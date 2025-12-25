#!/bin/sh
# Скрипт для ручного запуска миграций Prisma
# Используется, если миграции не применяются автоматически при сборке контейнера

set -e

echo "🔄 Running Prisma migrations manually..."

cd "$(dirname "$0")/.."

# Проверяем наличие DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  echo "Please set DATABASE_URL environment variable"
  exit 1
fi

# Проверяем подключение к БД
echo "⏳ Checking database connection..."
pnpm prisma db pull --schema=./prisma/schema.prisma > /dev/null 2>&1 || {
  echo "⚠️  Warning: Could not connect to database, but continuing..."
}

# Применяем миграции
echo "📦 Applying migrations..."
pnpm prisma migrate deploy --schema=./prisma/schema.prisma

echo "✅ Migrations applied successfully!"

# Генерируем Prisma Client
echo "🔧 Generating Prisma Client..."
pnpm prisma generate --schema=./prisma/schema.prisma

echo "✅ All done!"

