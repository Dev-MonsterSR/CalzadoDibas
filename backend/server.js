import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/auth.js';
import productRoutes from './src/routes/products.js';
import orderRoutes from './src/routes/orders.js';
import adminRoutes from './src/routes/admin.js';
import inventoryRoutes from './src/routes/inventory.js';
import reviewRoutes from './src/routes/reviews.js';
import categoryRoutes from './src/routes/categories.js';
import culqiRoutes from './src/routes/culqi.js';

// Import error handler
import { errorHandler } from './src/middlewares/errorHandler.js';
import { connectMongo } from './src/config/mongo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.port || process.env.PORT || 3001;
const FRONTEND_URL = process.env.frontend_url || 'http://localhost:5173';
const ALLOWED_ORIGINS = FRONTEND_URL.split(',').map(u => u.trim());

// --- Middleware ---
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Routes ---
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/culqi', culqiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Error handler (must be last)
app.use(errorHandler);

// --- Start server ---
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   CALZADO'S DIBA'S - Backend API        ║
  ║   Server running on port ${PORT}              ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
  ║   Frontend CORS: ${FRONTEND_URL}     ║
  ║   Health: http://localhost:${PORT}/api/health ║
  ╚══════════════════════════════════════════╝
  `);
  });
});
