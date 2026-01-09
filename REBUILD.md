# 🔄 Пересборка Docker контейнеров

Руководство по пересборке Docker контейнеров проекта.

## Быстрые команды

### Production окружение

```bash
# Пересобрать и перезапустить все контейнеры
docker-compose up -d --build

# Пересобрать без кэша (полная пересборка)
docker-compose build --no-cache
docker-compose up -d

# Или одной командой
docker-compose build --no-cache && docker-compose up -d
```

### Development окружение

```bash
# Пересобрать и перезапустить dev контейнеры
docker-compose -f docker-compose.dev.yml up -d --build

# Пересобрать без кэша
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

## Использование Makefile

Если у вас установлен `make`:

```bash
# Production
make rebuild              # Пересобрать и перезапустить
make build-no-cache       # Пересобрать без кэша
make rebuild-no-cache     # Пересобрать без кэша и перезапустить

# Development
make dev-rebuild          # Пересобрать и перезапустить dev
make dev-build            # Собрать dev контейнеры
```

## Пересборка конкретного сервиса

```bash
# Только backend
docker-compose build backend
docker-compose up -d backend

# Только frontend
docker-compose build frontend
docker-compose up -d frontend

# Без кэша
docker-compose build --no-cache backend
docker-compose up -d backend
```

## Полная пересборка (с удалением старых образов)

```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить старые образы
docker-compose build --no-cache

# Запустить заново
docker-compose up -d
```

## Когда нужна пересборка?

Пересборка нужна когда:
- ✅ Изменился код приложения
- ✅ Изменились зависимости в `package.json`
- ✅ Изменился `Dockerfile`
- ✅ Изменилась структура проекта
- ✅ Нужно обновить зависимости

## Оптимизация пересборки

### С кэшем (быстрее)
```bash
docker-compose build
```
Использует кэш Docker для ускорения сборки. Подходит для большинства случаев.

### Без кэша (медленнее, но чище)
```bash
docker-compose build --no-cache
```
Полная пересборка без использования кэша. Используйте когда:
- Подозреваете проблемы с кэшем
- Обновили базовый образ
- Нужна гарантированно чистая сборка

## Полезные команды

```bash
# Просмотр размера образов
docker images | grep weather-bot

# Очистка неиспользуемых образов
docker image prune -a

# Полная очистка (ОСТОРОЖНО: удалит все!)
docker system prune -a --volumes
```

## Troubleshooting

### Ошибки при пересборке

1. **Недостаточно места на диске**
   ```bash
   docker system prune -a
   ```

2. **Конфликты портов**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Проблемы с зависимостями**
   ```bash
   docker-compose build --no-cache backend
   ```

### Проверка после пересборки

```bash
# Проверить статус
docker-compose ps

# Проверить логи
docker-compose logs -f backend

# Проверить, что все работает
docker-compose exec backend node -v
```

