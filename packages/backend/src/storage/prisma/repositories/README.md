# Repository Layer

Repository Layer — единственное место в приложении, где используется Prisma Client. Все репозитории предоставляют чистые CRUD операции без бизнес-логики.

## Структура

```
storage/prisma/
├── client.ts                    # Prisma Client singleton
└── repositories/
    ├── index.ts                # Централизованный экспорт
    ├── user.repository.ts       # UserRepository
    ├── user-settings.repository.ts  # UserSettingsRepository
    ├── location.repository.ts   # LocationRepository
    └── notification.repository.ts    # NotificationRepository
```

## Использование

### Импорт репозиториев

```typescript
import {
  UserRepository,
  UserSettingsRepository,
  LocationRepository,
  NotificationRepository,
} from '@/storage/prisma/repositories';
```

### Пример использования в Service

```typescript
import { UserRepository } from '@/storage/prisma/repositories';

export class UserService {
  private userRepo = new UserRepository();
  private settingsRepo = new UserSettingsRepository();

  async getOrCreateUser(telegramId: string) {
    // Ищем пользователя
    let user = await this.userRepo.findByTelegramId(telegramId);
    
    if (!user) {
      // Создаем нового пользователя
      user = await this.userRepo.create({
        telegramId,
        languageCode: 'ru',
      });
      
      // Создаем настройки по умолчанию
      await this.settingsRepo.createDefault(user.id);
    }
    
    return user;
  }
}
```

## Репозитории

### UserRepository

Работа с пользователями.

**Методы:**
- `findByTelegramId(telegramId: string)` - найти по Telegram ID
- `findById(id: number)` - найти по ID
- `create(data: CreateUserData)` - создать пользователя
- `update(telegramId: string, data: UpdateUserData)` - обновить
- `updateById(id: number, data: UpdateUserData)` - обновить по ID
- `delete(telegramId: string)` - удалить
- `deleteById(id: number)` - удалить по ID
- `upsert(...)` - создать или обновить

### UserSettingsRepository

Работа с настройками пользователей.

**Методы:**
- `findByUserId(userId: number)` - найти настройки пользователя
- `findById(id: number)` - найти по ID
- `createDefault(userId: number)` - создать настройки по умолчанию
- `create(data: CreateUserSettingsData)` - создать с данными
- `update(userId: number, data: UpdateUserSettingsData)` - обновить
- `setDefaultLocation(userId: number, locationId: number | null)` - установить дефолтную локацию
- `delete(userId: number)` - удалить
- `upsert(...)` - создать или обновить

### LocationRepository

Работа с локациями пользователей.

**Методы:**
- `findByUserId(userId: number)` - найти все локации пользователя
- `findById(id: number)` - найти по ID
- `findByIdAndUserId(id: number, userId: number)` - найти с проверкой принадлежности
- `create(data: CreateLocationData)` - создать локацию
- `update(id: number, data: UpdateLocationData)` - обновить
- `delete(id: number)` - удалить
- `updateDisplayOrder(updates: Array<{id, displayOrder}>)` - обновить порядок отображения
- `countByUserId(userId: number)` - подсчитать количество локаций

### NotificationRepository

Работа с уведомлениями.

**Методы:**
- `findByUserId(userId: number)` - найти все уведомления пользователя
- `findActiveByUserId(userId: number)` - найти активные уведомления
- `findById(id: number)` - найти по ID
- `findByIdAndUserId(id: number, userId: number)` - найти с проверкой принадлежности
- `findActiveDue(now: Date)` - найти активные уведомления к отправке
- `create(data: CreateNotificationData)` - создать уведомление
- `update(id: number, data: UpdateNotificationData)` - обновить
- `pauseUntil(id: number, until: Date)` - приостановить до даты
- `setEnabled(id: number, enabled: boolean)` - включить/выключить
- `updateNextNotification(id: number, nextNotificationAt: Date | null)` - обновить время следующего уведомления
- `updateLastChecked(id: number, lastCheckedAt: Date)` - обновить время последней проверки
- `delete(id: number)` - удалить
- `countByUserId(userId: number)` - подсчитать количество уведомлений
- `countActiveByUserId(userId: number)` - подсчитать активные уведомления

## Типизация

Все репозитории используют Prisma generated types:

```typescript
import type { User, Prisma } from '@prisma/client';

// Prisma типы для создания
type CreateUserData = Prisma.UserCreateInput;
type UpdateUserData = Prisma.UserUpdateInput;
```

## Принципы

1. **Только CRUD** - никакой бизнес-логики
2. **Prisma types** - используем generated types
3. **Чистые методы** - один метод = одна операция
4. **Без валидации** - валидация в Service слое
5. **Без внешних зависимостей** - только Prisma Client

## Примеры

### Создание пользователя с настройками

```typescript
const userRepo = new UserRepository();
const settingsRepo = new UserSettingsRepository();

// Создаем пользователя
const user = await userRepo.create({
  telegramId: '123456789',
  languageCode: 'ru',
});

// Создаем настройки по умолчанию
await settingsRepo.createDefault(user.id);
```

### Работа с локациями

```typescript
const locationRepo = new LocationRepository();

// Получить все локации пользователя
const locations = await locationRepo.findByUserId(userId);

// Создать новую локацию
const location = await locationRepo.create({
  user: { connect: { id: userId } },
  name: 'Москва',
  latitude: 55.7558,
  longitude: 37.6173,
  countryCode: 'RU',
});

// Установить дефолтную локацию
await settingsRepo.setDefaultLocation(userId, location.id);
```

### Работа с уведомлениями

```typescript
const notificationRepo = new NotificationRepository();

// Найти уведомления к отправке
const dueNotifications = await notificationRepo.findActiveDue(new Date());

// Создать уведомление
const notification = await notificationRepo.create({
  user: { connect: { id: userId } },
  location: { connect: { id: locationId } },
  type: 'REGULAR_FORECAST',
  subtype: 'today',
  schedule: 'DAILY',
  parameters: { time: '08:00' },
  nextNotificationAt: new Date('2024-01-01T08:00:00Z'),
});

// Обновить время следующего уведомления
await notificationRepo.updateNextNotification(
  notification.id,
  new Date('2024-01-02T08:00:00Z')
);
```

