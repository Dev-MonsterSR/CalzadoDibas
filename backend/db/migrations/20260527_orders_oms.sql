-- OMS Migration: new states, validation fields, audit table
-- Run: mysql -u root -p dibas_db < 20260527_orders_oms.sql

ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'pendiente','pendiente_validacion','pagado','preparando',
    'enviado','listo_recojo','entregado','cancelado','rechazado_pago'
  ) DEFAULT 'pendiente';

ALTER TABLE orders
  ADD COLUMN payment_validation_status ENUM('none','pending','approved','rejected') DEFAULT 'none' AFTER payment_proof,
  ADD COLUMN payment_validated_by INT NULL AFTER payment_validation_status,
  ADD COLUMN payment_validated_at TIMESTAMP NULL AFTER payment_validated_by,
  ADD COLUMN payment_rejection_reason VARCHAR(500) NULL AFTER payment_validated_at,
  ADD COLUMN ready_for_pickup_at TIMESTAMP NULL AFTER tracking_code,
  ADD COLUMN delivered_at TIMESTAMP NULL AFTER ready_for_pickup_at,
  ADD COLUMN delivered_by INT NULL AFTER delivered_at;

ALTER TABLE orders
  ADD INDEX idx_status_delivery (status, delivery_method, delivery_location);

CREATE TABLE IF NOT EXISTS order_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  from_status VARCHAR(40) NULL,
  to_status VARCHAR(40) NOT NULL,
  actor_user_id INT NULL,
  actor_role VARCHAR(40) NULL,
  event_type VARCHAR(60) NOT NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_events (order_id, created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
