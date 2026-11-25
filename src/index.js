require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────
app.use(cors());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ─── Connect Database ─────────────────────────
connectDB();

// ─── Initialize Firebase Admin ────────────────
initializeFirebase();

// ─── Routes ───────────────────────────────────
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/reports', reportRoutes);
app.use('/admin', adminRoutes);
app.use('/analytics', analyticsRoutes);

// ─── Root ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'FixItNow API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth',
      authSync: '/auth/sync',
      authMe: '/auth/me',
      reports: '/reports',
      admin: '/admin',
    },
  });
});

// ─── 404 Handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 FixItNow API running on port ${PORT}`);
  console.log(`📊 Local:    http://localhost:${PORT}/health`);
  console.log(`📊 Network:  http://192.168.1.35:${PORT}/health\n`);
});