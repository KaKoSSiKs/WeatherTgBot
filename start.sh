#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что скрипт запущен из корня проекта
if [ ! -f "docker-compose.yml" ]; then
    error "Скрипт должен быть запущен из корня проекта (где находится docker-compose.yml)"
    exit 1
fi

info "🚀 Запуск WeatherTgBot проекта..."

# Шаг 1: Проверка .env файла
info "📋 Проверка переменных окружения..."
if [ ! -f ".env" ]; then
    warning ".env файл не найден. Создаю шаблон..."
    cat > .env << EOF
BOT_TOKEN=ваш_токен_бота
POSTGRES_USER=weatherbot
POSTGRES_PASSWORD=weatherbot123
POSTGRES_DB=weatherbot
WEATHER_API_KEY=ваш_ключ_openweather
OPENWEATHER_API_KEY=
WEATHER_API_PROVIDER=openweathermap
WEATHER_API_LANG=ru
WEATHER_UNITS=metric
TZ=Europe/Moscow
PORT=3000
API_PORT=3001
FRONTEND_PORT=5173
NODE_ENV=production
EOF
    error "Создан шаблон .env файла. Пожалуйста, заполните его и запустите скрипт снова!"
    exit 1
fi

# Проверка обязательных переменных
source .env
if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "ваш_токен_бота" ]; then
    error "BOT_TOKEN не установлен в .env файле!"
    exit 1
fi

if [ -z "$WEATHER_API_KEY" ] || [ "$WEATHER_API_KEY" = "ваш_ключ_openweather" ]; then
    error "WEATHER_API_KEY не установлен в .env файле!"
    exit 1
fi

success "Переменные окружения проверены"

# Шаг 2: Определение контейнеризатора
info "🔍 Определение контейнеризатора..."
if command -v docker &> /dev/null && docker ps &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
    COMPOSE_CMD="docker-compose"
    info "Используется Docker"
elif command -v podman &> /dev/null; then
    DOCKER_CMD="podman"
    COMPOSE_CMD="podman-compose"
    info "Используется Podman"
else
    error "Не найден Docker или Podman!"
    exit 1
fi

# Шаг 3: Остановка и удаление старых контейнеров
info "🧹 Очистка старых контейнеров..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

# Принудительное удаление контейнеров по именам
$DOCKER_CMD rm -f weather-bot-postgres weather-bot-backend weather-bot-frontend 2>/dev/null || true

# Удаление всех контейнеров проекта
$DOCKER_CMD ps -a --filter "name=weather-bot" --format "{{.Names}}" 2>/dev/null | xargs -r $DOCKER_CMD rm -f 2>/dev/null || true

success "Старые контейнеры удалены"

# Шаг 4: Сборка и запуск контейнеров
info "🔨 Сборка и запуск контейнеров..."
$COMPOSE_CMD up -d --build

if [ $? -ne 0 ]; then
    error "Ошибка при запуске контейнеров!"
    exit 1
fi

success "Контейнеры запущены"

# Шаг 5: Ожидание готовности сервисов
info "⏳ Ожидание готовности сервисов (30 секунд)..."
sleep 5

# Проверка статуса контейнеров
info "📊 Статус контейнеров:"
$COMPOSE_CMD ps

# Шаг 6: Проверка здоровья сервисов
info "🏥 Проверка здоровья сервисов..."

# Проверка PostgreSQL
if $DOCKER_CMD exec weather-bot-postgres pg_isready -U ${POSTGRES_USER:-weatherbot} &>/dev/null; then
    success "PostgreSQL готов"
else
    warning "PostgreSQL еще не готов, подождите..."
fi

# Проверка Backend API
sleep 5
if curl -s http://localhost:${API_PORT:-3001}/health &>/dev/null; then
    success "Backend API доступен"
else
    warning "Backend API еще не готов, проверьте логи"
fi

# Проверка Frontend
sleep 2
if curl -s http://localhost:${FRONTEND_PORT:-5173}/health &>/dev/null; then
    success "Frontend доступен"
else
    warning "Frontend еще не готов, проверьте логи"
fi

# Шаг 7: Вывод информации
echo ""
success "✅ Проект запущен!"
echo ""
info "📝 Полезные команды:"
echo "  Логи backend:    $COMPOSE_CMD logs -f backend"
echo "  Логи frontend:   $COMPOSE_CMD logs -f frontend"
echo "  Логи postgres:   $COMPOSE_CMD logs -f postgres"
echo "  Статус:          $COMPOSE_CMD ps"
echo "  Остановка:       $COMPOSE_CMD down"
echo ""
info "🌐 Доступные сервисы:"
echo "  Backend API:     http://localhost:${API_PORT:-3001}"
echo "  Frontend:        http://localhost:${FRONTEND_PORT:-5173}"
echo "  PostgreSQL:      localhost:${POSTGRES_PORT:-5432}"
echo ""
info "📋 Следующие шаги:"
echo "  1. Настройте Nginx (используйте nginx.conf.container для проксирования на контейнеры)"
echo "  2. Проверьте логи: $COMPOSE_CMD logs -f backend"
echo "  3. Убедитесь, что бот отвечает в Telegram"
echo ""
