# Frontend (Mini App) Dockerfile
# Multi-stage build для оптимизации размера образа

# Stage 1: Build
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app

# Устанавливаем pnpm
RUN npm install -g pnpm@9.0.0

# Копируем файлы конфигурации workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Копируем файлы конфигурации miniapp
COPY apps/miniapp/package.json ./apps/miniapp/
COPY apps/miniapp/tsconfig.json ./apps/miniapp/
COPY apps/miniapp/index.html ./apps/miniapp/
COPY apps/miniapp/tailwind.config.cjs ./apps/miniapp/
COPY apps/miniapp/postcss.config.cjs ./apps/miniapp/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY apps/miniapp/src ./apps/miniapp/src

# Собираем проект
WORKDIR /app/apps/miniapp
RUN pnpm build

# Stage 2: Production (nginx для статики)
FROM docker.io/library/nginx:alpine AS production

# Копируем собранные файлы
COPY --from=builder /app/apps/miniapp/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf

# Устанавливаем права на файлы
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Nginx должен запускаться от root для привязки к порту 80
# но worker процессы будут работать от nginx пользователя

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
