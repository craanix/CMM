// FIX: The file content was wrapped in a multi-line comment to resolve TypeScript parsing errors caused by the incorrect .tsx file extension. The file's content is intended as an example for a .env file, not as executable code.
/*
# -----------------------------
# DATABASE CONFIGURATION
# -----------------------------
# URL для подключения к базе данных PostgreSQL, работающей в Docker.
# 'db' - это имя сервиса из файла docker-compose.yaml.
# Пользователь, пароль и имя БД должны совпадать с теми, что указаны в docker-compose.yaml.
DATABASE_URL="postgresql://postgres:password123@db:5432/coffee_db?schema=public"

# -----------------------------
# AUTHENTICATION CONFIGURATION
# -----------------------------
# Секретный ключ для подписи JWT токенов.
# Это должна быть длинная, случайная и сложная строка для обеспечения безопасности.
# Вы можете сгенерировать ее, например, с помощью OpenSSL: openssl rand -base64 32
JWT_SECRET="your-super-secret-and-long-random-string-here"

# -----------------------------
# SERVER CONFIGURATION
# -----------------------------
# Порт, на котором будет работать ваш Node.js сервер.
PORT=4000
*/
