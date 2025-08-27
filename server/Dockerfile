# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# Copy prisma schema for runtime
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000

# Command to run the application
CMD ["npm", "start"]
