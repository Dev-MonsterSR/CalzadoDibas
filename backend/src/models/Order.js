import pool from '../config/db.js';

export const Order = {
  async create({ user_id, total, subtotal, discount_applied = false, delivery_method, delivery_location = null, payment_method, payment_proof = null }) {
    const [result] = await pool.execute(
      `INSERT INTO orders (user_id, total, subtotal, discount_applied, delivery_method, delivery_location, payment_method, payment_proof)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, total, subtotal, discount_applied ? 1 : 0, delivery_method, delivery_location || null, payment_method, payment_proof || null]
    );
    return result.insertId;
  },

  async addItem({ order_id, product_id, quantity, price_at_purchase, warehouse }) {
    await pool.execute(
      'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, warehouse) VALUES (?, ?, ?, ?, ?)',
      [order_id, product_id, quantity, price_at_purchase, warehouse]
    );
  },

  async decrementStock(productId, warehouse, quantity) {
    await pool.execute(
      'UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND warehouse = ? AND stock >= ?',
      [quantity, productId, warehouse, quantity]
    );
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    if (!rows.length) return null;

    const order = rows[0];

    const [items] = await pool.execute(
      `SELECT oi.*, p.name as product_name, p.code as product_code
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [id]
    );
    order.items = items;

    return order;
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safeOffset = ((parseInt(page) || 1) - 1) * safeLimit;

    // Count
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total;

    // Items
    const [rows] = await pool.execute(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [userId]
    );

    // Fetch items for each order
    for (const order of rows) {
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.code as product_code
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return { orders: rows, total, page: parseInt(page), limit: safeLimit };
  },

  async findAll({ status = null, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const values = [];

    if (status) {
      conditions.push('o.status = ?');
      values.push(status);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safeOffset = ((parseInt(page) || 1) - 1) * safeLimit;

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT o.*, u.name as customer_name, u.email as customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      values
    );

    for (const order of rows) {
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.code as product_code
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return { orders: rows, total, page: parseInt(page), limit: safeLimit };
  },

  async updateStatus(id, status) {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  async updatePaymentProof(id, paymentProof) {
    await pool.execute('UPDATE orders SET payment_proof = ? WHERE id = ?', [paymentProof, id]);
    return this.findById(id);
  },

  async updateTrackingCode(id, trackingCode) {
    await pool.execute('UPDATE orders SET tracking_code = ? WHERE id = ?', [trackingCode, id]);
    return this.findById(id);
  }
};
