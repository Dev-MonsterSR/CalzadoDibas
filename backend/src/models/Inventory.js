import pool from '../config/db.js';

export const Inventory = {
  async getByWarehouse(warehouse) {
    const [rows] = await pool.execute(
      `SELECT i.id, i.product_id, i.warehouse, i.stock, i.min_stock,
              p.name as product_name, p.code as product_code, p.is_active
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.warehouse = ?
       ORDER BY p.name ASC`,
      [warehouse]
    );
    // Add low_stock flag
    return rows.map(r => ({
      ...r,
      low_stock: r.stock <= r.min_stock
    }));
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT i.*, p.name as product_name, p.code as product_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStock(id, stock) {
    const [result] = await pool.execute(
      'UPDATE inventory SET stock = ? WHERE id = ?',
      [stock, id]
    );
    return this.findById(id);
  },

  async getStockForProduct(productId, warehouse) {
    const [rows] = await pool.execute(
      'SELECT * FROM inventory WHERE product_id = ? AND warehouse = ?',
      [productId, warehouse]
    );
    return rows[0] || null;
  },

  async getLowStockAlerts(warehouse = null) {
    let query = `SELECT i.*, p.name as product_name, p.code as product_code
                 FROM inventory i
                 JOIN products p ON i.product_id = p.id
                 WHERE i.stock <= i.min_stock`;
    const values = [];

    if (warehouse) {
      query += ' AND i.warehouse = ?';
      values.push(warehouse);
    }

    query += ' ORDER BY i.stock ASC';

    const [rows] = await pool.execute(query, values);
    return rows;
  },

  async getPickupOrders(warehouse) {
    // Map warehouse to delivery_location
    const locationMap = {
      'tienda_trujillo': 'trujillo',
      'tienda_lima': 'lima'
    };
    const location = locationMap[warehouse];

    if (!location) return [];

    const [rows] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.delivery_method, o.created_at,
              u.name as customer_name, u.phone as customer_phone,
              o.qr_code
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.delivery_location = ?
       AND o.status IN ('pagado', 'preparando')
       ORDER BY o.created_at ASC`,
      [location]
    );

    // Add items to each order
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

    return rows;
  },

  async markOrderDelivered(orderId) {
    await pool.execute(
      "UPDATE orders SET status = 'entregado' WHERE id = ?",
      [orderId]
    );
  }
};
