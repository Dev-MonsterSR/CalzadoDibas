import { Router } from 'express';
import { body } from 'express-validator';
import * as orderController from '../controllers/orderController.js';
import { verifyToken } from '../middlewares/auth.js';
import { uploadPaymentProof } from '../middlewares/upload.js';

const router = Router();

// Boleta: ruta pública con token via query (abre en nueva ventana sin headers)
// Debe ir ANTES de router.use(verifyToken)
router.get('/:id/boleta', orderController.getOrderBoleta);

router.use(verifyToken);

router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('El carrito debe tener al menos un producto'),
  body('items.*.product_id').isInt().withMessage('product_id debe ser un número'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity debe ser al menos 1'),
  body('delivery_method').isIn(['recojo_tienda', 'envio_agencia']).withMessage('Método de entrega inválido'),
  body('delivery_location').optional({ nullable: true }).isIn(['trujillo', 'lima']).withMessage('Ubicación inválida'),
  body('payment_method').isIn(['culqi', 'yape', 'plin']).withMessage('Método de pago inválido')
], orderController.createOrder);

router.get('/my-orders', orderController.getMyOrders);

router.get('/:id', orderController.getOrderDetail);

router.post('/:id/payment-proof', uploadPaymentProof.single('proof'), orderController.uploadPaymentProofHandler);

router.get('/:id/qr', orderController.getOrderQR);

router.get('/:id/events', orderController.getOrderEvents);

export default router;
