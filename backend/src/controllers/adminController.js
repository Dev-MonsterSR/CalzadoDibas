import pool from '../config/db.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { canTransition, canActorPerform } from '../domain/orderStateMachine.js';

export async function getDashboard(req, res, next) {
  try {
    // Total sales
    const [salesRows] = await pool.execute(
      "SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != 'cancelado'"
    );

    // Total users
    const [userRows] = await pool.execute("SELECT COUNT(*) as total_users FROM users");

    // Total categories
    const [catRows] = await pool.execute("SELECT COUNT(*) as total_categories FROM categories");

    // Total products
    const [prodRows] = await pool.execute("SELECT COUNT(*) as total_products FROM products");

    // Recent orders
    const [recentOrders] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.created_at, u.name as customer_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    // Top sellers
    const topSellers = await Product.getTopSellers(10);

    // Low stock alerts
    const [lowStock] = await pool.execute(
      `SELECT i.*, p.name as product_name, p.code as product_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.stock <= i.min_stock
       ORDER BY i.stock ASC
       LIMIT 20`
    );

    // Orders by status
    const [statusBreakdown] = await pool.execute(
      `SELECT status, COUNT(*) as count
       FROM orders
       GROUP BY status`
    );

    // Monthly sales (last 6 months)
    const [monthlySales] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE status != 'cancelado' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    res.json({
      total_orders: salesRows[0].total_orders,
      total_revenue: parseFloat(salesRows[0].total_revenue),
      total_users: userRows[0].total_users,
      total_categories: catRows[0].total_categories,
      total_products: prodRows[0].total_products,
      recent_orders: recentOrders,
      top_sellers: topSellers,
      low_stock: lowStock,
      status_breakdown: statusBreakdown,
      monthly_sales: monthlySales
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllOrders(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await Order.findAll({
      status: status || null,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status, tracking_code } = req.body;
    const validStatuses = ['pendiente', 'pendiente_validacion', 'pagado', 'preparando', 'enviado', 'listo_recojo', 'entregado', 'cancelado', 'rechazado_pago'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado de orden inválido.' });
    }

    const current = await Order.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    if (!canTransition(current.status, status)) {
      return res.status(400).json({ message: `Transición inválida: ${current.status} → ${status}` });
    }

    if (!canActorPerform(req.user.role, status)) {
      return res.status(403).json({ message: 'No tienes permiso para cambiar a este estado.' });
    }

    let order = await Order.updateStatus(req.params.id, status);

    await Order.recordEvent({
      order_id: req.params.id,
      from_status: current.status,
      to_status: status,
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'status_change',
    });

    if (tracking_code) {
      order = await Order.updateTrackingCode(req.params.id, tracking_code);
    }

    if (status === 'cancelado') {
      const [items] = await pool.execute(
        'SELECT product_id, quantity, warehouse FROM order_items WHERE order_id = ?',
        [req.params.id]
      );
      for (const item of items) {
        await pool.execute(
          'UPDATE inventory SET stock = stock + ? WHERE product_id = ? AND warehouse = ?',
          [item.quantity, item.product_id, item.warehouse]
        );
      }
    }

    res.json({ message: 'Estado de orden actualizado', order });
  } catch (err) {
    next(err);
  }
}

export async function approvePayment(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.status !== 'pendiente_validacion') {
      return res.status(400).json({ message: 'La orden no está pendiente de validación.' });
    }

    const updated = await Order.approvePayment(req.params.id, req.user.id);

    // Generar boleta al confirmar pago (Yape/Plin)
    if (!updated.boleta_number) {
      const boleta = await Order.setBoletaNumber(req.params.id);
      await pool.execute(
        'UPDATE orders SET boleta_number = ? WHERE id = ?',
        [boleta, req.params.id]
      );
      updated.boleta_number = boleta;
    }

    await Order.recordEvent({
      order_id: req.params.id,
      from_status: 'pendiente_validacion',
      to_status: 'pagado',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'voucher_approved',
    });

    res.json({ message: 'Pago aprobado', order: updated });
  } catch (err) {
    next(err);
  }
}

export async function rejectPayment(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'El motivo de rechazo es requerido.' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.status !== 'pendiente_validacion') {
      return res.status(400).json({ message: 'La orden no está pendiente de validación.' });
    }

    const updated = await Order.rejectPayment(req.params.id, req.user.id, reason);
    await Order.recordEvent({
      order_id: req.params.id,
      from_status: 'pendiente_validacion',
      to_status: 'rechazado_pago',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'voucher_rejected',
      payload: { reason },
    });

    res.json({ message: 'Pago rechazado', order: updated });
  } catch (err) {
    next(err);
  }
}

export async function shipOrder(req, res, next) {
  try {
    const { tracking_code, agency } = req.body;
    if (!tracking_code) return res.status(400).json({ message: 'Código de tracking requerido.' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.status !== 'preparando') {
      return res.status(400).json({ message: 'La orden debe estar en estado "preparando".' });
    }

    await Order.updateTrackingCode(req.params.id, tracking_code);
    const updated = await Order.updateStatus(req.params.id, 'enviado');

    await Order.recordEvent({
      order_id: req.params.id,
      from_status: 'preparando',
      to_status: 'enviado',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'tracking_added',
      payload: { tracking_code, agency },
    });

    res.json({ message: 'Orden enviada', order: updated });
  } catch (err) {
    next(err);
  }
}

export async function readyPickup(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.status !== 'preparando') {
      return res.status(400).json({ message: 'La orden debe estar en estado "preparando".' });
    }

    const updated = await Order.setReadyForPickup(req.params.id);
    await Order.recordEvent({
      order_id: req.params.id,
      from_status: 'preparando',
      to_status: 'listo_recojo',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'ready_for_pickup',
    });

    res.json({ message: 'Orden lista para recojo', order: updated });
  } catch (err) {
    next(err);
  }
}

// --- Category CRUD ---
export async function listCategories(req, res, next) {
  try {
    const categories = await Category.findAll();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: 'Nombre y slug son requeridos.' });
    }
    const id = await Category.create({ name, slug, description });
    const category = await Category.findById(id);
    res.status(201).json({ message: 'Categoría creada', category });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El nombre o slug ya existe.' });
    }
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    const { name, slug, description } = req.body;
    const category = await Category.update(req.params.id, { name, slug, description });
    res.json({ message: 'Categoría actualizada', category });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El nombre o slug ya existe.' });
    }
    next(err);
  }
}

export async function toggleCategory(req, res, next) {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    const category = await Category.toggleActive(req.params.id);
    res.json({ message: 'Estado actualizado', category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    const count = await Category.getProductCount(req.params.id);
    if (count > 0) {
      return res.status(400).json({ message: `No se puede eliminar: tiene ${count} productos asociados.` });
    }
    await Category.delete(req.params.id);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    next(err);
  }
}

// --- User management ---
export async function listUsers(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, phone, address, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const validRoles = ['cliente', 'admin', 'vendedor_trujillo', 'vendedor_lima', 'fabrica'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido.' });
    }
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    const [rows] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rol actualizado', user: rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function toggleUserActive(req, res, next) {
  try {
    await pool.execute('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    const [rows] = await pool.execute('SELECT id, name, email, is_active FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Estado actualizado', user: rows[0] });
  } catch (err) {
    next(err);
  }
}

// --- Coupon CRUD ---
export async function listCoupons(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: rows });
  } catch (err) {
    next(err);
  }
}

export async function createCoupon(req, res, next) {
  try {
    const { code, discount_percent, valid_from, valid_until, max_uses = 0 } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO coupons (code, discount_percent, valid_from, valid_until, max_uses) VALUES (?, ?, ?, ?, ?)',
      [code, parseFloat(discount_percent), valid_from || null, valid_until || null, parseInt(max_uses)]
    );
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Cupón creado', coupon: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El código de cupón ya existe.' });
    }
    next(err);
  }
}

export async function updateCoupon(req, res, next) {
  try {
    const { code, discount_percent, valid_from, valid_until, max_uses, is_active } = req.body;
    const fields = [];
    const values = [];

    if (code !== undefined) { fields.push('code = ?'); values.push(code); }
    if (discount_percent !== undefined) { fields.push('discount_percent = ?'); values.push(parseFloat(discount_percent)); }
    if (valid_from !== undefined) { fields.push('valid_from = ?'); values.push(valid_from); }
    if (valid_until !== undefined) { fields.push('valid_until = ?'); values.push(valid_until); }
    if (max_uses !== undefined) { fields.push('max_uses = ?'); values.push(parseInt(max_uses)); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron datos para actualizar.' });
    }

    values.push(req.params.id);
    await pool.execute(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cupón actualizado', coupon: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'El código de cupón ya existe.' });
    }
    next(err);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    await pool.execute('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cupón eliminado' });
  } catch (err) {
    next(err);
  }
}

// --- Excel Report ---
export async function exportExcel(req, res, next) {
  try {
    const [orders] = await pool.execute(
      `SELECT o.id, o.total, o.subtotal, o.status, o.delivery_method, o.delivery_location,
              o.payment_method, o.created_at, u.name as customer_name, u.email as customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );

    // Build CSV content
    const headers = ['ID Orden', 'Cliente', 'Email', 'Total', 'Subtotal', 'Estado', 'Método Entrega', 'Ubicación', 'Método Pago', 'Fecha'];
    const csvRows = [headers.join(',')];

    for (const order of orders) {
      csvRows.push([
        order.id,
        `"${order.customer_name}"`,
        order.customer_email,
        order.total,
        order.subtotal,
        order.status,
        order.delivery_method,
        order.delivery_location || '',
        order.payment_method,
        order.created_at
      ].join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for UTF-8

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dibas_reporte_' + new Date().toISOString().split('T')[0] + '.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

// --- Product list for admin ---
export async function listAdminProducts(req, res, next) {
  try {
    const { page, limit, is_active } = req.query;
    let conditions = [];
    const values = [];

    if (is_active !== undefined) {
      conditions.push('p.is_active = ?');
      values.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM products p ${whereClause}`, values);
    const total = countRows[0].total;

    // Pagination
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safeOffset = ((parseInt(page) || 1) - 1) * safeLimit;

    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      values
    );

    res.json({ products: rows, total, page: parseInt(page) || 1, limit: safeLimit });
  } catch (err) {
    next(err);
  }
}
