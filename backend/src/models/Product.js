import pool from '../config/db.js';

export const Product = {
  async findAll({ category = null, material = null, brand = null, min_price = null, max_price = null, search = null, page = 1, limit = 12 } = {}) {
    const conditions = ['p.is_active = 1'];
    const values = [];

    if (category) {
      conditions.push('c.slug = ?');
      values.push(category);
    }
    if (material) {
      conditions.push('p.material = ?');
      values.push(material);
    }
    if (brand) {
      conditions.push('p.brand = ?');
      values.push(brand);
    }
    if (min_price !== null) {
      conditions.push('p.price_retail >= ?');
      values.push(parseFloat(min_price));
    }
    if (max_price !== null) {
      conditions.push('p.price_retail <= ?');
      values.push(parseFloat(max_price));
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.code LIKE ?)');
      const searchVal = `%${search}%`;
      values.push(searchVal, searchVal, searchVal);
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    // Pagination - LIMIT/OFFSET must be interpolated as integers, not placeholders
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(parseInt(limit) || 12, 100);
    const safeOffset = parseInt(offset) || 0;

    const [rows] = await pool.execute(
      `SELECT p.id, p.category_id, p.name, p.description, p.price_wholesale, p.price_retail,
              p.code, p.material, p.brand, p.is_active, p.created_at, c.name as category_name, c.slug as category_slug,
              pi.image_url as primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      values
    );

    return { products: rows, total, page: parseInt(page), limit: safeLimit };
  },

  async findById(id) {
    // Get product
    const [productRows] = await pool.execute(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    if (!productRows.length) return null;

    const product = productRows[0];

    // Get images
    const [images] = await pool.execute(
      'SELECT id, image_url, is_primary, position FROM product_images WHERE product_id = ? ORDER BY position ASC',
      [id]
    );
    product.images = images;

    // Get inventory
    const [inventory] = await pool.execute(
      'SELECT warehouse, stock, min_stock FROM inventory WHERE product_id = ?',
      [id]
    );
    product.inventory = inventory.reduce((acc, inv) => {
      acc[inv.warehouse] = { stock: inv.stock, min_stock: inv.min_stock, low_stock: inv.stock <= inv.min_stock };
      return acc;
    }, {});

    // Get average rating
    const [ratingRows] = await pool.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE product_id = ?',
      [id]
    );
    product.avg_rating = parseFloat(ratingRows[0].avg_rating) || 0;
    product.review_count = parseInt(ratingRows[0].review_count) || 0;

    return product;
  },

  async create(data) {
    const { category_id, name, description, price_wholesale, price_retail, code, material, brand, is_active = true } = data;
    const [result] = await pool.execute(
      'INSERT INTO products (category_id, name, description, price_wholesale, price_retail, code, material, brand, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [category_id, name, description || null, price_wholesale, price_retail, code, material || null, brand || null, is_active ? 1 : 0]
    );

    // Create inventory entries for all warehouses
    if (result.insertId) {
      await pool.execute(
        'INSERT INTO inventory (product_id, warehouse, stock) VALUES (?, "fabrica", 0), (?, "tienda_trujillo", 0), (?, "tienda_lima", 0)',
        [result.insertId, result.insertId, result.insertId]
      );
    }

    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      if (key === 'is_active') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value !== undefined ? value : null);
      }
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);

    await pool.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async delete(id) {
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  },

  async getTopSellers(limit = 10) {
    const safeLimit = Math.min(parseInt(limit) || 10, 50);
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.code, SUM(oi.quantity) as total_sold
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelado'
       GROUP BY p.id, p.name, p.code
       ORDER BY total_sold DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }
};
