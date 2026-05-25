import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Nombre debe tener entre 2 y 150 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/)
    .withMessage('Nombre solo puede contener letras y espacios'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Contraseña debe tener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('Contraseña debe tener al menos un número')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Contraseña debe tener al menos un carácter especial'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^9\d{8}$/)
    .withMessage('Teléfono debe ser un número peruano válido (9 dígitos, empieza con 9)'),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 300 })
    .withMessage('Dirección no puede tener más de 300 caracteres')
], authController.register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], authController.login);

// POST /api/auth/google
router.post('/google', authController.loginGoogle);

// GET /api/auth/profile (requires auth)
router.get('/profile', verifyToken, authController.getProfile);

// PUT /api/auth/profile (requires auth)
router.put('/profile', verifyToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Nombre debe tener entre 2 y 150 caracteres'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^9\d{8}$/)
    .withMessage('Teléfono debe ser un número peruano válido (9 dígitos, empieza con 9)'),
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 300 })
    .withMessage('Dirección no puede tener más de 300 caracteres')
], authController.updateProfile);

// POST /api/auth/change-password (requires auth)
router.post('/change-password', verifyToken, [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Nueva contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Nueva contraseña debe tener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('Nueva contraseña debe tener al menos un número')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Nueva contraseña debe tener al menos un carácter especial')
], authController.changePassword);

export default router;
