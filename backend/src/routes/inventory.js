import { Router } from 'express';
import { body } from 'express-validator';
import * as inventoryController from '../controllers/inventoryController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// All inventory routes require auth + seller/admin role
router.use(verifyToken, requireRole('vendedor_trujillo', 'vendedor_lima', 'fabrica', 'admin'));

// GET /api/inventory/my-store - stock of user's store
router.get('/my-store', inventoryController.getMyStoreInventory);

// GET /api/inventory/pickup-orders - orders ready for pickup at user's store
router.get('/pickup-orders', inventoryController.getPickupOrders);

// PUT /api/inventory/pickup/:orderId - mark order as delivered
router.put('/pickup/:orderId', inventoryController.markOrderDelivered);

// PUT /api/inventory/:id - update stock
router.put('/:id', [
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un número entero no negativo')
], inventoryController.updateInventoryStock);

// GET /api/inventory/low-stock - low stock alerts
router.get('/low-stock', inventoryController.getLowStockAlerts);

export default router;
