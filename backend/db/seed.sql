USE dibas_db;

-- Users (password: bcrypt hash de 'admin123' / 'test123')
-- admin123 hash: $2b$10$X7bH8zK9vF2qL3mN4pO5r.S6tU7vW8xY9zA0bC1dE2fG3hI4jK5l
-- test123 hash: $2b$10$N9qao8kG6LZ5t3qX9wYhZuK7mN8pO0qR2sT4uV6wX8yZ0aB2cD4e

-- Admin
INSERT INTO users (name, email, password, role, phone) VALUES
  ('Admin DIBAS', 'admin@dibas.com', '$2b$10$MUpVJODvQhWUHU15wwSboeVXzdHOu9MszHIxb4DWwZefsZFaIOfNG', 'admin', '999888777');

-- Vendedores
INSERT INTO users (name, email, password, role, phone) VALUES
  ('Vendedor Trujillo', 'vendedor.t@dibas.com', '$2b$10$MUpVJODvQhWUHU15wwSboeVXzdHOu9MszHIxb4DWwZefsZFaIOfNG', 'vendedor_trujillo', '999111222'),
  ('Vendedor Lima', 'vendedor.l@dibas.com', '$2b$10$MUpVJODvQhWUHU15wwSboeVXzdHOu9MszHIxb4DWwZefsZFaIOfNG', 'vendedor_lima', '999333444');

-- Cliente
INSERT INTO users (name, email, password, role, phone, address) VALUES
  ('Cliente Test', 'cliente@test.com', '$2b$10$MUpVJODvQhWUHU15wwSboeVXzdHOu9MszHIxb4DWwZefsZFaIOfNG', 'cliente', '999555666', 'Av. Principal 123, Trujillo');

-- Categories
INSERT INTO categories (name, slug) VALUES
  ('Damas', 'damas'),
  ('Ni\xC3\xB1as', 'ninas'),
  ('Casual', 'casual'),
  ('Formal', 'formal');

-- Products
INSERT INTO products (category_id, name, description, price_retail, price_wholesale, code, material, brand) VALUES
  (1, 'Zapato Tacón Clásico Negro', 'Zapato de tacón elegante para dama, perfecto para eventos formales. Confortable y estilizado.', 129.90, 109.90, '01-NEGRO-38', 'Cuero', 'DIBAS'),
  (1, 'Sandalia Elegante Dorada', 'Sandalia con detalles dorados, ideal para fiestas y celebraciones. Tacón medio cómodo.', 99.90, 84.90, '02-DORADO-37', 'Sintético', 'DIBAS'),
  (2, 'Zapatito Escolar Negro', 'Zapato escolar resistente y cómodo para niñas. Suela antideslizante.', 69.90, 59.90, '03-NEGRO-30', 'Cuero sintético', 'DIBAS'),
  (3, 'Zapatilla Casual Blanca', 'Zapatilla urbana blanca, versátil para el día a día. Diseño moderno y ligero.', 89.90, 74.90, '04-BLANCO-39', 'Tela', 'DIBAS'),
  (3, 'Mocasín Café Casual', 'Mocasín de cuero café, ideal para uso casual y oficina. Suela flexible.', 119.90, 99.90, '05-CAFÉ-40', 'Cuero', 'DIBAS'),
  (4, 'Zapato Formal Negro Dama', 'Zapato cerrado formal para dama, perfecto para la oficina. Elegante y profesional.', 139.90, 119.90, '06-NEGRO-36', 'Cuero', 'DIBAS'),
  (1, 'Botín Charol Rojo', 'Botín de charol rojo con tacón alto. Diseño atrevido y moderno para noches especiales.', 159.90, 134.90, '07-ROJO-38', 'Charol', 'DIBAS'),
  (2, 'Ballet Rosa Niña', 'Zapatito tipo ballet en rosa, suave y cómodo para niñas. Diseño adorable.', 59.90, 49.90, '08-ROSA-28', 'Sintético', 'DIBAS');

-- Inventory (stock por sede)
INSERT INTO inventory (product_id, warehouse, stock, min_stock) VALUES
  (1, 'fabrica', 50, 6), (1, 'tienda_trujillo', 15, 6), (1, 'tienda_lima', 12, 6),
  (2, 'fabrica', 40, 6), (2, 'tienda_trujillo', 10, 6), (2, 'tienda_lima', 8, 6),
  (3, 'fabrica', 60, 6), (3, 'tienda_trujillo', 20, 6), (3, 'tienda_lima', 18, 6),
  (4, 'fabrica', 45, 6), (4, 'tienda_trujillo', 12, 6), (4, 'tienda_lima', 15, 6),
  (5, 'fabrica', 35, 6), (5, 'tienda_trujillo', 8, 6), (5, 'tienda_lima', 10, 6),
  (6, 'fabrica', 30, 6), (6, 'tienda_trujillo', 7, 6), (6, 'tienda_lima', 9, 6),
  (7, 'fabrica', 25, 6), (7, 'tienda_trujillo', 5, 6), (7, 'tienda_lima', 6, 6),
  (8, 'fabrica', 55, 6), (8, 'tienda_trujillo', 14, 6), (8, 'tienda_lima', 11, 6);

-- Inventory Sizes (distribución del stock por tallas 36-43)
-- Para cada registro de inventory, distribuimos su stock entre las 8 tallas
-- siguiendo la distribución normal centrada en 39 (talla media).
-- Tabla auxiliar con la distribución de probabilidad:
--   36: 1, 37: 3, 38: 6, 39: 8, 40: 8, 41: 6, 42: 3, 43: 1 (suma = 36)
-- Luego multiplicamos por stock/36 para escalar.
INSERT INTO inventory_sizes (inventory_id, size, stock)
SELECT
  inv.id,
  s.size,
  ROUND(inv.stock * s.weight / 36) AS stock_per_size
FROM inventory inv
CROSS JOIN (
  SELECT 36 AS size, 1 AS weight UNION ALL SELECT 37, 3 UNION ALL
  SELECT 38, 6 UNION ALL SELECT 39, 8 UNION ALL
  SELECT 40, 8 UNION ALL SELECT 41, 6 UNION ALL
  SELECT 42, 3 UNION ALL SELECT 43, 1
) s;

-- Coupons
INSERT INTO coupons (code, discount_percent, valid_from, valid_until, max_uses, is_active) VALUES
  ('BIENVENIDO10', 10, '2026-01-01', '2026-12-31', 100, TRUE),
  ('DIBAS20', 20, '2026-06-01', '2026-06-30', 50, TRUE);
