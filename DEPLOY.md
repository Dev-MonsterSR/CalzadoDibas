# Deploy en VPS — CALZADO'S DIBA'S

Registro del deploy del 2026-06-19. Incluye los **4 endpoints móviles listos para producción** y los pasos de migración de BD.

## 🌐 URLs Públicas (Cloudflare Tunnel + Dominio)

| Recurso | URL |
|---------|-----|
| Frontend web | `https://calzado.juanangel.me/` |
| API base | `https://calzado.juanangel.me/api` |
| Health check | `https://calzado.juanangel.me/api/health` |

## 🔌 Endpoints API (App Móvil)

Documentación completa en [`API_MOVIL.md`](./API_MOVIL.md). Resumen:

| # | Endpoint | URL |
|---|----------|-----|
| 1 | Login empleado | `POST https://calzado.juanangel.me/api/login` |
| 2 | Detalle pedido | `GET https://calzado.juanangel.me/api/orders/{id}` |
| 3 | Confirmar entrega | `POST https://calzado.juanangel.me/api/orders/{id}/deliver` |
| 4 | Historial del día | `GET https://calzado.juanangel.me/api/employees/{id}/deliveries?date=today` |

### Ejemplo de uso (login)

```bash
curl -X POST https://calzado.juanangel.me/api/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: DibasMobileApp/1.0" \
  -d '{"email":"vendedor.t@dibas.com","password":"test123"}'
```

**Importante**: el servidor está detrás de Cloudflare Tunnel con bot protection. Las requests sin `User-Agent` reciben 403. La app móvil debe enviar `User-Agent: <nombre-app>/<versión>`.

### Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | `admin@dibas.com` | `test123` |
| Vendedor Trujillo | `vendedor.t@dibas.com` | `test123` |
| Vendedor Lima | `vendedor.l@dibas.com` | `test123` |
| Cliente | `cliente@test.com` | `test123` |

## 🖥️ Infraestructura VPS

- **Proveedor**: Oracle Cloud (aarch64)
- **OS**: Ubuntu 24.04
- **SSH**: `ssh MinecracitoServer` (alias en `~/.ssh/config`)
- **Path**: `/home/ubuntu/Docker/Dibas/CalzadoDibas/`
- **Docker**: 29.x (compose v1)

### Contenedores

| Nombre | Imagen | Puerto | Estado |
|--------|--------|--------|--------|
| `dibas-mysql` | mysql:8 | 3307 | Up 3 weeks |
| `dibas-mongo` | mongo:7 | 27017 | Up 3 weeks |
| `dibas-backend` | calzadodibas_backend (custom) | 3002 | Up (nuevo) |
| `dibas-frontend` | calzadodibas_frontend (custom) | 5173 | Up (nuevo) |

### Redes Docker

- `calzadodibas_default` (creada por docker-compose, rango 172.24.0.0/16)
- `dibas-network` (preexistente, rango 192.168.32.0/20) — contiene mysql/mongo

**Importante**: el backend se conecta a `dibas-network` mediante `docker network connect` después del `up -d`, porque mysql/mongo se crearon originalmente con `docker run` (no compose) y no están en la red por defecto.

## 📦 Pasos del Deploy Ejecutado

### 1. Git commit local
```bash
cd "/home/angel/Documentos/Desarrollo de aplicaciones web Avanzado/Dibas"
git add .
git commit -m "feat: endpoints API móvil + inventario por tallas + boleta + QR..."
# NOTA: push falló por falta de credenciales en este entorno.
# El commit está en rama main local.
```

### 2. Rsync a VPS
```bash
rsync -avz --progress --exclude='node_modules' --exclude='.git' \
  --exclude='*.md' --exclude='docs' --exclude='uploads' --exclude='Avances pdf' \
  ./backend/ MinecracitoServer:/home/ubuntu/Docker/Dibas/CalzadoDibas/backend/

rsync -avz --progress --exclude='node_modules' --exclude='dist' \
  ./frontend/ MinecracitoServer:/home/ubuntu/Docker/Dibas/CalzadoDibas/frontend/
```

### 3. Aplicar migraciones SQL
```bash
# Las migraciones son idempotentes (CREATE IF NOT EXISTS, WHERE NOT EXISTS)
ssh MinecracitoServer 'cd /home/ubuntu/Docker/Dibas/CalzadoDibas && \
  cat backend/db/migrations/20260527_inventory_sizes_and_movements.sql | docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db && \
  cat backend/db/migrations/20260527_orders_oms.sql             | docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db && \
  cat backend/db/migrations/20260618_boleta_number.sql           | docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db && \
  cat backend/db/migrations/20260618_order_items_size.sql        | docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db'
```

**Resultado**: 5 columnas OMS + `boleta_number` + `counters` + `order_items.size` + **72 filas de `inventory_sizes`** (9 productos × 8 tallas, distribución normal centrada en 39).

### 4. Reconstruir Docker
```bash
ssh MinecracitoServer 'cd /home/ubuntu/Docker/Dibas/CalzadoDibas && \
  docker stop dibas-backend dibas-frontend && \
  docker rm dibas-backend dibas-frontend && \
  docker-compose up -d --build --no-deps backend frontend'
```

### 5. Conectar backend a la red de mysql
```bash
ssh MinecracitoServer 'docker network connect dibas-network dibas-backend'
```

Sin este paso, el backend no resuelve `dibas-mysql` (están en redes Docker distintas).

## ✅ Verificación Post-Deploy

Test E2E completo (orden #13 creada, pagada, preparada, lista para recojo, entregada):

| Verificación | Resultado |
|--------------|-----------|
| `POST /api/login` | 200, token + employee {id:2, store:'Trujillo'} |
| `GET /api/orders/13` | 200, `boleta_number='B001-00001'`, `image_url='/uploads/...'` |
| `POST /api/orders/13/deliver` | 200, status:'entregado', delivered_by:2 |
| `GET /api/employees/2/deliveries?date=today` | 200, count:1, orden #13 con detalles |
| `GET /api/health` | 200, `{"status":"ok"}` |

## 🔧 Deploy rápido (cambios solo de frontend)

El `Dockerfile` ejecuta `npm run build` dentro del contenedor, así que cualquier cambio
en `frontend/src/` se recoge reconstruyendo **solo el contenedor `dibas-frontend`**.

Si los cambios están **sin commitear**, el rsync normal (por `mtime`) puede no detectarlos.
Forzar siempre con `touch src/index.css` + `docker-compose build --no-cache frontend`.

```bash
# 1. Empujar cambios locales (si no se commiteó)
rsync -avz --progress --exclude='node_modules' --exclude='dist' \
  ./frontend/ MinecracitoServer:/home/ubuntu/Docker/Dibas/CalzadoDibas/frontend/

# 2. Forzar rebuild (sin caché de layers de Docker)
ssh MinecracitoServer 'cd /home/ubuntu/Docker/Dibas/CalzadoDibas/frontend && \
  touch src/index.css && \
  docker-compose build --no-cache frontend && \
  cd .. && \
  docker rm -f dibas-frontend 2>/dev/null; \
  docker-compose up -d --no-deps frontend'

# 3. Validar (simulando pestaña incógnito, sin caché)
curl -sS -H "Cache-Control: no-cache" https://calzado.juanangel.me/seller | grep -E "assets/index-.*\.(js|css)"
```

### Diagnóstico típico: "se ve sin estilos en incognito"

Síntoma: la página carga pero aparece como HTML pelado (texto negro sobre blanco,
sin colores ni layout).

Causa: el HTML en producción apunta a un hash de JS/CSS (`index-XXXX.js`) que ya no
existe en el contenedor. Suele pasar cuando se hace `npm run build` local pero NO
se redespliega el contenedor — en modo normal el navegador usa la versión cacheada
del HTML viejo, en incognito no hay caché y se ve roto.

Fix: redeploy completo siguiendo los pasos 1-3 de arriba.

## 🐛 Bug histórico: Tailwind se renderizaba básico en producción (jun 22 2026)

**Síntoma**: `calzado.juanangel.me/seller` se veía "básico" (texto plano, sin colores premium,
sin grid de tallas estilizado) mientras que `localhost:5173/seller` se veía bien.

**Causa raíz**: el commit `0e8ea11` quitó el `<script src="cdn.tailwindcss.com">` del
`index.html` para producción. Pensaba que Cloudflare lo bloqueaba. La realidad:

- El dev server local (Vite) estaba sirviendo un `index.html` cacheado con el CDN
- El build de producción usa `index.html` del proyecto (sin CDN) + Tailwind v4 local
- Tailwind v4 con `@config` del config de v3 NO genera correctamente las clases con
  modificadores de opacidad (`bg-primary-container/15`, `text-error/30`, etc.) ni las
  utility classes de los plugins `forms` y `container-queries`
- El CDN de Tailwind v3 SÍ responde 200 (verificado con `curl` + UA real)
- Cloudflare **no** lo bloquea (el bloqueo original fue en otro contexto, no permanente)

**Fix (commit `1191294`)**:
1. Restaurar `<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries">`
   en `frontend/index.html`
2. Restaurar `<script id="tailwind-config">` con las 50+ colores custom, borderRadius,
   spacing, fontFamily, fontSize — config idéntico al que Vite estaba sirviendo en dev
3. Quitar `@import "tailwindcss"` y `@config` de `src/index.css` (ya no es necesario
   porque Tailwind se carga por CDN en runtime)

**Resultado**: prod y dev ahora se ven IDÉNTICOS porque ambos cargan el mismo CDN con
el mismo config.

**Lección**: **NO** migrar de Tailwind CDN (v3) a Tailwind v4 build sin migrar primero
el config de v3 a formato v4 (`@theme` en CSS). El `@config` en v4 no procesa las
variantes de opacidad ni los plugins `forms`/`container-queries`.

## 📝 Deuda Técnica Conocida

1. **CORS pre-Check**: actualmente no se hace preflight desde la app móvil. Si agregas headers custom (ej. `X-App-Version`), necesitarás manejar OPTIONS.
2. **Push a GitHub**: el commit `9a15395` está en local pero el push falló por falta de token. Configurar PAT o SSH key para subir.
3. **Imagen URL absoluta**: actualmente devuelve `/uploads/...` (ruta relativa). Para app móvil, considera agregar el dominio completo en una futura versión.
4. **MongoDB warning en startup**: el backend puede tardar en resolver `dibas-mongo` si no está en la red `dibas-network`. Mismo fix que para mysql.
5. **Logo oscuro y Tailwind CDN**: ya se cambió el logo a dorado, falta migrar a build de Tailwind sin CDN.
