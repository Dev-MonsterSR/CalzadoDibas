import { Router } from 'express';
import { body } from 'express-validator';
import * as reviewController from '../controllers/reviewController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// GET /api/reviews/product/:productId - public
router.get('/product/:productId', reviewController.getProductReviews);

// POST /api/reviews - requires auth
router.post('/', verifyToken, [
  body('product_id').isInt().withMessage('product_id debe ser un número'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating debe ser entre 1 y 5'),
  body('comment').optional({ nullable: true }).isString().trim(),
  body('photos').optional().isArray()
], reviewController.createReview);

// GET /api/reviews/my - user's own reviews
router.get('/my', verifyToken, reviewController.getUserReviews);

// PUT /api/reviews/:reviewId/moderate - admin only
router.put('/:reviewId/moderate', verifyToken, requireRole('admin'), [
  body('status').isIn(['approved', 'rejected', 'pending'])
], reviewController.moderateReview);

// POST /api/reviews/:reviewId/helpful - mark as helpful
router.post('/:reviewId/helpful', verifyToken, reviewController.markHelpful);

export default router;
