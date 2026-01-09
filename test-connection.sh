#!/bin/bash
# Скрипт для диагностики подключения между контейнерами

echo "=========================================="
echo "=== ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БД ==="
echo "=========================================="
echo ""

echo "=== 1. Статус контейнеров ==="
docker-compose ps
echo ""

echo "=== 2. Проверка сети Docker/Podman ==="
# Определяем, используется ли Docker или Podman
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
    echo "Используется: Docker"
elif command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
    echo "Используется: Podman"
else
    echo "Ошибка: не найден Docker или Podman"
    exit 1
fi

NETWORK_NAME=$(docker-compose ps -q postgres 2>/dev/null | xargs $DOCKER_CMD inspect --format='{{range $net, $v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
if [ -z "$NETWORK_NAME" ]; then
    echo "⚠️  Не удалось найти сеть автоматически"
    echo "Все сети:"
    $DOCKER_CMD network ls | grep -E "weather|bridge"
    echo ""
    echo "Попробуем найти сеть вручную..."
    NETWORK_NAME="weather-bot-network"
else
    echo "✅ Найдена сеть: $NETWORK_NAME"
fi

echo ""
echo "Контейнеры в сети $NETWORK_NAME:"
$DOCKER_CMD network inspect $NETWORK_NAME --format='{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}' 2>/dev/null || echo "Не удалось получить информацию о сети"
echo ""

echo "=== 3. Проверка PostgreSQL изнутри контейнера postgres ==="
$DOCKER_CMD exec weather-bot-postgres pg_isready -U weatherbot -v 2>&1 || echo "❌ PostgreSQL не готов внутри своего контейнера"
echo ""

echo "=== 4. IP адреса контейнеров ==="
POSTGRES_IP=$($DOCKER_CMD inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' weather-bot-postgres 2>/dev/null)
BACKEND_IP=$($DOCKER_CMD inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' weather-bot-backend 2>/dev/null)
echo "PostgreSQL IP: $POSTGRES_IP"
echo "Backend IP: $BACKEND_IP"
echo ""

echo "=== 5. Проверка DNS резолюции имени 'postgres' из backend ==="
echo "Попытка 1: nslookup"
$DOCKER_CMD exec weather-bot-backend nslookup postgres 2>&1 || echo "nslookup не доступен"
echo ""
echo "Попытка 2: getent hosts"
$DOCKER_CMD exec weather-bot-backend getent hosts postgres 2>&1 || echo "getent не доступен"
echo ""
echo "Попытка 3: ping"
$DOCKER_CMD exec weather-bot-backend ping -c 2 postgres 2>&1 | head -5 || echo "ping не доступен"
echo ""

echo "=== 6. Проверка TCP подключения к PostgreSQL ==="
echo "Попытка подключения по имени 'postgres':"
$DOCKER_CMD exec weather-bot-backend sh -c "timeout 3 bash -c 'cat < /dev/null > /dev/tcp/postgres/5432' 2>&1 && echo '✅ TCP connection OK' || echo '❌ TCP connection FAILED'"
echo ""
if [ ! -z "$POSTGRES_IP" ]; then
    echo "Попытка подключения по IP $POSTGRES_IP:"
    $DOCKER_CMD exec weather-bot-backend sh -c "timeout 3 bash -c 'cat < /dev/null > /dev/tcp/$POSTGRES_IP/5432' 2>&1 && echo '✅ TCP connection OK' || echo '❌ TCP connection FAILED'"
    echo ""
fi

echo "=== 7. Попытка pg_isready из backend ==="
echo "По имени 'postgres':"
$DOCKER_CMD exec weather-bot-backend pg_isready -h postgres -p 5432 -U weatherbot -v 2>&1 || echo "❌ pg_isready failed"
echo ""
if [ ! -z "$POSTGRES_IP" ]; then
    echo "По IP $POSTGRES_IP:"
    $DOCKER_CMD exec weather-bot-backend pg_isready -h $POSTGRES_IP -p 5432 -U weatherbot -v 2>&1 || echo "❌ pg_isready failed"
    echo ""
fi

echo "=== 8. Проверка переменных окружения в backend ==="
echo "DATABASE_URL:"
$DOCKER_CMD exec weather-bot-backend env | grep DATABASE_URL || echo "Не найдено"
echo ""
echo "POSTGRES_* переменные:"
$DOCKER_CMD exec weather-bot-backend env | grep POSTGRES || echo "Не найдено"
echo ""

echo "=== 9. Логи PostgreSQL (последние 20 строк) ==="
docker-compose logs --tail 20 postgres 2>&1
echo ""

echo "=== 10. Логи Backend (последние 30 строк) ==="
docker-compose logs --tail 30 backend 2>&1
echo ""

echo "=== 11. Проверка конфигурации PostgreSQL ==="
echo "Проверяем, на каких интерфейсах слушает PostgreSQL:"
$DOCKER_CMD exec weather-bot-postgres sh -c "netstat -tlnp 2>/dev/null | grep 5432 || ss -tlnp 2>/dev/null | grep 5432 || echo 'Не удалось проверить'"
echo ""

echo "=== 12. Проверка подключения через psql ==="
echo "Попытка подключения из backend контейнера:"
$DOCKER_CMD exec weather-bot-backend sh -c "PGPASSWORD=weatherbot123 psql -h postgres -p 5432 -U weatherbot -d weatherbot -c 'SELECT version();' 2>&1" || echo "❌ Подключение через psql не удалось"
echo ""

echo "=========================================="
echo "=== КОНЕЦ ДИАГНОСТИКИ ==="
echo "=========================================="

