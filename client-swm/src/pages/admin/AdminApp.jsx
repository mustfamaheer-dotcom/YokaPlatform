import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Avatar,
  Space,
  Typography,
  Tag,
  Breadcrumb
} from 'antd';
import {
  Compass,
  ArrowRight,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  MapPin,
  Layers,
  Sparkles
} from 'lucide-react';
import ScrollToTopTabs from '../../components/ScrollToTopTabs';
import NavigationHub from './NavigationHub';
import {
  NAVIGATION_CATEGORIES,
  getCategoryById,
  getAllPages
} from './navigationData.jsx';

// Pages
import Home from '../Home';
import Dashboard from '../Dashboard';
import BranchesDaily from '../BranchesDaily';
import AdminJournals from '../AdminJournals';
import StockAudit from '../StockAudit';
import StockAdjustments from '../StockAdjustments';
import Products from '../Products';
import GroupsAndItems from '../GroupsAndItems';
import Branches from '../Branches';
import UsersPage from '../Users';
import Suppliers from '../Suppliers';
import Purchases from '../Purchases';
import Orders from '../Orders';
import EcomAnalytics from '../EcomAnalytics';
import DailyShift from '../DailyShift';
import Transfers from '../Transfers';
import TreasuryAdmin from '../TreasuryAdmin';
import EcomInventory from '../EcomInventory';
import SalesReportsPage from './supervisor/SalesReportsPage';
import SellerPayrollAndExpenseCategoriesCards from '../../components/SellerPayrollAndExpenseCategoriesCards';
import yokaLogo from '../../assets/yokaStoreTransparent.png';

const { Header, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS = {
  super_admin: { label: 'مدير عام النظام', color: 'red' },
  admin: { label: 'مدير إداري', color: 'volcano' },
  supervisor: { label: 'مشرف فرع', color: 'orange' },
  salesperson: { label: 'بائع / كاشير', color: 'blue' }
};

export default function AdminApp({ currentUser, onSwitchToPos, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract route path after /dashboard
  // Possible paths:
  // /dashboard -> hub
  // /dashboard/hub -> hub
  // /dashboard/hub/inventory -> hub with category 'inventory'
  // /dashboard/products -> page 'products'
  const pathParts = useMemo(() => {
    const raw = location.pathname.replace(/^\/dashboard\/?/, '');
    return raw ? raw.split('/').filter(Boolean) : [];
  }, [location.pathname]);

  const activeTab = useMemo(() => {
    if (pathParts.length === 0) return 'home';
    if (pathParts[0] === 'hub') return 'home';
    return pathParts[0];
  }, [pathParts]);

  const activeCategory = useMemo(() => {
    if (pathParts[0] === 'hub' && pathParts[1]) {
      return pathParts[1];
    }
    return null;
  }, [pathParts]);

  const [tabExtra, setTabExtra] = useState(null);

  // Helper to find category and metadata for current active page
  const currentPageMeta = useMemo(() => {
    if (activeTab === 'home' || activeTab === 'hub') return null;
    const allPages = getAllPages();
    return allPages.find((p) => p.id === activeTab) || null;
  }, [activeTab]);

  const handleNavigate = (tab, extra = null) => {
    setTabExtra(extra);
    if (!tab || tab === 'hub' || tab === 'home') {
      navigate('/dashboard/home');
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  const handleSelectCategory = (categoryId) => {
    if (categoryId) {
      navigate(`/dashboard/hub/${categoryId}`);
    } else {
      navigate('/dashboard/hub');
    }
  };

  const handleSelectPage = (pageId) => {
    navigate(`/dashboard/${pageId}`);
  };

  const role = currentUser?.role || 'admin';
  const roleInfo = ROLE_LABELS[role] || { label: role, color: 'default' };
  const branchDisplayName =
    currentUser?.branchName || currentUser?.branch_name || 'الإدارة المركزية';

  return (
    <Layout
      style={{
        minHeight: '100vh',
        direction: 'rtl',
        backgroundColor: '#F8FAFC'
      }}
    >
      <ScrollToTopTabs activeTab={activeTab} />

      {/* ─── FULL-WIDTH MODERN TOP NAVIGATION BAR ───────────────────── */}
      <Header
        className="swm-top-header"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        {/* Left Section: Branding & Hub Shortcut */}
        <div className="swm-header-start" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo & Platform Name */}
          <div
            className="swm-header-brand"
            onClick={() => handleNavigate('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <img
              src={yokaLogo}
              alt="Yoka Store"
              className="swm-header-logo"
              style={{ height: 34, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span
                className="swm-header-brand-title"
                style={{
                  color: '#0F172A',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'block'
                }}
              >
                يوكا ستور
              </span>
              <span className="swm-hide-mobile" style={{ color: '#0F766E', fontSize: 11, fontWeight: 700 }}>
                لوحة الإدارة المركزية
              </span>
            </div>
          </div>

          <div
            className="swm-hide-mobile"
            style={{
              height: 24,
              width: 1,
              backgroundColor: '#E2E8F0',
              margin: '0 2px'
            }}
          />

          {/* Primary Navigation Hub Button */}
          <Button
            type={activeTab === 'home' || activeTab === 'hub' ? 'primary' : 'default'}
            className="swm-header-hub-btn"
            icon={<Compass size={16} style={{ marginLeft: 4 }} />}
            onClick={() => handleNavigate('home')}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: (activeTab === 'home' || activeTab === 'hub') ? '#0F766E' : '#FFFFFF',
              borderColor: (activeTab === 'home' || activeTab === 'hub') ? '#0F766E' : '#CBD5E1',
              color: (activeTab === 'home' || activeTab === 'hub') ? '#FFFFFF' : '#0F172A'
            }}
          >
            <span>الرئيسية<span className="swm-hide-mobile"> (Navigation Hub)</span></span>
          </Button>

          {/* Branch Tag */}
          <Tag
            className="swm-hide-mobile"
            style={{
              fontSize: 12,
              padding: '3px 8px',
              fontWeight: 700,
              borderRadius: 8,
              backgroundColor: '#F0FDFA',
              color: '#0F766E',
              border: '1px solid #CCFBF1',
              margin: 0
            }}
          >
            <MapPin size={12} style={{ marginLeft: 4, display: 'inline' }} />
            {branchDisplayName}
          </Tag>
        </div>

        {/* Left Section (in RTL: End/Left): User Profile Info & Logout */}
        <div className="swm-header-end" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* User Profile Info */}
          <div className="swm-header-user" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              className="swm-header-avatar"
              style={{
                backgroundColor: '#0F766E',
                border: '1px solid #0D5D56',
                flexShrink: 0
              }}
              icon={<ShieldCheck size={18} />}
            />
            <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
              <Text strong className="swm-header-username" style={{ display: 'block', fontSize: 13, color: '#0F172A' }}>
                {currentUser?.fullName || currentUser?.username}
              </Text>
              <Tag
                className="swm-hide-mobile"
                color={roleInfo.color}
                style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}
              >
                {roleInfo.label}
              </Tag>
            </div>
          </div>

          <div
            className="swm-hide-mobile"
            style={{
              height: 28,
              width: 1,
              backgroundColor: '#E2E8F0',
              margin: '0 2px'
            }}
          />

          {/* Logout Button */}
          <Button
            type="text"
            danger
            className="swm-header-logout-btn"
            icon={<LogOut size={16} style={{ marginLeft: 4 }} />}
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 8
            }}
          >
            <span className="swm-header-logout-text">خروج</span>
          </Button>
        </div>
      </Header>

      {/* ─── MAIN FULL-WIDTH CONTENT AREA ─────────────────────────────── */}
      <Content
        className="swm-main-content"
        style={{
          width: '100%',
          maxWidth: 1600,
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {/* If viewing a child page, show quick breadcrumb bar to return to Hub/Home */}
        {activeTab !== 'home' && activeTab !== 'hub' && currentPageMeta && (
          <div className="swm-breadcrumb-bar">
            {/* Breadcrumb Navigation Trail */}
            <div className="swm-breadcrumb-trail">
              <button
                onClick={() => handleNavigate('home')}
                className="swm-breadcrumb-btn swm-breadcrumb-home"
              >
                <Compass size={15} color="#0F766E" />
                <span>الرئيسية<span className="swm-hide-mobile"> (Navigation Hub)</span></span>
              </button>

              <ChevronLeft size={14} className="swm-breadcrumb-sep" />

              <button
                onClick={() => handleSelectCategory(currentPageMeta.categoryId)}
                className="swm-breadcrumb-btn swm-breadcrumb-cat"
              >
                {currentPageMeta.categoryTitle}
              </button>

              <ChevronLeft size={14} className="swm-breadcrumb-sep" />

              <span className="swm-breadcrumb-current">
                {currentPageMeta.title}
              </span>
            </div>

            {/* Quick Action Button: Back to Main Hub */}
            <Button
              size="small"
              className="swm-hide-mobile swm-breadcrumb-back-btn"
              icon={<ArrowRight size={14} style={{ marginLeft: 4 }} />}
              onClick={() => handleNavigate('home')}
            >
              العودة للرئيسية
            </Button>
          </div>
        )}

        {/* ─── ROUTING / TAB VIEWS ──────────────────────────────────── */}
        {(activeTab === 'home' || activeTab === 'hub') && (
          <Home currentUser={currentUser} onNavigate={handleNavigate} />
        )}

        {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activeTab === 'orders' && <Orders currentUser={currentUser} />}
        {activeTab === 'purchases' && (
          <Purchases
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {activeTab === 'suppliers' && (
          <Suppliers
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {activeTab === 'products' && (
          <Navigate to="/dashboard/groups_items" replace />
        )}
        {activeTab === 'groups_items' && (
          <GroupsAndItems
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {(activeTab === 'stock_audit' || activeTab === 'stock_adjustments') && (
          <StockAudit
            currentUser={currentUser}
          />
        )}
        {activeTab === 'transfers' && (
          <Transfers
            currentUser={currentUser}
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {activeTab === 'branches' && (
          <Branches
            currentUser={currentUser}
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {activeTab === 'users' && (
          <UsersPage
            currentUser={currentUser}
            autoOpenCreate={tabExtra?.autoOpenCreate}
            onResetAction={() => setTabExtra(null)}
          />
        )}
        {activeTab === 'payroll_expenses' && (
          <div style={{ padding: '4px' }}>
            <SellerPayrollAndExpenseCategoriesCards currentUser={currentUser} />
          </div>
        )}
        {activeTab === 'treasury_admin' && <TreasuryAdmin />}
        {activeTab === 'branches_daily' && <BranchesDaily />}
        {activeTab === 'admin_journals' && <AdminJournals />}
        {(activeTab === 'sales_reports' || activeTab === 'retail_analytics') && (
          <SalesReportsPage currentUser={currentUser} />
        )}
        {activeTab === 'ecom_analytics' && (
          <EcomAnalytics currentUser={currentUser} onNavigate={handleNavigate} />
        )}
        {activeTab === 'ecom_inventory' && (
          <EcomInventory currentUser={currentUser} onNavigate={handleNavigate} />
        )}
        {activeTab === 'daily_shift' && <DailyShift currentUser={currentUser} />}
      </Content>
    </Layout>
  );
}
