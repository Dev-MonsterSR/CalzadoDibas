# CALZADO'S DIBA'S - E-commerce de Calzado

Aplicación full-stack de e-commerce y gestión de inventario para la zapatería "CALZADO'S DIBA'S".

## Tecnologías

- **Backend**: Node.js + Express + MySQL (usuarios, productos, pedidos) + MongoDB (reseñas con fotos)
- **Frontend**: React + Vite + Zustand
- **Pagos**: Culqi (tarjetas), Yape, Plin
- **Auth**: JWT + Google OAuth
- **Docker**: MongoDB en contenedor dedicado

## Estructura

```
Dibas/
├── backend/
│   ├── src/
│   │   ├── config/        # db.js, mongo.js
│   │   ├── models/        # Modelos MySQL
│   │   ├── controllers/   # Lógica de negocio
│   │   ├── routes/        # Endpoints
│   │   └── middlewares/   # Auth, upload, error handler
│   ├── db/                # schema.sql, seed.sql
│   └── uploads/           # Imágenes de productos
├── frontend/
│   └── src/
│       ├── components/    # Header, Footer, ProductCard
│       ├── pages/         # Home, Catalog, Cart, Checkout, Admin, Seller
│       ├── services/      # API calls
│       └── store/         # Zustand (auth, cart)
└── docker-compose.mongo.yml
```

## Instalación

### 1. MongoDB (Docker)
```bash
docker compose -f docker-compose.mongo.yml up -d
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env  # editar variables
node server.js
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Base de datos

- **MySQL**: Usuarios, productos, categorías, inventario, pedidos, cupones (compartido con plataforma educativa en Docker)
- **MongoDB**: Reseñas con fotos y comentarios (contenedor dedicado)

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos (público) |
| GET | `/api/products/:id` | Detalle de producto |
| GET | `/api/categories` | Listar categorías (público) |
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login |
| POST | `/api/reviews` | Crear reseña (auth, con fotos) |
| GET | `/api/reviews/product/:id` | Reseñas de producto |
| POST | `/api/culqi/token` | Crear token de tarjeta |
| POST | `/api/culqi/charge` | Procesar pago (auth) |
| GET | `/api/admin/dashboard` | Métricas (admin) |
| POST | `/api/admin/products` | Crear producto (admin) |
| GET | `/api/inventory/my-store` | Inventario tienda (vendedor) |

## Reglas de negocio

- **Precio mayorista**: Automático al agregar 3+ pares al carrito
- **Inventario por sede**: Trujillo y Lima independientes
- **Roles**: CLIENTE, ADMIN, VENDEDOR_TRUJILLO, VENDEDOR_LIMA, FABRICA
- **Reseñas verificadas**: Solo usuarios que compraron y recibieron el producto

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@dibas.com | test123 |
| Cliente | cliente@test.com | test123 |
| Vendedor Trujillo | vendedor.t@dibas.com | test123 |
| Vendedor Lima | vendedor.l@dibas.com | test123 |
