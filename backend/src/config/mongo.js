import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://dibas:mongo2025@localhost:27017/dibas_reviews?authSource=admin';

// Estado de la conexión
let connectionPromise = null;

/**
 * Conecta a MongoDB con retry. Si falla al inicio, reintenta en cada llamada.
 * Esto soluciona el problema de "buffering timed out" cuando el backend
 * arranca antes de que la red Docker esté lista (ej. mongo en otra red).
 */
export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) return; // ya conectado
  if (connectionPromise) return connectionPromise; // conexión en progreso

  connectionPromise = mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5s timeout por intento
  }).then(() => {
    console.log('  ✓ MongoDB connected');
    mongoose.connection.on('disconnected', () => {
      console.warn('  ⚠ MongoDB disconnected, will reconnect on next use');
      connectionPromise = null;
    });
    return true;
  }).catch((err) => {
    console.error('  ✗ MongoDB error:', err.message);
    connectionPromise = null; // permitir reintento
    throw err;
  });

  return connectionPromise;
};

/**
 * Asegura que mongo esté conectado antes de una operación. Si no lo está,
 * intenta reconectar. Las queries se reintentan automáticamente gracias a
 * mongoose (mientras la conexión esté established).
 */
export const ensureMongo = async () => {
  if (mongoose.connection.readyState === 1) return;
  await connectMongo();
};

// --- Review Schema (MongoDB) ---
const reviewSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, index: true },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  product_id: { type: Number, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },
  photos: [
    {
      url: String,
      caption: String,
      uploaded_at: { type: Date, default: Date.now }
    }
  ],
  order_id: { type: Number, default: null },
  is_verified_purchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  helpful_count: { type: Number, default: 0 },
}, {
  timestamps: true,
});

reviewSchema.index({ product_id: 1, status: 1 });
reviewSchema.index({ user_id: 1 });

const Review = mongoose.model('Review', reviewSchema);

export { Review };
