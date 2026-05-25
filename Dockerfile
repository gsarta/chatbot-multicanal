# --- Etapa 1: Construcción (Builder) ---
FROM node:20-slim AS builder

# Instalamos dependencias del sistema necesarias para Prisma y procesamiento multimedia de Baileys
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libwebp-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos archivos de configuración de dependencias
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instalamos TODAS las dependencias para poder compilar
RUN npm ci

# Generamos el cliente de Prisma y compilamos TypeScript a JavaScript
RUN npx prisma generate
COPY . .
RUN npm run build

# --- Etapa 2: Producción (Runner) ---
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Volvemos a instalar openssl y herramientas multimedia mínimas para la ejecución del bot
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libwebp-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copiamos solo lo necesario para producción
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos ÚNICAMENTE dependencias de producción para mantener la imagen ligera
RUN npm ci --only=production

# Copiamos el código compilado y el cliente de Prisma desde el builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Ejecutamos las migraciones pendientes en PostgreSQL y arrancamos el bot con Node nativo
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]