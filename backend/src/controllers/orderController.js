import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { uploadPaymentProof } from '../middlewares/upload.js';
import pool from '../config/db.js';
import QRCode from 'qrcode';
import { generateQRToken } from '../utils/qrToken.js';
import { canTransition } from '../domain/orderStateMachine.js';

export async function createOrder(req, res, next) {
  let connection;
  try {
    const { items, delivery_method, delivery_location, payment_method, coupon_code } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío.' });
    }

    // Validate each item has size and warehouse
    for (const item of items) {
      if (!item.size) {
        return res.status(400).json({ message: `Falta la talla del producto "${item.product_name || item.product_id}".` });
      }
      if (delivery_method === 'recojo_tienda' && !item.warehouse) {
        return res.status(400).json({ message: `Falta la sede del producto "${item.product_name || item.product_id}".` });
      }
    }

    // Validate delivery location matches method
    if (delivery_method === 'recojo_tienda' && !delivery_location) {
      return res.status(400).json({ message: 'Debes seleccionar una tienda para recojo.' });
    }

    // Map delivery location to warehouse
    const warehouseMap = {
      'trujillo': 'tienda_trujillo',
      'lima': 'tienda_lima'
    };
    // warehouse por defecto para cada item: la sede elegida (recojo) o 'fabrica' (envío)
    const defaultWarehouse = delivery_method === 'recojo_tienda'
      ? warehouseMap[delivery_location]
      : 'fabrica';

    // ========== PRIMER LOOP: validar productos y stock, calcular totalQuantity ==========
    let subtotal = 0;
    let totalQuantity = 0;
    const orderItems = [];
    const stockValidations = []; // {product_id, warehouse, size, quantity} para validar después

    for (const item of items) {
      const product = await Product.findById(parseInt(item.product_id));
      if (!product || !product.is_active) {
        return res.status(400).json({ message: `El producto "${item.product_name || item.product_id}" no está disponible.` });
      }

      const quantity = parseInt(item.quantity);
      if (quantity <= 0) {
        return res.status(400).json({ message: 'Cantidad inválida.' });
      }

      const size = parseInt(item.size);
      const warehouse = item.warehouse || defaultWarehouse;

      totalQuantity += quantity;
      orderItems.push({ product, size, quantity, warehouse });
      stockValidations.push({ product_id: product.id, warehouse, size, quantity });
    }

    // Determinar si aplica mayorista (basado en totalQuantity YA calculado)
    const isWholesale = totalQuantity >= 3;

    // ========== SEGUNDO LOOP: asignar precios y validar stock por talla ==========
    for (const oi of orderItems) {
      const price = isWholesale ? oi.product.price_wholesale : oi.product.price_retail;
      oi.price = price;
      oi.subtotal = price * oi.quantity;
      subtotal += oi.subtotal;
    }

    // Validar stock por talla ANTES de la transacción (fail fast)
    for (const sv of stockValidations) {
      const [sizeRows] = await pool.execute(
        `SELECT iz.stock
         FROM inventory_sizes iz
         JOIN inventory i ON iz.inventory_id = i.id
         WHERE i.product_id = ? AND i.warehouse = ? AND iz.size = ?`,
        [sv.product_id, sv.warehouse, sv.size]
      );
      const available = sizeRows[0]?.stock || 0;
      if (available < sv.quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para el producto ID ${sv.product_id} en talla ${sv.size} de la sede ${sv.warehouse}. Disponible: ${available}, solicitado: ${sv.quantity}`
        });
      }
    }

    // Apply coupon if provided
    let discountApplied = false;
    if (coupon_code) {
      const [coupons] = await pool.execute(
        "SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_until >= NOW()",
        [coupon_code]
      );
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (coupon.max_uses === 0 || coupon.uses_count < coupon.max_uses) {
          const discountAmount = subtotal * (coupon.discount_percent / 100);
          subtotal -= discountAmount;
          discountApplied = true;
          await pool.execute('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?', [coupon.id]);
        }
      }
    }

    const total = subtotal;

    // ========== TRANSACCIÓN: crear orden + descontar stock por talla + auditar ==========
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let orderId;
    try {
      orderId = await Order.create({
        user_id: req.user.id,
        total,
        subtotal,
        discount_applied: discountApplied,
        delivery_method,
        delivery_location: delivery_location || null,
        payment_method
      });

      for (const oi of orderItems) {
        // 1. Insertar item con size
        await Order.addItem({
          order_id: orderId,
          product_id: oi.product.id,
          quantity: oi.quantity,
          price_at_purchase: oi.price,
          warehouse: oi.warehouse,
          size: oi.size
        });

        // 2. Descontar stock por talla (en la misma transacción)
        const stockResult = await Order.decrementStockBySize(
          oi.product.id,
          oi.warehouse,
          oi.size,
          oi.quantity,
          connection
        );

        // 3. Registrar movimiento de inventario (venta)
        await connection.execute(
          `INSERT INTO inventory_movements
           (inventory_id, product_id, warehouse, size, movement_type, quantity_change,
            stock_before, stock_after, reason, reference_type, reference_id,
            actor_user_id, actor_role)
           VALUES (?, ?, ?, ?, 'venta', ?, ?, ?, ?, 'order', ?, ?, ?)`,
          [
            stockResult.inventoryId,
            oi.product.id,
            oi.warehouse,
            oi.size,
            -oi.quantity, // quantity_change negativo porque es salida
            stockResult.stockBefore,
            stockResult.stockAfter,
            `Venta orden #${orderId}`,
            orderId,
            req.user.id,
            req.user.role
          ]
        );
      }

      await connection.commit();
    } catch (innerErr) {
      await connection.rollback();
      throw innerErr;
    }

    const order = await Order.findById(orderId);

    if (payment_method === 'culqi') {
      return res.status(201).json({
        message: 'Orden creada',
        order,
        checkout: {
          order_id: orderId,
          amount: total,
          currency: 'PEN',
          email: req.user.email,
          description: `Compra #${orderId} en CALZADO'S DIBA'S`
        }
      });
    }

    res.status(201).json({ message: 'Orden creada exitosamente', order });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    if (connection) connection.release();
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await Order.findByUserId(req.user.id, parseInt(page) || 1, parseInt(limit) || 20);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetail(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    // Permisos:
    // - Cliente: solo sus propias órdenes
    // - Vendedor/Admin/Fábrica: si la orden es de recojo_tienda, solo de su sede
    // - Admin/Fábrica: ven cualquier orden
    const roleLocation = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima',
    };
    const isOwner = order.user_id === req.user.id;
    const isAdmin = ['admin', 'fabrica'].includes(req.user.role);
    const isSameStore = order.delivery_location === roleLocation[req.user.role];

    if (!isOwner && !isAdmin && !isSameStore) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta orden.' });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function uploadPaymentProofHandler(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta orden.' });
    }

    if (!['pendiente', 'rechazado_pago'].includes(order.status)) {
      return res.status(400).json({ message: 'No se puede subir comprobante en este estado.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó comprobante de pago.' });
    }

    const proofPath = `/uploads/payment-proofs/${req.file.filename}`;
    await Order.updatePaymentProof(req.params.id, proofPath);

    await Order.updateStatus(req.params.id, 'pendiente_validacion');
    await pool.execute(
      "UPDATE orders SET payment_validation_status = 'pending' WHERE id = ?",
      [req.params.id]
    );

    await Order.recordEvent({
      order_id: req.params.id,
      from_status: order.status,
      to_status: 'pendiente_validacion',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'voucher_uploaded',
    });

    const updated = await Order.findById(req.params.id);
    res.json({ message: 'Comprobante subido. Esperando validación.', order: updated });
  } catch (err) {
    next(err);
  }
}

export async function getOrderQR(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'fabrica') {
      return res.status(403).json({ message: 'Sin permiso.' });
    }
    if (order.delivery_method !== 'recojo_tienda') {
      return res.status(400).json({ message: 'Esta orden no es para recojo en tienda.' });
    }
    // QR disponible desde 'pagado' en adelante (cliente puede generar QR apenas pague,
    // antes incluso que la tienda lo marque como preparando). Decisión de UX:
    // el cliente NO tiene que esperar al admin para tener su comprobante de recojo.
    if (!['pagado', 'preparando', 'listo_recojo', 'entregado'].includes(order.status)) {
      return res.status(400).json({
        message: `El QR se genera cuando el pedido está pagado. Estado actual: '${order.status}'.`,
      });
    }

    const token = generateQRToken(order.id, order.delivery_location);
    // El QR contiene SOLO el token JWT, NO un JSON. Esto es porque
    // el html5-qrcode lo decodifica tal cual y lo envía al backend,
    // que espera un token puro (no un objeto JSON).
    // Si en el futuro se quiere incluir mas info, usar prefijo tipo
    // "dibas:eyJhbG..." o hacer que verifyQR parsee el JSON.
    const qrData = token;
    const qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

    res.json({
      qr_code: qrCode,
      token,  // código en texto que el cliente puede dictar al vendedor si la cámara falla
      code: `#${String(order.id).padStart(6, '0')}`,  // código legible
      order_id: order.id,
      location: order.delivery_location,
      status: order.status,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderEvents(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada.' });
    if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'fabrica') {
      return res.status(403).json({ message: 'Sin permiso.' });
    }
    const events = await Order.getEvents(req.params.id);
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

/**
 * Devuelve la boleta en formato HTML imprimible.
 * Accesible por el dueño de la orden, admin o fabrica.
 * Solo disponible si la orden está pagada o superior.
 * Acepta token via Authorization header O via query param ?t=...
 * (necesario porque la boleta se abre en nueva ventana y los headers no se preservan)
 */
export async function getOrderBoleta(req, res, next) {
  try {
    // Permitir token via query param para abrir en nueva ventana
    let user = req.user;
    if (!user && req.query.t) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        user = jwt.verify(req.query.t, process.env.jwt_secret || 'dibas_jwt_secret_dev_change_in_production_2026');
        req.user = user;
      } catch (e) {
        return res.status(403).send('<h1>Token inválido o expirado</h1><p>Vuelve a iniciar sesión.</p>');
      }
    }
    if (!user) {
      return res.status(401).send('<h1>No autenticado</h1>');
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send('<h1>Orden no encontrada</h1>');
    if (order.user_id !== user.id && user.role !== 'admin' && user.role !== 'fabrica') {
      return res.status(403).send('<h1>Sin permiso</h1>');
    }
    if (!['pagado', 'preparando', 'listo_recojo', 'entregado', 'enviado'].includes(order.status)) {
      return res.status(400).json({ message: 'La boleta solo está disponible una vez confirmado el pago.' });
    }

    // Si no tiene número de boleta, generar
    if (!order.boleta_number) {
      const boleta = await Order.setBoletaNumber(req.params.id);
      order.boleta_number = boleta;
    }

    const locationLabels = { trujillo: 'Trujillo — Jr. Pizarro 456', lima: 'Lima — Av. Larco 1024' };
    const paymentLabels = { culqi: 'Tarjeta (Culqi)', yape: 'Yape', plin: 'Plin' };
    const deliveryLabels = { recojo_tienda: 'Recojo en tienda', envio_agencia: 'Envío a agencia' };
    const statusLabels = {
      pagado: 'Pagado', preparando: 'Preparando', enviado: 'Enviado',
      listo_recojo: 'Listo para recojo', entregado: 'Entregado',
    };

    const itemsHtml = order.items.map((item, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_name || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.size || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">S/ ${parseFloat(item.price_at_purchase).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">S/ ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = order.items.reduce((sum, i) => sum + parseFloat(i.price_at_purchase) * i.quantity, 0);
    const igv = subtotal * 0.18; // IGV 18% (referencial)
    const total = parseFloat(order.total);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Boleta ${order.boleta_number} - CALZADO'S DIBA'S</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    @media print {
      .no-print { display: none; }
      body { background: white; }
    }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 30px; background: #fafafa; color: #18181B; }
    .doc { background: white; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-radius: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181B; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
    .brand p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .doc-info { text-align: right; }
    .doc-info .doc-type { background: #18181B; color: #f59e0b; padding: 6px 14px; font-size: 13px; font-weight: 700; letter-spacing: 1px; display: inline-block; margin-bottom: 8px; }
    .doc-info .doc-number { font-size: 16px; font-weight: 700; }
    .doc-info .doc-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .client-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 13px; }
    .client-section .field { margin-bottom: 4px; }
    .client-section .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .client-section .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #18181B; color: #f59e0b; }
    thead th { padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals { margin-top: 20px; text-align: right; font-size: 13px; }
    .totals .row { display: flex; justify-content: flex-end; gap: 60px; padding: 4px 0; }
    .totals .row.total { border-top: 2px solid #18181B; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 700; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
    .actions { text-align: center; margin-top: 20px; }
    .actions button { background: #18181B; color: #f59e0b; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="brand">
        <h1>CALZADO'S DIBA'S</h1>
        <p>RUC: 20123456789 · Av. Larco 1024, Lima</p>
        <p>Tel: +51 945 123 456 · contacto@dibas.pe</p>
      </div>
      <div class="doc-info">
        <div class="doc-type">BOLETA DE VENTA ELECTRÓNICA</div>
        <div class="doc-number">${order.boleta_number}</div>
        <div class="doc-date">${new Date(order.created_at).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}</div>
      </div>
    </div>

    <div class="client-section">
      <div>
        <div class="field"><div class="label">Cliente</div><div class="value">${order.customer_name || ''}</div></div>
        <div class="field"><div class="label">Email</div><div class="value">${order.customer_email || ''}</div></div>
      </div>
      <div>
        <div class="field"><div class="label">Forma de pago</div><div class="value">${paymentLabels[order.payment_method] || order.payment_method}</div></div>
        <div class="field"><div class="label">Entrega</div><div class="value">${deliveryLabels[order.delivery_method] || order.delivery_method}${order.delivery_location ? ' (' + locationLabels[order.delivery_location] + ')' : ''}</div></div>
        <div class="field"><div class="label">Estado</div><div class="value">${statusLabels[order.status] || order.status}</div></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: center; width: 40px;">#</th>
          <th>Descripción</th>
          <th style="text-align: center; width: 60px;">Talla</th>
          <th style="text-align: center; width: 50px;">Cant.</th>
          <th style="text-align: right; width: 90px;">P. Unit.</th>
          <th style="text-align: right; width: 90px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>S/ ${(total - igv).toFixed(2)}</span></div>
      <div class="row"><span>IGV (18%):</span><span>S/ ${igv.toFixed(2)}</span></div>
      <div class="row total"><span>TOTAL:</span><span>S/ ${total.toFixed(2)}</span></div>
    </div>

    <div class="footer">
      <p>Representación impresa de la Boleta de Venta Electrónica.</p>
      <p>Gracias por su compra en CALZADO'S DIBA'S.</p>
    </div>
  </div>

  <div class="actions no-print">
    <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    <button onclick="window.close()">Cerrar</button>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
}
