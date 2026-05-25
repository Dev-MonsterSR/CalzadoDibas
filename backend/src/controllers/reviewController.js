import { Review } from '../config/mongo.js';
import pool from '../config/db.js';

export async function createReview(req, res, next) {
  try {
    const { product_id, rating, comment, photos } = req.body;

    if (!product_id || !rating) {
      return res.status(400).json({ message: 'Producto y rating son requeridos.' });
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'El rating debe ser entre 1 y 5.' });
    }

    // Check if user purchased the product
    const hasPurchased = await userHasPurchased(req.user.id, parseInt(product_id));

    // Check if already reviewed
    const alreadyReviewed = await Review.findOne({
      user_id: req.user.id,
      product_id: parseInt(product_id),
      status: 'approved'
    });
    if (alreadyReviewed) {
      return res.status(409).json({ message: 'Ya dejaste una review para este producto.' });
    }

    const review = await Review.create({
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
      product_id: parseInt(product_id),
      rating: ratingNum,
      comment: comment?.trim() || null,
      photos: Array.isArray(photos) ? photos.map(p => ({ url: p.url, caption: p.caption || '' })) : [],
      order_id: null,
      is_verified_purchase: hasPurchased,
      status: hasPurchased ? 'approved' : 'pending',
    });

    if (!hasPurchased) {
      return res.status(201).json({
        message: 'Review enviada, pendiente de verificación (no se encontró compra de este producto)',
        review
      });
    }

    res.status(201).json({ message: 'Review creada exitosamente', review });
  } catch (err) {
    next(err);
  }
}

export async function getProductReviews(req, res, next) {
  try {
    const reviews = await Review.find({
      product_id: parseInt(req.params.productId),
      status: 'approved'
    }).sort({ created_at: -1 });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function getUserReviews(req, res, next) {
  try {
    const reviews = await Review.find({
      user_id: req.user.id
    }).sort({ created_at: -1 });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function moderateReview(req, res, next) {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { status },
      { new: true }
    );
    if (!review) {
      return res.status(404).json({ message: 'Review no encontrada' });
    }
    res.json({ review });
  } catch (err) {
    next(err);
  }
}

export async function markHelpful(req, res, next) {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { $inc: { helpful_count: 1 } },
      { new: true }
    );
    if (!review) {
      return res.status(404).json({ message: 'Review no encontrada' });
    }
    res.json({ helpful_count: review.helpful_count });
  } catch (err) {
    next(err);
  }
}

// Helper: check if user purchased product (MySQL)
async function userHasPurchased(userId, productId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('entregado', 'preparando')
     LIMIT 1`,
    [userId, productId]
  );
  return rows.length > 0;
}
