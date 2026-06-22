-- Migración: Stock por tallas + Logs de movimientos de inventario
-- Fecha: 2026-05-27
-- Descripción: Agrega soporte para stock por talla y registro de movimientos

USE dibas_db;

-- Tabla de stock por talla (extiende inventory)
CREATE TABLE IF NOT EXISTS inventory_sizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT NOT NULL,
  size INT NOT NULL,
  stock INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_inventory_size (inventory_id, size),
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  INDEX idx_inventory_sizes (inventory_id, size, stock)
) ENGINE=InnoDB;

-- Tabla de movimientos de inventario (logs/auditoría)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse ENUM('fabrica','tienda_trujillo','tienda_lima') NOT NULL,
  size INT NULL,
  movement_type ENUM('entrada','salida','ajuste_positivo','ajuste_negativo','venta','devolucion','transferencia') NOT NULL,
  quantity_change INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  reason VARCHAR(500) NULL,
  reference_type VARCHAR(50) NULL,
  reference_id INT NULL,
  actor_user_id INT NULL,
  actor_role VARCHAR(40) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_movements_product (product_id, created_at),
  INDEX idx_movements_warehouse (warehouse, created_at),
  INDEX idx_movements_actor (actor_user_id, created_at),
  INDEX idx_movements_type (movement_type, created_at)
) ENGINE=InnoDB;
