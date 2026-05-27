FROM node:20-alpine

WORKDIR /app

# Dependencias primero (caching)
COPY package.json ./
RUN npm install --production

# Codigo fuente
COPY . .

# Puerto que usa el backend (se sobreescribe via env en compose)
EXPOSE 3002

CMD ["node", "server.js"]
