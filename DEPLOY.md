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

## 📝 Deuda Técnica Conocida

1. **CORS pre-Check**: actualmente no se hace preflight desde la app móvil. Si agregas headers custom (ej. `X-App-Version`), necesitarás manejar OPTIONS.
2. **Push a GitHub**: el commit `9a15395` está en local pero el push falló por falta de token. Configurar PAT o SSH key para subir.
3. **Imagen URL absoluta**: actualmente devuelve `/uploads/...` (ruta relativa). Para app móvil, considera agregar el dominio completo en una futura versión.
4. **MongoDB warning en startup**: el backend no puede resolver `dibas-mongo` si no está en la red `dibas-network`. Mismo fix que para mysql.
5. **Logo oscuro y Tailwind CDN**: ya se cambió el logo a dorado, falta migrar a build de Tailwind sin CDN.
