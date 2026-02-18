# Usamos Node con soporte para TypeScript
FROM node:20

# Instalamos dependencias para el sistema y Baileys (multimedia)
# Incluimos openssl porque es necesario para que Prisma funcione en contenedores
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libwebp-dev \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copiamos archivos de configuración de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# 2. Instalamos las dependencias de Node
RUN npm install

# 3. Copiamos la carpeta de Prisma y generamos el cliente
# Esto es vital para que el bot reconozca tus 6 tablas en el contenedor
COPY prisma ./prisma/
RUN npx prisma generate

# 4. Copiamos el resto del código y compilamos de TS a JS
COPY . .
RUN npm run build

# 5. Ejecutamos la versión compilada
CMD ["npm", "start"]