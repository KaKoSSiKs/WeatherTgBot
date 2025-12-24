import { PrismaClient, User, UserSettings, UserCity, Location } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { ILogger } from '../logger/logger.interface';

type DisplaySettings = {
  temperature: boolean;
  feelsLike: boolean;
  humidity: boolean;
  pressure: boolean;
  visibility: boolean;
  wind: boolean;
  precipitation: boolean;
  sunriseSunset: boolean;
  recommendations: boolean;
  warnings: boolean;
  timePeriods: boolean;
  hourlyDetails: boolean;
};

@injectable()
export class SettingsService {
  constructor(
    @inject(TYPES.PrismaService) private prismaService: PrismaClient,
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  private get prismaAny(): any {
    return this.prismaService as any;
  }

  async getOrCreateUserSettings(userId: number): Promise<UserSettings> {
    try {
      // Check if user exists, create if not
      let user = await this.prismaService.user.findUnique({
        where: { telegramId: userId.toString() },
      });

      if (!user) {
        user = await this.prismaService.user.create({
          data: {
            telegramId: userId.toString(),
          },
        });
      }

      // Get or create settings
      let settings = await this.prismaService.userSettings.findUnique({
        where: { userId: user.id },
      });

      if (!settings) {
        settings = await this.prismaService.userSettings.create({
          data: {
            user: { connect: { id: user.id } },
          },
        });

        // Update user with settings reference
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { settingsId: settings.id },
        });
      }

      return settings;
    } catch (error) {
      this.logger.error(`Error getting user settings: ${error}`);
      throw error;
    }
  }

  async getDisplaySettings(userId: number): Promise<DisplaySettings> {
    try {
      const settings = await this.getOrCreateUserSettings(userId);
      return JSON.parse(settings.displaySettings) as DisplaySettings;
    } catch (error) {
      this.logger.error(`Error getting display settings: ${error}`);
      // Return default settings on error
      return {
        temperature: true,
        feelsLike: true,
        humidity: true,
        pressure: true,
        visibility: true,
        wind: true,
        precipitation: true,
        sunriseSunset: true,
        recommendations: true,
        warnings: true,
        timePeriods: true,
        hourlyDetails: false,
      };
    }
  }

  async updateDisplaySettings(
    userId: number,
    updates: Partial<DisplaySettings>
  ): Promise<DisplaySettings> {
    try {
      const currentSettings = await this.getDisplaySettings(userId);
      const newSettings = { ...currentSettings, ...updates };

      await this.prismaService.userSettings.update({
        where: { userId: (await this.prismaService.user.findUnique({ where: { telegramId: userId.toString() } }))?.id },
        data: {
          displaySettings: JSON.stringify(newSettings),
        },
      });

      return newSettings;
    } catch (error) {
      this.logger.error(`Error updating display settings: ${error}`);
      throw error;
    }
  }

  async getSavedCities(userId: number): Promise<Array<{
    id: number;
    name: string;
    isDefault: boolean;
    latitude: number;
    longitude: number;
  }>> {
    try {
      const user = (await this.prismaAny.user.findUnique({
        where: { telegramId: userId.toString() },
        include: {
          savedCities: {
            include: {
              location: true,
            },
            orderBy: {
              orderIndex: 'asc',
            },
          },
        },
      })) as any;

      if (!user) {
        return [];
      }

      return (user.savedCities as any[]).map((city) => ({
        id: city.id,
        name: city.location.name,
        isDefault: city.isDefault,
        latitude: city.location.latitude,
        longitude: city.location.longitude,
      }));
    } catch (error) {
      this.logger.error(`Error getting saved cities: ${error}`);
      return [];
    }
  }

  async addCity(
    userId: number,
    locationId: number,
    setAsDefault: boolean = false
  ): Promise<boolean> {
    const prisma = this.prismaAny;
    
    return prisma.$transaction(async (tx: any) => {
      const txAny = tx as any;
      // Check if user exists
      let user = await txAny.user.findUnique({
        where: { telegramId: userId.toString() },
        include: { savedCities: true },
      });

      if (!user) {
        // Create user if not exists
        user = await txAny.user.create({
          data: { telegramId: userId.toString() },
          include: { savedCities: true },
        });
      }

      // Check if city is already saved
      const existingCity = (user.savedCities as any[]).find((c) => c.locationId === locationId);
      if (existingCity) {
        return false; // City already saved
      }

      // Check city limit (max 10)
      if ((user.savedCities as any[]).length >= 10) {
        return false; // Max cities reached
      }

      // If setting as default, unset current default
      if (setAsDefault) {
        await txAny.userCity.updateMany({
          where: { 
            userId: user.id,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      // Add new city
      await txAny.userCity.create({
        data: {
          userId: user.id,
          locationId,
          isDefault: setAsDefault || user.savedCities.length === 0, // First city is default
          orderIndex: user.savedCities.length,
        },
      });

      // Update default city in settings if needed
      if (setAsDefault) {
        await this.updateDefaultCity(userId, locationId);
      }

      return true;
    }).catch((error: any) => {
      this.logger.error(`Error adding city: ${error}`);
      return false;
    });
  }

  async removeCity(userId: number, userCityId: number): Promise<boolean> {
    try {
      const user = (await this.prismaAny.user.findUnique({
        where: { telegramId: userId.toString() },
        include: { settings: true },
      })) as any;

      if (!user) {
        return false;
      }

      // Get the city to be deleted
      const cityToDelete = await this.prismaAny.userCity.findUnique({
        where: { id: userCityId },
      });

      if (!cityToDelete) {
        return false;
      }

      // Delete the city
      await this.prismaAny.userCity.delete({
        where: { id: userCityId },
      });

      // If this was the default city, set a new default
      if (user.settings?.defaultCityId === cityToDelete.locationId) {
        const nextCity = await this.prismaAny.userCity.findFirst({
          where: { userId: user.id },
          orderBy: { orderIndex: 'asc' },
        });

        if (nextCity) {
          await this.updateDefaultCity(userId, nextCity.locationId);
        } else {
          // No more cities, clear default
          await this.prismaAny.userSettings.update({
            where: { id: user.settings.id },
            data: { defaultCityId: null },
          });
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Error removing city: ${error}`);
      return false;
    }
  }

  async setDefaultCity(userId: number, locationId: number): Promise<boolean> {
    try {
      const user = (await this.prismaAny.user.findUnique({
        where: { telegramId: userId.toString() },
        include: { savedCities: { where: { locationId } } },
      })) as any;

      if (!user || user.savedCities.length === 0) {
        return false; // City not found in user's saved cities
      }

      // Update all cities to not be default
      await this.prismaAny.userCity.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });

      // Set the selected city as default
      await this.prismaAny.userCity.update({
        where: { id: user.savedCities[0].id },
        data: { isDefault: true },
      });

      // Update default city in settings
      await this.updateDefaultCity(userId, locationId);

      return true;
    } catch (error) {
      this.logger.error(`Error setting default city: ${error}`);
      return false;
    }
  }

  async updateDefaultCity(userId: number, locationId: number): Promise<void> {
    const user = (await this.prismaAny.user.findUnique({
      where: { telegramId: userId.toString() },
      include: { settings: true },
    })) as any;

    if (!user) {
      return;
    }

    if (user.settings) {
      await this.prismaAny.userSettings.update({
        where: { id: user.settings.id },
        data: { defaultCityId: locationId },
      });
    } else {
      await this.prismaAny.userSettings.create({
        data: {
          userId: user.id,
          defaultCityId: locationId,
        },
      });
    }
  }

  async updateSilentHours(
    userId: number,
    enabled: boolean,
    startTime?: string,
    endTime?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { silentModeEnabled: enabled };
      
      if (startTime) updateData.silentModeStart = startTime;
      if (endTime) updateData.silentModeEnd = endTime;

      const u = await this.prismaAny.user.findUnique({ where: { telegramId: userId.toString() } });
      await this.prismaAny.userSettings.update({
        where: { userId: u?.id },
        data: updateData,
      });

      return true;
    } catch (error) {
      this.logger.error(`Error updating silent hours: ${error}`);
      return false;
    }
  }

  async getCurrentLocation(userId: number): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const user = (await this.prismaAny.user.findUnique({
        where: { telegramId: userId.toString() },
        include: {
          settings: {
            include: { defaultCity: true },
          },
          savedCities: {
            where: { isDefault: true },
            include: { location: true },
            take: 1,
          },
        },
      })) as any;

      if (!user) {
        return null;
      }

      // Try to get from default city in settings
      if (user.settings?.defaultCity) {
        return {
          latitude: user.settings.defaultCity.latitude,
          longitude: user.settings.defaultCity.longitude,
        };
      }

      // Try to get from saved cities
      if ((user.savedCities as any[]).length > 0 && user.savedCities[0].location) {
        return {
          latitude: user.savedCities[0].location.latitude,
          longitude: user.savedCities[0].location.longitude,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting current location: ${error}`);
      return null;
    }
  }
}
