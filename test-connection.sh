#!/bin/bash
# Скрипт для тестирования подключения между контейнерами

echo "=== 1. Проверка статуса контейнеров ==="
docker-compose ps

echo ""
echo "=== 2. Проверка сети ==="
NETWORK_NAME=$(docker-compose ps -q postgres | xargs docker inspect --format='{{range $net, $v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
if [ -z "$NETWORK_NAME" ]; then
    echo "Не удалось найти сеть. Проверяем все сети..."
    docker network ls | grep weather
else
    echo "Сеть: $NETWORK_NAME"
    echo "Контейнеры в сети:"
    docker network inspect $NETWORK_NAME --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null
fi

echo ""
echo "=== 3. Проверка PostgreSQL изнутри контейнера ==="
docker exec weather-bot-postgres pg_isready -U weatherbot -v

echo ""
echo "=== 4. Проверка DNS резолюции из backend ==="
docker exec weather-bot-backend nslookup postgres 2>&1 || docker exec weather-bot-backend getent hosts postgres 2>&1 || echo "DNS resolution failed"

echo ""
echo "=== 5. Проверка TCP подключения к PostgreSQL из backend ==="
docker exec weather-bot-backend sh -c "timeout 3 bash -c 'cat < /dev/null > /dev/tcp/postgres/5432' 2>&1 && echo 'TCP connection OK' || echo 'TCP connection FAILED'"

echo ""
echo "=== 6. Попытка pg_isready из backend ==="
docker exec weather-bot-backend pg_isready -h postgres -p 5432 -U weatherbot -v

echo ""
echo "=== 7. Логи PostgreSQL (последние 10 строк) ==="
docker-compose logs --tail 10 postgres

echo ""
echo "=== 8. Логи Backend (последние 10 строк) ==="
docker-compose logs --tail 10 backend

