# Backend Package

Единый backend для Telegram Bot и Mini App.

## Структура

```
src/
├── api/              # HTTP API для Mini App
├── services/         # Бизнес-логика
├── integrations/     # Внешние API
├── storage/          # Слой данных
├── transport/        # Transport layer (Telegram)
├── shared/           # Общие ресурсы
└── index.ts          # Точка входа
```

## Статус

🚧 **В разработке** - Скелет создан, миграция в процессе.

## TODO

- [ ] Миграция storage layer
- [ ] Миграция integrations layer
- [ ] Создание services layer
- [ ] Создание HTTP API
- [ ] Рефакторинг Telegram transport

