#!/bin/bash
# Скрипт для быстрого запуска Docker окружения

set -e

echo "========================================"
echo "  WeatherTgBot - Docker Setup"
echo "========================================"
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Ошибка: Docker не установлен"
    echo "Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Ошибка: Docker Compose не установлен"
    echo "Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден"
    if [ -f ".env.example" ]; then
        echo "Создаю .env из .env.example..."
        cp .env.example .env
        echo "✅ Файл .env создан. Пожалуйста, заполните необходимые переменные:"
        echo "   - BOT_TOKEN"
        echo "   - WEATHER_API_KEY"
        echo ""
        read -p "Нажмите Enter после заполнения .env файла..."
    else
        echo "❌ Файл .env.example не найден"
        exit 1
    fi
fi

# Выбор режима
echo "Выберите режим запуска:"
echo "1) Production (оптимизированный, без hot reload)"
echo "2) Development (с hot reload для разработки)"
read -p "Введите номер (1 или 2): " mode

case $mode in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo ""
        echo "🔨 Сборка production образов..."
        docker-compose build
        
        echo ""
        echo "🚀 Запуск сервисов..."
        docker-compose up -d
        
        echo ""
        echo "⏳ Ожидание готовности сервисов..."
        sleep 5
        
        echo ""
        echo "✅ Сервисы запущены!"
        echo ""
        echo "Компоненты:"
        echo "  • Backend: http://localhost:3000"
        echo "  • Frontend: http://localhost:5173"
        echo "  • PostgreSQL: localhost:5432"
        echo ""
        echo "Просмотр логов: docker-compose logs -f"
        echo "Остановка: docker-compose down"
        ;;
    2)
        COMPOSE_FILE="docker-compose.dev.yml"
        echo ""
        echo "🔨 Сборка development образов..."
        docker-compose -f docker-compose.dev.yml build
        
        echo ""
        echo "🚀 Запуск сервисов в dev режиме..."
        docker-compose -f docker-compose.dev.yml up -d
        
        echo ""
        echo "⏳ Ожидание готовности сервисов..."
        sleep 5
        
        echo ""
        echo "✅ Сервисы запущены в dev режиме!"
        echo ""
        echo "Компоненты:"
        echo "  • Backend: http://localhost:3000 (hot reload)"
        echo "  • Frontend: http://localhost:5173 (hot reload)"
        echo "  • PostgreSQL: localhost:5432"
        echo ""
        echo "Просмотр логов: docker-compose -f docker-compose.dev.yml logs -f"
        echo "Остановка: docker-compose -f docker-compose.dev.yml down"
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "📋 Полезные команды:"
echo "  • Логи: docker-compose logs -f"
echo "  • Статус: docker-compose ps"
echo "  • Остановка: docker-compose down"
echo "  • Перезапуск: docker-compose restart"
echo ""

