#!/bin/bash
# Скрипт запуска WeatherTgBot (Telegram бот, бэкенд, фронтенд)
# Использование: ./start.sh

echo "========================================"
echo "  WeatherTgBot - Запуск всех сервисов"
echo "========================================"
echo ""

# Получаем директорию скрипта (должно быть в начале!)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Переходим в директорию скрипта
cd "$SCRIPT_DIR"

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Ошибка: pnpm не найден. Установите pnpm: npm install -g pnpm"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f "bot/.env" ] && [ ! -f ".env" ]; then
    echo "Предупреждение: Файл .env не найден. Убедитесь, что он настроен."
fi

# Проверка и генерация Prisma клиента
echo "[1/4] Проверка Prisma клиента..."
PRISMA_FOUND=0
if [ -d "node_modules/.pnpm" ]; then
    for dir in node_modules/.pnpm/@prisma+client*; do
        if [ -f "$dir/node_modules/@prisma/client/index.js" ]; then
            PRISMA_FOUND=1
            break
        fi
    done
fi

if [ $PRISMA_FOUND -eq 0 ]; then
    echo "  Prisma клиент не найден. Генерация..."
    cd bot || exit 1
    pnpm prisma:generate
    if [ $? -ne 0 ]; then
        echo "Ошибка: Не удалось сгенерировать Prisma клиент."
        exit 1
    fi
    cd .. || exit 1
    echo "  Prisma клиент успешно сгенерирован."
else
    echo "  Prisma клиент найден."
fi

# Проверка и создание базы данных
echo "[2/4] Проверка базы данных..."
if [ ! -f "bot/prisma/dev.db" ]; then
    echo "  База данных не найдена. Выполнение миграций..."
    cd bot || exit 1
    # Устанавливаем DATABASE_URL по умолчанию, если не задан
    export DATABASE_URL="${DATABASE_URL:-file:./prisma/dev.db}"
    pnpm prisma migrate deploy
    if [ $? -ne 0 ]; then
        echo "  Попытка выполнить dev миграции..."
        pnpm prisma migrate dev --name init
        if [ $? -ne 0 ]; then
            echo "Ошибка: Не удалось выполнить миграции базы данных."
            exit 1
        fi
    fi
    cd .. || exit 1
    echo "  База данных успешно создана."
else
    echo "  База данных найдена."
fi

echo ""
echo "Запуск компонентов..."
echo ""

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "Остановка сервисов..."
    kill $BOT_PID $FRONTEND_PID 2>/dev/null
    wait $BOT_PID $FRONTEND_PID 2>/dev/null
    echo "Все сервисы остановлены."
    exit 0
}

# Устанавливаем обработчик сигналов
trap cleanup SIGINT SIGTERM

# Запуск Telegram бота (бэкенд) в фоне
echo "[3/4] Запуск Telegram бота (бэкенд)..."
(cd bot && pnpm dev) &
BOT_PID=$!

sleep 2

# Запуск фронтенда (Mini App) в фоне
echo "[4/4] Запуск фронтенда (Mini App)..."
(cd apps/miniapp && pnpm dev) &
FRONTEND_PID=$!

sleep 2

echo ""
echo "========================================"
echo "  Все сервисы запущены!"
echo "========================================"
echo ""
echo "Компоненты:"
echo "  • Telegram бот (бэкенд): запущен (PID: $BOT_PID)"
echo "  • Фронтенд (Mini App): запущен (PID: $FRONTEND_PID)"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Ожидание завершения
wait

