require('dotenv').config();
const Redis = require('ioredis');

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);
const password = process.env.REDIS_PASSWORD || undefined;

// In-memory fallback map for development/testing when local Redis server is not running
const memoryStore = new Map();

let redisClient;
let isConnected = false;

try {
  redisClient = new Redis({
    host,
    port,
    password: password || undefined,
    retryStrategy: (times) => {
      // Limit retry attempts in development to prevent flooding logs
      if (process.env.NODE_ENV === 'development' && times > 3) {
        return null; // Stop retrying and fallback to in-memory store
      }
      return Math.min(times * 150, 3000);
    },
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    isConnected = true;
    console.log('✅ [Redis] Connected successfully to ' + host + ':' + port);
  }).catch((err) => {
    console.warn('⚠️ [Redis] Could not connect to Redis (' + err.message + '). Operating with in-memory token store fallback.');
  });

  redisClient.on('connect', () => {
    isConnected = true;
    console.log('✅ [Redis] Connection established');
  });

  redisClient.on('error', (err) => {
    isConnected = false;
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 [Redis] Attempting reconnection...');
  });
} catch (e) {
  console.warn('⚠️ [Redis] Initialization failed, using in-memory store.');
}

// Unified redis proxy with in-memory fallback
const redisProxy = {
  async get(key) {
    if (isConnected && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (e) {
        // Fall back to memoryStore
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async setex(key, seconds, value) {
    if (isConnected && redisClient) {
      try {
        return await redisClient.setex(key, seconds, value);
      } catch (e) {
        // Fall back to memoryStore
      }
    }
    memoryStore.set(key, {
      value: String(value),
      expiresAt: Date.now() + seconds * 1000
    });
    return 'OK';
  },

  async del(key) {
    if (isConnected && redisClient) {
      try {
        return await redisClient.del(key);
      } catch (e) {
        // Fall back
      }
    }
    memoryStore.delete(key);
    return 1;
  },

  raw: redisClient
};

module.exports = redisProxy;
