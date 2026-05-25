import pool from '../config/db.js';

export const Review = {
  async findByProductId(productId) {
    const [rows] = await pool.execute(
      `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [productId]
    );
    return rows;
  },

  async create({ user_id, product_id, rating, comment = null }) {
    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, product_id, rating, comment || null]
    );
    return result.insertId;
  },

  async userHasPurchased(userId, productId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'entregado'`,
      [userId, productId]
    );
    return rows[0].count > 0;
  },

  async userAlreadyReviewed(userId, productId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows[0].count > 0;
  }
};
