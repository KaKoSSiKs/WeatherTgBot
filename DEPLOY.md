# Инструкция по запуску WeatherTgBot на сервере

## Предварительные требования

- Node.js 20+ и pnpm (или используйте Docker)
- PostgreSQL (или используйте Docker)
- Nginx
- SSL сертификаты (Let's Encrypt)

## Вариант 1: Запуск через Docker Compose (Рекомендуется)

### 1. Подготовка

```bash
cd /opt/WeatherTgBot

# Создайте файл .env с переменными окружения
cat > .env << EOF
# Telegram Bot
BOT_TOKEN=your_bot_token_here

# Database
POSTGRES_USER=weatherbot
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=weatherbot
POSTGRES_PORT=5432

# Weather API
WEATHER_API_KEY=your_openweather_api_key
OPENWEATHER_API_KEY=your_openweather_api_key

# Backend
NODE_ENV=production
PORT=3000
API_PORT=3001
TZ=Europe/Moscow

# Frontend
FRONTEND_PORT=5173
EOF

# Установите права доступа
chmod 600 .env
```

### 2. Сборка и запуск

```bash
# Соберите Docker образы
docker-compose build

# Запустите все сервисы
docker-compose up -d

# Проверьте статус
docker-compose ps

# Просмотрите логи
docker-compose logs -f backend
```

### 3. Сборка мини-аппа

```bash
# Установите зависимости (если еще не установлены)
pnpm install

# Соберите мини-апп
pnpm -F weather-miniapp build

# Проверьте, что файлы собраны
ls -la apps/miniapp/dist/
```

### 4. Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/weatherbot

# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если нужно)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```

### 5. Проверка работы

```bash
# Проверьте статус контейнеров
docker-compose ps

# Проверьте логи бэкенда
docker-compose logs backend | tail -20

# Проверьте API
curl http://localhost:3001/health

# Проверьте через nginx
curl https://nikitintex.ru/api/health

# Проверьте статику
curl https://nikitintex.ru/
```

## Вариант 2: Запуск без Docker

### 1. Установка зависимостей

```bash
cd /opt/WeatherTgBot

# Установите pnpm (если не установлен)
npm install -g pnpm

# Установите зависимости
pnpm install
```

### 2. Настройка базы данных PostgreSQL

```bash
# Создайте базу данных
sudo -u postgres psql << EOF
CREATE USER weatherbot WITH PASSWORD 'your_secure_password';
CREATE DATABASE weatherbot OWNER weatherbot;
\q
EOF

# Настройте переменные окружения
export DATABASE_URL="postgresql://weatherbot:your_secure_password@localhost:5432/weatherbot?schema=public"
```

### 3. Настройка переменных окружения

```bash
cd /opt/WeatherTgBot/packages/backend

# Создайте .env файл
cat > .env << EOF
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://weatherbot:your_secure_password@localhost:5432/weatherbot?schema=public
WEATHER_API_KEY=your_openweather_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
NODE_ENV=production
API_PORT=3001
TZ=Europe/Moscow
EOF
```

### 4. Сборка бэкенда

```bash
cd /opt/WeatherTgBot

# Соберите бэкенд
pnpm -F @weather-tg-bot/backend build

# Примените миграции
cd packages/backend
pnpm prisma migrate deploy
pnpm prisma generate
```

### 5. Запуск бэкенда с PM2

```bash
# Установите PM2 (если не установлен)
npm install -g pm2

# Запустите бэкенд
cd /opt/WeatherTgBot/packages/backend
pm2 start dist/index.js --name weatherbot-backend --env production

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск
pm2 startup
```

### 6. Сборка мини-аппа

```bash
cd /opt/WeatherTgBot

# Соберите мини-апп
pnpm -F weather-miniapp build

# Проверьте результат
ls -la apps/miniapp/dist/
```

### 7. Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp /opt/WeatherTgBot/nginx.conf /etc/nginx/sites-available/weatherbot

# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/

# Проверьте и перезагрузите
sudo nginx -t && sudo systemctl reload nginx
```

## Полезные команды

### Docker Compose

```bash
# Остановить все сервисы
docker-compose down

# Перезапустить сервисы
docker-compose restart

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f postgres

# Остановить и удалить все (включая volumes)
docker-compose down -v

# Пересобрать образы
docker-compose build --no-cache
```

### PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs weatherbot-backend

# Перезапуск
pm2 restart weatherbot-backend

# Остановка
pm2 stop weatherbot-backend

# Удаление
pm2 delete weatherbot-backend
```

### Обновление проекта

```bash
cd /opt/WeatherTgBot

# Обновите код (git pull или другой способ)

# Пересоберите мини-апп
pnpm -F weather-miniapp build

# Перезапустите бэкенд
# Docker:
docker-compose restart backend

# PM2:
pm2 restart weatherbot-backend

# Перезагрузите nginx (если изменили конфиг)
sudo nginx -t && sudo systemctl reload nginx
```

## Проверка работоспособности

1. **Проверьте бэкенд:**
```bash
curl http://localhost:3001/health
# Должен вернуть: {"status":"ok","timestamp":"..."}
```

2. **Проверьте через nginx:**
```bash
curl https://nikitintex.ru/api/health
```

3. **Проверьте мини-апп:**
```bash
curl https://nikitintex.ru/
# Должен вернуть HTML страницу
```

4. **Проверьте логи:**
```bash
# Docker
docker-compose logs backend | tail -50

# PM2
pm2 logs weatherbot-backend --lines 50

# Nginx
sudo tail -f /var/log/nginx/weatherbot-access.log
sudo tail -f /var/log/nginx/weatherbot-error.log
```

## Решение проблем

### Бэкенд не запускается

1. Проверьте переменные окружения:
```bash
docker-compose config
# или
cat packages/backend/.env
```

2. Проверьте логи:
```bash
docker-compose logs backend
# или
pm2 logs weatherbot-backend
```

3. Проверьте подключение к БД:
```bash
# Docker
docker-compose exec postgres psql -U weatherbot -d weatherbot

# Локально
psql -U weatherbot -d weatherbot
```

### 502 Bad Gateway в nginx

1. Проверьте, что бэкенд запущен:
```bash
curl http://127.0.0.1:3001/health
```

2. Проверьте логи nginx:
```bash
sudo tail -f /var/log/nginx/weatherbot-error.log
```

3. Проверьте, что порт 3001 не занят другим процессом:
```bash
sudo netstat -tlnp | grep 3001
```

### Мини-апп не загружается

1. Проверьте, что файлы собраны:
```bash
ls -la /opt/WeatherTgBot/apps/miniapp/dist/
```

2. Проверьте права доступа:
```bash
sudo chown -R www-data:www-data /opt/WeatherTgBot/apps/miniapp/dist
```

3. Проверьте логи nginx:
```bash
sudo tail -f /var/log/nginx/weatherbot-error.log
```

## Автозапуск при перезагрузке сервера

### Docker Compose

Docker Compose автоматически запускает контейнеры при перезагрузке, если они настроены с `restart: unless-stopped`.

### PM2

```bash
# Сохраните текущую конфигурацию
pm2 save

# Настройте автозапуск
pm2 startup
# Выполните команду, которую выведет PM2
```

## Мониторинг

### Docker

```bash
# Использование ресурсов
docker stats

# Статус контейнеров
docker-compose ps
```

### PM2

```bash
# Мониторинг в реальном времени
pm2 monit

# Статистика
pm2 status
```

