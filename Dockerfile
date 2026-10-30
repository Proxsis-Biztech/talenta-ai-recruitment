# ─── Multi-stage Dockerfile for Talenta+ AI Recruitment Platform ───

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
ENV NODE_ENV=development
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --include=dev

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
ENV NODE_ENV=development
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --include=dev

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/backend/prisma/dev.db?_journal_mode=WAL"

# Install openssl for Prisma binary compatibility
RUN apk add --no-cache openssl

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Ensure uploads directory exists
RUN mkdir -p /app/backend/uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
