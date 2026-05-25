import { Router } from 'express';
import { body } from 'express-validator';
import * as adminController from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as productController from '../controllers/productController.js';

const router = Router();

// All admin routes require auth + admin/fabrica role
router.use(verifyToken, requireRole('admin', 'fabrica'));

// GET /api/admin/dashboard - metrics
router.get('/dashboard', adminController.getDashboard);

// GET /api/admin/reports/excel - export report (CSV)
router.get('/reports/excel', adminController.exportExcel);

// --- Product CRUD ---
// GET /api/admin/products - list all products (including inactive)
router.get('/products', adminController.listAdminProducts);

// POST /api/admin/products - create product
router.post('/products', upload.array('images', 10), productController.createProduct);

// PUT /api/admin/products/:id - update product
router.put('/products/:id', productController.updateProduct);

// DELETE /api/admin/products/:id - delete product
router.delete('/products/:id', productController.deleteProduct);

// POST /api/admin/products/:id/images - upload images
router.post('/products/:id/images', upload.array('images', 10), productController.uploadProductImages);

// DELETE /api/admin/products/:id/images/:imageId - delete image
router.delete('/products/:id/images/:imageId', productController.deleteProductImage);

// PUT /api/admin/products/:id/images/:imageId/primary - set primary image
router.put('/products/:id/images/:imageId/primary', productController.setPrimaryImage);

// --- Order management ---
// GET /api/admin/orders - list all orders
router.get('/orders', adminController.getAllOrders);

// PUT /api/admin/orders/:id/status - update order status
router.put('/orders/:id/status', [
  body('status').isIn(['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado']).withMessage('Estado inválido')
], adminController.updateOrderStatus);

// --- Category CRUD ---
// GET /api/admin/categories
router.get('/categories', adminController.listCategories);

// POST /api/admin/categories
router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Nombre requerido'),
  body('slug').trim().notEmpty().withMessage('Slug requerido')
], adminController.createCategory);

// PUT /api/admin/categories/:id
router.put('/categories/:id', [
  body('name').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('slug').optional().trim().notEmpty().withMessage('Slug no puede estar vacío')
], adminController.updateCategory);

// PUT /api/admin/categories/:id/toggle
router.put('/categories/:id/toggle', adminController.toggleCategory);

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', adminController.deleteCategory);

// --- User management ---
router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/toggle-active', adminController.toggleUserActive);

// --- Coupon CRUD ---
// GET /api/admin/coupons
router.get('/coupons', adminController.listCoupons);

// POST /api/admin/coupons
router.post('/coupons', [
  body('code').trim().notEmpty().withMessage('Código requerido'),
  body('discount_percent').isFloat({ min: 0, max: 100 }).withMessage('Descuento debe ser entre 0 y 100'),
  body('valid_from').isISO8601().withMessage('Fecha inválida'),
  body('valid_until').isISO8601().withMessage('Fecha inválida')
], adminController.createCoupon);

// PUT /api/admin/coupons/:id
router.put('/coupons/:id', adminController.updateCoupon);

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', adminController.deleteCoupon);

export default router;
