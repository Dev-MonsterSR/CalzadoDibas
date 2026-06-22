import { Router } from 'express';
import { body, query } from 'express-validator';
import * as inventoryController from '../controllers/inventoryController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(verifyToken, requireRole('vendedor_trujillo', 'vendedor_lima', 'fabrica', 'admin'));

router.get('/my-store', inventoryController.getMyStoreInventory);

router.get('/pickup-orders', inventoryController.getPickupOrders);

router.get('/delivered-today', inventoryController.getDeliveredToday);

router.get('/movements', inventoryController.getMovements);

router.get('/low-stock', inventoryController.getLowStockAlerts);

router.get('/product/:productId/stock', inventoryController.getProductStock);

router.post('/verify-qr', [
  body('token').trim().notEmpty().withMessage('Token QR requerido')
], inventoryController.verifyQR);

router.post('/adjust', [
  body('inventory_id').isInt({ min: 1 }).withMessage('inventory_id debe ser un entero positivo'),
  body('quantity_change').isInt().withMessage('quantity_change debe ser un entero'),
  body('reason').trim().isLength({ min: 3 }).withMessage('reason debe tener al menos 3 caracteres')
], inventoryController.adjustStock);

// Ajuste en batch (múltiples tallas con una sola razón)
router.post('/adjust-batch', [
  body('inventory_id').isInt({ min: 1 }).withMessage('inventory_id debe ser un entero positivo'),
  body('items').isArray({ min: 1 }).withMessage('items debe ser un array con al menos 1 elemento'),
  body('items.*.size').isInt().withMessage('Cada item debe tener size entero'),
  body('items.*.quantity_change').isInt().withMessage('Cada item debe tener quantity_change entero'),
  body('reason').trim().isLength({ min: 3 }).withMessage('reason debe tener al menos 3 caracteres')
], inventoryController.adjustStockBatch);

router.put('/pickup/:orderId', inventoryController.markOrderDelivered);

router.put('/:id', [
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un número entero no negativo')
], inventoryController.updateInventoryStock);

export default router;
