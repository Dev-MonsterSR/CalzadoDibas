import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.JWT_SECRET || 'dibas-qr-secret-change-me';
const QR_EXPIRES = '24h';

export function generateQRToken(orderId, location) {
  return jwt.sign(
    { orderId, location, type: 'pickup' },
    QR_SECRET,
    { expiresIn: QR_EXPIRES }
  );
}

export function verifyQRToken(token) {
  try {
    const decoded = jwt.verify(token, QR_SECRET);
    if (decoded.type !== 'pickup') return null;
    return decoded;
  } catch {
    return null;
  }
}
