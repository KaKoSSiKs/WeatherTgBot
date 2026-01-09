# Скрипт для быстрого запуска Docker окружения (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WeatherTgBot - Docker Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Ошибка: Docker не установлен" -ForegroundColor Red
    Write-Host "Установите Docker: https://docs.docker.com/get-docker/" -ForegroundColor Yellow
    exit 1
}

# Проверка наличия Docker Compose
$dockerComposeAvailable = $false
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $dockerComposeAvailable = $true
    $composeCmd = "docker-compose"
} elseif (docker compose version 2>&1) {
    $dockerComposeAvailable = $true
    $composeCmd = "docker compose"
}

if (-not $dockerComposeAvailable) {
    Write-Host "❌ Ошибка: Docker Compose не установлен" -ForegroundColor Red
    Write-Host "Установите Docker Compose: https://docs.docker.com/compose/install/" -ForegroundColor Yellow
    exit 1
}

# Проверка наличия .env файла
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Файл .env не найден" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "Создаю .env из .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Файл .env создан. Пожалуйста, заполните необходимые переменные:" -ForegroundColor Green
        Write-Host "   - BOT_TOKEN" -ForegroundColor White
        Write-Host "   - WEATHER_API_KEY" -ForegroundColor White
        Write-Host ""
        Read-Host "Нажмите Enter после заполнения .env файла"
    } else {
        Write-Host "❌ Файл .env.example не найден" -ForegroundColor Red
        exit 1
    }
}

# Выбор режима
Write-Host "Выберите режим запуска:" -ForegroundColor Cyan
Write-Host "1) Production (оптимизированный, без hot reload)" -ForegroundColor White
Write-Host "2) Development (с hot reload для разработки)" -ForegroundColor White
$mode = Read-Host "Введите номер (1 или 2)"

switch ($mode) {
    "1" {
        $composeFile = "docker-compose.yml"
        Write-Host ""
        Write-Host "🔨 Сборка production образов..." -ForegroundColor Yellow
        & $composeCmd.Split(' ') build
        
        Write-Host ""
        Write-Host "🚀 Запуск сервисов..." -ForegroundColor Yellow
        & $composeCmd.Split(' ') up -d
        
        Write-Host ""
        Write-Host "⏳ Ожидание готовности сервисов..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Host "✅ Сервисы запущены!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Компоненты:" -ForegroundColor Cyan
        Write-Host "  • Backend: http://localhost:3000" -ForegroundColor White
        Write-Host "  • Frontend: http://localhost:5173" -ForegroundColor White
        Write-Host "  • PostgreSQL: localhost:5432" -ForegroundColor White
        Write-Host ""
        Write-Host "Просмотр логов: $composeCmd logs -f" -ForegroundColor Gray
        Write-Host "Остановка: $composeCmd down" -ForegroundColor Gray
    }
    "2" {
        $composeFile = "docker-compose.dev.yml"
        Write-Host ""
        Write-Host "🔨 Сборка development образов..." -ForegroundColor Yellow
        & $composeCmd.Split(' ') -f docker-compose.dev.yml build
        
        Write-Host ""
        Write-Host "🚀 Запуск сервисов в dev режиме..." -ForegroundColor Yellow
        & $composeCmd.Split(' ') -f docker-compose.dev.yml up -d
        
        Write-Host ""
        Write-Host "⏳ Ожидание готовности сервисов..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Host "✅ Сервисы запущены в dev режиме!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Компоненты:" -ForegroundColor Cyan
        Write-Host "  • Backend: http://localhost:3000 (hot reload)" -ForegroundColor White
        Write-Host "  • Frontend: http://localhost:5173 (hot reload)" -ForegroundColor White
        Write-Host "  • PostgreSQL: localhost:5432" -ForegroundColor White
        Write-Host ""
        Write-Host "Просмотр логов: $composeCmd -f docker-compose.dev.yml logs -f" -ForegroundColor Gray
        Write-Host "Остановка: $composeCmd -f docker-compose.dev.yml down" -ForegroundColor Gray
    }
    default {
        Write-Host "❌ Неверный выбор" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Полезные команды:" -ForegroundColor Cyan
Write-Host "  • Логи: $composeCmd logs -f" -ForegroundColor White
Write-Host "  • Статус: $composeCmd ps" -ForegroundColor White
Write-Host "  • Остановка: $composeCmd down" -ForegroundColor White
Write-Host "  • Перезапуск: $composeCmd restart" -ForegroundColor White
Write-Host ""

