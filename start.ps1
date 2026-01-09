# Скрипт запуска WeatherTgBot (Telegram бот, бэкенд, фронтенд)
# Использование: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WeatherTgBot - Запуск всех сервисов" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: pnpm не найден. Установите pnpm: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# Проверка наличия .env файла
if (-not (Test-Path "packages\backend\.env") -and -not (Test-Path ".env")) {
    Write-Host "Предупреждение: Файл .env не найден. Убедитесь, что он настроен." -ForegroundColor Yellow
}

# Проверка и генерация Prisma клиента
Write-Host "[1/4] Проверка Prisma клиента..." -ForegroundColor Yellow
$prismaClientFound = $false
$prismaClientDirs = Get-ChildItem -Path "node_modules\.pnpm" -Filter "@prisma+client*" -Directory -ErrorAction SilentlyContinue
if ($prismaClientDirs) {
    foreach ($dir in $prismaClientDirs) {
        $clientPath = Join-Path $dir.FullName "node_modules\@prisma\client\index.js"
        if (Test-Path $clientPath) {
            $prismaClientFound = $true
            break
        }
    }
}

if (-not $prismaClientFound) {
    Write-Host "  Prisma клиент не найден. Генерация..." -ForegroundColor Yellow
    Set-Location "packages\backend"
    pnpm prisma:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Ошибка: Не удалось сгенерировать Prisma клиент." -ForegroundColor Red
        Set-Location "..\.."
        exit 1
    }
    Set-Location "..\.."
    Write-Host "  Prisma клиент успешно сгенерирован." -ForegroundColor Green
} else {
    Write-Host "  Prisma клиент найден." -ForegroundColor Green
}

# Проверка и создание базы данных
Write-Host "[2/4] Проверка базы данных..." -ForegroundColor Yellow
$backendDir = Join-Path $PSScriptRoot "packages\backend"
$dbFiles = Get-ChildItem -Path "$backendDir\prisma" -Filter "*.db" -ErrorAction SilentlyContinue
if (-not $dbFiles) {
    Write-Host "  База данных не найдена. Выполнение миграций..." -ForegroundColor Yellow
    Push-Location $backendDir
    try {
        # Устанавливаем DATABASE_URL по умолчанию, если не задан
        if (-not $env:DATABASE_URL) {
            $env:DATABASE_URL = "file:./prisma/dev.db"
        }
        pnpm prisma migrate deploy
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Попытка выполнить dev миграции..." -ForegroundColor Yellow
            pnpm prisma migrate dev
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Ошибка: Не удалось выполнить миграции базы данных." -ForegroundColor Red
                exit 1
            }
        }
        Write-Host "  База данных успешно создана." -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    # Проверяем, что все миграции применены
    Push-Location $backendDir
    try {
        if (-not $env:DATABASE_URL) {
            $env:DATABASE_URL = "file:./prisma/dev.db"
        }
        $migrateStatus = pnpm prisma migrate status 2>&1
        if ($LASTEXITCODE -ne 0 -or $migrateStatus -match "following.*not.*applied") {
            Write-Host "  Обнаружены неприменённые миграции. Применение..." -ForegroundColor Yellow
            pnpm prisma migrate deploy
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  Попытка выполнить dev миграции..." -ForegroundColor Yellow
                pnpm prisma migrate dev
            }
        } else {
            Write-Host "  База данных найдена и актуальна." -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Запуск компонентов..." -ForegroundColor Green
Write-Host ""

# Функция для запуска процесса в новом окне
function Start-ProcessInWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory
    )
    
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; Write-Host '$Title' -ForegroundColor Cyan; $Command" -PassThru
    return $process
}

# Запуск Telegram бота (бэкенд)
Write-Host "[3/4] Запуск Telegram бота (бэкенд)..." -ForegroundColor Yellow
$botProcess = Start-ProcessInWindow -Title "Telegram Bot (Backend)" -Command "pnpm dev" -WorkingDirectory "$PSScriptRoot\packages\backend"

Start-Sleep -Seconds 2

# Запуск фронтенда (Mini App)
Write-Host "[4/4] Запуск фронтенда (Mini App)..." -ForegroundColor Yellow
$frontendProcess = Start-ProcessInWindow -Title "Frontend (Mini App)" -Command "pnpm dev" -WorkingDirectory "$PSScriptRoot\apps\miniapp"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Все сервисы запущены!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Компоненты:" -ForegroundColor Cyan
Write-Host "  • Telegram бот (бэкенд): запущен" -ForegroundColor White
Write-Host "  • Фронтенд (Mini App): запущен" -ForegroundColor White
Write-Host ""
Write-Host "Для остановки закройте окна PowerShell или нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Ожидание завершения (Ctrl+C)
try {
    Write-Host "Нажмите Ctrl+C для остановки всех сервисов..." -ForegroundColor Gray
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host ""
    Write-Host "Остановка сервисов..." -ForegroundColor Yellow
    
    # Попытка остановить процессы
    if ($botProcess -and -not $botProcess.HasExited) {
        Stop-Process -Id $botProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Все сервисы остановлены." -ForegroundColor Green
    exit 0
}

