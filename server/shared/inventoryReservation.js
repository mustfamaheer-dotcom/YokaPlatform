const redis = require('./redis');
const { query } = require('./db');
const crypto = require('crypto');

const RESERVATION_TTL_SECONDS = 900; // 15 minutes

// In-memory active reservations fallback
const memoryReservations = new Map();

/**
 * Acquire distributed mutex lock
 */
async function acquireLock(resource, ttlMs = 10000) {
  const lockKey = `lock:${resource}`;
  const token = crypto.randomUUID();
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

  if (redis.raw && redis.raw.status === 'ready') {
    try {
      const res = await redis.raw.set(lockKey, token, 'PX', ttlMs, 'NX');
      if (res === 'OK') return token;
    } catch (e) {
      // Fallback to memory
    }
  }

  // Memory lock fallback
  const existing = await redis.get(lockKey);
  if (!existing) {
    await redis.setex(lockKey, ttlSec, token);
    return token;
  }
  return null;
}

/**
 * Release distributed mutex lock
 */
async function releaseLock(resource, token) {
  const lockKey = `lock:${resource}`;
  try {
    const current = await redis.get(lockKey);
    if (current === token) {
      await redis.del(lockKey);
    }
  } catch (e) {
    // Ignore release errors
  }
}

/**
 * Get total quantity currently reserved for a given product / variant in a branch
 */
async function getReservedQuantity(branchId, productId, variantId = null) {
  const prefix = `ecp:reserve:${branchId}:${productId}:${variantId || 'null'}:`;
  let total = 0;

  // 1. From Redis if available
  if (redis.raw && redis.raw.status === 'ready') {
    try {
      const keys = await redis.raw.keys(`${prefix}*`);
      for (const k of keys) {
        const val = await redis.raw.get(k);
        if (val) total += parseInt(val, 10) || 0;
      }
      return total;
    } catch (e) {
      // fallback
    }
  }

  // 2. From memory store
  const now = Date.now();
  for (const [key, data] of memoryReservations.entries()) {
    if (key.startsWith(prefix)) {
      if (data.expiresAt > now) {
        total += data.quantity;
      } else {
        memoryReservations.delete(key);
      }
    }
  }

  return total;
}

/**
 * Reserve stock for items in a cart for 15 minutes
 * @param {string|number} cartId - ID or session ID of cart
 * @param {number} branchId - Warehouse branch ID
 * @param {Array<{product_id, variant_id, quantity, product_name}>} items
 * @param {number} ttlSeconds - Duration (default 15 mins)
 */
async function reserveCartStock(cartId, branchId, items, ttlSeconds = RESERVATION_TTL_SECONDS) {
  const locksAcquired = [];

  try {
    // 1. Acquire mutex lock for all items to prevent race conditions
    for (const item of items) {
      const lockKey = `stock:${branchId}:${item.product_id}:${item.variant_id || 'base'}`;
      let token = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        token = await acquireLock(lockKey, 4000);
        if (token) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!token) {
        throw new Error(`الصنف "${item.product_name || item.product_id}" محجوز حالياً لمتسوق آخر، يرجى المحاولة بعد لحظات.`);
      }
      locksAcquired.push({ lockKey, token });
    }

    // 2. Verify available stock for each item considering existing reservations
    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (!qty || qty <= 0) continue;

      // Query database physical available stock
      let physicalStock = 0;
      if (item.variant_id) {
        const [varRow] = await query(
          `SELECT available_qty FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2 AND variant_id = $3`,
          [branchId, item.product_id, item.variant_id]
        );
        if (varRow && parseInt(varRow.available_qty, 10) > 0) {
          physicalStock = parseInt(varRow.available_qty, 10);
        } else {
          // Fallback to base product inventory
          const [baseRow] = await query(
            `SELECT available_qty FROM inventory_balances
             WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
            [branchId, item.product_id]
          );
          physicalStock = baseRow ? parseInt(baseRow.available_qty, 10) : 0;
        }
      } else {
        const [baseRow] = await query(
          `SELECT available_qty FROM inventory_balances
           WHERE branch_id = $1 AND product_id = $2 AND variant_id IS NULL`,
          [branchId, item.product_id]
        );
        physicalStock = baseRow ? parseInt(baseRow.available_qty, 10) : 0;
      }

      // Query existing reservations
      const alreadyReserved = await getReservedQuantity(branchId, item.product_id, item.variant_id);
      const effectiveStock = physicalStock - alreadyReserved;

      if (effectiveStock < qty) {
        throw new Error(
          `الكمية المطلوبة من "${item.product_name || 'الصنف'}" (${qty}) غير متوفرة حالياً. المتاح: ${Math.max(0, effectiveStock)}`
        );
      }
    }

    // 3. Establish the 15-minute reservation
    const reservationExpiresAt = Date.now() + ttlSeconds * 1000;
    for (const item of items) {
      const key = `ecp:reserve:${branchId}:${item.product_id}:${item.variant_id || 'null'}:${cartId}`;
      await redis.setex(key, ttlSeconds, item.quantity);
      memoryReservations.set(key, {
        quantity: parseInt(item.quantity, 10),
        expiresAt: reservationExpiresAt
      });
    }

    return {
      success: true,
      expiresAt: new Date(reservationExpiresAt).toISOString(),
      ttlSeconds
    };
  } finally {
    // Always release mutex locks
    for (const { lockKey, token } of locksAcquired) {
      await releaseLock(lockKey, token);
    }
  }
}

/**
 * Release all reservations for a cart
 */
async function releaseCartReservation(cartId, branchId, items = []) {
  try {
    for (const item of items) {
      const key = `ecp:reserve:${branchId}:${item.product_id}:${item.variant_id || 'null'}:${cartId}`;
      await redis.del(key);
      memoryReservations.delete(key);
    }
  } catch (err) {
    console.error('Error releasing cart reservation:', err);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  getReservedQuantity,
  reserveCartStock,
  releaseCartReservation
};
