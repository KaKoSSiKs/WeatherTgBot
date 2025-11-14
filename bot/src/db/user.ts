import { prisma } from './prisma';

export async function getOrCreateUser(telegramId: string, languageCode?: string) {
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { languageCode },
    create: {
      telegramId,
      languageCode: languageCode || 'ru',
    },
  });
  return user;
}

