/*
# -----------------------------
# DATABASE CONFIGURATION
# -----------------------------
# URL для подключения к вашей базе данных PostgreSQL.
# Замените USER, PASSWORD, HOST, PORT, и DATABASE на ваши реальные данные.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

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
