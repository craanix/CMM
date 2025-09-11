# Dockerfile (для фронтенда)

# --- STAGE 1: Builder ---
# Этот этап устанавливает все зависимости (включая dev) и собирает приложение.
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы package.json и устанавливаем все зависимости.
COPY package*.json ./
RUN npm install

# Копируем остальной исходный код.
COPY . .

# Собираем production-сборку.
RUN npm run build

# --- STAGE 2: Nginx Web Server ---
# Этот этап создает финальный, легковесный образ для раздачи статики.
FROM nginx:stable-alpine

# Копируем кастомную конфигурацию Nginx. Она настроит прокси для API.
COPY nginx/nginx.conf.json /etc/nginx/conf.d/default.conf

# Копируем собранные статические файлы из builder-этапа.
COPY --from=builder /app/dist /usr/share/nginx/html

# Открываем порт 80, который слушает Nginx
EXPOSE 80

# Команда для запуска Nginx
CMD ["nginx", "-g", "daemon off;"]
