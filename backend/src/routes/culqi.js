import { Router } from 'express';
import { body } from 'express-validator';
import * as culqiController from '../controllers/culqiController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

// GET /api/culqi/config - get public key and config (public)
router.get('/config', culqiController.getConfig);

// POST /api/culqi/pay - process card payment (requires auth)
router.post('/pay', verifyToken, [
  body('order_id').notEmpty().withMessage('Orden requerida'),
  body('card_number').notEmpty().withMessage('Número de tarjeta requerido'),
  body('cvv').notEmpty().withMessage('CVV requerido'),
  body('expiry_month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('expiry_year').isInt({ min: 2026, max: 2099 }).withMessage('Año inválido'),
  body('email').isEmail().withMessage('Email inválido'),
], culqiController.payWithCard);

// POST /api/culqi/webhook - Culqi payment webhook (no auth)
router.post('/webhook', culqiController.webhook);

// Legacy: Card token creation (public)
router.post('/token', [
  body('card_number').matches(/^\d{16}$/).withMessage('Número de tarjeta inválido'),
  body('cvv').matches(/^\d{3,4}$/).withMessage('CVV inválido'),
  body('expiry_month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('expiry_year').isInt({ min: 2026, max: 2099 }).withMessage('Año inválido'),
  body('email').isEmail().withMessage('Email inválido'),
], culqiController.createToken);

// Legacy: Direct charge (requires auth)
router.post('/charge', verifyToken, [
  body('token_id').notEmpty().withMessage('Token ID requerido'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('email').isEmail().withMessage('Email inválido'),
], culqiController.createCharge);

export default router;
