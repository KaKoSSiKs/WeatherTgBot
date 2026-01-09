# Настройка Nginx для WeatherTgBot

## Установка конфигурации

1. Скопируйте конфигурацию nginx:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/weatherbot
```

2. Создайте символическую ссылку:
```bash
sudo ln -s /etc/nginx/sites-available/weatherbot /etc/nginx/sites-enabled/
```

3. Удалите дефолтную конфигурацию (если нужно):
```bash
sudo rm /etc/nginx/sites-enabled/default
```

4. Проверьте конфигурацию:
```bash
sudo nginx -t
```

5. Перезагрузите nginx:
```bash
sudo systemctl reload nginx
```

## Структура проекта

Проект должен быть расположен в `/opt/WeatherTgBot`:

```
/opt/WeatherTgBot/
├── apps/
│   └── miniapp/
│       └── dist/          # Собранный мини-апп (после `pnpm build`)
├── packages/
│   └── backend/           # Бэкенд код
└── ...
```

## Сборка мини-аппа

Перед деплоем соберите мини-апп:

```bash
cd /opt/WeatherTgBot
pnpm install
pnpm -F weather-miniapp build
```

Собранные файлы будут в `/opt/WeatherTgBot/apps/miniapp/dist/`

## Запуск бэкенда

Бэкенд должен быть запущен на порту 3001 (или из переменной окружения `API_PORT`). Можно использовать:

1. **Docker Compose** (рекомендуется):
```bash
cd /opt/WeatherTgBot
# Убедитесь, что API_PORT=3001 в .env или docker-compose.yml
docker-compose up -d backend
```

2. **PM2** (для production):
```bash
cd /opt/WeatherTgBot/packages/backend
export API_PORT=3001
pm2 start dist/index.js --name weatherbot-backend --env production
```

3. **Systemd service** (создайте service файл):
```ini
[Unit]
Description=Weather Bot Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/WeatherTgBot/packages/backend
Environment="API_PORT=3001"
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## Проверка работы

1. Проверьте статику:
```bash
curl https://nikitintex.ru/
```

2. Проверьте API:
```bash
curl https://nikitintex.ru/api/health
```

3. Проверьте логи:
```bash
sudo tail -f /var/log/nginx/weatherbot-access.log
sudo tail -f /var/log/nginx/weatherbot-error.log
```

## Переменные окружения для мини-аппа

Убедитесь, что в мини-аппе установлена правильная переменная для API:

```bash
# В файле .env или при сборке
VITE_API_URL=https://nikitintex.ru/api
```

Или измените в `apps/miniapp/src/services/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikitintex.ru/api';
```

## Обновление после изменений

1. Соберите мини-апп:
```bash
cd /opt/WeatherTgBot
pnpm -F weather-miniapp build
```

2. Перезагрузите nginx (если изменили конфиг):
```bash
sudo nginx -t && sudo systemctl reload nginx
```

3. Перезапустите бэкенд (если нужно):
```bash
docker-compose restart backend
# или
pm2 restart weatherbot-backend
```

## Troubleshooting

### 502 Bad Gateway
- Проверьте, что бэкенд запущен: `curl http://127.0.0.1:3001/health`
- Проверьте логи: `sudo tail -f /var/log/nginx/weatherbot-error.log`

### 404 для статики
- Проверьте путь: `ls -la /opt/WeatherTgBot/apps/miniapp/dist/`
- Проверьте права доступа: `sudo chown -R www-data:www-data /opt/WeatherTgBot/apps/miniapp/dist`

### CORS ошибки
- Убедитесь, что заголовки правильно проксируются
- Проверьте, что `X-Telegram-Init-Data` передается в бэкенд

