-- ============================================================
-- Migración 20260618: boleta_number en orders
-- ============================================================
-- Añade número correlativo de boleta (formato B001-NNNNN)
-- al confirmar pago. Permite generar boleta descargable
-- sin integración con SUNAT (suficiente para demo académica).
-- ============================================================

USE dibas_db;

ALTER TABLE orders
  ADD COLUMN boleta_number VARCHAR(20) NULL AFTER tracking_code,
  ADD UNIQUE KEY uk_boleta_number (boleta_number);

-- Contador para generar correlativos
CREATE TABLE IF NOT EXISTS counters (
  name VARCHAR(50) PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT INTO counters (name, value) VALUES ('boleta', 0)
  ON DUPLICATE KEY UPDATE name = name;
