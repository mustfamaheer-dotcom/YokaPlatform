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
    if (pathParts.length === 0) return 'hub';
    if (pathParts[0] === 'hub') return 'hub';
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
    if (activeTab === 'hub') return null;
    const allPages = getAllPages();
    return allPages.find((p) => p.id === activeTab) || null;
  }, [activeTab]);

  const handleNavigate = (tab, extra = null) => {
    setTabExtra(extra);
    if (!tab || tab === 'hub') {
      navigate('/dashboard/hub');
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
        style={{
          padding: '0 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 68,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        {/* Left Section: Branding & Hub Shortcut */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Logo & Platform Name */}
          <div
            onClick={() => handleNavigate('hub')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <img
              src={yokaLogo}
              alt="Yoka Store"
              style={{ height: 38, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span
                style={{
                  color: '#0F172A',
                  fontSize: 15,
                  fontWeight: 800,
                  display: 'block'
                }}
              >
                يوكا ستور
              </span>
              <span style={{ color: '#0F766E', fontSize: 11, fontWeight: 700 }}>
                لوحة الإدارة المركزية
              </span>
            </div>
          </div>

          <div
            style={{
              height: 28,
              width: 1,
              backgroundColor: '#E2E8F0',
              margin: '0 4px'
            }}
          />

          {/* Primary Navigation Hub Button */}
          <Button
            type={activeTab === 'hub' ? 'primary' : 'default'}
            icon={<Compass size={16} style={{ marginLeft: 6 }} />}
            onClick={() => handleNavigate('hub')}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: activeTab === 'hub' ? '#0F766E' : '#FFFFFF',
              borderColor: activeTab === 'hub' ? '#0F766E' : '#CBD5E1',
              color: activeTab === 'hub' ? '#FFFFFF' : '#0F172A'
            }}
          >
            القائمة الرئيسية (Navigation Hub)
          </Button>

          {/* Branch Tag */}
          <Tag
            style={{
              fontSize: 12,
              padding: '4px 10px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* User Profile Info */}
          <Space size="small">
            <Avatar
              style={{
                backgroundColor: '#0F766E',
                border: '1px solid #0D5D56'
              }}
              icon={<ShieldCheck size={18} />}
            />
            <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
              <Text strong style={{ display: 'block', fontSize: 13, color: '#0F172A' }}>
                {currentUser?.fullName || currentUser?.username}
              </Text>
              <Tag
                color={roleInfo.color}
                style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}
              >
                {roleInfo.label}
              </Tag>
            </div>
          </Space>

          <div
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
            خروج
          </Button>
        </div>
      </Header>

      {/* ─── MAIN FULL-WIDTH CONTENT AREA ─────────────────────────────── */}
      <Content
        style={{
          padding: '24px 32px 48px',
          minHeight: 'calc(100vh - 68px)',
          width: '100%',
          maxWidth: 1600,
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {/* If viewing a child page, show quick breadcrumb bar to return to Hub/Sub-Hub */}
        {activeTab !== 'hub' && currentPageMeta && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: '1.5px solid #E2E8F0',
              padding: '12px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
            }}
          >
            {/* Breadcrumb Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <button
                onClick={() => handleNavigate('hub')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#0F766E',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Compass size={15} color="#0F766E" />
                <span>القائمة الرئيسية</span>
              </button>

              <ChevronLeft size={14} color="#94A3B8" />

              <button
                onClick={() => handleSelectCategory(currentPageMeta.categoryId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#475569',
                  fontWeight: 600
                }}
              >
                {currentPageMeta.categoryTitle}
              </button>

              <ChevronLeft size={14} color="#94A3B8" />

              <span style={{ color: '#0F172A', fontWeight: 800 }}>
                {currentPageMeta.title}
              </span>
            </div>

            {/* Quick Action Button: Back to Main Hub */}
            <Button
              size="small"
              icon={<ArrowRight size={14} style={{ marginLeft: 4 }} />}
              onClick={() => handleNavigate('hub')}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                color: '#0F766E',
                borderColor: '#0F766E'
              }}
            >
              العودة للقائمة الرئيسية
            </Button>
          </div>
        )}

        {/* ─── ROUTING / TAB VIEWS ──────────────────────────────────── */}
        {activeTab === 'hub' && (
          <NavigationHub
            currentUser={currentUser}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
            onSelectPage={handleSelectPage}
          />
        )}

        {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activeTab === 'home' && <Home currentUser={currentUser} onNavigate={handleNavigate} />}
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
