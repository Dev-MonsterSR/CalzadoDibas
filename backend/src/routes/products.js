import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { upload } from '../middlewares/upload.js';

const router = Router();

// GET /api/products - list with filters
router.get('/', productController.listProducts);

// GET /api/products/:id - product detail
router.get('/:id', productController.getProductDetail);

export default router;
