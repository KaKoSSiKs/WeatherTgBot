# WeatherTgBot Monorepo

Монорепозиторий для погодного Telegram-бота с уведомлениями и Mini App.

## Состав
- `packages/backend/` — Telegram-бот (TypeScript, Telegraf), Prisma + PostgreSQL, планировщик уведомлений
- `apps/miniapp/` — Mini App (Vite + React + TypeScript) — scaffold

## Требования
- Node.js 20+
- pnpm 9+

## Быстрый старт

### 🐳 Запуск в Docker (рекомендуется)

Самый простой способ запустить весь проект:

```bash
# Windows (PowerShell)
.\docker-start.ps1

# Linux/Mac
./docker-start.sh

# Или вручную
docker-compose up -d
```

Подробнее: [README.DOCKER.md](./README.DOCKER.md) и [DOCKER.md](./DOCKER.md)

### 💻 Локальная разработка

1. Установите зависимости:
```bash
pnpm install
```
2. Настройте окружение:
- Скопируйте `.env.example` в `.env`
- Заполните переменные: `BOT_TOKEN`, `WEATHER_API_KEY`
3. Настройка БД (PostgreSQL + Prisma):
```bash
pnpm -F backend prisma:generate
pnpm -F backend prisma:migrate
```
4. Запуск бота в dev-режиме:
```bash
pnpm -F backend dev
```

## Переменные окружения
См. `.env.example` в корне.

## Дорожная карта (связана с требованиями)
- План минимум:
  - Местоположения: несколько городов, геолокация, поиск/дизамбигуация
  - Уведомления: расписание (ежедневно/разово/по дням), триггеры по погоде, настраиваемое время
  - Параметры погоды: температура, явления, ветер, давление, влажность, УФ, восход/закат
  - Умные оповещения: ухудшение, резкие изменения, экстремальные явления
  - Редактирование настроек: просмотр/вкл-выкл/сброс/редактирование мест
- План максимум:
  - Форматы (единицы, язык), названия уведомлений, детализация, рекомендации по одежде, Mini App UI

## Скрипты
- `pnpm -F backend dev` — локальная разработка бота (ts-node-dev)
- `pnpm -F backend build && pnpm -F backend start` — прод-сборка и запуск

## Лицензия
MIT
