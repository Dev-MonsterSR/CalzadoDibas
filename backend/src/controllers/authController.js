import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { body, validationResult } from 'express-validator';

const JWT_SECRET = process.env.jwt_secret || 'dibas_jwt_secret_dev_change_in_production_2026';
const JWT_EXPIRES = process.env.jwt_expires || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function sanitizeUser(user) {
  const { password, google_id, ...safeUser } = user;
  return safeUser;
}

export async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Error de validación', errors: errors.array() });
    }

    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'cliente',
      phone: phone || null,
      address: address || null
    });

    const user = await User.findById(userId);
    const token = generateToken(user);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Error de validación', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
    }

    // Check if user has password (not Google-only account)
    if (!user.password) {
      return res.status(401).json({ message: 'Esta cuenta fue creada con Google. Usa login con Google.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login exitoso',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    next(err);
  }
}

export async function loginGoogle(req, res, next) {
  try {
    const { google_id, name, email } = req.body;

    if (!google_id || !email) {
      return res.status(400).json({ message: 'Datos de Google incompletos.' });
    }

    // Check if user exists
    let user = await User.findByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user from Google
      const userId = await User.create({
        name,
        email,
        password: null,
        role: 'cliente',
        google_id
      });
      user = await User.findById(userId);
      isNewUser = true;
    } else if (!user.google_id) {
      // Link Google account
      await User.update(user.id, { google_id });
      user = await User.findById(user.id);
    }

    // Si el usuario no tiene telefono (cosa importante para entregas), pedirlo.
    // El frontend abrira un modal y llamara a completeGoogleProfile.
    if (!user.phone) {
      return res.json({
        requires_phone: true,
        is_new_user: isNewUser,
        google_id,
        email,
        name: user.name,
      });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login con Google exitoso',
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    next(err);
  }
}

// Completa el perfil de un usuario autenticado por Google (solo el telefono es obligatorio)
export async function completeGoogleProfile(req, res, next) {
  try {
    const { google_id, phone, address } = req.body;

    if (!google_id) {
      return res.status(400).json({ message: 'Falta google_id.' });
    }
    if (!phone || !/^9\d{8}$/.test(phone)) {
      return res.status(400).json({ message: 'Telefono invalido. Debe empezar con 9 y tener 9 digitos.' });
    }

    const user = await User.findByGoogleId(google_id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado. Inicia sesion con Google primero.' });
    }

    await User.update(user.id, { phone, address: address || user.address });
    const updated = await User.findById(user.id);
    const token = generateToken(updated);

    res.json({
      message: 'Perfil completado',
      token,
      user: sanitizeUser(updated)
    });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone, address } = req.body;
    const user = await User.update(req.user.id, { name, phone, address });
    res.json({ message: 'Perfil actualizado', user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'Esta cuenta usa login con Google. No tiene contraseña.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(req.user.id, { password: hashedPassword });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    next(err);
  }
}
