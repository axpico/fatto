# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Placeholder values so env validation passes during the build's page-data collection step;
# nothing actually connects to these during `next build`. Real values come from docker-compose at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV ANTHROPIC_API_KEY="build-placeholder"
RUN npm run build

# Tesseract data downloaded at build time so OCR works without outbound internet at runtime.
FROM alpine:3.20 AS tessdata
RUN apk add --no-cache curl && \
    mkdir -p /tessdata && \
    curl -fL -o /tessdata/ita.traineddata https://github.com/tesseract-ocr/tessdata_fast/raw/main/ita.traineddata && \
    curl -fL -o /tessdata/eng.traineddata https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=tessdata /tessdata /app/tessdata
ENV TESSDATA_PREFIX=/app/tessdata

EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && npm run start"
