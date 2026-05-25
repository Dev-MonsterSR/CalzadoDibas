import { Product } from '../models/Product.js';
import pool from '../config/db.js';

export async function listProducts(req, res, next) {
  try {
    const { category, material, brand, min_price, max_price, search, page, limit } = req.query;
    const result = await Product.findAll({
      category: category || null,
      material: material || null,
      brand: brand || null,
      min_price: min_price || null,
      max_price: max_price || null,
      search: search || null,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductDetail(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    if (!product.is_active) {
      return res.status(404).json({ message: 'Producto no disponible.' });
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, description, category_id, price_wholesale, price_retail, code, material, brand } = req.body;

    // Check code uniqueness
    const [existing] = await pool.execute('SELECT id FROM products WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'El código de producto ya existe.' });
    }

    const productId = await Product.create({
      category_id: parseInt(category_id),
      name,
      description: description || null,
      price_wholesale: parseFloat(price_wholesale),
      price_retail: parseFloat(price_retail),
      code,
      material: material || null,
      brand: brand || null
    });

    // Handle images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        await pool.execute(
          'INSERT INTO product_images (product_id, image_url, is_primary, position) VALUES (?, ?, ?, ?)',
          [productId, `/uploads/${file.path.split('/uploads/')[1]}`, i === 0 ? 1 : 0, i]
        );
      }
    }

    const product = await Product.findById(productId);
    res.status(201).json({ message: 'Producto creado exitosamente', product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    // Check code uniqueness if changed
    if (req.body.code && req.body.code !== existing.code) {
      const [dup] = await pool.execute('SELECT id FROM products WHERE code = ? AND id != ?', [req.body.code, req.params.id]);
      if (dup.length > 0) {
        return res.status(409).json({ message: 'El código de producto ya existe.' });
      }
    }

    const updateData = {};
    const allowedFields = ['name', 'description', 'category_id', 'price_wholesale', 'price_retail', 'code', 'material', 'brand', 'is_active'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (updateData.category_id) updateData.category_id = parseInt(updateData.category_id);
    if (updateData.price_wholesale) updateData.price_wholesale = parseFloat(updateData.price_wholesale);
    if (updateData.price_retail) updateData.price_retail = parseFloat(updateData.price_retail);

    const product = await Product.update(req.params.id, updateData);
    res.json({ message: 'Producto actualizado', product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    await Product.delete(req.params.id);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    next(err);
  }
}

export async function uploadProductImages(req, res, next) {
  try {
    const productId = parseInt(req.params.id);
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron imágenes.' });
    }

    // Get max position
    const images = product.images || [];
    const maxPosition = images.length > 0 ? Math.max(...images.map(i => i.position)) : 0;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      await pool.execute(
        'INSERT INTO product_images (product_id, image_url, is_primary, position) VALUES (?, ?, ?, ?)',
        [productId, `/uploads/${file.path.split('/uploads/')[1]}`, images.length === 0 && i === 0 ? 1 : 0, maxPosition + 1 + i]
      );
    }

    const updated = await Product.findById(productId);
    res.json({ message: 'Imágenes subidas exitosamente', product: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductImage(req, res, next) {
  try {
    await pool.execute('DELETE FROM product_images WHERE id = ? AND product_id = ?', [req.params.imageId, req.params.id]);
    res.json({ message: 'Imagen eliminada' });
  } catch (err) {
    next(err);
  }
}

export async function setPrimaryImage(req, res, next) {
  try {
    await pool.execute(
      'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
      [req.params.id]
    );
    await pool.execute(
      'UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?',
      [req.params.imageId, req.params.id]
    );
    res.json({ message: 'Imagen principal actualizada' });
  } catch (err) {
    next(err);
  }
}
