#!/bin/bash
# Скрипт для проверки логов backend и диагностики проблемы

echo "=== ЛОГИ BACKEND (последние 50 строк) ==="
docker-compose logs --tail 50 backend

echo ""
echo "=== ПОПЫТКА ПОДКЛЮЧЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ ==="
echo "Запускаем тест подключения из backend контейнера..."
echo ""

# Определяем, используется ли Docker или Podman
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
elif command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
else
    echo "Ошибка: не найден Docker или Podman"
    exit 1
fi

echo "1. Проверка DNS:"
$DOCKER_CMD exec weather-bot-backend getent hosts postgres 2>&1 || echo "   ❌ DNS не работает"

echo ""
echo "2. Проверка TCP подключения:"
$DOCKER_CMD exec weather-bot-backend sh -c "timeout 2 bash -c 'cat < /dev/null > /dev/tcp/postgres/5432' 2>&1" && echo "   ✅ TCP OK" || echo "   ❌ TCP FAILED"

echo ""
echo "3. Проверка pg_isready:"
$DOCKER_CMD exec weather-bot-backend pg_isready -h postgres -p 5432 -U weatherbot -v 2>&1

echo ""
echo "4. Попытка подключения через psql:"
$DOCKER_CMD exec weather-bot-backend sh -c "PGPASSWORD=weatherbot123 psql -h postgres -p 5432 -U weatherbot -d weatherbot -c 'SELECT 1;' 2>&1" && echo "   ✅ Подключение успешно!" || echo "   ❌ Подключение не удалось"

echo ""
echo "=== СТАТУС КОНТЕЙНЕРОВ ==="
docker-compose ps

