# ---- Stage 1: Build ----
# Forzar plataforma ARM64 porque el host es aarch64 (Oracle Cloud).
# Sin esto, esbuild intenta ejecutar binarios x64 y falla con ETXTBSY.
ARG TARGETPLATFORM=linux/arm64
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=optional

COPY . .
RUN npm run build

# ---- Stage 2: Nginx ----
FROM nginx:alpine

# Copiar los archivos compilados
COPY --from=build /app/dist /usr/share/nginx/html

# Configuracion de nginx con proxy inverso al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
