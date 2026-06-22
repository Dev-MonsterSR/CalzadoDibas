# DIBAS - Contexto Completo del Proyecto

## 📋 Resumen Ejecutivo

**Proyecto:** CALZADO'S DIBA'S - E-commerce de calzado con panel de vendedor operativo
**Stack:** Node.js/Express + MySQL + MongoDB + React/Vite + Tailwind CSS (híbrido)
**Estado:** Backend OMS 95% completo, Frontend vendedor 75% funcional (navegación completa, stock por tallas implementado, ajuste de inventario funcional)

---

## 🎯 Objetivo Actual

Completar el **panel del trabajador/vendedor** para que sea completamente funcional:
- ✅ Botones de navegación funcionales (Venta Nueva, Mis Pedidos, Almacén/Stock, Mi Perfil)
- ✅ Datos reales conectados (pedidos, inventario, métricas)
- ✅ Stock por tallas con visualización en tiempo real
- ✅ Ajuste de inventario con logs completos
- Flujo completo: Cliente genera QR → Trabajador escanea → Entrega confirmada

---

## 🏗️ Arquitectura Implementada

### Backend (Express + MySQL + MongoDB)

#### Estado OMS - 9 estados con transiciones controladas
```javascript
// backend/src/domain/orderStateMachine.js
pendiente → pendiente_validacion → pagado → preparando → listo_recojo → entregado
                                                    ↓
                                                  enviado → entregado
pendiente_validacion → rechazado_pago → pendiente
```

#### Endpoints Backend (TODOS FUNCIONAN)

**Vendedor (requiere rol vendedor_trujillo/vendedor_lima):**
- `GET /api/inventory/my-store` - Inventario de su sede (ahora incluye tallas)
- `GET /api/inventory/pickup-orders` - Pedidos listos para recojo (status='listo_recojo')
- `GET /api/inventory/delivered-today` - Entregas del día
- `POST /api/inventory/verify-qr` - Valida token QR y marca entregado
- `GET /api/inventory/low-stock` - Alertas de stock bajo
- `POST /api/inventory/adjust` - Ajustar stock por talla (requiere razón)
- `GET /api/inventory/movements` - Historial de movimientos (filtrado por sede)
- `GET /api/inventory/product/:id/stock` - Stock por tallas de un producto

**Cliente:**
- `POST /api/orders` - Crear pedido
- `POST /api/orders/:id/payment-proof` - Subir voucher (cambia a pendiente_validacion)
- `GET /api/orders/:id/qr` - Generar QR (solo si status='listo_recojo')
- `GET /api/orders/:id/events` - Historial de eventos

**Admin (requiere rol admin/fabrica):**
- `POST /api/admin/orders/:id/payment/approve` - Aprobar pago
- `POST /api/admin/orders/:id/payment/reject` - Rechazar pago (requiere reason)
- `POST /api/admin/orders/:id/ship` - Marcar enviado (requiere tracking_code)
- `POST /api/admin/orders/:id/ready-pickup` - Marcar listo para recojo

#### Base de Datos (MySQL)

**Tabla orders (con campos OMS):**
```sql
status ENUM('pendiente','pendiente_validacion','pagado','preparando','enviado','listo_recojo','entregado','cancelado','rechazado_pago')
payment_validation_status ENUM('none','pending','approved','rejected')
payment_validated_by INT
payment_validated_at TIMESTAMP
payment_rejection_reason VARCHAR(500)
ready_for_pickup_at TIMESTAMP
delivered_at TIMESTAMP
delivered_by INT
```

**Tabla order_events (auditoría):**
```sql
id, order_id, from_status, to_status, actor_user_id, actor_role, event_type, payload_json, created_at
```

**Tabla inventory_sizes (stock por talla):**
```sql
id INT AUTO_INCREMENT PRIMARY KEY
inventory_id INT NOT NULL (FK → inventory.id)
size INT NOT NULL (36-43)
stock INT DEFAULT 0
updated_at TIMESTAMP
UNIQUE KEY (inventory_id, size)
```

**Tabla inventory_movements (logs de movimientos):**
```sql
id INT AUTO_INCREMENT PRIMARY KEY
inventory_id INT NOT NULL
product_id INT NOT NULL
warehouse ENUM('fabrica','tienda_trujillo','tienda_lima')
size INT NULL
movement_type ENUM('entrada','salida','ajuste_positivo','ajuste_negativo','venta','devolucion','transferencia')
quantity_change INT NOT NULL
stock_before INT NOT NULL
stock_after INT NOT NULL
reason VARCHAR(500)
reference_type VARCHAR(50) NULL
reference_id INT NULL
actor_user_id INT NULL (FK → users.id)
actor_role VARCHAR(40)
created_at TIMESTAMP
```

**Migraciones aplicadas:**
- `backend/db/migrations/20260527_orders_oms.sql` - Estados OMS y auditoría de pedidos
- `backend/db/migrations/20260527_inventory_sizes_and_movements.sql` - Stock por tallas y logs de movimientos

#### QR Firmado con JWT
```javascript
// backend/src/utils/qrToken.js
generateQRToken(orderId, location) // JWT con orderId, location, type='pickup', exp=24h
verifyQRToken(token) // Valida firma, expiración y tipo
```

### Frontend (React + Vite)

#### Estructura de Archivos
```
frontend/src/
├── components/
│   └── seller/
│       ├── QRScanner.jsx          ← Modal con cámara (html5-qrcode)
│       └── AdjustStockModal.jsx   ← Modal para ajustar stock por talla (NUEVO)
├── pages/
│   ├── seller/
│   │   └── SellerDashboard.jsx    ← Panel del vendedor (COMPLETO con navegación)
│   ├── admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminOrders.jsx        ← Solo tabla read-only (INCOMPLETO)
│   │   ├── AdminProducts.jsx
│   │   └── ...
│   ├── ProductDetail.jsx          ← Detalle de producto (ACTUALIZADO con stock por tallas)
│   ├── OrderDetail.jsx            ← Detalle de pedido (cliente)
│   └── ...
├── services/
│   └── index.js                   ← API calls (ACTUALIZADO con endpoints de inventario)
└── store/
    └── index.js                   ← Zustand (auth + cart, ACTUALIZADO con warehouse)
```

#### Servicios Frontend (ACTUALIZADOS)
```javascript
// frontend/src/services/index.js

inventoryService = {
  myStore: () => api.get('/inventory/my-store'),
  getMyInventory: () => api.get('/inventory/my-store'),
  pickupOrders: () => api.get('/inventory/pickup-orders'),
  deliveredToday: () => api.get('/inventory/delivered-today'),
  verifyQR: (token) => api.post('/inventory/verify-qr', { token }),
  markDelivered: (orderId) => api.put(`/inventory/pickup/${orderId}`),
  lowStock: () => api.get('/inventory/low-stock'),
  updateStock: (id, data) => api.put(`/inventory/${id}`, data),
  adjustStock: (data) => api.post('/inventory/adjust', data),           // NUEVO
  getMovements: (params = {}) => api.get('/inventory/movements', { params }), // NUEVO
  getProductStock: (productId) => api.get(`/inventory/product/${productId}/stock`), // NUEVO
}

orderService = {
  getQR: (orderId) => api.get(`/orders/${orderId}/qr`),
  getEvents: (orderId) => api.get(`/orders/${orderId}/events`),
  uploadPaymentProof: (orderId, formData) => api.post(`/orders/${orderId}/payment-proof`, formData),
}

adminService = {
  approvePayment: (id) => api.post(`/admin/orders/${id}/payment/approve`),
  rejectPayment: (id, reason) => api.post(`/admin/orders/${id}/payment/reject`, { reason }),
  shipOrder: (id, data) => api.post(`/admin/orders/${id}/ship`, data),
  readyPickup: (id) => api.post(`/admin/orders/${id}/ready-pickup`),
}
```

#### Tailwind CSS (Enfoque Híbrido)
- **Páginas de cliente:** Inline styles + CSS variables
- **Páginas de seller/admin:** Tailwind CSS con CDN
- **Config:** `frontend/index.html` tiene `<script src="https://cdn.tailwindcss.com">` con todos los tokens del DESIGN.md

---

## ❌ Lo Que FALTA Implementar

### Panel del Vendedor (SellerDashboard.jsx)

**Estado actual:** Navegación completa, stock por tallas funcional, ajuste de inventario con logs.

**Falta:**
1. **Vista POS (Venta Nueva):**
   - Formulario para crear pedido manual
   - Búsqueda de productos
   - Selección de tallas y cantidades
   - Procesamiento de pago

2. **Vista de Historial de Movimientos:**
   - Tabla con logs de ajustes de inventario
   - Filtros por fecha, tipo de movimiento, producto
   - Exportar a Excel/PDF

### Panel del Admin (AdminOrders.jsx)

**Problema actual:** Solo muestra tabla read-only, no puede aprobar/rechazar/enviar.

**Necesita:**
1. **Tabs por estado:**
   - Pendiente Validación → Ver vouchers, aprobar/rechazar
   - Pagado/Preparando → Marcar preparando, listo_recojo
   - Enviado → Tracking code
   - Recojo Listo → Ver pedidos listos

2. **Acciones:**
   - Ver voucher (imagen)
   - Aprobar pago
   - Rechazar pago (con motivo)
   - Marcar preparando
   - Marcar listo_recojo
   - Enviar (con tracking_code + agencia)

3. **Panel de Control de Inventario (NUEVO):**
   - Vista de todos los movimientos de inventario (todas las sedes)
   - Filtros por vendedor, producto, fecha, tipo de movimiento
   - Estadísticas de ajustes (quién ajusta más, productos más ajustados)
   - Alertas de ajustes sospechosos

4. **Estados OMS en statusMap:**
   ```javascript
   pendiente_validacion: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente validación' }
   rechazado_pago: { bg: '#fee2e2', color: '#991b1b', label: 'Pago rechazado' }
   listo_recojo: { bg: '#ddd6fe', color: '#5b21b6', label: 'Listo para recojo' }
   ```

### OrderDetail.jsx (Cliente)

**Problema actual:** QR se muestra en estado incorrecto, faltan estados OMS.

**Necesita:**
1. **QR solo en listo_recojo** (ya corregido)
2. **Estados OMS en statusConfig** (ya agregados)
3. **Timeline de eventos** → usar orderService.getEvents()
4. **Mensaje de rechazo** → mostrar payment_rejection_reason si existe

### Cart.jsx (Carrito)

**Estado actual:** Actualizado para soportar warehouse, pero falta validación de stock.

**Falta:**
1. **Validación de stock en tiempo real:**
   - Verificar stock disponible antes de agregar al carrito
   - Mostrar alerta si no hay stock suficiente
   - Deshabilitar botón si talla agotada

2. **Selector de sede de recojo:**
   - Permitir elegir Trujillo o Lima
   - Mostrar stock disponible por sede
   - Actualizar precios según sede (si aplica)

---

## 🔧 Comandos Útiles

```bash
# Levantar todo el stack
cd "/home/angel/Documentos/Desarrollo de aplicaciones web Avanzado/Dibas"
docker compose up -d

# Ver logs
docker logs dibas-backend -f
docker logs dibas-frontend -f

# Reconstruir frontend después de cambios
docker compose up -d --build frontend

# Reconstruir backend después de cambios
docker compose up -d --build backend

# Aplicar migraciones (si no están aplicadas)
docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db < backend/db/migrations/20260527_orders_oms.sql
docker exec -i dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db < backend/db/migrations/20260527_inventory_sizes_and_movements.sql

# Verificar BD
docker exec dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db -e "DESCRIBE orders;"
docker exec dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db -e "SHOW TABLES LIKE 'order_events';"
docker exec dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db -e "SHOW TABLES LIKE 'inventory%';"

# Verificar stock por tallas
docker exec dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db -e "SELECT i.id, p.name, i.warehouse, i.stock, COUNT(iz.id) as tallas FROM inventory i JOIN products p ON i.product_id = p.id LEFT JOIN inventory_sizes iz ON i.id = iz.inventory_id GROUP BY i.id LIMIT 10;"

# Ver movimientos de inventario
docker exec dibas-mysql mysql -uroot -pdibas_root_2025 dibas_db -e "SELECT id, warehouse, size, movement_type, quantity_change, stock_before, stock_after, reason FROM inventory_movements ORDER BY id DESC LIMIT 10;"
```

---

## 🧪 Credenciales de Prueba

| Rol | Email | Contraseña | Panel |
|-----|-------|------------|-------|
| Admin | admin@dibas.com | test123 | /admin |
| Vendedor Trujillo | vendedor.t@dibas.com | test123 | /seller |
| Vendedor Lima | vendedor.l@dibas.com | test123 | /seller |
| Cliente | cliente@test.com | test123 | /orders |

---

## 📦 Dependencias Instaladas

**Backend:**
- express, mysql2, mongoose, jsonwebtoken, qrcode, multer, bcrypt, cors, dotenv, morgan

**Frontend:**
- react, react-router-dom, zustand, axios
- html5-qrcode (para escáner de cámara)
- tailwindcss (CDN en index.html)

---

## 🎨 Diseño

**Sistema:** Midnight Gilded Minimalist
**Archivo:** `Diseños/DESIGN.md`
**Referencia HTML:** `Diseños/code.html`

**Colores principales:**
- Background: #131313
- Surface: #201f1f
- Primary (gold): #f59e0b
- Text: #e5e2e1
- Outline: #534434

**Tipografía:** Geist
**Iconos:** Material Symbols Outlined

---

## 🚀 Siguiente Paso (Para Próxima Sesión)

### Prioridad Alta

1. **Panel del Admin - Control de Inventario:**
   - Crear vista `AdminInventory.jsx`
   - Tabla con todos los movimientos de inventario (todas las sedes)
   - Filtros: vendedor, producto, fecha, tipo de movimiento
   - Estadísticas: ajustes por vendedor, productos más ajustados
   - Endpoint: `GET /api/inventory/movements` (ya existe, admin ve todo)

2. **Panel del Vendedor - Vista POS:**
   - Crear `SellerPOS.jsx`
   - Formulario de venta manual
   - Búsqueda de productos con stock por tallas
   - Procesamiento de pago

3. **Panel del Vendedor - Historial de Movimientos:**
   - Agregar tab "Mis Ajustes" en vista de inventario
   - Tabla con movimientos del vendedor
   - Filtros por fecha y tipo

### Prioridad Media

4. **Cart.jsx - Validación de Stock:**
   - Verificar stock en tiempo real antes de agregar
   - Mostrar alerta si no hay stock suficiente
   - Actualizar cantidad máxima según stock disponible

5. **AdminOrders.jsx - Funcionalidad Completa:**
   - Tabs por estado
   - Acciones: aprobar/rechazar pago, marcar preparando, enviar
   - Ver vouchers (imagen)

### Prioridad Baja

6. **OrderDetail.jsx - Timeline:**
   - Timeline visual de eventos
   - Mensaje de rechazo si existe

7. **Reportes:**
   - Exportar movimientos a Excel/PDF
   - Dashboard de estadísticas de inventario

---

## 📝 Notas Importantes

### General
- **Login redirige según rol:** vendedor → /seller, admin → /admin, cliente → /
- **SellerDashboard oculta Header/Footer:** App.jsx detecta ruta /seller
- **QR Scanner usa html5-qrcode:** Requiere permisos de cámara
- **QR token es JWT firmado:** 24h de validez, incluye orderId + location
- **Estados OMS ya están en BD:** Migración aplicada correctamente
- **Todos los endpoints funcionan:** Backend completo

### Sistema de Inventario por Tallas
- **Tallas disponibles:** 36, 37, 38, 39, 40, 41, 42, 43
- **Stock por talla:** Tabla `inventory_sizes` (inventory_id + size + stock)
- **Stock total:** Campo `inventory.stock` se recalcula automáticamente al ajustar tallas
- **Movimientos:** Tabla `inventory_movements` registra TODO (quién, cuándo, cuánto, razón)
- **Permisos:** Vendedores solo pueden ajustar stock de su sede
- **Razón obligatoria:** Mínimo 3 caracteres para cualquier ajuste
- **Validación:** No permite stock negativo por talla

### Flujo de Ajuste de Inventario
1. Vendedor hace clic en "Ajustar Stock" en producto
2. Selecciona talla, tipo (agregar/retirar), cantidad, razón
3. Backend valida permisos y stock disponible
4. Se actualiza `inventory_sizes` (stock de talla)
5. Se recalcula `inventory.stock` (total)
6. Se registra en `inventory_movements` (log completo)
7. Frontend muestra confirmación y actualiza datos

### Flujo de Compra con Stock por Tallas
1. Cliente selecciona sede (Trujillo/Lima)
2. Ve stock real por talla (botones muestran "X disp." o "Agotado")
3. Tallas sin stock: deshabilitadas (gris, no clickeables)
4. Cantidad máxima limitada al stock de la talla seleccionada
5. Al agregar al carrito, se guarda warehouse
6. Al crear pedido, backend descuenta stock de inventory_sizes

---

## 🐛 Bugs Conocidos (Auditoría 2026-06-18)

### Críticos
1. **Precio mayorista incremental** — `orderController.js:49`: `totalQuantity` se acumula dentro del loop; el 3er ítem cambia el precio de los anteriores. Fix: pre-calcular total en 1er loop, asignar precios en 2do.
2. **Stock por tallas NO se descuenta al comprar** — `createOrder` llama a `Order.decrementStock()` que solo toca `inventory.stock` (total), no `inventory_sizes`. La feature de tallas queda desincronizada con la realidad. Además el body del request NO incluye `size` por ítem (frontend manda `{product_id, quantity}` sin size). Fix doble: cliente debe enviar size; backend debe usar `decrementStockBySize()` análogo a `Inventory.adjustStock`.
3. **`userHasPurchased` incompleto** — `reviewController.js:120`: solo incluye `entregado` y `preparando`. Faltan `listo_recojo` y `enviado`, por lo que un cliente con pedido listo para recojo no puede reseñar.

### Importantes
4. **PDF voucher rechazado sin UX clara** — `upload.js:31` filtra a `jpeg|jpg|png|webp|gif`; el frontend acepta `.pdf` y al subir lanza error genérico. Mensaje amigable al usuario.
5. **`getPickupOrders` con estados inconsistentes** — `inventoryController.getPickupOrders` llama a `Order.findPickupReadyByLocation` (solo `listo_recojo`), pero el modelo `Inventory.getPickupOrders` (línea 255-290, NO usado por el controller) trae `('pagado','preparando')`. Además `Order.findPickupReadyByLocation` (modelo Order.js:192) tiene `u.phone as customer_email` y alias `customer_email_addr` mal copiados — columnas duplicadas en SELECT. Vendedor no ve pedidos en preparación.
6. **`payment_proof` queda desactualizado tras upload** — `OrderDetail.jsx:57` setea `payment_proof: 'pending'` localmente pero no recarga la orden → cliente no ve `pendiente_validacion`.
7. **Tab "Entregados Hoy" en SellerDashboard no funciona** — `SellerDashboard.jsx:294-299` hardcoded `${true ? ... : ...}`, el 2do tab es inerte. Tampoco hay state para cambiar entre tabs.
8. **`AdminUsers` y `AdminCategories` usan `confirm()` y `alert()` nativos** — rompe UX. Falta feedback toast consistente.

### Menores
9. **Order.findById niega acceso a vendedor** — `orderController.js:168`: solo permite admin/fabrica; un vendedor no puede ver detalle de orden ni siquiera de su sede.
10. **Tablas OMS faltantes en AdminOrders statusMap** — `AdminOrders.jsx:5-12`: faltan `pendiente_validacion`, `rechazado_pago`, `listo_recojo`.
30. **`tracking_code` solo visible si `payment_method === 'culqi'`** — `OrderDetail.jsx:137` (commit `1d60f3c` lo corrige). El tracking es del ENVÍO, no del pago. Clientes con `envio_agencia` (yape/plin) nunca veían el código de seguimiento de la agencia de transportes.
31. **QR solo en `listo_recojo`** — `orderController.getOrderQR` requería `status === 'listo_recojo'` (commit `3d671ae` lo cambia). Cliente sin código de referencia hasta que la tienda lo marcara como listo. Ahora: `pagado` muestra el código `#000018` (sin QR por seguridad), `preparando`/`listo_recojo`/`entregado` muestran QR + código en texto.
32. **Vendedor no podía confirmar entrega con código corto** — `inventoryController.verifyQR` (commit `fa0b4c4` lo arregla) SOLO aceptaba JWT firmado largo. Si el vendedor metía `#000022` (código legible del pedido), backend rechazaba con 400. Ahora acepta `#000022`, `000022` o JWT. Además: vendedor puede confirmar entregas en `pagado`/`preparando` (transición automática a `listo_recojo` → `entregado` en un solo paso). Bloquea re-entregas.
12. **mongoose ^9.6.2 en package.json** — versión inexistente (última estable es 8.x). Probable typo que rompa `npm install`.
13. **`recordEvent` no se centraliza** — `markDeliveredWithActor` solo hace UPDATE; el evento lo registra el controller. Si se llama desde otra parte, no se audita.
14. **Columna `qr_code` en `orders`** se inserta en schema pero el controller de order usa el patrón de generar on-demand vía `getOrderQR` (`generateQRToken` + `QRCode.toDataURL`). El campo en BD queda NULL permanente.
15. **`orderStateMachine.js` tiene `pendiente: ['cliente']`** en ROLE_PERMISSIONS — pero `pendiente` es estado inicial automático al crear orden, no se "transiciona hacia" desde otro. La entrada en ROLE_PERMISSIONS es dead code.
16. **`Coupon.max_uses = 0` significa "ilimitado"** — pero el seed inserta `MAYORISTA5` con `max_uses=0` y el filtro SQL `coupon.max_uses === 0 || coupon.uses_count < coupon.max_uses` lo trata como ilimitado. Inconsistencia: si admin crea cupón con `max_uses=0` esperando "sin cupón", no hay forma; documentación cruzada con frontend que también usa `0 = ilimitado` (AdminCoupons.jsx línea 99).
17. **Checkout.jsx no valida método de pago vs stock por talla** — el cliente puede pedir 5 unidades de una talla que solo tiene 3; el error sale tarde en el backend.
18. **Server.js: PORT default es 3001** pero docker-compose expone 3002. El .env.example dice `port=3002` (correcto), pero el server.js mira `process.env.port || process.env.PORT`. Si el .env no se carga, arranca en 3001 → mismatch con docker-compose.
19. **No hay rate limiting** en login ni register — `express-rate-limit` está instalado pero no se usa en ningún archivo (verificado). Riesgo de fuerza bruta.
20. **CORS solo permite 2 orígenes hardcoded** — `frontend_url=http://localhost:5173,https://calzado.juanangel.me` en docker-compose. Cambiar dominio requiere rebuild.

### Diseño / Arquitectura
21. **Dos sistemas de estilos coexistiendo** — Cliente/admin viejo usa inline styles con CSS vars (`var(--bg-secondary)`); SellerDashboard nuevo usa Tailwind. Confirmado: `index.css` define vars dark, `index.html` carga Tailwind CDN con config dark, pero `AdminOrders/Cart/OrderDetail/ProductDetail/Checkout/MyOrders/Catalog/Home/Login/Register/Header/Footer/ProductCard/AdminProducts/AdminCategories/AdminUsers/AdminCoupons/Contact/About` TODOS siguen inline styles. Solo `SellerDashboard.jsx` y `AdjustStockModal.jsx` migrados.
22. **Tailwind por CDN** — `index.html` carga `https://cdn.tailwindcss.com` (no apto para producción, advertencia oficial). Pero `package.json` tiene `tailwindcss ^4.3.0` + `@tailwindcss/postcss` instalado → **inconsistencia**: las deps existen pero no se usan; se carga vía CDN. Build ignorará Tailwind.
23. **Conflicto de diseño** — Obsidian dice Navy `#1a1a2e` + Dorado `#c8a96e`; CONTEXT.md dice `#131313` + `#f59e0b`; `.HERMES_RESUME_STATE.txt` dice `#0A0A0A` + `#f59e0b`. **Realidad**: `index.css` usa `#0A0A0A` + `#f59e0b` (gana el RESUME_STATE). Decisión: usar este.
24. **Inconsistencia location naming** — `inventory.warehouse='tienda_trujillo'` vs `orders.delivery_location='trujillo'`. Mapeo manual en 6+ lugares (controllers y modelos).
25. **Voucher previo huérfano** — Subir nuevo comprobante no borra el archivo anterior del disco. `orderController.uploadPaymentProofHandler` solo actualiza el path en BD.
26. **`orderItems[].warehouse` default `'fabrica'`** — Para `envio_agencia` no se descuenta de ningún lado concreto. Decisión de negocio no documentada.
27. **Login Google declarado en backend pero sin uso en frontend** — `authController.loginGoogle` existe; `Login.jsx` tiene botón Google que NO hace nada (no hay `onClick`, no llama a `authService.loginGoogle`).
28. **Contact.jsx formulario sin handler** — form estático, `onSubmit` no existe, no llama a nada. El usuario llena y el botón "Enviar Mensaje" recarga la página.
29. **About.jsx fechas 2014-2026 hardcoded** — el timeline dice "2026 más de 500 modelos" pero en el seed hay 8 productos. Métrica falsa.
30. **Header.jsx detección de ruta activa con `window.location.pathname`** — no usa `useLocation()` de react-router. No se re-renderiza al navegar.

---

## ✅ Lo Que YA Funciona

### Backend
- ✅ OMS completo (state machine, endpoints, auditoría)
- ✅ QR firmado con JWT
- ✅ Stock por tallas (inventory_sizes)
- ✅ Logs de movimientos de inventario (inventory_movements)
- ✅ Ajuste de stock con validaciones (razón obligatoria, permisos por sede)
- ✅ API responde inventario con desglose por tallas
- ✅ Endpoint de movimientos filtrado por sede para vendedores
- ✅ Endpoint de movimientos completo para admin

### Frontend - SellerDashboard (/seller)
- ✅ Navegación completa (Dashboard, Venta Nueva, Mis Pedidos, Almacén/Stock, Mi Perfil)
- ✅ Vista de Almacén con stock por tallas (grid visual)
- ✅ Modal de ajuste de stock (AdjustStockModal)
  - Selector de talla con stock actual
  - Tipo de ajuste (agregar/retirar)
  - Cantidad con controles +/-
  - Razón obligatoria
  - Vista previa del resultado
- ✅ Botón "Ajustar Stock" en cada producto
- ✅ Indicadores visuales de stock bajo por talla
- ✅ Datos reales conectados (pedidos, inventario, métricas)
- ✅ QRScanner con cámara y modo manual

### Frontend - ProductDetail (/producto/:id)
- ✅ Selector de sede (Trujillo/Lima)
- ✅ Stock real por talla visible en cada botón
- ✅ Tallas agotadas deshabilitadas (gris, no seleccionables)
- ✅ Tallas con poco stock (≤2) con advertencia visual
- ✅ Cantidad máxima limitada al stock disponible
- ✅ Validación de stock antes de agregar al carrito

### Frontend - Store (Zustand)
- ✅ Cart actualizado para soportar warehouse
- ✅ addItem acepta parámetro warehouse
- ✅ Items del carrito incluyen warehouse

### Frontend - Otros
- ✅ OrderDetail con estados OMS y mensajes contextuales
- ✅ Login con redirección por rol
- ✅ Migraciones BD aplicadas correctamente

---

## 📊 Archivos Modificados en Esta Sesión (2026-05-27)

### Backend
- `backend/db/migrations/20260527_inventory_sizes_and_movements.sql` (NUEVO)
- `backend/src/models/Inventory.js` (ACTUALIZADO - métodos para tallas y movimientos)
- `backend/src/models/Product.js` (ACTUALIZADO - incluye tallas en inventory)
- `backend/src/controllers/inventoryController.js` (ACTUALIZADO - 3 nuevos handlers)
- `backend/src/routes/inventory.js` (ACTUALIZADO - 3 nuevas rutas)

### Frontend
- `frontend/src/components/seller/AdjustStockModal.jsx` (NUEVO)
- `frontend/src/pages/seller/SellerDashboard.jsx` (ACTUALIZADO - vista inventario con tallas)
- `frontend/src/pages/ProductDetail.jsx` (ACTUALIZADO - selector sede + stock por talla)
- `frontend/src/services/index.js` (ACTUALIZADO - 3 nuevos métodos)
- `frontend/src/store/index.js` (ACTUALIZADO - addItem con warehouse)

---

**Última actualización:** 2026-05-27
**Versión:** 2.0
**Sesión:** Implementación de stock por tallas + logs de movimientos + ajuste de inventario
