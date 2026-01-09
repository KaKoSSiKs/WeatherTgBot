# Быстрый запуск на сервере

## 1. Создайте .env файл

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
# Соберите и запустите
docker-compose up -d --build

# Проверьте статус
docker-compose ps

# Посмотрите логи
docker-compose logs -f backend
```

## 3. Соберите мини-апп

```bash
# Установите зависимости (если нужно)
pnpm install

# Соберите
pnpm -F weather-miniapp build

# Проверьте результат
ls -la apps/miniapp/dist/
```

## 4. Настройте Nginx

```bash
# Скопируйте конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/weatherbot
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите
sudo systemctl reload nginx
```

## 5. Проверьте работу

```bash
# API
curl https://nikitintex.ru/api/health

# Сайт
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

# Обновление мини-аппа
pnpm -F weather-miniapp build
```

## Если что-то не работает

1. Проверьте логи: `docker-compose logs backend`
2. Проверьте API: `curl http://localhost:3001/health`
3. Проверьте nginx: `sudo nginx -t`
4. Проверьте права: `ls -la apps/miniapp/dist/`

