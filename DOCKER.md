# Docker Setup Guide

Руководство по запуску проекта в Docker контейнерах.

## Требования

- Docker 20.10+
- Docker Compose 2.0+
- ~2GB свободного места на диске

## Быстрый старт

### 1. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните необходимые переменные:

```bash
cp .env.example .env
```

Обязательные переменные:
- `BOT_TOKEN` - токен Telegram бота
- `WEATHER_API_KEY` - API ключ OpenWeatherMap

### 2. Запуск в production режиме

```bash
# Собрать и запустить все сервисы
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 3. Запуск в development режиме

```bash
# Запустить с hot reload
docker-compose -f docker-compose.dev.yml up -d

# Просмотр логов
docker-compose -f docker-compose.dev.yml logs -f

# Остановка
docker-compose -f docker-compose.dev.yml down
```

## Использование Makefile

Для удобства можно использовать Makefile:

```bash
# Показать все доступные команды
make help

# Production
make build    # Собрать образы
make up       # Запустить
make down     # Остановить
make logs     # Показать логи

# Development
make dev      # Запустить dev окружение
make dev-down # Остановить dev окружение
make dev-logs # Показать логи dev

# Пересборка
make rebuild          # Пересобрать и перезапустить
make rebuild-no-cache # Пересобрать без кэша
make dev-rebuild      # Пересобрать dev окружение

# Утилиты
make migrate  # Выполнить миграции
make prisma-studio  # Запустить Prisma Studio
make shell-backend  # Открыть shell в backend
```

## Пересборка контейнеров

Когда нужно пересобрать контейнеры (после изменения кода, зависимостей, Dockerfile):

```bash
# Быстрая пересборка (с кэшем) - рекомендуется
docker-compose up -d --build

# Полная пересборка (без кэша) - если есть проблемы
docker-compose build --no-cache
docker-compose up -d

# Или через Makefile
make rebuild              # С кэшем
make rebuild-no-cache     # Без кэша

# Для dev окружения
docker-compose -f docker-compose.dev.yml up -d --build
make dev-rebuild
```

**Когда нужна пересборка:**
- Изменился код приложения
- Изменились зависимости в `package.json`
- Изменился `Dockerfile`
- Нужно обновить зависимости

Подробнее: [REBUILD.md](./REBUILD.md)

## Структура сервисов

### Backend (Telegram Bot)
- **Порт**: 3000
- **Контейнер**: `weather-bot-backend`
- **Логи**: `docker-compose logs -f backend`

### Frontend (Mini App)
- **Порт**: 5173 (dev) / 80 (prod)
- **Контейнер**: `weather-bot-frontend`
- **Логи**: `docker-compose logs -f frontend`

### PostgreSQL Database
- **Порт**: 5432
- **Контейнер**: `weather-bot-postgres`
- **Данные**: сохраняются в volume `postgres_data`

## Выполнение миграций

Миграции выполняются автоматически при запуске backend контейнера.

Для ручного выполнения:

```bash
# Production
docker-compose exec backend pnpm prisma migrate deploy

# Development
docker-compose -f docker-compose.dev.yml exec backend pnpm prisma migrate deploy
```

## Prisma Studio

Для просмотра и редактирования данных в БД:

```bash
# Production
make prisma-studio
# или
docker-compose exec backend pnpm prisma studio

# Откроется на http://localhost:5555
```

## Отладка

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Подключение к контейнеру

```bash
# Backend shell
docker-compose exec backend sh

# PostgreSQL shell
docker-compose exec postgres psql -U weatherbot -d weatherbot
```

### Проверка состояния

```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

## Очистка

```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить также volumes (ОСТОРОЖНО: удалит данные БД!)
docker-compose down -v

# Удалить все (контейнеры, volumes, образы)
make clean
```

## Переменные окружения

Все переменные окружения настраиваются в файле `.env`:

- `BOT_TOKEN` - токен Telegram бота (обязательно)
- `WEATHER_API_KEY` - API ключ OpenWeatherMap (обязательно)
- `POSTGRES_USER` - пользователь БД (по умолчанию: weatherbot)
- `POSTGRES_PASSWORD` - пароль БД (по умолчанию: weatherbot123)
- `POSTGRES_DB` - имя БД (по умолчанию: weatherbot)
- `TZ` - часовой пояс (по умолчанию: Europe/Moscow)

## Troubleshooting

### Backend не запускается

1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь, что БД запущена: `docker-compose ps`
3. Проверьте переменные окружения в `.env`

### База данных не подключается

1. Проверьте, что PostgreSQL контейнер запущен: `docker-compose ps postgres`
2. Проверьте `DATABASE_URL` в `.env`
3. Проверьте логи БД: `docker-compose logs postgres`

### Миграции не применяются

1. Выполните миграции вручную: `make migrate`
2. Проверьте права доступа к БД
3. Проверьте логи: `docker-compose logs backend`

