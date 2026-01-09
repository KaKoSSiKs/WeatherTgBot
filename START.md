# Быстрый запуск на сервере

## 🚀 Быстрый старт (рекомендуется)

```bash
cd /opt/WeatherTgBot

# Сделайте скрипт исполняемым
chmod +x start.sh

# Запустите скрипт (он все сделает автоматически)
./start.sh
```

Скрипт автоматически:
- ✅ Проверит и создаст .env файл при необходимости
- ✅ Очистит старые контейнеры
- ✅ Соберет и запустит все сервисы
- ✅ Проверит готовность сервисов
- ✅ Покажет статус и полезные команды

---

## Ручная настройка

### 1. Создайте .env файл

```bash
cd /opt/WeatherTgBot
nano .env
```

Добавьте:
```
BOT_TOKEN=ваш_токен_бота
POSTGRES_PASSWORD=надежный_пароль
WEATHER_API_KEY=ваш_ключ_openweather
API_PORT=3001
```

## 2. Запустите через Docker

```bash
# Если контейнеры уже существуют, остановите и удалите их
docker-compose down --remove-orphans

# Если все еще есть проблемы, принудительно удалите контейнеры
# Для Docker:
docker rm -f weather-bot-postgres weather-bot-backend weather-bot-frontend 2>/dev/null || true
# Для Podman:
# podman rm -f weather-bot-postgres weather-bot-backend weather-bot-frontend 2>/dev/null || true

# Запустите все сервисы (postgres, backend, frontend)
docker-compose up -d --build

# Проверьте статус
docker-compose ps

# Посмотрите логи
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 3. Настройте Nginx

**Вариант A: Используете frontend контейнер (рекомендуется)**

```bash
# Используйте конфигурацию для проксирования на контейнер
sudo cp nginx.conf.container /etc/nginx/sites-available/weatherbot
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Вариант B: Отдаете статику напрямую через nginx на хосте**

```bash
# Соберите мини-апп локально
pnpm install
pnpm -F weather-miniapp build

# Используйте конфигурацию для статики
sudo cp nginx.conf /etc/nginx/sites-available/weatherbot
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Проверьте работу

```bash
# API
curl https://nikitintex.ru/api/health

# Frontend контейнер
curl http://localhost:5173/health

# Сайт через nginx
curl https://nikitintex.ru/
```

## Полезные команды

```bash
# Логи бэкенда
docker-compose logs -f backend

# Перезапуск
docker-compose restart backend

# Остановка
docker-compose down

# Обновление мини-аппа (если используете статику на хосте)
pnpm -F weather-miniapp build

# Пересборка frontend контейнера
docker-compose build frontend
docker-compose up -d frontend
```

## Если что-то не работает

1. Проверьте логи: `docker-compose logs backend`
2. Проверьте API: `curl http://localhost:3001/health`
3. Проверьте nginx: `sudo nginx -t`
4. Проверьте права: `ls -la apps/miniapp/dist/`

