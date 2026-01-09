# PowerShell скрипт для запуска проекта на Windows

Write-Host "[INFO] 🚀 Запуск WeatherTgBot проекта..." -ForegroundColor Blue

# Проверка, что скрипт запущен из корня проекта
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "[ERROR] Скрипт должен быть запущен из корня проекта (где находится docker-compose.yml)" -ForegroundColor Red
    exit 1
}

# Шаг 1: Проверка .env файла
Write-Host "[INFO] 📋 Проверка переменных окружения..." -ForegroundColor Blue
if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env файл не найден. Создаю шаблон..." -ForegroundColor Yellow
    @"
BOT_TOKEN=ваш_токен_бота
POSTGRES_USER=weatherbot
POSTGRES_PASSWORD=weatherbot123
POSTGRES_DB=weatherbot
WEATHER_API_KEY=ваш_ключ_openweather
OPENWEATHER_API_KEY=
WEATHER_API_PROVIDER=openweathermap
WEATHER_API_LANG=ru
WEATHER_UNITS=metric
TZ=Europe/Moscow
PORT=3000
API_PORT=3001
FRONTEND_PORT=5173
NODE_ENV=production
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "[ERROR] Создан шаблон .env файла. Пожалуйста, заполните его и запустите скрипт снова!" -ForegroundColor Red
    exit 1
}

# Шаг 2: Остановка и удаление старых контейнеров
Write-Host "[INFO] 🧹 Очистка старых контейнеров..." -ForegroundColor Blue
docker-compose down --remove-orphans 2>$null

# Принудительное удаление контейнеров
docker rm -f weather-bot-postgres weather-bot-backend weather-bot-frontend 2>$null

Write-Host "[SUCCESS] Старые контейнеры удалены" -ForegroundColor Green

# Шаг 3: Сборка и запуск контейнеров
Write-Host "[INFO] 🔨 Сборка и запуск контейнеров..." -ForegroundColor Blue
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Ошибка при запуске контейнеров!" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Контейнеры запущены" -ForegroundColor Green

# Шаг 4: Ожидание готовности
Write-Host "[INFO] ⏳ Ожидание готовности сервисов (10 секунд)..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Проверка статуса
Write-Host "[INFO] 📊 Статус контейнеров:" -ForegroundColor Blue
docker-compose ps

Write-Host ""
Write-Host "[SUCCESS] ✅ Проект запущен!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] 📝 Полезные команды:" -ForegroundColor Blue
Write-Host "  Логи backend:    docker-compose logs -f backend"
Write-Host "  Логи frontend:   docker-compose logs -f frontend"
Write-Host "  Статус:          docker-compose ps"
Write-Host "  Остановка:       docker-compose down"
Write-Host ""
