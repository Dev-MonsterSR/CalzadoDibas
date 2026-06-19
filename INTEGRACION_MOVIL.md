# Guía de Integración — App Móvil (Trabajador)

Documento para el equipo de desarrollo móvil. Explica cómo autenticarse, consumir los 4 endpoints, manejar errores y el ciclo de vida del token.

## 🌐 URL Base

```
https://calzado.juanangel.me/api
```

⚠️ **SIEMPRE** enviar header `User-Agent: <NombreApp>/<versión>`. Cloudflare bloquea requests sin User-Agent con 403.

---

## 🔐 Autenticación (CRÍTICO)

### El problema
Los 4 endpoints móviles (login, get order, deliver, deliveries) NO son públicos. Requieren un **JWT token** en cada request.

### Flujo de autenticación

```
┌─────────────┐                              ┌─────────────┐
│ App Móvil   │  POST /api/login            │  Backend    │
│             │ ─────────────────────────>  │             │
│ 1) Login    │  { email, password }         │             │
│             │  <─────────────────────────  │             │
│             │  { token, employee }         │             │
│             │                               │             │
│ 2) Guardar  │  token en localStorage/     │             │
│    token    │  SecureStorage               │             │
│             │                               │             │
│ 3) Cada     │  GET /api/orders/13          │             │
│   request   │  Authorization: Bearer <jwt>  │             │
│             │ ─────────────────────────>  │ Valida JWT  │
│             │  <─────────────────────────  │ y responde  │
│             │  { order }                   │             │
└─────────────┘                              └─────────────┘
```

### Paso 1: Login (OBTENER token)

```http
POST /api/login
Content-Type: application/json
User-Agent: DibasMobileApp/1.0

{
  "email": "vendedor.t@dibas.com",
  "password": "test123"
}
```

**Response 200**:
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miw...",  // ← ESTE ES EL QUE NECESITAN
  "employee": {
    "id": 2,
    "name": "Vendedor Trujillo",
    "email": "vendedor.t@dibas.com",
    "role": "vendedor_trujillo",
    "phone": "999111222",
    "store": "Trujillo"  // "Trujillo" | "Lima" | "Fábrica" | null
  }
}
```

**El campo `token` es lo que falta en sus requests.** Es un JWT firmado, vence en 7 días.

### Paso 2: Enviar token en cada request

```http
GET /api/orders/13
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miw...
User-Agent: DibasMobileApp/1.0
```

```http
POST /api/orders/13/deliver
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miw...
User-Agent: DibasMobileApp/1.0
Content-Type: application/json

{}
```

```http
GET /api/employees/2/deliveries?date=today
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miw...
User-Agent: DibasMobileApp/1.0
```

---

## 📱 Implementación Recomendada (código)

### Android (Kotlin + Retrofit)

```kotlin
object ApiClient {
    private const val BASE_URL = "https://calzado.juanangel.me/api/"
    private val USER_AGENT = "DibasMobileApp/${BuildConfig.VERSION_NAME}"

    private val authInterceptor = Interceptor { chain ->
        val prefs = getSharedPreferences("dibas", MODE_PRIVATE)
        val token = prefs.getString("token", null)
        val request = chain.request().newBuilder()
            .header("User-Agent", USER_AGENT)
            .apply { if (token != null) header("Authorization", "Bearer $token") }
            .build()
        chain.proceed(request)
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .build()

    val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}

interface DibasApi {
    @POST("login")
    suspend fun login(@Body credentials: LoginRequest): LoginResponse

    @GET("orders/{id}")
    suspend fun getOrder(@Path("id") orderId: Int): OrderResponse

    @POST("orders/{id}/deliver")
    suspend fun deliverOrder(@Path("id") orderId: Int): DeliverResponse

    @GET("employees/{id}/deliveries")
    suspend fun getDeliveries(
        @Path("id") employeeId: Int,
        @Query("date") date: String? = null
    ): DeliveriesResponse
}

// Guardar token después de login
fun saveToken(context: Context, token: String, employee: Employee) {
    context.getSharedPreferences("dibas", Context.MODE_PRIVATE)
        .edit()
        .putString("token", token)
        .putInt("employee_id", employee.id)
        .putString("employee_name", employee.name)
        .putString("employee_store", employee.store ?: "")
        .apply()
}
```

### iOS (Swift + URLSession)

```swift
class DibasAPI {
    static let shared = DibasAPI()
    let baseURL = "https://calzado.juanangel.me/api"
    let userAgent = "DibasMobileApp/1.0"

    func login(email: String, password: String, completion: @escaping (Result<LoginResponse, Error>) -> Void) {
        var request = URLRequest(url: URL(string: "\(baseURL)/login")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        URLSession.shared.dataTask(with: request) { data, response, error in
            // ... parsear JSON
            // Guardar token en Keychain
            // self.saveToken(token)
        }.resume()
    }

    func getOrder(id: Int, completion: @escaping (Result<Order, Error>) -> Void) {
        let token = loadToken()  // del Keychain
        var request = URLRequest(url: URL(string: "\(baseURL)/orders/\(id)")!)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: request) { ... }.resume()
    }

    // Similar para deliver y getDeliveries
}
```

### Flutter / React Native / Ionic

```javascript
const API = 'https://calzado.juanangel.me/api';
const USER_AGENT = 'DibasMobileApp/1.0';

async function login(email, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  // Guardar token en AsyncStorage / SecureStore
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('employee', JSON.stringify(data.employee));
  return data;
}

async function getOrder(orderId) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API}/orders/${orderId}`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    // Token expirado, redirigir a login
    await AsyncStorage.removeItem('token');
    throw new Error('SESSION_EXPIRED');
  }
  return res.json();
}

async function deliverOrder(orderId) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API}/orders/${orderId}/deliver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  return res.json();
}

async function getMyDeliveries(employeeId) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API}/employees/${employeeId}/deliveries?date=today`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Authorization': `Bearer ${token}`,
    },
  });
  return res.json();
}
```

---

## 🔄 Flujo Típico de la App

```
1. App se abre
   → Lee token de AsyncStorage
   → Si existe, va a "Inicio"
   → Si no, va a "Login"

2. Usuario escribe email/password
   → POST /api/login
   → Guarda token + employee en storage
   → Navega a "Inicio"

3. Pantalla "Inicio" (Home)
   → Muestra datos del employee: "Hola {name}, tienda {store}"
   → Botón "Escanear QR"

4. Usuario escanea QR (que contiene un JWT con orderId)
   → El QR ya viene con el orderId del cliente
   → GET /api/orders/{orderId}
   → Muestra: imagen, nombre zapato, talla, cliente, total

5. Usuario confirma entrega
   → POST /api/orders/{orderId}/deliver
   → Muestra "Entrega confirmada ✓"
   → Vuelve a "Inicio"

6. Usuario abre "Historial del día"
   → GET /api/employees/{employee.id}/deliveries?date=today
   → Lista las entregas del día
```

---

## ⚠️ Manejo de Errores

| Status | Causa | Acción en la app |
|--------|-------|-------------------|
| 200/201 | OK | Continuar |
| 400 | Validación falló (ej: orden en estado incorrecto) | Mostrar `message` del backend al usuario |
| 401 | Token inválido / expirado | Borrar token, redirigir a login |
| 403 | Sin permisos (sede incorrecta, no es empleado) | Mostrar mensaje + logout |
| 404 | Pedido/empleado no existe | Mostrar "No encontrado" |
| 500 | Bug del servidor | Mostrar "Error del servidor, reintenta" |

**Importante**: el `message` que devuelve el backend está en español, listo para mostrar al usuario.

---

## 📦 Estructura de Respuestas (TypeScript-like)

```typescript
// LoginResponse
{
  message: string;
  token: string;        // JWT para enviar en Authorization
  employee: {
    id: number;
    name: string;
    email: string;
    role: 'vendedor_trujillo' | 'vendedor_lima' | 'admin' | 'fabrica';
    phone: string | null;
    store: 'Trujillo' | 'Lima' | 'Fábrica' | null;
  };
}

// OrderResponse (de GET /orders/:id)
{
  order: {
    id: number;
    status: 'pendiente' | 'pendiente_validacion' | 'pagado' | 'preparando' | 'enviado' | 'listo_recojo' | 'entregado' | 'cancelado' | 'rechazado_pago';
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    total: string;  // decimal como string
    boleta_number: string | null;
    delivery_method: 'recojo_tienda' | 'envio_agencia';
    delivery_location: 'trujillo' | 'lima' | null;
    items: Array<{
      id: number;
      product_id: number;
      product_name: string;
      product_code: string;  // SKU
      size: number | null;
      quantity: number;
      price_at_purchase: string;
      warehouse: 'fabrica' | 'tienda_trujillo' | 'tienda_lima';
      image_url: string | null;  // ⚠️ OBLIGATORIO en el response
    }>;
    delivered_at: string | null;
    delivered_by: number | null;
    created_at: string;  // ISO 8601
  };
}

// DeliverResponse
{
  success: boolean;
  message: string;
  order: Order;
}

// DeliveriesResponse
{
  employee: { id: number; name: string; role: string };
  date: string;  // YYYY-MM-DD
  count: number;
  deliveries: Array<Order>;  // misma estructura que OrderResponse.order
}
```

---

## 🧪 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Vendedor Trujillo | `vendedor.t@dibas.com` | `test123` |
| Vendedor Lima | `vendedor.l@dibas.com` | `test123` |
| Admin | `admin@dibas.com` | `test123` |
| Fábrica | (no creado en seed) | (no creado en seed) |

**NO usar `cliente@test.com` para login móvil** — el endpoint `/api/login` rechaza clientes con 403 "Tu cuenta no tiene permisos de empleado".

---

## ⏰ Vigencia del Token

- **7 días** desde el login (configurable en backend con `JWT_EXPIRES=7d`).
- Después de 7 días, el token expira y todas las requests devuelven 401.
- **Solución**: antes de que expire, llamar a `POST /api/login` de nuevo para obtener uno nuevo.
- **Recomendación**: en la app, si una request devuelve 401, intentar login de nuevo automáticamente (si hay credenciales guardadas) o pedir al usuario que ingrese password.

---

## 🔒 Seguridad

1. **HTTPS obligatorio**: el dominio usa Cloudflare con SSL. Nunca usar HTTP.
2. **Almacenar token seguro**:
   - Android: `EncryptedSharedPreferences` o `KeyStore`
   - iOS: `Keychain`
   - Flutter/React Native: `flutter_secure_storage` / `react-native-keychain`
   - **Nunca** en texto plano en SharedPreferences/AsyncStorage
3. **No loggear el token** en consola de la app
4. **Cerrar sesión**: borrar token del storage + limpiar interceptor
5. **Certificate pinning** (opcional): para máxima seguridad, fijar el cert de Cloudflare

---

## 📋 Resumen para el equipo móvil

```
ENDPOINTS:
  POST   /api/login                          → obtener token
  GET    /api/orders/{id}                   → ver pedido (necesita token)
  POST   /api/orders/{id}/deliver           → entregar (necesita token)
  GET    /api/employees/{id}/deliveries?date=today  → historial (necesita token)

HEADERS OBLIGATORIOS:
  User-Agent: TuApp/1.0
  Authorization: Bearer <token>  (excepto en /api/login)

BASE URL: https://calzado.juanangel.me/api

FLUJO:
  1. Login → guardar token
  2. Cada request → enviar token en header
  3. Si 401 → re-login
  4. Si token expira (7d) → re-login
```

---

## 🆘 Soporte

Si la app móvil tiene problemas:
1. **Verificar el header `User-Agent`**: si falta, Cloudflare devuelve 403.
2. **Verificar que el token no esté expirado**: decodea el JWT en jwt.io y mira el campo `exp`.
3. **Logs del backend en VPS**: `ssh MinecracitoServer 'docker logs dibas-backend --tail 50'` muestra cada request con status.
4. **Logs de Cloudflare**: disponibles en el dashboard de Cloudflare con el dominio `calzado.juanangel.me`.
