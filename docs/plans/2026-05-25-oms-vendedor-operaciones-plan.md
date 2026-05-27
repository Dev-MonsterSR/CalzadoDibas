# OMS + Operaciones de Vendedor (Trujillo/Lima) Implementation Plan

> For Hermes: ejecutar luego con subagent-driven-development, task-by-task, con revisión de cumplimiento funcional y revisión de calidad por cada bloque.

Goal: completar el flujo operativo real de pedidos (pago, validación, despacho, recojo QR, entrega, postventa) respetando roles y reglas RN/RF del negocio.

Architecture: mantener stack actual (Express + MySQL + Mongo + React/Vite) y extender con un mini-OMS por estados, auditoría de transiciones y panel vendedor operativo por sede. Evitar reescritura: evolución incremental sobre rutas y modelos existentes.

Tech stack: Node.js/Express, MySQL, React+Vite, Zustand, multer, qrcode, Telegram bot (existente o nuevo módulo), PDF engine (pdfkit o puppeteer), mailer (nodemailer/provider).

---

## 0) Estado actual (baseline real del código)

Backend actual:
- Ya existe carga de voucher: POST /api/orders/:id/payment-proof
- Problema crítico: subir voucher auto-cambia estado a `pagado` (no cumple Flujo A de validación admin)
- Ya existe inventario por sede + pickup orders:
  - GET /api/inventory/my-store
  - GET /api/inventory/pickup-orders
  - PUT /api/inventory/pickup/:orderId (entregado)
- Roles aplicados en rutas (admin/fabrica/vendedor_trujillo/vendedor_lima)

Frontend actual:
- SellerDashboard solo muestra inventario + alerta stock, no bandeja operativa de pedidos
- AdminOrders existe pero debe ampliarse para validación voucher y despacho más completo
- OrderDetail cliente existe, pero confirmaciones están incompletas

Archivos base identificados:
- backend/src/controllers/orderController.js
- backend/src/controllers/inventoryController.js
- backend/src/routes/orders.js
- backend/src/routes/admin.js
- frontend/src/pages/seller/SellerDashboard.jsx
- frontend/src/pages/admin/AdminOrders.jsx
- frontend/src/pages/OrderDetail.jsx
- frontend/src/services/index.js

---

## 1) Modelo de estados y reglas de transición (núcleo OMS)

Objetivo: estandarizar estados y quién puede mover cada estado.

Estados propuestos:
- `pendiente` (creado)
- `pendiente_validacion` (voucher subido, esperando admin)
- `pagado`
- `preparando`
- `enviado` (agencia)
- `listo_recojo` (tienda)
- `entregado`
- `cancelado`
- `rechazado_pago`

Transiciones válidas (mínimo):
- cliente voucher: pendiente -> pendiente_validacion
- admin aprueba voucher: pendiente_validacion -> pagado
- admin rechaza voucher: pendiente_validacion -> rechazado_pago
- admin prepara: pagado -> preparando
- admin envío agencia: preparando -> enviado
- admin listo recojo: preparando -> listo_recojo
- vendedor entrega QR: listo_recojo -> entregado
- admin cierre envío: enviado -> entregado

Reglas de autorización:
- Cliente: solo subir voucher y ver estado
- Vendedor sede: solo operaciones de su sede (RN07)
- Admin/Fábrica: validación de pago, despacho, tracking, cierre operativo

Entregables técnicos:
- Nueva util de reglas: `backend/src/domain/orderStateMachine.js`
- Validación central en controladores (no reglas duplicadas)

---

## 2) Cambios de BD (migraciones)

Objetivo: trazabilidad y soporte operativo.

2.1 Tabla de eventos de pedido
- `order_events`:
  - id, order_id, from_status, to_status, actor_user_id, actor_role
  - event_type (status_change, voucher_uploaded, voucher_approved, qr_scanned, tracking_added, etc.)
  - payload_json, created_at

2.2 Campos en `orders`
- `payment_validation_status` enum: none|pending|approved|rejected
- `payment_validated_by`, `payment_validated_at`, `payment_rejection_reason`
- `tracking_code` (ya existe en partes, verificar tipo/index)
- `ready_for_pickup_at`, `delivered_at`, `delivered_by`

2.3 Índices
- orders(status, delivery_method, delivery_location)
- order_events(order_id, created_at)

Archivos:
- Crear `backend/db/migrations/2026xxxx_orders_oms.sql`
- Actualizar `backend/db/schema.sql` si se mantiene sincronizado

---

## 3) Backend: Pago Yape/Plin bien implementado

Objetivo: corregir flujo A.

Cambios:
1. `orderController.uploadPaymentProofHandler`
- Actualmente auto-set a `pagado` -> eliminar
- Nuevo comportamiento:
  - guarda voucher
  - set `payment_validation_status = pending`
  - transición a `pendiente_validacion`
  - registra `order_event`

2. Nuevos endpoints admin para vouchers
- POST `/api/admin/orders/:id/payment/approve`
- POST `/api/admin/orders/:id/payment/reject`

3. Validaciones:
- solo yape/plin
- solo estado pendiente_validacion para aprobar/rechazar
- rechazo requiere motivo

Archivos:
- Modificar `backend/src/routes/admin.js`
- Modificar `backend/src/controllers/adminController.js` (o nuevo `adminOrderController.js`)
- Modificar/crear métodos en `backend/src/models/Order.js`

---

## 4) Backend: flujo despacho/recojo y QR robusto

Objetivo: cerrar Flujo B y C.

4.1 Recojo tienda
- Generar QR con token firmado (orderId + location + exp + hash), no solo ID plano
- Endpoint verificar QR vendedor:
  - POST `/api/inventory/verify-qr`
  - valida firma, expiración, estado `listo_recojo`, sede correcta
  - transición `entregado`
  - registra evento

4.2 Envío agencia
- Endpoint admin:
  - POST `/api/admin/orders/:id/ship`
  - requiere `tracking_code` + agencia
  - transición `preparando -> enviado`
  - registra evento

4.3 Paso intermedio operativo
- Endpoint admin set listo recojo:
  - POST `/api/admin/orders/:id/ready-pickup`
  - transición `preparando -> listo_recojo`

Archivos:
- Modificar `backend/src/routes/inventory.js`
- Modificar `backend/src/controllers/inventoryController.js`
- Modificar `backend/src/controllers/orderController.js`
- Crear `backend/src/utils/qrToken.js`

---

## 5) Backend: reglas de inventario y mayorista correctas

Objetivo: cumplir RN01/RN02/RN04 consistentemente.

5.1 RN01 precio mayorista
- Corregir cálculo en `createOrder`: hoy aplica por acumulado durante loop (puede mezclar reglas)
- Debe decidir precio por item con base en cantidad total final >= 3

5.2 RN02 stock seguridad (6)
- Al decrementar stock, si queda <=6 registrar alerta evento
- Disparar notificación Telegram (RF-11)

5.3 RN04 independencia sedes
- Endurecer validación: recojo solo si stock físicamente en sede elegida
- Bloquear cualquier fallback implícito a fábrica en recojo tienda

Archivos:
- Modificar `backend/src/controllers/orderController.js`
- Modificar `backend/src/models/Order.js` / `Inventory.js`
- Crear/actualizar notificador `backend/src/integrations/telegramNotifier.js`

---

## 6) Frontend Admin: consola de validación y despacho

Objetivo: que admin pueda operar pagos/manual y despacho end-to-end.

6.1 AdminOrders
- Bandeja con tabs:
  - Pendiente validación
  - Pagado/Preparando
  - Enviado
  - Recojo listo
- Vista voucher (imagen/PDF) + botones Aprobar/Rechazar
- Acciones:
  - marcar preparando
  - registrar tracking y enviar
  - marcar listo recojo

6.2 Seguridad de UI
- Botones habilitados según estado actual
- Mensajes de error de transición inválida

Archivos:
- Modificar `frontend/src/pages/admin/AdminOrders.jsx`
- Modificar `frontend/src/services/index.js` (nuevos endpoints)

---

## 7) Frontend Vendedor: panel operativo completo

Objetivo: vendedor deja de ser “solo stock”.

7.1 Nueva vista vendedor
- Ruta actual `/seller` se convierte en tablero de operación local:
  - Pedidos listos para recojo (de su sede)
  - Verificación/escaneo QR
  - Confirmar entrega
  - Historial entregas del día
  - Stock bajo local

7.2 Acciones permitidas por rol
- vendedor_trujillo: solo pedidos de trujillo
- vendedor_lima: solo pedidos de lima

7.3 UX móvil
- botón “Escanear QR” (si móvil web inicial) o input manual QR fallback
- feedback inmediato (válido/inválido/expirado/sede incorrecta)

Archivos:
- Modificar `frontend/src/pages/seller/SellerDashboard.jsx`
- Crear `frontend/src/components/seller/PickupQueue.jsx`
- Crear `frontend/src/components/seller/QRValidator.jsx`
- Modificar `frontend/src/services/index.js`

Nota: si luego se implementa Flutter (RNF-03), este panel web sigue siendo respaldo operativo.

---

## 8) Frontend Cliente: confirmación clara para el cliente

Objetivo: eliminar ambigüedad de “¿ya confirmé?”

OrderDetail cliente:
- Timeline visual por estado
- Para Yape/Plin:
  - estado “Pendiente de validación” tras subir voucher
  - mostrar resultado de validación y motivo rechazo si aplica
- Para recojo:
  - mostrar QR (o botón generar) solo cuando estado listo_recojo
- Para envío:
  - mostrar tracking + estado enviado

Archivos:
- Modificar `frontend/src/pages/OrderDetail.jsx`
- Modificar `frontend/src/pages/MyOrders.jsx`

---

## 9) Postventa: cambios de talla sin devolución dinero (RN06)

Objetivo: habilitar proceso real de cambio.

Backend:
- endpoint solicitud cambio:
  - POST `/api/orders/:id/exchange-request`
- endpoint admin/vendedor procesar cambio:
  - POST `/api/admin/orders/:id/exchange-approve`
- movimientos inventario:
  - entrada talla devuelta + salida talla nueva
- registrar evento y evidencia

Frontend:
- cliente solicita cambio desde OrderDetail (si entregado)
- admin/vendedor ve solicitudes y procesa

Archivos nuevos sugeridos:
- `backend/src/routes/exchanges.js`
- `backend/src/controllers/exchangeController.js`
- `backend/src/models/Exchange.js`
- UI en admin/seller/order detail

---

## 10) Automatizaciones: PDF + correo + Telegram

Objetivo: RF-11 y RF-13 completos.

10.1 Nota de venta PDF al entregar
- trigger al pasar a `entregado`
- generar PDF con detalle, totales, método pago, entrega
- enviar por email

10.2 Alertas Telegram
- cuando stock <= 6 por variante/sede
- comando bot para consulta y alta stock (RF-12)

Archivos:
- `backend/src/services/invoiceService.js`
- `backend/src/services/emailService.js`
- `backend/src/services/telegramBotService.js`

---

## 11) Seguridad, auditoría y cumplimiento

Objetivo: cerrar RNF-07/RNF-08 y trazabilidad.

- No guardar datos de tarjeta (solo reference/charge id)
- JWT en todas rutas protegidas (ya existente, reforzar cobertura)
- Registro de actor en toda transición de estado
- Rate limit y validación mime/tamaño en vouchers
- Sanitizar archivos subidos y nombres

---

## 12) Testing strategy (obligatoria antes de ejecutar)

Backend tests:
- state machine transitions (unit)
- authz por rol y sede (unit/integration)
- voucher upload -> pending_validation (integration)
- approve/reject payment (integration)
- qr verify success/fail cases (integration)
- inventory threshold alerts (integration)

Frontend tests:
- render condicional por estado (OrderDetail)
- acciones admin habilitadas por estado
- seller queue muestra solo su sede
- errores de transición visibles

Smoke/E2E manual checklist:
1) cliente yape -> sube voucher -> admin aprueba -> listo recojo -> vendedor entrega QR
2) cliente envío agencia -> tracking -> enviado -> entregado
3) rechazo voucher con motivo -> cliente lo ve
4) stock cruza 6 -> alerta

---

## 13) Plan de ejecución por fases (sin downtime)

Fase 1 (rápida, alto impacto)
- Corregir flujo voucher (no auto-pagado)
- Admin approve/reject
- Timeline cliente básico

Fase 2
- Seller operativo: cola recojo + verify QR + entregar
- Eventos/auditoría

Fase 3
- Despacho agencia completo + tracking UX
- Telegram stock alerts

Fase 4
- Postventa cambios talla
- PDF+email al entregar

Rollback strategy:
- feature flags por módulo:
  - `OMS_PAYMENT_VALIDATION`
  - `OMS_QR_SIGNED`
  - `OMS_EXCHANGES`

---

## 14) Riesgos actuales detectados y mitigación

Riesgo A: transición automática a pagado al subir voucher
- Mitigación: cambiar a pendiente_validacion + aprobación admin

Riesgo B: vendedor marca entregado sin control QR fuerte
- Mitigación: token QR firmado + validación sede/estado

Riesgo C: confusión cliente sobre confirmación
- Mitigación: timeline explícito + mensajes por estado

Riesgo D: reglas mayorista inconsistentes por cálculo incremental
- Mitigación: recalcular con cantidad total previa a asignar precios

---

## 15) Definición de “completo” (Done Criteria)

Se considera completo cuando:
1. Ningún pedido Yape/Plin pasa a pagado sin acción de admin
2. Vendedor solo opera pedidos de su sede
3. Recojo en tienda exige QR válido + estado listo_recojo
4. Cliente ve estado entendible en todo momento
5. Alertas de stock <=6 funcionan
6. Entregado dispara PDF+correo
7. Reportes/admin siguen operativos sin regresiones

---

## 16) Preparación para ejecución posterior

Comandos base (cuando se ejecute):
- Backend tests: npm test (o suite definida)
- Frontend tests: npm test / vitest
- Build frontend: npm run build
- Smoke API: curl endpoints críticos

Recomendación de ejecución:
- Implementar por fase, PR por fase
- Mantener migraciones reversibles
- Activar feature flags gradualmente en producción

---

Plan guardado para implementación posterior. Este documento es la guía maestra de ejecución incremental y segura sobre el código actual.
