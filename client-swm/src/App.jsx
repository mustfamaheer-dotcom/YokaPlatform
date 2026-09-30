import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Spin, App as AntApp } from 'antd';
import Login from './pages/Login';
import SellerApp from './pages/pos/SellerApp';
import SupervisorDashboard from './pages/admin/SupervisorDashboard';
import SalesReportsPage from './pages/admin/supervisor/SalesReportsPage';
import TreasuryPage from './pages/admin/supervisor/TreasuryPage';
import InventoryPage from './pages/admin/supervisor/InventoryPage';
import SettingsPage from './pages/admin/supervisor/SettingsPage';
import StockAlertsPage from './pages/admin/supervisor/StockAlertsPage';
import AdminApp from './pages/admin/AdminApp';
import EcomWarehouseApp from './pages/ecom/EcomWarehouseApp';
import api from './api';

/**
 * Helper to identify if user belongs to an E-Commerce warehouse
 */
export function isEcomWarehouseUser(user) {
  if (!user) return false;
  return user.branchType === 'ecom_warehouse' || user.branchCode === 'BR-ECOM';
}

/**
 * Strict Role-Based Protected Route Guard
 * Never blindly falls back to lower-privileged routes.
 * If unauthorized, bounces the user directly to their respective role-based home.
 */
function ProtectedRoute({ currentUser, allowedRoles, requiredBranchType, children }) {
  const { message } = AntApp.useApp();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isEcom = isEcomWarehouseUser(currentUser);
  const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
  const isSupervisor = currentUser.role === 'supervisor' || currentUser.isSupervisor === true;

  // 1. Guard against E-Commerce users trying to access Retail POS / Shift screens
  if (isEcom && !isAdmin && (location.pathname === '/pos' || location.pathname.startsWith('/supervisor'))) {
    message.info('تم توجيهك إلى بوابة مستودع المتجر الإلكتروني المخصصة لفرعك.');
    return <Navigate to="/ecom" replace />;
  }

  // 2. Guard for routes specifically requiring ecom_warehouse (unless admin)
  if (requiredBranchType === 'ecom_warehouse' && !isEcom && !isAdmin) {
    message.warning('هذه البوابة مخصصة لمستودع المتجر الإلكتروني فقط.');
    return <RoleRootRedirect currentUser={currentUser} />;
  }

  const isAllowed = allowedRoles.includes(currentUser.role) || (isSupervisor && allowedRoles.includes('supervisor'));

  if (!isAllowed) {
    message.warning('غير مصرح لك بالوصول إلى هذه الصفحة. تم توجيهك إلى شاشتك المخصصة.');
    return <RoleRootRedirect currentUser={currentUser} />;
  }

  return children;
}

/**
 * Root Redirection helper based on user authentication, branch type, and role
 */
function RoleRootRedirect({ currentUser }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 1. E-Commerce Warehouse Portal (Orders, Inventory, Analytics)
  if (isEcomWarehouseUser(currentUser)) {
    return <Navigate to="/ecom" replace />;
  }

  const isSupervisor = currentUser.role === 'supervisor' || currentUser.isSupervisor === true;
  const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);

  // 2. Main Admin Portal
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Retail Branch Supervisor Dashboard
  if (isSupervisor) {
    return <Navigate to="/supervisor-dashboard" replace />;
  }

  // 4. Retail Branch POS Cashier
  if (currentUser.role === 'salesperson') {
    return <Navigate to="/pos" replace />;
  }

  return <Navigate to="/pos" replace />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      if (storedUser && token) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
        } catch (e) {
          localStorage.clear();
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.clear();
      setCurrentUser(null);
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}
      >
        <Spin size="large" />
        <span style={{ color: '#64748b', fontSize: 14 }}>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          currentUser ? (
            <RoleRootRedirect currentUser={currentUser} />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      {/* E-Commerce Warehouse Portal Route (Orders, Inventory, Analytics) */}
      <Route
        path="/ecom/*"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['salesperson', 'supervisor', 'admin', 'super_admin']}
            requiredBranchType="ecom_warehouse"
          >
            <EcomWarehouseApp
              currentUser={currentUser}
              onLogout={handleLogout}
              onSupervisorUnlock={(elevatedUser) => {
                setCurrentUser(elevatedUser);
              }}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ecom"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['salesperson', 'supervisor', 'admin', 'super_admin']}
            requiredBranchType="ecom_warehouse"
          >
            <EcomWarehouseApp
              currentUser={currentUser}
              onLogout={handleLogout}
              onSupervisorUnlock={(elevatedUser) => {
                setCurrentUser(elevatedUser);
              }}
            />
          </ProtectedRoute>
        }
      />

      {/* POS / Sales Terminal Route (salesperson, supervisor, admin, super_admin) */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['salesperson', 'supervisor', 'admin', 'super_admin']}
          >
            <SellerApp
              currentUser={currentUser}
              onSwitchToAdmin={() => {
                if (currentUser.role === 'supervisor') {
                  navigate('/supervisor-dashboard');
                } else {
                  navigate('/dashboard');
                }
              }}
              onLogout={handleLogout}
              onSupervisorUnlock={(elevatedUser) => {
                setCurrentUser(elevatedUser);
              }}
            />
          </ProtectedRoute>
        }
      />

      {/* Supervisor Navigation Hub (4 Clickable Cards) */}
      <Route
        path="/supervisor-dashboard"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <SupervisorDashboard
              currentUser={currentUser}
              onSwitchToPos={() => navigate('/pos')}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor"
        element={<Navigate to="/supervisor-dashboard" replace />}
      />

      {/* Comprehensive Sales & Reports Page (Supervisor, Admin & Super Admin - NEVER Salesperson/POS) */}
      <Route
        path="/admin/sales-reports"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <SalesReportsPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-reports"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <SalesReportsPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor/sales-reports"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <SalesReportsPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/treasury"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <TreasuryPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/inventory"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <InventoryPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supervisor/settings"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['supervisor', 'admin', 'super_admin']}
          >
            <SettingsPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />

      {/* Stock Alerts & Warnings Route (Accessible to salesperson, supervisor, admin) */}
      <Route
        path="/alerts"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['salesperson', 'supervisor', 'admin', 'super_admin']}
          >
            <StockAlertsPage currentUser={currentUser} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/low-stock"
        element={<Navigate to="/alerts" replace />}
      />
      <Route
        path="/supervisor/alerts"
        element={<Navigate to="/alerts" replace />}
      />

      {/* Main Admin Dashboard & Executive Portal Route (admin, super_admin) */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute
            currentUser={currentUser}
            allowedRoles={['admin', 'super_admin']}
          >
            <AdminApp
              currentUser={currentUser}
              onSwitchToPos={() => navigate('/pos')}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* /admin smart aliases based on role & branch type */}
      <Route
        path="/admin"
        element={<RoleRootRedirect currentUser={currentUser} />}
      />
      <Route
        path="/admin/*"
        element={<RoleRootRedirect currentUser={currentUser} />}
      />

      {/* Root Route Smart Role Redirection */}
      <Route path="/" element={<RoleRootRedirect currentUser={currentUser} />} />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
