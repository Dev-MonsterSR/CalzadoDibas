-- ============================================================
-- Migración 20260618: size en order_items + inventario por tallas
-- ============================================================
-- Agrega la columna `size` a `order_items` para persistir qué
-- talla específica se vendió.
--
-- Crea `inventory_sizes` con distribución del stock actual
-- de `inventory` (que está en `inventory.stock`) entre las
-- tallas 36..43. Si el stock total es 20, se reparte 2 por
-- talla + 4 unidades sobrantes que se asignan a tallas centrales
-- (38, 39, 40).
-- ============================================================

USE dibas_db;

-- 1) Columna size en order_items
ALTER TABLE order_items
  ADD COLUMN size INT NULL AFTER quantity,
  ADD INDEX idx_order_items_size (size);

-- 2) Crear tabla inventory_sizes si no existe (defensa, ya debería existir)
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

-- 3) Poblar inventory_sizes distribuyendo el stock actual por tallas
-- Solo si la tabla está vacía (primera vez). Si ya hay datos, respetar.
INSERT INTO inventory_sizes (inventory_id, size, stock)
SELECT
  inv.id,
  s.size,
  FLOOR(inv.stock / 8) +
    CASE
      WHEN inv.stock % 8 >= (4 - ABS(s.size - 39)) AND s.size BETWEEN 36 AND 43
      THEN 1
      ELSE 0
    END AS stock_per_size
FROM inventory inv
CROSS JOIN (
  SELECT 36 AS size UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL
  SELECT 39 UNION ALL SELECT 40 UNION ALL SELECT 41 UNION ALL
  SELECT 42 UNION ALL SELECT 43
) s
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_sizes iz WHERE iz.inventory_id = inv.id
);
