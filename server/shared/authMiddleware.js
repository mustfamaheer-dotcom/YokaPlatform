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

    // super_admin & admin always bypass role restrictions with complete system authority across all functions
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // If supervisor role is allowed, accept isSupervisor === true
    if (allowedRoles.includes('supervisor') && (req.user.role === 'supervisor' || req.user.isSupervisor === true)) {
      return next();
    }

    // Main warehouse accounts have administrative privileges
    if (req.user.isMainWarehouse === true && (allowedRoles.includes('admin') || allowedRoles.includes('supervisor') || allowedRoles.includes('warehouse_manager'))) {
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

  const userBranchId = req.user.branchId || req.user.branch_id;
  const isSuperAdmin = req.user.role === 'super_admin';

  // Only central system owners or main warehouse headquarters have cross-branch visibility
  const isCentralAdmin = !isSuperAdmin && (
    ['admin', 'warehouse_manager'].includes(req.user.role) &&
    (req.user.isMainWarehouse === true || userBranchId === 1 || !userBranchId) &&
    req.user.branchType !== 'retail_branch'
  );

  const hasCrossBranchAccess = isSuperAdmin || isCentralAdmin;

  if (hasCrossBranchAccess) {
    // Central Admin & Warehouse Manager have cross-branch visibility; can optionally filter by query/body branch_id
    const rawBranch = req.query.branch_id || req.body.branch_id;
    if (rawBranch === 'all' || rawBranch === 'retail' || rawBranch === 'ecom' || rawBranch === 'ecs') {
      req.scopedBranchId = rawBranch;
    } else if (rawBranch) {
      req.scopedBranchId = parseInt(rawBranch, 10);
    } else {
      req.scopedBranchId = isSuperAdmin ? 'all' : (userBranchId || 'all');
    }
    req.isCrossBranchAdmin = true;
    return next();
  }

  // Branch staff / Branch admin are strictly confined to their assigned branch
  req.isCrossBranchAdmin = false;

  // E-Commerce warehouse users requesting ecom store data
  if (req.user.branchType === 'ecom_warehouse' || req.user.branchCode === 'BR-ECOM' || userBranchId === 2) {
    const rawBranch = req.query.branch_id || req.body.branch_id;
    if (rawBranch === 'ecom' || rawBranch === 'ecs' || !rawBranch) {
      req.scopedBranchId = 'ecom';
    } else {
      req.scopedBranchId = userBranchId || 2;
    }
    return next();
  }

  // Branch staff and branch admin must be strictly bound to their assigned branch
  req.scopedBranchId = userBranchId || 1;
  next();
}

/**
 * Granular Permission Guard for Warehouse Manager
 * @param {string} permKey - Name of the permission field (e.g. 'perm_pos', 'perm_transfers')
 */
function requireWarehousePermission(permKey) {
  return async (req, res, next) => {
    // If req.user is not yet populated by an earlier middleware, try authenticating from Bearer token
    if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        decoded.branch_id = decoded.branch_id || decoded.branchId || null;
        decoded.branchId = decoded.branchId || decoded.branch_id || null;
        req.user = decoded;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired access token.'
        });
      }
    }

    if (!req.user) {
      // If no token provided, defer to downstream handlers (e.g. requireAuth or public route)
      return next();
    }

    // Super admin & admin bypass warehouse manager permission restrictions
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Only apply if user is warehouse_manager
    if (req.user.role !== 'warehouse_manager') {
      return next();
    }

    // Role is warehouse_manager -> check permissions
    try {
      const { query } = require('./db');
      const rows = await query(
        `SELECT * FROM warehouse_manager_permissions WHERE user_id = $1 LIMIT 1`,
        [req.user.id]
      );
      const perms = rows[0] || null;

      const column = permKey.startsWith('perm_') ? permKey : `perm_${permKey}`;
      if (!perms || perms[column] !== true) {
        return res.status(403).json({
          success: false,
          code: 'WAREHOUSE_PERMISSION_DENIED',
          message: `تم إيقاف صلاحية (${permKey}) لحساب مدير المخازن بواسطة الإدارة.`
        });
      }

      req.user.wmPermissions = perms;
      next();
    } catch (err) {
      console.error('Error validating warehouse permission:', err);
      return res.status(500).json({ success: false, message: 'Internal authorization error.' });
    }
  };
}

module.exports = { requireAuth, requireRole, requireBranchScope, requireWarehousePermission };

