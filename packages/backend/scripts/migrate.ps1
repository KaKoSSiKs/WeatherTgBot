# Скрипт для ручного запуска миграций Prisma (PowerShell)
# Используется, если миграции не применяются автоматически при сборке контейнера

$ErrorActionPreference = "Stop"

Write-Host "🔄 Running Prisma migrations manually..." -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Проверяем наличие DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL is not set" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL environment variable" -ForegroundColor Yellow
    exit 1
}

# Проверяем подключение к БД
Write-Host "⏳ Checking database connection..." -ForegroundColor Yellow
try {
    pnpm prisma db pull --schema=./prisma/schema.prisma 2>&1 | Out-Null
} catch {
    Write-Host "⚠️  Warning: Could not connect to database, but continuing..." -ForegroundColor Yellow
}

# Применяем миграции
Write-Host "📦 Applying migrations..." -ForegroundColor Yellow
pnpm prisma migrate deploy --schema=./prisma/schema.prisma

Write-Host "✅ Migrations applied successfully!" -ForegroundColor Green

# Генерируем Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
pnpm prisma generate --schema=./prisma/schema.prisma

Write-Host "✅ All done!" -ForegroundColor Green

