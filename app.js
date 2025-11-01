const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middlewares/errorHandler');
const { 
  generalLimiter, 
  securityHeaders, 
  corsOptions, 
  sanitizeInput,
  securityLogger 
} = require('./middlewares/security');

// Import routes
const authRoutes = require('./routes/v1/auth');
const userRoutes = require('./routes/v1/user');
const productRoutes = require('./routes/v1/product');
const collectionRoutes = require('./routes/v1/collection');
const commentRoutes = require('./routes/v1/comment');
const notificationRoutes = require('./routes/v1/notification');
const geoRoutes = require('./routes/v1/geo');
const contactRoutes = require('./routes/v1/contact');

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions)); // CORS configuration includes all necessary headers
app.use(securityLogger);
app.use(sanitizeInput);

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/geo', geoRoutes);
app.use('/api/v1/contact', contactRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

