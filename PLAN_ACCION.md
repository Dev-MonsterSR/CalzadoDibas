# Plan de Acción — Inventario por Sede + Tallas

## 🎯 Objetivo
Cada local (Trujillo, Lima) tiene su **propio inventario independiente**, cada zapato tiene **sus tallas con stock propio**, cada trabajador gestiona **solo su sede**. La feature ya está parcialmente construida (tablas, endpoints seller, modal de ajuste) — falta cerrar el ciclo end-to-end (compra → descuento por talla → auditoría).

## 📊 Lo que YA EXISTE (no rehacer)

### Base de datos ✅
- `inventory(id, product_id, warehouse ENUM('fabrica','tienda_trujillo','tienda_lima'), stock, min_stock)` — separación por sede lista
- `inventory_sizes(id, inventory_id, size, stock)` — stock por talla con FK CASCADE
- `inventory_movements(...)` — auditoría completa con columna `size` y `movement_type` incluyendo `'venta'`
- Migraciones 20260527 aplicadas

### Backend ✅
- `Inventory.adjustStock(inventoryId, size, qty, ...)` — funciona con tallas, con transacción
- `Inventory.getByWarehouse(warehouse)` — trae productos + tallas
- `Inventory.getStockByProductAllWarehouses(productId)` — todas las sedes
- `Inventory.getMovements({warehouse, ...})` — filtrado por sede
- Permisos por sede en `inventoryController` según rol

### Frontend ✅
- `SellerDashboard` — vista "Almacén/Stock" con grid de tallas y modal de ajuste
- `AdjustStockModal` — selector de talla, agregar/retirar, razón obligatoria
- `QRScanner` — modal con cámara + modo manual
- `ProductDetail` — selector de sede Trujillo/Lima con stock por talla visible

## 🐛 Lo que FALLA (cierre end-to-end)

### Crítico (rompe el flujo)
1. **`Order.decrementStock` solo descuenta del total**, NO de `inventory_sizes` → la talla nunca baja al vender.
2. **`Checkout.jsx` no envía `size` ni `warehouse` por ítem** al backend → no se puede descontar por talla.
3. **`order_items` no tiene columna `size`** → no se puede persistir qué talla se vendió.
4. **Precio mayorista incremental** (bug previo del informe) → pre-calculado mal.

### Importante
5. **`Order.findPickupReadyByLocation`** (Order.js:192) tiene SQL con `u.phone as customer_email` (alias mal).
6. **Seed no inserta `inventory_sizes`** → los productos no tienen tallas cargadas.
7. **No hay UI admin para gestionar stock por tallas** al crear/editar producto.

### Menor
8. `orderStateMachine.js` tiene entrada dead `pendiente: ['cliente']`.
9. `mongoose ^9.6.2` typo (probable fallo npm install, no afecta este feature pero lo registro).
10. Tailwind v4 instalado pero cargado por CDN (no afecta este feature, lo registro).

## 🛠️ Tareas

### Fase 1 — Base de datos
- [ ] **T1.1** — Migración: añadir columna `size INT NULL` a `order_items` con índice
- [ ] **T1.2** — Generar migración SQL que pueble `inventory_sizes` desde `inventory.stock` actual (para no perder datos si ya hay registros)
- [ ] **T1.3** — Actualizar `seed.js` y `seed.sql` para que inserten `inventory_sizes` con distribución por tallas

### Fase 2 — Backend (Order)
- [ ] **T2.1** — Añadir método `Order.decrementStockBySize(productId, warehouse, size, qty, connection)` con `FOR UPDATE` y recálculo de `inventory.stock`
- [ ] **T2.2** — Modificar `Order.addItem` para recibir y guardar `size`
- [ ] **T2.3** — Modificar `Order.findById` para hacer JOIN con `inventory_sizes` y devolver `size` y stock disponible por ítem
- [ ] **T2.4** — Reescribir loop de `orderController.createOrder`:
  - Primer loop: validar + calcular `totalQuantity` y acumular items con `size` y `warehouse`
  - Determinar si aplica mayorista (≥3 items)
  - Segundo loop: asignar precio unitario
  - Validar stock por talla (no por total)
  - En transaction: crear orden, insertar items con `size`, descontar por talla, registrar `inventory_movements` con `movement_type='venta'` y `size`
- [ ] **T2.5** — Fix `Order.findPickupReadyByLocation`: corregir alias `customer_email` ↔ `customer_phone`

### Fase 3 — Backend (Admin Inventory por tallas)
- [ ] **T3.1** — `GET /api/admin/inventory` — ver todo el inventario con tallas, paginado, filtros
- [ ] **T3.2** — `PUT /api/admin/inventory/:inventoryId/sizes` — bulk update de tallas de un producto/sede
- [ ] **T3.3** — Al crear producto (`productController.createProduct`), si el body trae `initial_sizes: {36: 5, 37: 3, ...}`, insertarlas para cada sede

### Fase 4 — Frontend
- [ ] **T4.1** — `Checkout.jsx`: cambiar `orderItems` para enviar `size` y `warehouse` por cada item (desde el cart store)
- [ ] **T4.2** — `Cart.jsx`: mostrar la sede de recojo elegida en cada item
- [ ] **T4.3** — `AdminProducts.jsx`: añadir sección "Stock inicial por tallas" en el form de crear/editar producto
- [ ] **T4.4** — Verificar que `ProductDetail.jsx` lea correctamente `product.inventory[warehouse].sizes[size]` (la estructura ya viene del backend como objeto)

### Fase 5 — Verificación end-to-end
- [ ] **T5.1** — Levantar Docker (`docker compose up -d --build`)
- [ ] **T5.2** — Ejecutar migración nueva
- [ ] **T5.3** — Verificar `SHOW COLUMNS FROM order_items` tiene `size`
- [ ] **T5.4** — Login admin → crear producto con tallas iniciales → verificar en BD
- [ ] **T5.5** — Login cliente → seleccionar sede Trujillo → talla 38 → cantidad 2 → checkout → verificar:
  - `inventory_sizes` (Trujillo, 38) bajó -2
  - `inventory.stock` (Trujillo) se recalculó
  - `order_items.size = 38`
  - `inventory_movements` tiene registro tipo `venta` con `size=38`
- [ ] **T5.6** — Login vendedor Trujillo → ver stock actualizado en dashboard

## 📁 Archivos a tocar

```
backend/
  db/migrations/20260618_order_items_size.sql          (NUEVO)
  db/seed.sql                                          (EDIT: añadir INSERT inventory_sizes)
  db/seed.js                                           (EDIT: loop tallas)
  src/models/Order.js                                  (EDIT: decrementStockBySize, addItem, findById, fix findPickupReadyByLocation)
  src/controllers/orderController.js                   (REWRITE createOrder loop)
  src/controllers/productController.js                 (EDIT: createProduct acepta initial_sizes)
  src/controllers/adminController.js                   (EDIT: listAdminInventory, bulkUpdateSizes)
  src/routes/admin.js                                  (EDIT: nuevas rutas inventory)
  src/middlewares/auth.js                              (intacto)

frontend/
  src/pages/Checkout.jsx                               (EDIT: enviar size/warehouse)
  src/pages/Cart.jsx                                   (EDIT: mostrar sede)
  src/pages/admin/AdminProducts.jsx                    (EDIT: form de tallas)
```

## 🎯 Orden de ejecución
1. T1.1 → T1.2 → T1.3 (BD)
2. T2.1 → T2.2 → T2.3 → T2.4 → T2.5 (Backend Order)
3. T3.1 → T3.2 → T3.3 (Backend Admin)
4. T4.1 → T4.2 → T4.3 → T4.4 (Frontend)
5. T5.1 → T5.2 → T5.3 → T5.4 → T5.5 → T5.6 (Verificación)
