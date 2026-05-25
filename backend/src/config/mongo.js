import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://dibas:mongo2025@localhost:27017/dibas_reviews?authSource=admin';

let isConnected = false;

export const connectMongo = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('  ✓ MongoDB connected');
  } catch (err) {
    console.error('  ✗ MongoDB error:', err.message);
  }
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
