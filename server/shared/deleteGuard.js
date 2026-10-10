/**
 * Global Delete Protection Middleware
 * Restricts all DELETE HTTP methods exclusively to `super_admin` (System Owner).
 * Returns 403 DELETE_FORBIDDEN for any other role (including admin, warehouse_manager, supervisor, salesperson).
 */

const { requireAuth } = require('./authMiddleware');

function deleteGuard(req, res, next) {
  if (req.method === 'DELETE') {
    // If user is not yet authenticated by a route-level middleware, run requireAuth first
    if (!req.user) {
      return requireAuth(req, res, () => {
        if (!req.user || req.user.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            code: 'DELETE_FORBIDDEN',
            message: 'صلاحية الحذف مقتصرة حصرياً على مدير عام النظام (Owner Only). غير مصرح لأي دور آخر بالحذف نهائياً.'
          });
        }
        next();
      });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        code: 'DELETE_FORBIDDEN',
        message: 'صلاحية الحذف مقتصرة حصرياً على مدير عام النظام (Owner Only). غير مصرح لأي دور آخر بالحذف نهائياً.'
      });
    }
  }
  next();
}

module.exports = deleteGuard;
