const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limiting - More lenient for product browsing
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for product browsing)
  message: { error: 'تعداد درخواست‌های شما از حد مجاز بیشتر است. لطفاً کمی صبر کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for GET requests to products (browsing)
  skip: (req) => {
    // Allow unlimited GET requests to products and collections for browsing
    return req.method === 'GET' && (req.path.startsWith('/api/v1/products') || req.path.startsWith('/api/v1/collections'))
  }
});

// Auth rate limiting - Lenient for registration
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // limit each IP to 50 requests per windowMs (generous for registration)
  'تعداد درخواست‌های شما از حد مجاز بیشتر است. لطفاً چند دقیقه صبر کنید.'
);

// Strict login rate limiting (for login attempts only)
const loginLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 login attempts per windowMs
  'تعداد تلاش‌های ورود شما از حد مجاز بیشتر است. لطفاً 15 دقیقه صبر کنید.'
);

// Comment/Review rate limiting
const commentLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // limit each IP to 10 comments per hour
  'تعداد نظرات شما از حد مجاز بیشتر است. لطفاً یک ساعت صبر کنید.'
);

// Product creation rate limiting (admin)
const productLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // limit each IP to 20 products per hour
  'تعداد محصولات ایجاد شده از حد مجاز بیشتر است.'
);

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable or use defaults
    const frontendUrlFromEnv = process.env.FRONTEND_URL;
    const allowedOriginsEnv = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN;
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://front-store-luxury-muc4.vercel.app', // Frontend production domain
    ];
    
    // Add frontend URL from environment variable if provided
    if (frontendUrlFromEnv && allowedOrigins.indexOf(frontendUrlFromEnv) === -1) {
      allowedOrigins.push(frontendUrlFromEnv);
    }
    
    // Support comma-separated URLs in environment variable
    if (allowedOriginsEnv && allowedOriginsEnv.includes(',')) {
      const envUrls = allowedOriginsEnv.split(',').map(url => url.trim());
      envUrls.forEach(url => {
        if (url && allowedOrigins.indexOf(url) === -1) {
          allowedOrigins.push(url);
        }
      });
    }
    
    // Allow all Vercel preview and production deployments
    // Vercel domains match patterns like:
    // - *.vercel.app (production)
    // - *-git-*-*.vercel.app (preview)
    // - *-nmashoomy0-*.vercel.app (preview with user ID)
    const isVercelDomain = origin.includes('.vercel.app');
    
    // Check if it's a valid Vercel domain with proper pattern
    const vercelPattern = /^https:\/\/[a-zA-Z0-9\-]+.*\.vercel\.app$/;
    const matchesVercelPattern = vercelPattern.test(origin);
    
    console.log('[CORS] Checking origin:', origin);
    console.log('[CORS] Is Vercel domain:', isVercelDomain);
    console.log('[CORS] Matches Vercel pattern:', matchesVercelPattern);
    console.log('[CORS] Allowed origins:', allowedOrigins);
    
    // Allow if it's in the explicit list, or if it's a valid Vercel domain
    if (allowedOrigins.indexOf(origin) !== -1 || (isVercelDomain && matchesVercelPattern)) {
      console.log('[CORS] Allowing origin:', origin);
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Input sanitization
// Skip for multipart/form-data (file uploads) - let multer handle it first
const sanitizeInput = (req, res, next) => {
  // Skip sanitization for multipart/form-data - multer needs to process files first
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    console.log('[Sanitize] Skipping sanitization for multipart/form-data request');
    return next();
  }

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Log suspicious activities
    if (res.statusCode >= 400) {
      console.warn('Security Warning:', logData);
    }

    // Log successful requests (for monitoring)
    if (res.statusCode < 400) {
      console.log('Request:', logData);
    }
  });

  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  loginLimiter,
  commentLimiter,
  productLimiter,
  securityHeaders,
  corsOptions,
  sanitizeInput,
  securityLogger,
};
