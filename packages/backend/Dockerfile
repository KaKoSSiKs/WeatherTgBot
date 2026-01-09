# Backend Dockerfile
# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы конфигурации workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Копируем файлы конфигурации backend
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/prisma ./packages/backend/prisma

# Устанавливаем pnpm
RUN npm install -g pnpm@9.0.0

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY packages/backend/src ./packages/backend/src

# Генерируем Prisma Client
WORKDIR /app/packages/backend
RUN pnpm prisma:generate

# Собираем проект
RUN pnpm build

# Stage 2: Production
# Используем Debian-based образ для лучшей совместимости с Prisma
FROM node:20-slim AS production

WORKDIR /app

# Устанавливаем OpenSSL для Prisma
RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Устанавливаем pnpm
RUN npm install -g pnpm@9.0.0

# Копируем package.json и устанавливаем только production зависимости
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Устанавливаем все зависимости (включая dev для prisma) ДО создания пользователя
RUN pnpm install --frozen-lockfile

# Копируем собранные файлы и Prisma schema
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma

# Генерируем Prisma Client в production (до создания пользователя)
# Это также установит Prisma engines
WORKDIR /app/packages/backend
RUN pnpm prisma:generate
WORKDIR /app

# Убеждаемся, что Prisma engines установлены и доступны
# Проверяем наличие engines и даем права на чтение
RUN chmod -R 755 /app/node_modules/.prisma 2>/dev/null || true && \
    chmod -R 755 /app/node_modules/.pnpm/@prisma+engines* 2>/dev/null || true

WORKDIR /app/packages/backend

# Создаем пользователя для безопасности
RUN groupadd -r nodejs -g 1001 && \
    useradd -r -g nodejs -u 1001 nodejs

# Даем права на чтение/выполнение Prisma engines для пользователя nodejs
RUN chown -R nodejs:nodejs /app/node_modules 2>/dev/null || true

USER nodejs

EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/index.js"]

