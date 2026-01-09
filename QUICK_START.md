# 🚀 Быстрый старт с Docker

## Шаг 1: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# Windows
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Откройте `.env` и заполните обязательные переменные:

```env
BOT_TOKEN=your_telegram_bot_token_here
WEATHER_API_KEY=your_openweathermap_api_key_here
```

**Где получить:**
- `BOT_TOKEN`: Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
- `WEATHER_API_KEY`: Получите на [OpenWeatherMap](https://openweathermap.org/api)

## Шаг 2: Запуск

### Windows (PowerShell)

```powershell
.\docker-start.ps1
```

Выберите режим:
- `1` - Production (оптимизированный)
- `2` - Development (с hot reload)

### Linux/Mac

```bash
chmod +x docker-start.sh
./docker-start.sh
```

Выберите режим:
- `1` - Production (оптимизированный)
- `2` - Development (с hot reload)

### Или вручную

```bash
# Production
docker-compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d
```

## Шаг 3: Проверка работы

### Проверка статуса

```bash
docker-compose ps
```

Должны быть запущены:
- `weather-bot-postgres` (PostgreSQL)
- `weather-bot-backend` (Telegram Bot)
- `weather-bot-frontend` (Mini App)

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только backend (бот)
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Только база данных
docker-compose logs -f postgres
```

### Проверка бота

1. Найдите вашего бота в Telegram (по имени, которое вы указали в BotFather)
2. Отправьте команду `/start`
3. Бот должен ответить и показать главное меню

### Проверка базы данных

```bash
# Подключиться к PostgreSQL
docker-compose exec postgres psql -U weatherbot -d weatherbot

# Или запустить Prisma Studio
docker-compose exec backend pnpm prisma studio
# Откроется на http://localhost:5555
```

## Шаг 4: Остановка

```bash
# Остановить все контейнеры
docker-compose down

# Остановить и удалить volumes (ОСТОРОЖНО: удалит данные БД!)
docker-compose down -v
```

## Полезные команды

```bash
# Перезапустить все сервисы
docker-compose restart

# Перезапустить только backend
docker-compose restart backend

# Выполнить миграции вручную
docker-compose exec backend pnpm prisma migrate deploy

# Открыть shell в backend контейнере
docker-compose exec backend sh

# Просмотреть использование ресурсов
docker stats
```

## Troubleshooting

### ❌ Backend не запускается

1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь, что `.env` заполнен правильно
3. Проверьте, что БД запущена: `docker-compose ps postgres`

### ❌ База данных не подключается

1. Проверьте `DATABASE_URL` в `.env`
2. Убедитесь, что PostgreSQL контейнер запущен
3. Проверьте логи: `docker-compose logs postgres`

### ❌ Порт уже занят

Измените порты в `.env`:
```env
PORT=3001              # для backend
FRONTEND_PORT=5174     # для frontend
POSTGRES_PORT=5433     # для PostgreSQL
```

### ❌ Миграции не применяются

Выполните миграции вручную:
```bash
docker-compose exec backend pnpm prisma migrate deploy
```

## Следующие шаги

- Прочитайте [DOCKER.md](./DOCKER.md) для полной документации
- Прочитайте [README.md](./README.md) для общей информации о проекте
- Начните разработку: используйте `docker-compose.dev.yml` для hot reload

