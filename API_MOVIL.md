# API Móvil — CALZADO'S DIBA'S

Documentación de los 4 endpoints REST expuestos para la **aplicación móvil del trabajador** (vendedor/admin de tienda).

## Configuración

- **Base URL (producción)**: `https://calzado.juanangel.me/api`
- **Base URL (desarrollo)**: `http://localhost:3002/api`
- **Autenticación**: Bearer Token en header `Authorization`
- **Formato**: JSON
- **CORS**: Habilitado para los orígenes del frontend web + app móvil

## Roles permitidos

| Rol | Acceso |
|-----|--------|
| `vendedor_trujillo` | Login, ver pedidos Trujillo, entregar pedidos Trujillo, ver su historial |
| `vendedor_lima` | Login, ver pedidos Lima, entregar pedidos Lima, ver su historial |
| `admin` | Todo, incluyendo ver historial de cualquier empleado |
| `fabrica` | Todo, ver todos los pedidos |
| `cliente` | **NO permitido** en endpoints móviles (recibe 403) |

---

## 1. POST /api/login

Login de empleado. Devuelve token + datos del empleado (incluye tienda asignada).

### Request

```http
POST /api/login
Content-Type: application/json

{
  "email": "vendedor.t@dibas.com",
  "password": "test123"
}
```

### Response 200

```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee": {
    "id": 2,
    "name": "Vendedor Trujillo",
    "email": "vendedor.t@dibas.com",
    "role": "vendedor_trujillo",
    "phone": "999111222",
    "store": "Trujillo"
  }
}
```

### Errores

| Status | Mensaje | Causa |
|--------|---------|-------|
| 400 | Email y contraseña son requeridos. | Faltan campos |
| 401 | Email o contraseña incorrectos. | Credenciales inválidas |
| 401 | Esta cuenta fue creada con Google. | Cuenta sin password (Google OAuth) |
| 403 | Tu cuenta no tiene permisos de empleado. | Rol es `cliente` u otro no-empleado |

### Mapeo role → store

| Role | Store |
|------|-------|
| `vendedor_trujillo` | `"Trujillo"` |
| `vendedor_lima` | `"Lima"` |
| `fabrica` | `"Fábrica"` |
| `admin` | `null` |
| `cliente` | `null` (no puede loguearse aquí) |

---

## 2. GET /api/orders/:id

Consulta de pedido escaneado (o por código). Devuelve detalle completo con **`image_url` obligatoria** de la zapatilla principal a entregar.

### Request

```http
GET /api/orders/17
Authorization: Bearer <token>
```

### Response 200

```json
{
  "order": {
    "id": 17,
    "status": "listo_recojo",
    "delivery_method": "recojo_tienda",
    "delivery_location": "trujillo",
    "payment_method": "yape",
    "subtotal": "107.37",
    "total": "129.92",
    "boleta_number": "B001-00001",
    "customer_name": "Cliente Test",
    "customer_email": "cliente@test.com",
    "customer_phone": "999555666",
    "created_at": "2026-06-19T04:11:32.000Z",
    "ready_for_pickup_at": "2026-06-19T04:11:32.000Z",
    "items": [
      {
        "id": 19,
        "order_id": 17,
        "product_id": 1,
        "product_name": "Zapato Tacón Clásico Negroo",
        "product_code": "01-NEGRO-382",
        "size": 42,
        "quantity": 1,
        "price_at_purchase": "129.92",
        "warehouse": "tienda_trujillo",
        "image_url": "https://images.unsplash.com/photo-1543163521-603bf1840b5e?w=400"
      }
    ]
  }
}
```

### Errores

| Status | Mensaje | Causa |
|--------|---------|-------|
| 401 | Token requerido / inválido | Sin auth |
| 403 | No tienes permiso para ver esta orden. | Vendedor intentando ver orden de otra sede |
| 404 | Orden no encontrada. | ID inválido |

### Permisos

- **Cliente**: solo sus propias órdenes
- **Vendedor**: solo órdenes con `delivery_location` = su sede
- **Admin/Fábrica**: cualquier orden

### Importante: `image_url`

El campo `image_url` de cada item se resuelve así:
1. Si el producto tiene una imagen marcada como `is_primary=1` en `product_images`, se devuelve esa
2. Si no, devuelve la primera imagen del producto ordenada por `position`
3. Si el producto no tiene imágenes, devuelve `null`

La URL es absoluta (incluye `https://...`) y apunta a una imagen pública servida por Unsplash o por el propio backend en `/uploads/products/...`.

---

## 3. POST /api/orders/:id/deliver

Confirma la entrega del pedido. Cambia estado a `entregado` y registra auditoría.

### Request

```http
POST /api/orders/17/deliver
Authorization: Bearer <token>
Content-Type: application/json

{}
```

Body vacío (opcional). La información del `delivered_by` se toma del token JWT.

### Response 200

```json
{
  "success": true,
  "message": "Entrega confirmada",
  "order": {
    "id": 17,
    "status": "entregado",
    "delivered_at": "2026-06-19T05:18:58.000Z",
    "delivered_by": 2,
    ...
  }
}
```

### Errores

| Status | Mensaje | Causa |
|--------|---------|-------|
| 400 | order_id requerido. | Path inválido |
| 400 | La orden está en estado 'X'. Debe estar 'listo_recojo' para entregar. | Estado incorrecto |
| 403 | Esta orden no corresponde a tu tienda. | Vendedor de otra sede |
| 404 | Orden no encontrada. | ID inválido |
| 401 | Token requerido | Sin auth |

### Side effects (auditoría)

- Actualiza `orders.status = 'entregado'`, `orders.delivered_at = NOW()`, `orders.delivered_by = <user_id>`
- Inserta registro en `order_events` con `event_type = 'mobile_delivery'`, `from_status = 'listo_recojo'`, `to_status = 'entregado'`

---

## 4. GET /api/employees/:id/deliveries?date=today

Historial de entregas del empleado (hoy por defecto, o fecha específica).

### Request

```http
GET /api/employees/2/deliveries?date=today
Authorization: Bearer <token>
```

O con fecha específica (YYYY-MM-DD):
```http
GET /api/employees/2/deliveries?date=2026-06-19
```

### Response 200

```json
{
  "employee": {
    "id": 2,
    "name": "Vendedor Trujillo",
    "email": "vendedor.t@dibas.com",
    "role": "vendedor_trujillo"
  },
  "date": "2026-06-19",
  "count": 3,
  "deliveries": [
    {
      "id": 21,
      "total": "129.92",
      "status": "entregado",
      "delivery_method": "recojo_tienda",
      "delivery_location": "trujillo",
      "delivered_at": "2026-06-19T05:18:58.000Z",
      "boleta_number": "B001-00004",
      "customer_name": "Cliente Test",
      "customer_phone": "999555666",
      "items": [
        {
          "id": 23,
          "product_id": 1,
          "product_name": "Zapato Tacón Clásico Negroo",
          "product_code": "01-NEGRO-382",
          "size": 36,
          "quantity": 1,
          "price_at_purchase": "129.92",
          "warehouse": "tienda_trujillo",
          "image_url": "https://images.unsplash.com/photo-1543163521-603bf1840b5e?w=400"
        }
      ]
    }
  ]
}
```

### Errores

| Status | Mensaje | Causa |
|--------|---------|-------|
| 400 | employee_id requerido / Formato de fecha inválido | Parámetros inválidos |
| 401 | Token requerido | Sin auth |
| 403 | No tienes permiso para ver las entregas de otro empleado. | Vendedor A quiere ver entregas de Vendedor B |
| 404 | Empleado no encontrado. | ID inválido |

### Permisos

- **Admin**: puede ver entregas de cualquier empleado
- **Cualquier otro usuario**: solo puede ver sus propias entregas (`req.user.id === employeeId`)

### Valores del parámetro `date`

| Valor | Significado |
|-------|-------------|
| (omitido), `""`, `"today"` | Hoy (CURDATE()) |
| `"2026-06-19"` | Fecha específica (YYYY-MM-DD) |

---

## Flujo típico de la app móvil

```
1. App se abre → usuario escribe email/password
2. POST /api/login → guarda token en localStorage
3. App navega al scanner de QR
4. Usuario escanea QR del cliente → token del QR → order_id
   (alternativamente, el usuario ingresa el order_id manualmente)
5. GET /api/orders/:id → muestra detalle con image_url grande
6. App muestra:
   - Imagen del zapato
   - Talla, cantidad, precio
   - Nombre del cliente
   - Estado actual
   - Botón "Confirmar entrega"
7. Click en "Confirmar entrega" → POST /api/orders/:id/deliver
8. App muestra "Entrega confirmada ✓"
9. Usuario navega a "Historial del día"
10. GET /api/employees/{id}/deliveries?date=today
11. App muestra la lista con todas las entregas
```

---

## Setup en Postman / Insomnia / curl

Ejemplo de uso completo:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3002/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendedor.t@dibas.com","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Ver pedido
curl -s http://localhost:3002/api/orders/17 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. Confirmar entrega
curl -s -X POST http://localhost:3002/api/orders/17/deliver \
  -H "Authorization: Bearer $TOKEN"

# 4. Ver historial del día
curl -s "http://localhost:3002/api/employees/2/deliveries?date=today" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## Códigos de error comunes

| Status | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created (POST que crea un recurso) |
| 400 | Bad Request (validación falló) |
| 401 | Unauthorized (sin token o token inválido) |
| 403 | Forbidden (sin permisos para la acción) |
| 404 | Not Found (recurso no existe) |
| 500 | Internal Server Error (bug en el servidor) |

---

## Modelos de datos

### Employee (devuelto por /login)

```typescript
{
  id: number;
  name: string;
  email: string;
  role: 'vendedor_trujillo' | 'vendedor_lima' | 'admin' | 'fabrica';
  phone: string | null;
  store: 'Trujillo' | 'Lima' | 'Fábrica' | null;
}
```

### Order (devuelto por /orders/:id y /deliver)

```typescript
{
  id: number;
  status: 'pendiente' | 'pendiente_validacion' | 'pagado' | 'preparando' | 'enviado' | 'listo_recojo' | 'entregado' | 'cancelado' | 'rechazado_pago';
  delivery_method: 'recojo_tienda' | 'envio_agencia';
  delivery_location: 'trujillo' | 'lima' | null;
  payment_method: 'culqi' | 'yape' | 'plin';
  total: string;  // decimal como string
  boleta_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  items: OrderItem[];
  created_at: string;  // ISO 8601
  delivered_at: string | null;
  delivered_by: number | null;
}
```

### OrderItem (dentro de Order)

```typescript
{
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  size: number | null;
  quantity: number;
  price_at_purchase: string;  // decimal como string
  warehouse: 'fabrica' | 'tienda_trujillo' | 'tienda_lima';
  image_url: string | null;  // URL absoluta
}
```

---

## Stack

- **Backend**: Node.js + Express + MySQL + MongoDB (reseñas)
- **Frontend web**: React + Vite (existente)
- **Auth**: JWT (jsonwebtoken)
- **Pagos**: Culqi (integración existente)
- **Imágenes**: product_images (MySQL) con `is_primary=1`
- **Auditoría**: order_events (MySQL) con `event_type='mobile_delivery'`

---

## Despliegue (próximos pasos)

1. Subir a GitHub (repositorio público o privado)
2. Deploy en VPS (Oracle Cloud aarch64 Ubuntu 24.04)
3. Configurar Cloudflare Tunnel con dominio `calzado.juanangel.me`
4. El frontend móvil consumirá `https://calzado.juanangel.me/api/*`
