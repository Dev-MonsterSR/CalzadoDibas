import { Router } from 'express';
import { body } from 'express-validator';
import * as orderController from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/auth.js';
import { uploadPaymentProof } from '../middlewares/upload.js';
import QRCode from 'qrcode';
import pool from '../config/db.js';

const router = Router();

// All routes require auth
router.use(verifyToken);

// POST /api/orders - create order
router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('El carrito debe tener al menos un producto'),
  body('items.*.product_id').isInt().withMessage('product_id debe ser un número'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity debe ser al menos 1'),
  body('delivery_method').isIn(['recojo_tienda', 'envio_agencia']).withMessage('Método de entrega inválido'),
  body('delivery_location').optional({ nullable: true }).isIn(['trujillo', 'lima']).withMessage('Ubicación inválida'),
  body('payment_method').isIn(['culqi', 'yape', 'plin']).withMessage('Método de pago inválido')
], orderController.createOrder);

// GET /api/orders/my-orders - user's orders
router.get('/my-orders', orderController.getMyOrders);

// GET /api/orders/:id - order detail
router.get('/:id', orderController.getOrderDetail);

// POST /api/orders/:id/payment-proof - upload payment voucher
router.post('/:id/payment-proof', uploadPaymentProof.single('proof'), orderController.uploadPaymentProofHandler);

// GET /api/orders/:id/qr - generate QR code for pickup
router.get('/:id/qr', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE o.id = ? AND o.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    const order = rows[0];

    if (order.delivery_method !== 'recojo_tienda') {
      return res.status(400).json({ message: 'Esta orden no es para recojo en tienda' });
    }

    const qrData = JSON.stringify({
      type: 'pickup',
      order_id: order.id,
      location: order.delivery_location,
      total: order.total,
      customer: order.customer_name
    });

    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.json({ qr_code: qrCode, order_id: order.id, location: order.delivery_location });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ message: 'Error al generar QR' });
  }
});

export default router;
