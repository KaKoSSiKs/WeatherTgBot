#!/bin/bash
# Скрипт для диагностики подключения к базе данных

echo "=== Проверка контейнеров ==="
docker-compose ps

echo ""
echo "=== Проверка сети Docker ==="
docker network ls | grep weather-bot

echo ""
echo "=== Проверка PostgreSQL контейнера ==="
docker logs --tail 20 weather-bot-postgres

echo ""
echo "=== Попытка подключения к PostgreSQL из backend контейнера ==="
docker exec weather-bot-backend pg_isready -h postgres -p 5432 -U weatherbot -v

echo ""
echo "=== Проверка переменных окружения в backend ==="
docker exec weather-bot-backend env | grep -E "POSTGRES|DATABASE"

echo ""
echo "=== Проверка DNS разрешения ==="
docker exec weather-bot-backend nslookup postgres || docker exec weather-bot-backend ping -c 2 postgres

