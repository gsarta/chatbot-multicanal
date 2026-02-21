FROM ghcr.io/puppeteer/puppeteer:latest

USER root
RUN apt-get update && apt-get install -y google-chrome-stable || true

# Copiamos el package.json desde la raíz
COPY package*.json ./
# Aseguramos permisos
RUN chown -R pptruser:pptruser /app

# Instalamos librerías
COPY package*.json ./
RUN npm install

# ¡ESTA ES LA LÍNEA CLAVE! 
# Copia el CONTENIDO de backend directamente a /app
COPY backend/. .

# Forzamos el uso del Chrome instalado en la imagen
ENV PUPPETEER_SKIP_DOWNLOAD=true

EXPOSE 10000

# Ahora sí encontrará el archivo server.js en la raíz de /app
CMD ["node", "server.js"]