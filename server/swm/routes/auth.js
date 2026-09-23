const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redis = require('../../shared/redis');
const { query } = require('../../shared/db');
const { logActivity } = require('../../shared/activityLogger');
const { requireAuth } = require('../../shared/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'yoka_jwt_secret_dev_key_2026_moustafa_maher';
const ACCESS_EXPIRES = '1h';
const REFRESH_EXPIRES = '7d';

/**
 * POST /api/auth/login
 * User & Staff Authentication with JWT and Redis Refresh Token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const rows = await query(
      `SELECT id, username, email, password_hash, full_name, role, branch_id, status
       FROM users WHERE username = $1 OR email = $1 LIMIT 1`,
      [username.trim()]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact system administrator.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      branchId: user.branch_id
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
    const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });

    // Store refresh token in Redis (7 days TTL)
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 3600, refreshToken);

    // Update last login timestamp
    await query(`UPDATE users SET last_login = NOW(), login_attempts = 0 WHERE id = $1`, [user.id]);

    // Fire-and-forget activity log
    logActivity({
      userId: user.id,
      branchId: user.branch_id,
      actionType: 'LOGIN',
      entityType: 'users',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      notes: `User logged in with role ${user.role}`
    });

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          branchId: user.branch_id
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Token refresh endpoint
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const storedToken = await redis.get(`refresh:${decoded.id}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or invalid' });
    }

    const rows = await query(
      `SELECT id, username, full_name, role, branch_id, status FROM users WHERE id = $1 AND status = 'active' LIMIT 1`,
      [decoded.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      branchId: user.branch_id
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
    const newRefreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });

    await redis.setex(`refresh:${user.id}`, 7 * 24 * 3600, newRefreshToken);

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.id) {
          await redis.del(`refresh:${decoded.id}`);
        }
      } catch (e) {
        // ignore decoding errors
      }
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
});

/**
 * GET /api/auth/me
 * Returns currently logged-in user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.branch_id, u.phone,
              b.branch_name, b.branch_code
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1 LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
