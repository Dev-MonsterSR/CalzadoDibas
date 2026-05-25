import { Inventory } from '../models/Inventory.js';
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
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima'
    };

    const warehouse = roleWarehouseMap[req.user.role];
    if (!warehouse) {
      return res.status(403).json({ message: 'Tu rol no tiene acceso a pedidos de recojo.' });
    }

    const orders = await Inventory.getPickupOrders(warehouse);
    res.json({ warehouse, orders });
  } catch (err) {
    next(err);
  }
}

export async function markOrderDelivered(req, res, next) {
  try {
    const { orderId } = req.params;

    const roleWarehouseMap = {
      'vendedor_trujillo': 'tienda_trujillo',
      'vendedor_lima': 'tienda_lima'
    };

    const warehouse = roleWarehouseMap[req.user.role];
    if (!warehouse) {
      return res.status(403).json({ message: 'Tu rol no tiene permiso para marcar entregas.' });
    }

    // Verify order exists and is for this location
    const warehouseToLocation = {
      'tienda_trujillo': 'trujillo',
      'tienda_lima': 'lima'
    };
    const location = warehouseToLocation[warehouse];

    // Check order
    const [rows] = await pool.execute(
      'SELECT id, status, delivery_location FROM orders WHERE id = ?',
      [orderId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    const order = rows[0];
    if (order.delivery_location !== location) {
      return res.status(403).json({ message: 'Esta orden no corresponde a tu tienda.' });
    }

    await Inventory.markOrderDelivered(orderId);
    res.json({ message: 'Orden marcada como entregada' });
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
