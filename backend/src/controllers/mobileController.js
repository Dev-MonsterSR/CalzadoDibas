import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Order } from '../models/Order.js';
import pool from '../config/db.js';

const JWT_SECRET = process.env.jwt_secret || 'dibas_jwt_secret_dev_change_in_production_2026';
const JWT_EXPIRES = process.env.jwt_expires || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

const STORE_BY_ROLE = {
  'vendedor_trujillo': 'Trujillo',
  'vendedor_lima': 'Lima',
  'fabrica': 'Fábrica',
  'admin': null,
  'cliente': null,
};

/**
 * POST /api/login
 * Alias de /api/auth/login optimizado para la app móvil del trabajador.
 * Devuelve token + datos del empleado (incluye ID, nombre y tienda).
 */
export async function mobileLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
    }
    const user = rows[0];

    if (!user.password) {
      return res.status(401).json({ message: 'Esta cuenta fue creada con Google. Usa login con Google.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
    }

    if (!['vendedor_trujillo', 'vendedor_lima', 'admin', 'fabrica'].includes(user.role)) {
      return res.status(403).json({ message: 'Tu cuenta no tiene permisos de empleado.' });
    }

    const token = generateToken(user);
    const { password: _, google_id, ...employee } = user;

    res.json({
      message: 'Login exitoso',
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        phone: employee.phone,
        store: STORE_BY_ROLE[employee.role] || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:id/deliver
 * Confirma la entrega de un pedido por parte del empleado.
 * Valida que la orden esté en `listo_recojo` y que pertenezca a la sede del vendedor.
 */
export async function deliverOrder(req, res, next) {
  try {
    const orderId = parseInt(req.params.id);
    if (!orderId) {
      return res.status(400).json({ message: 'order_id requerido.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    if (order.status !== 'listo_recojo') {
      return res.status(400).json({
        message: `La orden está en estado '${order.status}'. Debe estar 'listo_recojo' para entregar.`,
        current_status: order.status,
      });
    }

    // Validar que el empleado pertenece a la sede (o es admin)
    const roleLocation = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima',
    };
    const employeeLocation = roleLocation[req.user.role];
    if (employeeLocation && order.delivery_location !== employeeLocation) {
      return res.status(403).json({
        message: 'Esta orden no corresponde a tu tienda.',
        order_location: order.delivery_location,
        your_location: employeeLocation,
      });
    }

    const updated = await Order.markDeliveredWithActor(orderId, req.user.id);
    await Order.recordEvent({
      order_id: orderId,
      from_status: 'listo_recojo',
      to_status: 'entregado',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'mobile_delivery',
    });

    res.json({
      success: true,
      message: 'Entrega confirmada',
      order: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/employees/:id/deliveries?date=today
 * Lista las entregas del día (o de la fecha indicada) de un empleado específico.
 */
export async function getEmployeeDeliveries(req, res, next) {
  try {
    const employeeId = parseInt(req.params.id);
    if (!employeeId) {
      return res.status(400).json({ message: 'employee_id requerido.' });
    }

    // Solo el propio empleado o un admin puede ver su historial
    if (req.user.role !== 'admin' && req.user.id !== employeeId) {
      return res.status(403).json({ message: 'No tienes permiso para ver las entregas de otro empleado.' });
    }

    // Si date= hoy, vacío o 'today' → usar hoy; sino validar formato
    let date = null;
    const rawDate = req.query.date;
    if (rawDate && rawDate !== 'today' && rawDate !== '') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD o "today".' });
      }
      date = rawDate;
    }

    const [userRows] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [employeeId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    const deliveries = await Order.findDeliveriesByEmployee(employeeId, date);

    res.json({
      employee: userRows[0],
      date: date || new Date().toISOString().split('T')[0],
      count: deliveries.length,
      deliveries,
    });
  } catch (err) {
    next(err);
  }
}
