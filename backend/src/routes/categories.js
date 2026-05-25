import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/categories - public list
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ total: rows.length, categories: rows });
  } catch (err) {
    console.error('Error listing categories:', err);
    res.status(500).json({ message: 'Error al listar categorías' });
  }
});

export default router;
