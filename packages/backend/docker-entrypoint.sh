#!/bin/sh
set -e

echo "🚀 Starting Weather Bot Backend..."

# Ждем готовности базы данных
echo "⏳ Waiting for database to be ready..."
POSTGRES_USER="${POSTGRES_USER:-weather_user}"
until pg_isready -h postgres -p 5432 -U "$POSTGRES_USER" > /dev/null 2>&1; do
  echo "   Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready"

# Переходим в рабочую директорию
cd /app/packages/backend

# Применяем миграции
echo "📦 Running Prisma migrations..."
# Используем pnpm для запуска prisma (в runtime stage prisma не установлен глобально)
pnpm prisma:migrate:deploy || {
  echo "⚠️  Migration failed, trying alternative method..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "⚠️  Migration failed, but continuing..."
  }
}

# Генерируем Prisma Client (обязательно перед запуском)
echo "🔧 Generating Prisma Client..."
# Используем pnpm для запуска prisma (в runtime stage prisma не установлен глобально)
pnpm prisma:generate || {
  echo "⚠️  Prisma generate failed, trying alternative method..."
  npx prisma generate --schema=./prisma/schema.prisma || {
    echo "⚠️  Prisma generate failed, but continuing..."
  }
}

# Запускаем приложение
echo "🎯 Starting application..."
exec "$@"

