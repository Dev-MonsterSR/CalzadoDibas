import { Router } from 'express';
import { body } from 'express-validator';
import * as mobileController from '../controllers/mobileController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

/**
 * Rutas de la API móvil para trabajadores.
 *
 * Endpoints:
 *   POST /api/login                                    - Login empleado
 *   GET  /api/orders/:id                              - Detalle pedido (reusa el de /api/orders/:id)
 *   POST /api/orders/:id/deliver                       - Confirmar entrega
 *   GET  /api/employees/:id/deliveries?date=today      - Historial de entregas
 *
 * NOTA: GET /api/orders/:id está implementado en routes/orders.js y ahora
 * incluye image_url de la zapatilla principal en cada item (ver Order.findById).
 */

/**
 * POST /api/login
 * Login del empleado (vendedor o admin). Devuelve token + datos del empleado.
 * Público (no requiere token previo).
 */
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isString().isLength({ min: 1 }).withMessage('Contraseña requerida')
], mobileController.mobileLogin);

/**
 * POST /api/orders/:id/deliver
 * Confirma la entrega. Cambia estado a 'entregado'.
 * Requiere autenticación.
 */
router.post('/orders/:id/deliver', verifyToken, mobileController.deliverOrder);

/**
 * GET /api/employees/:id/deliveries?date=today
 * Historial de entregas del empleado (hoy o fecha específica).
 * Requiere autenticación.
 */
router.get('/employees/:id/deliveries', verifyToken, mobileController.getEmployeeDeliveries);

export default router;
