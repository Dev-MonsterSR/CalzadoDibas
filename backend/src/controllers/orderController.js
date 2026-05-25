import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { uploadPaymentProof } from '../middlewares/upload.js';
import pool from '../config/db.js';
import QRCode from 'qrcode';

export async function createOrder(req, res, next) {
  let connection;
  try {
    const { items, delivery_method, delivery_location, payment_method, coupon_code } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío.' });
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
    const warehouse = delivery_method === 'recojo_tienda' ? warehouseMap[delivery_location] : null;

    // Check stock for each item
    let subtotal = 0;
    let totalQuantity = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(parseInt(item.product_id));
      if (!product || !product.is_active) {
        return res.status(400).json({ message: `El producto "${item.product_name || item.product_id}" no está disponible.` });
      }

      const quantity = parseInt(item.quantity);
      if (quantity <= 0) {
        return res.status(400).json({ message: 'Cantidad inválida.' });
      }

      totalQuantity += quantity;

      // Determine price based on wholesale rule (3+ items total = wholesale)
      const price = totalQuantity >= 3 ? product.price_wholesale : product.price_retail;

      // Check stock if recojo_tienda
      if (warehouse) {
        const inv = product.inventory[warehouse];
        if (!inv || inv.stock < quantity) {
          return res.status(400).json({
            message: `Stock insuficiente para "${product.name}" en la tienda seleccionada. Stock disponible: ${inv ? inv.stock : 0}`
          });
        }
      }

      subtotal += price * quantity;
      orderItems.push({ product_id: product.id, quantity, price, warehouse });
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
          // Increment coupon usage
          await pool.execute('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?', [coupon.id]);
        }
      }
    }

    // Calculate total
    const total = subtotal;

    // Generate QR code for pickup orders (store just order ID, QR generated on demand)
    let qrCode = null;
    if (delivery_method === 'recojo_tienda') {
      qrCode = null; // Will be generated on demand when viewing order
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Create order
    const orderId = await Order.create({
      user_id: req.user.id,
      total,
      subtotal,
      discount_applied: discountApplied,
      delivery_method,
      delivery_location: delivery_location || null,
      payment_method
    });

    // Add items and decrement stock
    for (const oi of orderItems) {
      await Order.addItem({
        order_id: orderId,
        product_id: oi.product_id,
        quantity: oi.quantity,
        price_at_purchase: oi.price,
        warehouse: oi.warehouse || 'fabrica'
      });

      // Decrement stock
      if (oi.warehouse) {
        await Order.decrementStock(oi.product_id, oi.warehouse, oi.quantity);
      }
    }

    await connection.commit();

    const order = await Order.findById(orderId);
    
    // If Culqi payment, return checkout data
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
    // Verify ownership
    if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'fabrica') {
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

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó comprobante de pago.' });
    }

    const proofPath = `/uploads/payment-proofs/${req.file.filename}`;
    await Order.updatePaymentProof(req.params.id, proofPath);

    // Auto-set status to pagado when proof is uploaded
    await Order.updateStatus(req.params.id, 'pagado');

    const updated = await Order.findById(req.params.id);
    res.json({ message: 'Comprobante de pago subido exitosamente', order: updated });
  } catch (err) {
    next(err);
  }
}
