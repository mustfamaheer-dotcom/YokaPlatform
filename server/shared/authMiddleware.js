const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yoka_jwt_secret_dev_key_2026_moustafa_maher';

/**
 * Authentication Middleware: Validates Bearer JWT Access Token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No Bearer token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Normalize branch id property across camelCase and snake_case
    decoded.branch_id = decoded.branch_id || decoded.branchId || null;
    decoded.branchId = decoded.branchId || decoded.branch_id || null;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token.'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param {string[]} allowedRoles - List of permitted roles
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated.'
      });
    }

    // super_admin always bypasses role restrictions
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}

/**
 * Branch Scoping Guard:
 * Ensures branch users can only query/mutate their own branch data.
 * Admins have cross-branch visibility.
 */
function requireBranchScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated.' });
  }

  const ADMIN_ROLES = ['super_admin', 'admin'];
  if (ADMIN_ROLES.includes(req.user.role)) {
    // Admin has global access; can optionally filter by query/body branch_id
    const rawBranch = req.query.branch_id || req.body.branch_id;
    if (rawBranch === 'all' || rawBranch === 'retail') {
      req.scopedBranchId = rawBranch;
    } else if (rawBranch) {
      req.scopedBranchId = parseInt(rawBranch, 10);
    } else {
      req.scopedBranchId = req.user.branchId || 'all';
    }
    req.isCrossBranchAdmin = true;
    return next();
  }

  // Branch staff must have a valid branch assigned
  if (!req.user.branchId) {
    return res.status(403).json({
      success: false,
      message: 'هذا الحساب غير مرتبط بأي فرع مصرح به.'
    });
  }

  req.scopedBranchId = req.user.branchId;
  req.isCrossBranchAdmin = false;
  next();
}

module.exports = { requireAuth, requireRole, requireBranchScope };

