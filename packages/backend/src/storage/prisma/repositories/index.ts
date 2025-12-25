/**
 * Repositories Index
 * 
 * Централизованный экспорт всех репозиториев.
 */

export { UserRepository } from './user.repository';
export { UserSettingsRepository } from './user-settings.repository';
export { LocationRepository } from './location.repository';
export { NotificationRepository } from './notification.repository';

export type { CreateUserData, UpdateUserData } from './user.repository';
export type {
  CreateUserSettingsData,
  UpdateUserSettingsData,
} from './user-settings.repository';
export type {
  CreateLocationData,
  UpdateLocationData,
} from './location.repository';
export type {
  CreateNotificationData,
  UpdateNotificationData,
  NotificationWithRelations,
} from './notification.repository';

