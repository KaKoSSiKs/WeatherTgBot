.PHONY: help build up down restart logs clean dev prod migrate

help: ## Показать справку
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Собрать все контейнеры
	docker-compose build

build-no-cache: ## Пересобрать все контейнеры без кэша
	docker-compose build --no-cache

rebuild: ## Пересобрать и перезапустить все контейнеры
	docker-compose up -d --build

rebuild-no-cache: ## Пересобрать без кэша и перезапустить
	docker-compose build --no-cache
	docker-compose up -d

up: ## Запустить все сервисы (production)
	docker-compose up -d

down: ## Остановить все сервисы
	docker-compose down

restart: ## Перезапустить все сервисы
	docker-compose restart

logs: ## Показать логи всех сервисов
	docker-compose logs -f

logs-backend: ## Показать логи backend
	docker-compose logs -f backend

logs-frontend: ## Показать логи frontend
	docker-compose logs -f frontend

logs-db: ## Показать логи базы данных
	docker-compose logs -f postgres

dev: ## Запустить в режиме разработки
	docker-compose -f docker-compose.dev.yml up -d

dev-build: ## Собрать dev контейнеры
	docker-compose -f docker-compose.dev.yml build

dev-rebuild: ## Пересобрать и перезапустить dev контейнеры
	docker-compose -f docker-compose.dev.yml up -d --build

dev-down: ## Остановить dev окружение
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## Показать логи dev окружения
	docker-compose -f docker-compose.dev.yml logs -f

clean: ## Удалить все контейнеры, volumes и образы
	docker-compose down -v --rmi all

migrate: ## Выполнить миграции базы данных
	docker-compose exec backend pnpm prisma migrate deploy

migrate-dev: ## Выполнить миграции в dev режиме
	docker-compose -f docker-compose.dev.yml exec backend pnpm prisma migrate deploy

prisma-studio: ## Запустить Prisma Studio
	docker-compose exec backend pnpm prisma studio

prisma-studio-dev: ## Запустить Prisma Studio в dev режиме
	docker-compose -f docker-compose.dev.yml exec backend pnpm prisma studio

shell-backend: ## Открыть shell в backend контейнере
	docker-compose exec backend sh

shell-db: ## Открыть psql в базе данных
	docker-compose exec postgres psql -U weatherbot -d weatherbot

