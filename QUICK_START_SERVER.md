# Быстрый старт на сервере

## 🚀 Автоматический запуск (рекомендуется)

```bash
cd /opt/WeatherTgBot
chmod +x start.sh
./start.sh
```

Скрипт автоматически настроит и запустит все сервисы!

---

## Ручная настройка

### 1. Настройте переменные окружения

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

### 2. Запустите через Docker

```bash
# Если контейнеры уже существуют, остановите и удалите их
docker-compose down

# Соберите и запустите
docker-compose up -d --build

# Проверьте статус
docker-compose ps
```

### 3. Соберите мини-апп

```bash
# Установите зависимости (если нужно)
pnpm install

# Соберите
pnpm -F weather-miniapp build
```

### 4. Настройте Nginx

```bash
# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/weatherbot
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/

# Проверьте и перезагрузите
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Проверьте работу

```bash
# API
curl https://nikitintex.ru/api/health

# Сайт
curl https://nikitintex.ru/
```

Готово! 🎉

## Полезные команды

```bash
# Логи бэкенда
docker-compose logs -f backend

# Перезапуск
docker-compose restart backend

# Обновление мини-аппа
pnpm -F weather-miniapp build && sudo systemctl reload nginx
```

