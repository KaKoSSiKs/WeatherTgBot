# Services Layer

## Назначение

Слой бизнес-логики приложения. Содержит всю логику работы с данными, не зависящую от transport layer (Telegram или HTTP).

## Принципы

- ✅ Использует только storage и integrations слои
- ✅ НЕ зависит от transport (telegram/http)
- ✅ Возвращает готовые DTO для клиентов
- ✅ Вся бизнес-логика здесь

## Структура

```
services/
├── user.service.ts          # Работа с пользователями
├── location.service.ts       # Управление локациями
├── weather.service.ts       # Получение и форматирование погоды
├── notification.service.ts  # Управление уведомлениями
└── settings.service.ts      # Настройки пользователя
```

## TODO: Файлы для создания

- [ ] user.service.ts
- [ ] location.service.ts
- [ ] weather.service.ts
- [ ] notification.service.ts
- [ ] settings.service.ts

