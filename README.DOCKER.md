# 🐳 Docker Quick Start

Быстрый запуск проекта в Docker контейнерах.

## 📋 Требования

- Docker 20.10+
- Docker Compose 2.0+
- ~2GB свободного места

## 🚀 Быстрый старт

### Windows (PowerShell)

```powershell
# 1. Настройте переменные окружения
Copy-Item .env.example .env
# Отредактируйте .env и укажите BOT_TOKEN и WEATHER_API_KEY

# 2. Запустите скрипт
.\docker-start.ps1

# Или вручную:
docker-compose up -d
```

### Linux/Mac

```bash
# 1. Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env и укажите BOT_TOKEN и WEATHER_API_KEY

# 2. Запустите скрипт
./docker-start.sh

# Или вручную:
docker-compose up -d
```

## 📝 Настройка .env

Обязательные переменные:
- `BOT_TOKEN` - токен Telegram бота (получите у @BotFather)
- `WEATHER_API_KEY` - API ключ OpenWeatherMap

Остальные переменные имеют значения по умолчанию.

## 🎯 Режимы запуска

### Production (оптимизированный)

```bash
docker-compose up -d
```

- Оптимизированные образы
- Без hot reload
- Готово к продакшену

### Development (с hot reload)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

- Hot reload для кода
- Удобно для разработки
- Больше размер образов

## 📊 Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Статус контейнеров
docker-compose ps

# Выполнить миграции
docker-compose exec backend pnpm prisma migrate deploy

# Prisma Studio (просмотр БД)
docker-compose exec backend pnpm prisma studio
```

## 🔧 Использование Makefile

Если у вас установлен `make`:

```bash
make help      # Показать все команды
make build     # Собрать образы
make up        # Запустить
make logs      # Показать логи
make down      # Остановить
make dev       # Запустить dev режим
make migrate   # Выполнить миграции
```

## 📚 Подробная документация

См. [DOCKER.md](./DOCKER.md) для полной документации.

## 🆘 Troubleshooting

### Backend не запускается
1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь, что `.env` заполнен правильно
3. Проверьте, что БД запущена: `docker-compose ps postgres`

### База данных не подключается
1. Проверьте `DATABASE_URL` в `.env`
2. Убедитесь, что PostgreSQL контейнер запущен
3. Проверьте логи: `docker-compose logs postgres`

### Порт уже занят
Измените порты в `.env`:
- `PORT=3001` для backend
- `FRONTEND_PORT=5174` для frontend
- `POSTGRES_PORT=5433` для PostgreSQL

