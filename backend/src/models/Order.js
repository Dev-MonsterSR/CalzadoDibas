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

  async addItem({ order_id, product_id, quantity, price_at_purchase, warehouse, size = null }) {
    await pool.execute(
      'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, warehouse, size) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, product_id, quantity, price_at_purchase, warehouse, size]
    );
  },

  async decrementStock(productId, warehouse, quantity) {
    await pool.execute(
      'UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND warehouse = ? AND stock >= ?',
      [quantity, productId, warehouse, quantity]
    );
  },

  /**
   * Descuenta stock de una talla específica.
   * Usa transacción explícita para garantizar consistencia:
   * 1) SELECT FOR UPDATE en inventory_sizes
   * 2) Validar que hay stock suficiente
   * 3) UPDATE inventory_sizes
   * 4) Recalcular y UPDATE inventory.stock
   * @returns true si se descontó, lanza error si no hay stock
   */
  async decrementStockBySize(productId, warehouse, size, quantity, externalConnection = null) {
    const useExternal = !!externalConnection;
    const connection = externalConnection || await pool.getConnection();
    try {
      if (!useExternal) await connection.beginTransaction();

      // 1. Obtener inventory_id con FOR UPDATE
      const [invRows] = await connection.execute(
        'SELECT id, stock FROM inventory WHERE product_id = ? AND warehouse = ? FOR UPDATE',
        [productId, warehouse]
      );
      if (!invRows[0]) {
        throw new Error(`No existe inventario para producto ${productId} en ${warehouse}`);
      }
      const inventoryId = invRows[0].id;

      // 2. Obtener stock de la talla con FOR UPDATE
      const [sizeRows] = await connection.execute(
        'SELECT stock FROM inventory_sizes WHERE inventory_id = ? AND size = ? FOR UPDATE',
        [inventoryId, size]
      );
      const stockBefore = sizeRows[0]?.stock || 0;

      if (stockBefore < quantity) {
        throw new Error(`Stock insuficiente para talla ${size}. Disponible: ${stockBefore}, solicitado: ${quantity}`);
      }

      // 3. Descontar de la talla
      await connection.execute(
        `UPDATE inventory_sizes SET stock = stock - ? WHERE inventory_id = ? AND size = ?`,
        [quantity, inventoryId, size]
      );

      // 4. Recalcular total
      const [sumRows] = await connection.execute(
        'SELECT COALESCE(SUM(stock), 0) as total FROM inventory_sizes WHERE inventory_id = ?',
        [inventoryId]
      );
      const newTotal = sumRows[0].total;
      await connection.execute(
        'UPDATE inventory SET stock = ? WHERE id = ?',
        [newTotal, inventoryId]
      );

      if (!useExternal) await connection.commit();
      return { inventoryId, size, quantity, stockBefore, stockAfter: stockBefore - quantity, totalAfter: newTotal };
    } catch (err) {
      if (!useExternal && connection) await connection.rollback();
      throw err;
    } finally {
      if (!useExternal) connection.release();
    }
  },

  /**
   * Registra un movimiento en inventory_movements (auditoría).
   * Usado desde el flujo de venta para dejar rastro de qué talla se vendió.
   */
  async recordInventoryMovement({ inventory_id, product_id, warehouse, size, movement_type, quantity_change, stock_before, stock_after, reason = null, reference_type = 'order', reference_id = null, actor_user_id = null, actor_role = 'sistema' }) {
    await pool.execute(
      `INSERT INTO inventory_movements
       (inventory_id, product_id, warehouse, size, movement_type, quantity_change,
        stock_before, stock_after, reason, reference_type, reference_id,
        actor_user_id, actor_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inventory_id, product_id, warehouse, size, movement_type, quantity_change,
       stock_before, stock_after, reason, reference_type, reference_id,
       actor_user_id, actor_role]
    );
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    if (!rows.length) return null;

    const order = rows[0];

    // Items con imagen primaria del producto (subquery para no romper N+1)
    const [items] = await pool.execute(
      `SELECT oi.*, p.name as product_name, p.code as product_code,
              (SELECT image_url FROM product_images pi
                WHERE pi.product_id = p.id AND pi.is_primary = 1
                ORDER BY pi.position ASC LIMIT 1) as image_url
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
  },

  async recordEvent({ order_id, from_status, to_status, actor_user_id, actor_role, event_type, payload }) {
    await pool.execute(
      `INSERT INTO order_events (order_id, from_status, to_status, actor_user_id, actor_role, event_type, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_id, from_status || null, to_status, actor_user_id || null, actor_role || null, event_type, payload ? JSON.stringify(payload) : null]
    );
  },

  async getEvents(orderId) {
    const [rows] = await pool.execute(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    return rows;
  },

  async approvePayment(orderId, adminUserId) {
    await pool.execute(
      `UPDATE orders SET status = 'pagado', payment_validation_status = 'approved',
       payment_validated_by = ?, payment_validated_at = NOW() WHERE id = ?`,
      [adminUserId, orderId]
    );
    return this.findById(orderId);
  },

  async rejectPayment(orderId, adminUserId, reason) {
    await pool.execute(
      `UPDATE orders SET status = 'rechazado_pago', payment_validation_status = 'rejected',
       payment_validated_by = ?, payment_validated_at = NOW(), payment_rejection_reason = ? WHERE id = ?`,
      [adminUserId, reason, orderId]
    );
    return this.findById(orderId);
  },

  async setReadyForPickup(orderId) {
    await pool.execute(
      "UPDATE orders SET status = 'listo_recojo', ready_for_pickup_at = NOW() WHERE id = ?",
      [orderId]
    );
    return this.findById(orderId);
  },

  async markDeliveredWithActor(orderId, actorUserId) {
    await pool.execute(
      "UPDATE orders SET status = 'entregado', delivered_at = NOW(), delivered_by = ? WHERE id = ?",
      [actorUserId, orderId]
    );
    return this.findById(orderId);
  },

  /**
   * Genera el siguiente número correlativo de boleta con formato B001-NNNNN.
   * Usa la tabla counters con lock para evitar duplicados en concurrencia.
   */
  async nextBoletaNumber() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Lock del row
      const [rows] = await connection.execute(
        "SELECT value FROM counters WHERE name = 'boleta' FOR UPDATE"
      );
      let next = (rows[0]?.value || 0) + 1;
      await connection.execute(
        "UPDATE counters SET value = ? WHERE name = 'boleta'",
        [next]
      );
      await connection.commit();
      return `B001-${String(next).padStart(5, '0')}`;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Asigna número de boleta a una orden.
   */
  async setBoletaNumber(orderId) {
    const number = await this.nextBoletaNumber();
    await pool.execute(
      'UPDATE orders SET boleta_number = ? WHERE id = ?',
      [number, orderId]
    );
    return number;
  },

  async findPickupReadyByLocation(location) {
    const [rows] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.delivery_method, o.delivery_location,
              o.created_at, o.user_id,
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.delivery_location = ?
         AND o.delivery_method = 'recojo_tienda'
         AND o.status IN ('pagado', 'preparando', 'listo_recojo')
       ORDER BY
         CASE o.status
           WHEN 'listo_recojo' THEN 1
           WHEN 'preparando' THEN 2
           WHEN 'pagado' THEN 3
         END,
         o.created_at ASC`,
      [location]
    );
    for (const order of rows) {
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.code as product_code
         FROM order_items oi JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    return rows;
  },

  async findDeliveredTodayByLocation(location) {
    const [rows] = await pool.execute(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.delivery_location = ? AND o.status = 'entregado'
       AND DATE(o.delivered_at) = CURDATE()
       ORDER BY o.delivered_at DESC`,
      [location]
    );
    for (const order of rows) {
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name
         FROM order_items oi JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    return rows;
  },

  /**
   * Entregas del día (o de una fecha específica) realizadas por un empleado específico.
   * Usado por la app móvil del trabajador para ver su historial.
   * @param {number} employeeId - ID del vendedor/admin
   * @param {string} date - formato 'YYYY-MM-DD' (opcional, default = hoy)
   */
  async findDeliveriesByEmployee(employeeId, date = null) {
    const dateCondition = date ? 'DATE(o.delivered_at) = ?' : 'DATE(o.delivered_at) = CURDATE()';
    const values = [employeeId];
    if (date) values.push(date);

    const [rows] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.delivery_method, o.delivery_location,
              o.delivered_at, o.boleta_number, o.user_id,
              u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.delivered_by = ? AND o.status = 'entregado' AND ${dateCondition}
       ORDER BY o.delivered_at DESC`,
      values
    );

    // Cargar items con imagen para cada entrega
    for (const order of rows) {
      const [items] = await pool.execute(
        `SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase, oi.size, oi.warehouse,
                p.name as product_name, p.code as product_code,
                (SELECT image_url FROM product_images pi
                  WHERE pi.product_id = p.id AND pi.is_primary = 1
                  ORDER BY pi.position ASC LIMIT 1) as image_url
         FROM order_items oi JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    return rows;
  }
};
