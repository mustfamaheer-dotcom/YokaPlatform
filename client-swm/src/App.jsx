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
import api from './api';

/**
 * Strict Role-Based Protected Route Guard
 * Never blindly falls back to lower-privileged routes.
 * If unauthorized, bounces the user directly to their respective role-based home.
 */
function ProtectedRoute({ currentUser, allowedRoles, children }) {
  const { message } = AntApp.useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isSupervisor = currentUser.role === 'supervisor' || currentUser.isSupervisor === true;
  const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
  const isAllowed = allowedRoles.includes(currentUser.role) || (isSupervisor && allowedRoles.includes('supervisor'));

  if (!isAllowed) {
    message.warning('غير مصرح لك بالوصول إلى هذه الصفحة. تم توجيهك إلى شاشتك المخصصة.');

    if (isSupervisor && !isAdmin) {
      return <Navigate to="/supervisor-dashboard" replace />;
    } else if (isAdmin) {
      return <Navigate to="/dashboard" replace />;
    } else if (currentUser.role === 'salesperson') {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Root Redirection helper based on user authentication and role
 */
function RoleRootRedirect({ currentUser }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isSupervisor = currentUser.role === 'supervisor' || currentUser.isSupervisor === true;
  const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);

  if (isSupervisor && !isAdmin) {
    return <Navigate to="/supervisor-dashboard" replace />;
  } else if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  } else if (currentUser.role === 'salesperson') {
    return <Navigate to="/pos" replace />;
  }

  return <Navigate to="/supervisor-dashboard" replace />;
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

      {/* /admin smart aliases based on role */}
      <Route
        path="/admin"
        element={
          currentUser?.role === 'salesperson' ? (
            <Navigate to="/pos" replace />
          ) : currentUser?.role === 'supervisor' || currentUser?.isSupervisor ? (
            <Navigate to="/supervisor-dashboard" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          currentUser?.role === 'salesperson' ? (
            <Navigate to="/pos" replace />
          ) : currentUser?.role === 'supervisor' || currentUser?.isSupervisor ? (
            <Navigate to="/supervisor-dashboard" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Root Route Smart Role Redirection */}
      <Route path="/" element={<RoleRootRedirect currentUser={currentUser} />} />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
