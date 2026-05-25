import crypto from 'crypto';
import pool from '../config/db.js';

const CULQI_SECRET_KEY = process.env.culqi_secret_key || '';
const CULQI_PUBLIC_KEY = process.env.culqi_public_key || '';
const RSA_KEY_ID = process.env.culqi_rsa_key_id || '';
const CULQI_BASE = 'https://api.culqi.com/v2';

/**
 * Culqi Payment Integration
 * 
 * Flow for card payments:
 * 1. Frontend sends card details + order_id
 * 2. Backend creates Culqi token
 * 3. Backend creates charge
 * 4. Order status updated to "pagado"
 */

// Process payment with card details
export async function payWithCard(req, res, next) {
  try {
    const { order_id, card_number, cvv, expiry_month, expiry_year, email } = req.body;

    if (!order_id || !card_number || !cvv || !expiry_month || !expiry_year || !email) {
      return res.status(400).json({ message: 'Datos de pago incompletos' });
    }

    // Verify order belongs to user
    const [orders] = await pool.execute(
      'SELECT id, user_id, status, total FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    const order = orders[0];
    if (order.status !== 'pendiente') {
      return res.status(400).json({ message: 'La orden ya ha sido procesada' });
    }

    // Step 1: Create token with Culqi
    const tokenResponse = await fetch(`${CULQI_BASE}/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CULQI_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number,
        cvv,
        expiration_month: parseInt(expiry_month),
        expiration_year: parseInt(expiry_year),
        email,
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.object === 'error') {
      return res.status(400).json({
        message: tokenData.user_message || 'Error al procesar la tarjeta',
        culqi_error: tokenData
      });
    }

    // Step 2: Create charge with token
    const chargeResponse = await fetch(`${CULQI_BASE}/charges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(parseFloat(order.total) * 100), // Culqi expects céntimos
        currency_code: 'PEN',
        email: email,
        source_id: tokenData.id,
        description: `Compra #${order_id} en CALZADO'S DIBA'S`,
        metadata: {
          order_id: String(order_id),
          user_id: String(req.user.id),
        },
        capture: true
      })
    });

    const chargeData = await chargeResponse.json();

    if (chargeData.object === 'error') {
      return res.status(400).json({
        message: chargeData.merchant_message || chargeData.user_message || 'Error al procesar el pago',
        culqi_error: chargeData
      });
    }

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = "pagado", payment_method = "culqi", tracking_code = ? WHERE id = ?',
      [chargeData.id, order_id]
    );

    res.json({
      message: 'Pago procesado exitosamente',
      charge: {
        id: chargeData.id,
        amount: chargeData.amount,
        currency_code: chargeData.currency_code,
        status: chargeData.status,
      },
      order_id: order_id
    });
  } catch (err) {
    next(err);
  }
}

// Webhook for Culqi payment confirmation
export async function webhook(req, res, next) {
  try {
    const { action, object } = req.body;

    if (action === 'charge.created' || action === 'charge.succeeded') {
      const orderId = object.metadata?.order_id;
      if (orderId) {
        await pool.execute(
          'UPDATE orders SET status = "pagado", tracking_code = ? WHERE id = ?',
          [object.id, orderId]
        );
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// Get Culqi public key and config for frontend SDK
export async function getConfig(req, res, next) {
  res.json({
    public_key: CULQI_PUBLIC_KEY,
    rsa_key_id: RSA_KEY_ID,
    logo_url: process.env.APP_URL ? `${process.env.APP_URL}/logo.png` : '',
    title: "CALZADO'S DIBA'S",
    description: 'Pago seguro con Culqi',
    currency: 'PEN',
    amount: 0, // Will be set by frontend
  });
}

// Legacy: Create card token (for direct API integration)
export async function createToken(req, res, next) {
  try {
    const { card_number, cvv, expiry_month, expiry_year, email } = req.body;

    if (!card_number || !cvv || !expiry_month || !expiry_year || !email) {
      return res.status(400).json({ message: 'Datos de tarjeta incompletos' });
    }

    // Culqi API expects expiration_month and expiration_year
    const response = await fetch(`${CULQI_BASE}/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CULQI_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number,
        cvv,
        expiration_month: parseInt(expiry_month),
        expiration_year: parseInt(expiry_year),
        email,
      })
    });

    const data = await response.json();

    if (data.object === 'error') {
      return res.status(400).json({
        message: data.user_message || 'Error al crear token',
        culqi_error: data
      });
    }

    res.json({
      token_id: data.id,
      last_four: data.card_number?.slice(-4),
      message: 'Token creado exitosamente'
    });
  } catch (err) {
    next(err);
  }
}

// Legacy: Process charge with token
export async function createCharge(req, res, next) {
  try {
    const { token_id, amount, description, email, order_id } = req.body;

    if (!token_id || !amount || !email) {
      return res.status(400).json({ message: 'token_id, amount y email son requeridos' });
    }

    const response = await fetch(`${CULQI_BASE}/charges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(parseFloat(amount) * 100),
        currency_code: 'PEN',
        email: email,
        source_id: token_id,
        description: description || 'Compra en CALZADO\'S DIBA\'S',
        metadata: {
          order_id: order_id || null,
          user_id: req.user.id,
        },
        capture: true
      })
    });

    const data = await response.json();

    if (data.object === 'error') {
      return res.status(400).json({
        message: data.merchant_message || data.user_message || 'Error al procesar el pago',
        culqi_error: data
      });
    }

    if (order_id) {
      await pool.execute(
        'UPDATE orders SET status = "pagado", payment_method = "culqi", tracking_code = ? WHERE id = ? AND user_id = ?',
        [data.id, order_id, req.user.id]
      );
    }

    res.json({
      message: 'Pago procesado exitosamente',
      charge: {
        id: data.id,
        amount: data.amount,
        currency_code: data.currency_code,
        status: data.status,
      }
    });
  } catch (err) {
    next(err);
  }
}
