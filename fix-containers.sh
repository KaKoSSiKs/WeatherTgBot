#!/bin/bash
# Скрипт для принудительного удаления контейнеров перед запуском

echo "Останавливаем и удаляем все контейнеры проекта..."

# Определяем, используется ли Docker или Podman
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    DOCKER_CMD="docker"
elif command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
else
    echo "Ошибка: не найдены Docker или Podman"
    exit 1
fi

# Останавливаем через docker-compose
docker-compose down --remove-orphans 2>/dev/null || true

# Принудительно удаляем контейнеры по именам
echo "Принудительное удаление контейнеров..."
$DOCKER_CMD rm -f weather-bot-postgres weather-bot-backend weather-bot-frontend 2>/dev/null || true

# Удаляем все контейнеры проекта (если есть)
$DOCKER_CMD ps -a --filter "name=weather-bot" --format "{{.Names}}" | xargs -r $DOCKER_CMD rm -f 2>/dev/null || true

echo "Контейнеры удалены. Теперь можно запускать: docker-compose up -d --build"

