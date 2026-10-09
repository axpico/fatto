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

# whisper.cpp compilato da sorgente: C++ puro, compila identico su musl o glibc (a differenza di
# faster-whisper/ctranslate2, che pubblica solo wheel manylinux/glibc e su Alpine richiederebbe
# o una compilazione ctranslate2 molto più fragile, o cambiare base image per tutto il progetto).
# -DBUILD_SHARED_LIBS=OFF produce un unico binario statico, niente .so da inseguire tra gli stage.
FROM alpine:3.20 AS whisper
RUN apk add --no-cache build-base cmake git curl
# pinned release: an unpinned `main` made builds non-reproducible
ARG WHISPER_CPP_VERSION=v1.9.5
RUN git clone --depth 1 --branch ${WHISPER_CPP_VERSION} https://github.com/ggml-org/whisper.cpp /whisper
RUN cmake -B /whisper/build -S /whisper -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF && \
    cmake --build /whisper/build -j --config Release --target whisper-cli
RUN mkdir -p /models && \
    curl -fL -o /models/ggml-small-q5_1.bin \
      https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# ffmpeg: estrazione audio dal reel (WAV mono 16kHz atteso da whisper.cpp).
# python3/pip: yt-dlp è puro Python (nessuna estensione compilata), installarlo qui via pip prende
# sempre l'ultima release PyPI — a differenza del pacchetto apk (spesso indietro: l'estrattore
# Instagram di yt-dlp si rompe spesso e serve restare aggiornati) o di un binario precompilato da
# GitHub Releases (rischio di link glibc su un'immagine musl). Installato direttamente nel runner,
# non in uno stage separato, per evitare di dover ricostruire a mano l'ambiente Python tra stage.
RUN apk add --no-cache ffmpeg python3 py3-pip && \
    pip install --no-cache-dir --break-system-packages yt-dlp
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# .next owned by the runtime user: next writes its cache there (images, fetch cache)
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=tessdata /tessdata /app/tessdata
ENV TESSDATA_PREFIX=/app/tessdata
COPY --from=whisper /whisper/build/bin/whisper-cli /usr/local/bin/whisper-cli
COPY --from=whisper /models/ggml-small-q5_1.bin /app/whisper-models/ggml-small-q5_1.bin

# Non-root at runtime. Only .next and the uploads dir need to be writable; node_modules stays
# root-owned and read-only. Upgrading from an image that ran as root: the existing uploads volume
# is root-owned, fix it once with
#   docker compose run --rm --user root app chown -R node:node /data/uploads
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node

EXPOSE 3000
# exec: next becomes PID 1's direct child target of SIGTERM, so `docker stop` shuts down promptly
CMD ["sh", "-c", "npx prisma migrate deploy && exec node_modules/.bin/next start"]
