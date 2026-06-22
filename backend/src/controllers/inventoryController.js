import { Inventory } from '../models/Inventory.js';
import { Order } from '../models/Order.js';
import { verifyQRToken } from '../utils/qrToken.js';
import pool from '../config/db.js';

export async function getMyStoreInventory(req, res, next) {
  try {
    // Determine warehouse from user role
    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica'
    };

    const warehouse = roleWarehouseMap[req.user.role];
    if (!warehouse) {
      return res.status(403).json({ message: 'Tu rol no tiene acceso a inventario de tienda.' });
    }

    const inventory = await Inventory.getByWarehouse(warehouse);
    res.json({ warehouse, inventory });
  } catch (err) {
    next(err);
  }
}

export async function updateInventoryStock(req, res, next) {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock === null) {
      return res.status(400).json({ message: 'El campo stock es requerido.' });
    }

    const inv = await Inventory.findById(req.params.id);
    if (!inv) {
      return res.status(404).json({ message: 'Registro de inventario no encontrado.' });
    }

    // Verify user can modify this warehouse
    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica',
      'admin': null // admin can modify any
    };

    const allowedWarehouse = roleWarehouseMap[req.user.role];
    if (req.user.role !== 'admin' && inv.warehouse !== allowedWarehouse) {
      return res.status(403).json({ message: 'No tienes permiso para modificar este inventario.' });
    }

    const updated = await Inventory.updateStock(req.params.id, parseInt(stock));
    res.json({ message: 'Stock actualizado', inventory: updated });
  } catch (err) {
    next(err);
  }
}

export async function getPickupOrders(req, res, next) {
  try {
    const roleWarehouseMap = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima'
    };

    const location = roleWarehouseMap[req.user.role];
    if (!location) {
      return res.status(403).json({ message: 'Tu rol no tiene acceso a pedidos de recojo.' });
    }

    const orders = await Order.findPickupReadyByLocation(location);
    res.json({ location, orders });
  } catch (err) {
    next(err);
  }
}

export async function getDeliveredToday(req, res, next) {
  try {
    const roleWarehouseMap = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima'
    };

    const location = roleWarehouseMap[req.user.role];
    if (!location) {
      return res.status(403).json({ message: 'Tu rol no tiene acceso.' });
    }

    const orders = await Order.findDeliveredTodayByLocation(location);
    res.json({ location, orders });
  } catch (err) {
    next(err);
  }
}

export async function verifyQR(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token QR requerido.' });

    // Aceptar dos formatos:
    // 1. JWT firmado largo (lo que genera /api/orders/:id/qr)
    // 2. Código corto legible tipo "#000022" (lo que el cliente dicta al vendedor)
    let orderId = null;

    if (token.startsWith('#')) {
      // Formato código corto: "#000022" (con numeral)
      const numericPart = token.replace(/^#/, '').replace(/^0+/, '');
      orderId = parseInt(numericPart, 10);
      if (!orderId || isNaN(orderId)) {
        return res.status(400).json({ message: 'Código inválido. Usa el formato #000022 o escanea el QR.', valid: false });
      }
    } else if (/^\d{1,6}$/.test(token)) {
      // Formato numérico: "000022" o "22" (sin numeral)
      orderId = parseInt(token.replace(/^0+/, '') || '0', 10);
      if (!orderId) {
        return res.status(400).json({ message: 'Código inválido. Usa el formato #000022 o escanea el QR.', valid: false });
      }
    } else if (token.startsWith('{') || token.startsWith('[')) {
      // Retrocompatibilidad: QRs viejos que tenían JSON.stringify({token, orderId, location})
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          const decoded = verifyQRToken(parsed.token);
          if (!decoded) {
            return res.status(400).json({ message: 'QR inválido o expirado.', valid: false });
          }
          orderId = decoded.orderId;
        } else if (parsed.orderId) {
          orderId = parsed.orderId;
        } else {
          return res.status(400).json({ message: 'QR inválido. Usa el formato #000022 o escanea el QR.', valid: false });
        }
      } catch (e) {
        return res.status(400).json({ message: 'QR inválido. Usa el formato #000022 o escanea el QR.', valid: false });
      }
    } else {
      // Asumir formato JWT firmado
      const decoded = verifyQRToken(token);
      if (!decoded) {
        return res.status(400).json({ message: 'QR inválido o expirado.', valid: false });
      }
      orderId = decoded.orderId;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada.', valid: false });
    }

    if (order.delivery_method !== 'recojo_tienda') {
      return res.status(400).json({ message: 'Esta orden no es para recojo en tienda.', valid: false });
    }

    if (order.status === 'entregado') {
      return res.status(400).json({ message: 'Esta orden YA fue entregada.', valid: false, already_delivered: true });
    }

    // ANTES: solo 'listo_recojo' permitía confirmar. AHORA: cualquier estado
    // desde 'pagado' en adelante (porque el vendedor también ve 'pagado' en su panel)
    if (!['pagado', 'preparando', 'listo_recojo'].includes(order.status)) {
      return res.status(400).json({
        message: `La orden no está lista para entregar. Estado: '${order.status}'.`,
        valid: false,
        current_status: order.status,
      });
    }

    const roleWarehouseMap = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima'
    };
    const sellerLocation = roleWarehouseMap[req.user.role];
    if (order.delivery_location !== sellerLocation) {
      return res.status(403).json({ message: 'Esta orden no corresponde a tu sede.', valid: false });
    }

    // Si está en 'pagado' o 'preparando', lo marcamos como 'listo_recojo' primero
    // (transición automática: vendedor confirma que ya está listo)
    if (order.status !== 'listo_recojo') {
      await Order.updateStatus(order.id, 'listo_recojo');
      await Order.recordEvent({
        order_id: order.id,
        from_status: order.status,
        to_status: 'listo_recojo',
        actor_user_id: req.user.id,
        actor_role: req.user.role,
        event_type: 'auto_ready_on_scan',
      });
    }

    const updated = await Order.markDeliveredWithActor(order.id, req.user.id);
    await Order.recordEvent({
      order_id: order.id,
      from_status: 'listo_recojo',
      to_status: 'entregado',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: token.startsWith('#') ? 'manual_code_delivery' : 'qr_scanned',
    });

    res.json({
      message: 'Entrega confirmada',
      valid: true,
      order: updated,
      delivery_method: token.startsWith('#') ? 'manual_code' : 'qr_scan',
    });
  } catch (err) {
    next(err);
  }
}

export async function markOrderDelivered(req, res, next) {
  try {
    const { orderId } = req.params;

    const roleWarehouseMap = {
      'vendedor_trujillo': 'trujillo',
      'vendedor_lima': 'lima'
    };

    const location = roleWarehouseMap[req.user.role];
    if (!location) {
      return res.status(403).json({ message: 'Tu rol no tiene permiso para marcar entregas.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    if (order.delivery_location !== location) {
      return res.status(403).json({ message: 'Esta orden no corresponde a tu tienda.' });
    }

    if (order.status !== 'listo_recojo') {
      return res.status(400).json({ message: 'La orden debe estar en estado listo_recojo.' });
    }

    const updated = await Order.markDeliveredWithActor(orderId, req.user.id);
    await Order.recordEvent({
      order_id: orderId,
      from_status: 'listo_recojo',
      to_status: 'entregado',
      actor_user_id: req.user.id,
      actor_role: req.user.role,
      event_type: 'delivered',
    });

    res.json({ message: 'Orden marcada como entregada', order: updated });
  } catch (err) {
    next(err);
  }
}

export async function getLowStockAlerts(req, res, next) {
  try {
    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica',
      'admin': null
    };

    const warehouse = roleWarehouseMap[req.user.role];
    const alerts = await Inventory.getLowStockAlerts(warehouse);
    res.json({ warehouse, alerts });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const { inventory_id, size, quantity_change, reason } = req.body;

    if (!inventory_id || quantity_change === undefined || quantity_change === null) {
      return res.status(400).json({ message: 'inventory_id y quantity_change son requeridos.' });
    }

    if (quantity_change === 0) {
      return res.status(400).json({ message: 'quantity_change no puede ser 0.' });
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ message: 'Debes proporcionar una razón para el ajuste (mínimo 3 caracteres).' });
    }

    const inv = await Inventory.findById(inventory_id);
    if (!inv) {
      return res.status(404).json({ message: 'Registro de inventario no encontrado.' });
    }

    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica',
      'admin': null
    };

    const allowedWarehouse = roleWarehouseMap[req.user.role];
    if (req.user.role !== 'admin' && inv.warehouse !== allowedWarehouse) {
      return res.status(403).json({ message: 'No tienes permiso para ajustar inventario de esta sede.' });
    }

    const movementType = quantity_change > 0 ? 'ajuste_positivo' : 'ajuste_negativo';

    const result = await Inventory.adjustStock(
      inventory_id,
      size || null,
      parseInt(quantity_change),
      movementType,
      reason.trim(),
      req.user.id,
      req.user.role
    );

    res.json({
      message: 'Stock ajustado correctamente',
      adjustment: result
    });
  } catch (err) {
    if (err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

export async function getMovements(req, res, next) {
  try {
    const { product_id, movement_type, limit = 50, offset = 0 } = req.query;

    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica',
      'admin': null
    };

    const warehouse = roleWarehouseMap[req.user.role];

    const movements = await Inventory.getMovements({
      productId: product_id ? parseInt(product_id) : null,
      warehouse,
      movementType: movement_type || null,
      limit: Math.min(parseInt(limit) || 50, 200),
      offset: parseInt(offset) || 0
    });

    res.json({ movements });
  } catch (err) {
    next(err);
  }
}

/**
 * Ajuste de stock en batch (múltiples tallas con una sola razón).
 * Body: { inventory_id, items: [{size, quantity_change}, ...], reason }
 * - Validar permisos por sede según rol
 * - Validar stock suficiente si items[i].quantity_change es negativo
 * - 1 transacción = N updates + N logs de movimientos
 * - Recalcula inventory.stock al final
 */
export async function adjustStockBatch(req, res, next) {
  try {
    const { inventory_id, items, reason } = req.body;

    if (!inventory_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'inventory_id y un array de items son requeridos.' });
    }

    // Validar cada item
    for (const it of items) {
      if (it.size == null || !Number.isInteger(it.quantity_change) || it.quantity_change === 0) {
        return res.status(400).json({ message: 'Cada item debe tener size entero y quantity_change no-cero.' });
      }
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ message: 'Debes proporcionar una razón (mínimo 3 caracteres).' });
    }

    const inv = await Inventory.findById(inventory_id);
    if (!inv) {
      return res.status(404).json({ message: 'Registro de inventario no encontrado.' });
    }

    // Permisos por sede
    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima',
      'fabrica': 'fabrica',
      'admin': null
    };
    const allowedWarehouse = roleWarehouseMap[req.user.role];
    if (req.user.role !== 'admin' && inv.warehouse !== allowedWarehouse) {
      return res.status(403).json({ message: 'No tienes permiso para ajustar inventario de esta sede.' });
    }

    // Detectar tipo: si todos los items son positivos → ajuste_positivo; si negativos → ajuste_negativo; si mixto → error
    const allPositive = items.every(i => i.quantity_change > 0);
    const allNegative = items.every(i => i.quantity_change < 0);
    if (!allPositive && !allNegative) {
      return res.status(400).json({ message: 'Todos los items deben ser del mismo tipo (agregar o retirar), no se permite mixto.' });
    }
    const movementType = allPositive ? 'ajuste_positivo' : 'ajuste_negativo';

    const result = await Inventory.adjustStockBatch(
      inventory_id,
      items,
      movementType,
      reason.trim(),
      req.user.id,
      req.user.role
    );

    res.json({
      message: `Stock ajustado correctamente (${items.length} tallas)`,
      adjustment: result
    });
  } catch (err) {
    if (err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

export async function getProductStock(req, res, next) {
  try {
    const { productId } = req.params;

    const inventory = await Inventory.getStockByProductAllWarehouses(parseInt(productId));

    if (!inventory || inventory.length === 0) {
      return res.status(404).json({ message: 'No se encontró inventario para este producto.' });
    }

    res.json({ inventory });
  } catch (err) {
    next(err);
  }
}
