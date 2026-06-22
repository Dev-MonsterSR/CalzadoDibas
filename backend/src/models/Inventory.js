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
    
    const inventoryWithSizes = await Promise.all(rows.map(async (r) => {
      const sizes = await this.getSizesByInventoryId(r.id);
      return {
        ...r,
        low_stock: r.stock <= r.min_stock,
        sizes
      };
    }));
    
    return inventoryWithSizes;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT i.*, p.name as product_name, p.code as product_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    
    const inventory = rows[0];
    inventory.sizes = await this.getSizesByInventoryId(id);
    
    return inventory;
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
    if (!rows[0]) return null;
    
    const inventory = rows[0];
    inventory.sizes = await this.getSizesByInventoryId(inventory.id);
    
    return inventory;
  },

  async getStockByProductAllWarehouses(productId) {
    const [rows] = await pool.execute(
      `SELECT i.id, i.warehouse, i.stock, i.min_stock,
              (SELECT SUM(iz.stock) FROM inventory_sizes iz WHERE iz.inventory_id = i.id) as total_sizes_stock
       FROM inventory i
       WHERE i.product_id = ?`,
      [productId]
    );
    
    const inventoryWithSizes = await Promise.all(rows.map(async (r) => {
      const sizes = await this.getSizesByInventoryId(r.id);
      return {
        ...r,
        low_stock: r.stock <= r.min_stock,
        sizes
      };
    }));
    
    return inventoryWithSizes;
  },

  async getSizesByInventoryId(inventoryId) {
    const [rows] = await pool.execute(
      'SELECT size, stock FROM inventory_sizes WHERE inventory_id = ? ORDER BY size ASC',
      [inventoryId]
    );
    return rows;
  },

  async updateSizeStock(inventoryId, size, newStock) {
    const [result] = await pool.execute(
      `INSERT INTO inventory_sizes (inventory_id, size, stock) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stock = ?`,
      [inventoryId, size, newStock, newStock]
    );
    return result;
  },

  async adjustStock(inventoryId, size, quantityChange, movementType, reason, actorUserId, actorRole, referenceType = null, referenceId = null, externalConnection = null) {
    const useExternal = !!externalConnection;
    const connection = externalConnection || await pool.getConnection();

    try {
      if (!useExternal) await connection.beginTransaction();

      const [invRows] = await connection.execute(
        'SELECT * FROM inventory WHERE id = ? FOR UPDATE',
        [inventoryId]
      );

      if (!invRows[0]) {
        throw new Error('Inventario no encontrado');
      }

      const inventory = invRows[0];

      let stockBefore, stockAfter;

      if (size) {
        const [sizeRows] = await connection.execute(
          'SELECT stock FROM inventory_sizes WHERE inventory_id = ? AND size = ? FOR UPDATE',
          [inventoryId, size]
        );

        stockBefore = sizeRows[0]?.stock || 0;
        stockAfter = stockBefore + quantityChange;

        if (stockAfter < 0) {
          throw new Error(`Stock insuficiente para talla ${size}. Disponible: ${stockBefore}`);
        }

        await connection.execute(
          `INSERT INTO inventory_sizes (inventory_id, size, stock)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE stock = ?`,
          [inventoryId, size, stockAfter, stockAfter]
        );
      } else {
        stockBefore = inventory.stock;
        stockAfter = stockBefore + quantityChange;

        if (stockAfter < 0) {
          throw new Error(`Stock insuficiente. Disponible: ${stockBefore}`);
        }

        await connection.execute(
          'UPDATE inventory SET stock = ? WHERE id = ?',
          [stockAfter, inventoryId]
        );
      }

      await connection.execute(
        `INSERT INTO inventory_movements
         (inventory_id, product_id, warehouse, size, movement_type, quantity_change,
          stock_before, stock_after, reason, reference_type, reference_id,
          actor_user_id, actor_role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inventoryId, inventory.product_id, inventory.warehouse, size || null,
          movementType, quantityChange, stockBefore, stockAfter,
          reason || null, referenceType, referenceId,
          actorUserId, actorRole
        ]
      );

      if (!useExternal) await connection.commit();

      return {
        inventory_id: inventoryId,
        product_id: inventory.product_id,
        warehouse: inventory.warehouse,
        size,
        stock_before: stockBefore,
        stock_after: stockAfter,
        quantity_change: quantityChange,
        movement_type: movementType
      };
    } catch (err) {
      if (!useExternal) await connection.rollback();
      throw err;
    } finally {
      if (!useExternal) connection.release();
    }
  },

  /**
   * Ajusta stock de múltiples tallas en una sola transacción.
   * Recibe array de items con {size, quantity_change} y una razón compartida.
   * Recalcula inventory.stock una sola vez al final.
   * Registra N movimientos de inventario con la misma razón.
   */
  async adjustStockBatch(inventoryId, items, movementType, reason, actorUserId, actorRole) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock del inventory
      const [invRows] = await connection.execute(
        'SELECT * FROM inventory WHERE id = ? FOR UPDATE',
        [inventoryId]
      );
      if (!invRows[0]) throw new Error('Inventario no encontrado');
      const inventory = invRows[0];

      // Validar que cada size existe y tiene stock suficiente (si resta)
      for (const item of items) {
        const [sizeRows] = await connection.execute(
          'SELECT stock FROM inventory_sizes WHERE inventory_id = ? AND size = ? FOR UPDATE',
          [inventoryId, item.size]
        );
        const current = sizeRows[0]?.stock || 0;
        const after = current + item.quantity_change;
        if (after < 0) {
          throw new Error(`Stock insuficiente para talla ${item.size}. Disponible: ${current}, solicitado restar: ${Math.abs(item.quantity_change)}`);
        }
      }

      // Aplicar todos los ajustes
      const results = [];
      for (const item of items) {
        const [sizeRows] = await connection.execute(
          'SELECT stock FROM inventory_sizes WHERE inventory_id = ? AND size = ?',
          [inventoryId, item.size]
        );
        const stockBefore = sizeRows[0]?.stock || 0;
        const stockAfter = stockBefore + item.quantity_change;

        await connection.execute(
          `INSERT INTO inventory_sizes (inventory_id, size, stock)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE stock = ?`,
          [inventoryId, item.size, stockAfter, stockAfter]
        );

        // Registrar movimiento individual (auditoría)
        await connection.execute(
          `INSERT INTO inventory_movements
           (inventory_id, product_id, warehouse, size, movement_type, quantity_change,
            stock_before, stock_after, reason, reference_type, reference_id,
            actor_user_id, actor_role)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'adjust_batch', ?, ?, ?)`,
          [
            inventoryId, inventory.product_id, inventory.warehouse, item.size,
            movementType, item.quantity_change,
            stockBefore, stockAfter,
            reason, inventoryId, actorUserId, actorRole
          ]
        );

        results.push({ size: item.size, stock_before: stockBefore, stock_after: stockAfter, quantity_change: item.quantity_change });
      }

      // Recalcular inventory.stock total
      const [sumRows] = await connection.execute(
        'SELECT COALESCE(SUM(stock), 0) as total FROM inventory_sizes WHERE inventory_id = ?',
        [inventoryId]
      );
      const newTotal = sumRows[0].total;
      await connection.execute(
        'UPDATE inventory SET stock = ? WHERE id = ?',
        [newTotal, inventoryId]
      );

      await connection.commit();

      return {
        inventory_id: inventoryId,
        product_id: inventory.product_id,
        warehouse: inventory.warehouse,
        movements: results,
        total_after: newTotal
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async _recalculateTotalStock(connection, inventoryId) {
    const [rows] = await connection.execute(
      'SELECT COALESCE(SUM(stock), 0) as total FROM inventory_sizes WHERE inventory_id = ?',
      [inventoryId]
    );
    return rows[0].total;
  },

  async getMovements({ productId = null, warehouse = null, movementType = null, limit = 50, offset = 0 } = {}) {
    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    const safeOffset = parseInt(offset) || 0;
    
    let query = `
      SELECT im.*, 
             p.name as product_name, p.code as product_code,
             u.name as actor_name, u.email as actor_email
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.actor_user_id = u.id
      WHERE 1=1
    `;
    const values = [];

    if (productId) {
      query += ' AND im.product_id = ?';
      values.push(productId);
    }
    if (warehouse) {
      query += ' AND im.warehouse = ?';
      values.push(warehouse);
    }
    if (movementType) {
      query += ' AND im.movement_type = ?';
      values.push(movementType);
    }

    query += ` ORDER BY im.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await pool.execute(query, values);
    return rows;
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
