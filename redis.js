const { Redis } = require("ioredis");

// Create Redis client with proper error handling and retry logic
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    // Stop retrying after 5 attempts to prevent infinite retry loops
    if (times > 5) {
      console.warn('[Redis] Max retry attempts reached, giving up connection');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false, // Don't queue commands when offline
  lazyConnect: true, // Don't connect immediately
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
};

// Support REDIS_URL if provided (e.g., Render/Upstash)
const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl, redisOptions) : new Redis(redisOptions);

// Track connection status
let isRedisAvailable = false;

// Handle connection errors gracefully
redis.on('error', (err) => {
  console.warn('[Redis] Connection error:', err.message);
  isRedisAvailable = false;
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
  isRedisAvailable = true;
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
  isRedisAvailable = true;
});

redis.on('close', () => {
  console.warn('[Redis] Connection closed');
  isRedisAvailable = false;
});

redis.on('reconnecting', (time) => {
  console.log(`[Redis] Reconnecting in ${time}ms...`);
});

// Don't connect immediately - let it connect lazily on first command
// This prevents unhandled connection errors at startup
// If Redis is not available, operations will fail gracefully

// Export redis client and helper functions
module.exports = redis;

// Helper function to check if Redis is available
module.exports.isAvailable = () => isRedisAvailable;

// Helper function to safely execute Redis commands
// These functions will gracefully handle Redis unavailability
module.exports.safeGet = async (key) => {
  try {
    const result = await redis.get(key);
    return result;
  } catch (err) {
    // Redis is not available or connection failed - return null (OTP expired)
    console.warn('[Redis] safeGet error:', err.message);
    return null;
  }
};

module.exports.safeSet = async (key, value, ...args) => {
  try {
    return await redis.set(key, value, ...args);
  } catch (err) {
    // Redis is not available - return OK to not break the flow
    // In production without Redis, OTP won't be cached but app will work
    console.warn('[Redis] safeSet error:', err.message);
    return 'OK';
  }
};

module.exports.safeTtl = async (key) => {
  try {
    return await redis.ttl(key);
  } catch (err) {
    // Redis is not available - return -1 (expired)
    console.warn('[Redis] safeTtl error:', err.message);
    return -1;
  }
};