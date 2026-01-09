#!/bin/bash
# Скрипт для исправления проблем с сетью между контейнерами

echo "=== Исправление проблем с сетью ==="

# Определяем, используется ли Docker или Podman
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
    COMPOSE_CMD="docker-compose"
    echo "Используется: Docker"
elif command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    echo "Используется: Podman"
else
    echo "Ошибка: не найден Docker или Podman"
    exit 1
fi

echo ""
echo "1. Останавливаем все контейнеры..."
$COMPOSE_CMD down

echo ""
echo "2. Удаляем старую сеть (если есть)..."
$DOCKER_CMD network rm weather-bot-network 2>/dev/null || echo "Сеть не существует или уже удалена"

echo ""
echo "3. Создаем новую сеть с явным именем..."
$DOCKER_CMD network create weather-bot-network 2>/dev/null || echo "Сеть уже существует"

echo ""
echo "4. Проверяем сеть..."
$DOCKER_CMD network inspect weather-bot-network --format='{{.Name}}' 2>/dev/null && echo "✅ Сеть создана" || echo "❌ Ошибка создания сети"

echo ""
echo "5. Запускаем контейнеры заново..."
$COMPOSE_CMD up -d

echo ""
echo "6. Ждем 5 секунд для инициализации..."
sleep 5

echo ""
echo "7. Проверяем, что контейнеры в одной сети..."
$DOCKER_CMD network inspect weather-bot-network --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null

echo ""
echo "8. Проверяем DNS резолюцию из backend..."
$DOCKER_CMD exec weather-bot-backend getent hosts postgres 2>&1 || echo "❌ DNS все еще не работает"

echo ""
echo "=== Готово! Проверьте логи: $COMPOSE_CMD logs -f backend ==="

