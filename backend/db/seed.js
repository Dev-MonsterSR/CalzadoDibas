#!/usr/bin/env node
/**
 * Seed script for CALZADO'S DIBA'S database
 * Run: node db/seed.js
 *
 * Creates tables and populates with sample data including proper bcrypt hashes.
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔧 Connecting to MySQL...');

  // Connect without database to create it
  const connection = await mysql.createConnection({
    host: process.env.db_host || 'localhost',
    port: parseInt(process.env.db_port || '3306'),
    user: process.env.db_user || 'root',
    password: process.env.db_password || '',
    charset: 'utf8mb4'
  });

  try {
    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS dibas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database dibas_db ready');

    await connection.execute('USE dibas_db');

    // Run schema
    console.log('📋 Running schema.sql...');
    const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.toUpperCase().startsWith('USE') || statement.toUpperCase().startsWith('CREATE DATABASE')) continue;
      await connection.execute(statement);
    }
    console.log('✅ Schema created');

    // Generate bcrypt hashes
    const adminHash = await bcrypt.hash('admin123', 10);
    const testHash = await bcrypt.hash('test123', 10);

    // Insert users
    console.log('👤 Inserting users...');
    await connection.execute('DELETE FROM users');
    await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Administrador DIBAS', 'admin@dibas.com', adminHash, 'admin']
    );
    await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Vendedor Trujillo', 'vendedor.t@dibas.com', testHash, 'vendedor_trujillo']
    );
    await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Vendedor Lima', 'vendedor.l@dibas.com', testHash, 'vendedor_lima']
    );
    await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Cliente Prueba', 'cliente@test.com', testHash, 'cliente']
    );

    // Insert categories
    console.log('📂 Inserting categories...');
    await connection.execute('DELETE FROM categories');
    await connection.execute("INSERT INTO categories (name, slug) VALUES ('Damas', 'damas')");
    await connection.execute("INSERT INTO categories (name, slug) VALUES ('Niñas', 'ninas')");
    await connection.execute("INSERT INTO categories (name, slug) VALUES ('Casual', 'casual')");
    await connection.execute("INSERT INTO categories (name, slug) VALUES ('Formal', 'formal')");

    // Insert products
    console.log('👟 Inserting products...');
    await connection.execute('DELETE FROM products');
    const products = [
      [1, 'Zapato Tacón Clásico Negro', 'Zapato de tacón elegante para damas, cuero sintético de alta calidad', 85.00, 99.00, '01-NEGRO-38', 'Cuero sintético', 'DIBAS', 1],
      [1, 'Zapato Tacón Elegante Rojo', 'Zapato de tacón con diseño moderno y cómodo', 89.00, 105.00, '02-ROJO-37', 'Cuero genuino', 'DIBAS', 1],
      [2, 'Zapatito Niña Rosa', 'Zapatito cómodo y resistente para niñas, suela antideslizante', 45.00, 55.00, '03-ROSA-28', 'Cuero sintético', 'DIBAS Kids', 1],
      [3, 'Mocasín Casual Café', 'Mocasín casual perfecto para el día a día, material transpirable', 70.00, 85.00, '04-CAFE-40', 'Cuero genuino', 'DIBAS', 1],
      [4, 'Zapato Formal Negro', 'Zapato formal para ocasiones especiales, acabado premium', 95.00, 115.00, '05-NEGRO-42', 'Cuero genuino', 'DIBAS Premium', 1],
      [3, 'Sandalia Casual Beige', 'Sandalia cómoda y fresca para temporada de verano', 55.00, 69.00, '06-BEIGE-36', 'Cuero sintético', 'DIBAS', 1],
      [1, 'Bota Dama Marrón', 'Bota estilo cowboy para dama, cuero genuino con detalles artesanales', 120.00, 145.00, '07-MARRON-39', 'Cuero genuino', 'DIBAS', 1],
      [2, 'Zapatito Niña Azul', 'Zapatito escolar resistente y cómodo para uso diario', 42.00, 52.00, '08-AZUL-30', 'Cuero sintético', 'DIBAS Kids', 1],
    ];

    for (const p of products) {
      await connection.execute(
        'INSERT INTO products (category_id, name, description, price_wholesale, price_retail, code, material, brand, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        p
      );
    }

    // Insert product images
    console.log('🖼️  Inserting product images...');
    await connection.execute('DELETE FROM product_images');
    const images = [
      [1, '/uploads/products/tacon-negro-1.jpg', 1, 1],
      [1, '/uploads/products/tacon-negro-2.jpg', 0, 2],
      [2, '/uploads/products/tacon-rojo-1.jpg', 1, 1],
      [3, '/uploads/products/zapatito-rosa-1.jpg', 1, 1],
      [4, '/uploads/products/mocasin-cafe-1.jpg', 1, 1],
      [5, '/uploads/products/formal-negro-1.jpg', 1, 1],
      [5, '/uploads/products/formal-negro-2.jpg', 0, 2],
      [6, '/uploads/products/sandalia-beige-1.jpg', 1, 1],
      [7, '/uploads/products/bota-marron-1.jpg', 1, 1],
      [8, '/uploads/products/zapatito-azul-1.jpg', 1, 1],
    ];

    for (const img of images) {
      await connection.execute(
        'INSERT INTO product_images (product_id, image_url, is_primary, position) VALUES (?, ?, ?, ?)',
        img
      );
    }

    // Insert inventory
    console.log('📦 Inserting inventory...');
    await connection.execute('DELETE FROM inventory');
    const inventory = [
      [1, 'fabrica', 50, 6], [1, 'tienda_trujillo', 20, 6], [1, 'tienda_lima', 15, 6],
      [2, 'fabrica', 30, 6], [2, 'tienda_trujillo', 10, 6], [2, 'tienda_lima', 12, 6],
      [3, 'fabrica', 40, 6], [3, 'tienda_trujillo', 15, 6], [3, 'tienda_lima', 18, 6],
      [4, 'fabrica', 25, 6], [4, 'tienda_trujillo', 8, 6], [4, 'tienda_lima', 10, 6],
      [5, 'fabrica', 20, 6], [5, 'tienda_trujillo', 5, 6], [5, 'tienda_lima', 7, 6],
      [6, 'fabrica', 35, 6], [6, 'tienda_trujillo', 12, 6], [6, 'tienda_lima', 14, 6],
      [7, 'fabrica', 15, 6], [7, 'tienda_trujillo', 4, 6], [7, 'tienda_lima', 6, 6],
      [8, 'fabrica', 45, 6], [8, 'tienda_trujillo', 20, 6], [8, 'tienda_lima', 22, 6],
    ];

    for (const inv of inventory) {
      await connection.execute(
        'INSERT INTO inventory (product_id, warehouse, stock, min_stock) VALUES (?, ?, ?, ?)',
        inv
      );
    }

    // Insert coupons
    console.log('🎟️  Inserting coupons...');
    await connection.execute('DELETE FROM coupons');
    await connection.execute(
      "INSERT INTO coupons (code, discount_percent, valid_from, valid_until, max_uses, uses_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['BIENVENIDO10', 10.00, new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 100, 0, 1]
    );
    await connection.execute(
      "INSERT INTO coupons (code, discount_percent, valid_from, valid_until, max_uses, uses_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['VERANO15', 15.00, new Date(), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), 50, 0, 1]
    );
    await connection.execute(
      "INSERT INTO coupons (code, discount_percent, valid_from, valid_until, max_uses, uses_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['MAYORISTA5', 5.00, new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 0, 0, 1]
    );

    console.log('\n✅ Seed complete!');
    console.log('\n📋 Demo credentials:');
    console.log('   Admin:         admin@dibas.com / admin123');
    console.log('   Vendedor T:    vendedor.t@dibas.com / test123');
    console.log('   Vendedor L:    vendedor.l@dibas.com / test123');
    console.log('   Cliente:       cliente@test.com / test123');
    console.log(`\n📦 Products: ${products.length}`);
    console.log(`📂 Categories: 4`);
    console.log(`🎟️  Coupons: 3`);
    console.log(`📦 Inventory records: ${inventory.length}`);

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
