import pool from '../config/db.js';

export const User = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, phone, address, google_id, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByIdWithPassword(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByGoogleId(googleId) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE google_id = ?',
      [googleId]
    );
    return rows[0] || null;
  },

  async create({ name, email, password, role = 'cliente', phone = null, address = null, google_id = null }) {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role, phone, address, google_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, password || null, role, phone || null, address || null, google_id || null]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value !== undefined ? value : null);
    }
    values.push(id);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }
};
