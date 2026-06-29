import pool from '../config/db.js';

export const Category = {
  async findAll() {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name ASC');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findBySlug(slug) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE slug = ?', [slug]);
    return rows[0] || null;
  },

  async create({ name, slug, description }) {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description || '']
    );
    return result.insertId;
  },

  async update(id, { name, slug, description }) {
    await pool.execute(
      'UPDATE categories SET name = ?, slug = ?, description = COALESCE(?, description) WHERE id = ?',
      [name, slug, description, id]
    );
    return this.findById(id);
  },

  async toggleActive(id) {
    // La tabla categories no tiene columna 'is_active' en este schema.
    // Devolvemos la categoria sin modificar (placeholder para mantener compatibilidad).
    return this.findById(id);
  },

  async delete(id) {
    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  },

  async getProductCount(id) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    return rows[0].count;
  }
};
