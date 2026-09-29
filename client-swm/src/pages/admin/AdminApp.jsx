import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Space,
  Typography,
  Tag,
  Alert,
  Drawer,
  App as AntApp
} from 'antd';
import {
  Home as HomeIcon,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  CalendarCheck,
  ShoppingBag,
  FileSpreadsheet,
  BookOpenCheck,
  Landmark,
  ArrowLeftRight,
  ClipboardCheck,
  SlidersHorizontal,
  Layers,
  Receipt,
  Truck,
  Store,
  Users,
  Wallet,
  LogOut,
  ShieldCheck,
  MapPin,
  PackageCheck,
  Menu as MenuIcon,
  X,
  ScanLine,
  Crown
} from 'lucide-react';
import ScrollToTopTabs from '../../components/ScrollToTopTabs';
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
import RetailAnalytics from '../RetailAnalytics';
import EcomAnalytics from '../EcomAnalytics';
import DailyShift from '../DailyShift';
import Transfers from '../Transfers';
import BranchTreasury from '../BranchTreasury';
import TreasuryAdmin from '../TreasuryAdmin';
import EcomInventory from '../EcomInventory';
import SalesReportsPage from './supervisor/SalesReportsPage';
import yokaLogo from '../../assets/yokaStoreTransparent.png';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const ROLE_LABELS = {
  super_admin: { label: 'مدير عام النظام', color: 'red' },
  admin: { label: 'مدير إداري', color: 'volcano' },
  supervisor: { label: 'مشرف فرع', color: 'orange' },
  salesperson: { label: 'بائع / كاشير', color: 'blue' }
};

export default function AdminApp({ currentUser, onSwitchToPos, onLogout }) {
  const navigate = useNavigate();
  // Default to Main Executive Admin Dashboard
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabExtra, setTabExtra] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 840 : false
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 840;
      setIsMobile(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (tab, extra = null) => {
    setActiveTab(tab);
    setTabExtra(extra);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const role = currentUser?.role || 'admin';
  const roleInfo = ROLE_LABELS[role] || { label: role, color: 'default' };
  const branchDisplayName = currentUser?.branchName || currentUser?.branch_name || 'الإدارة المركزية';

  // Admin Navigation Menu
  const menuItems = useMemo(() => {
    const grouped = [
      {
        key: 'dashboard',
        icon: <LayoutDashboard size={18} />,
        label: 'لوحة التحكم الرئيسية'
      },
      {
        key: 'home',
        icon: <HomeIcon size={18} />,
        label: 'نبض العمليات والمؤشرات'
      },
      {
        key: 'group_ecp',
        label: 'المتجر الإلكتروني',
        icon: <ShoppingBag size={18} />,
        children: [
          { key: 'orders', icon: <ShoppingBag size={18} />, label: 'طلبات المتجر الإلكتروني' },
          { key: 'ecom_inventory', icon: <PackageCheck size={18} />, label: 'مخزون المتجر الإلكتروني' },
          { key: 'ecom_analytics', icon: <TrendingUp size={18} />, label: 'إحصائيات المتجر الإلكتروني' }
        ]
      },
      {
        key: 'group_inventory',
        label: 'إدارة المخزون',
        icon: <Layers size={18} />,
        children: [
          { key: 'products', icon: <PackageCheck size={18} />, label: 'قائمة المنتجات والباركود' },
          { key: 'groups_items', icon: <Layers size={18} />, label: 'المجموعات والأصناف' },
          { key: 'stock_audit', icon: <ClipboardCheck size={18} />, label: 'الجرد المجمع' },
          { key: 'stock_adjustments', icon: <SlidersHorizontal size={18} />, label: 'سندات التسوية' },
          { key: 'transfers', icon: <ArrowLeftRight size={18} />, label: 'أذونات الصرف والتحويل' }
        ]
      },
      {
        key: 'group_purchases',
        label: 'المشتريات والتوريد',
        icon: <Receipt size={18} />,
        children: [
          { key: 'purchases', icon: <Receipt size={18} />, label: 'فواتير المشتريات والتوريد' },
          { key: 'suppliers', icon: <Truck size={18} />, label: 'الموردين والحسابات' }
        ]
      },
      {
        key: 'group_finance',
        label: 'المالية والخزائن',
        icon: <Wallet size={18} />,
        children: [
          { key: 'treasury_admin', icon: <Landmark size={18} />, label: 'الخزينة الرئيسية والتحويلات' },
          { key: 'branch_treasury', icon: <Wallet size={18} />, label: 'خزينة الفرع' }
        ]
      },
      {
        key: 'group_analytics',
        label: 'التحليلات والتقارير',
        icon: <BarChart3 size={18} />,
        children: [
          { key: 'sales_reports', icon: <BarChart3 size={18} />, label: 'تقارير ومبيعات الفرع الشاملة' },
          { key: 'retail_analytics', icon: <BarChart3 size={18} />, label: 'إحصائيات المبيعات والأداء' },
          { key: 'branches_daily', icon: <FileSpreadsheet size={18} />, label: 'يومية الفروع' },
          { key: 'admin_journals', icon: <BookOpenCheck size={18} />, label: 'اليوميات الإدارية' },
          { key: 'daily_shift', icon: <CalendarCheck size={18} />, label: 'تقفيل الورديات' }
        ]
      },
      {
        key: 'group_management',
        label: 'إدارة النظام والفروع',
        icon: <Store size={18} />,
        children: [
          { key: 'branches', icon: <Store size={18} />, label: 'الفروع والمستودعات' },
          { key: 'users', icon: <Users size={18} />, label: 'المستخدمين والصلاحيات' }
        ]
      }
    ];

    return grouped;
  }, [role]);

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <ScrollToTopTabs activeTab={activeTab} />

      {/* Mobile Navigation Drawer */}
      <Drawer
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        styles={{
          body: { padding: 0, backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', height: '100%' },
          header: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#fff', padding: '12px 16px' }
        }}
        width={Math.min(300, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300)}
        closable={true}
        closeIcon={<X size={20} color="#94a3b8" />}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={yokaLogo} alt="Yoka Store" style={{ height: 32, objectFit: 'contain' }} />
            <div>
              <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>يوكا ستور</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>لوحة تحكم الإدارة المركزية</Text>
            </div>
          </div>
        }
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b', background: '#131d31' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ backgroundColor: '#4f46e5' }} icon={<ShieldCheck size={18} />} />
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <Text strong style={{ color: '#fff', fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.fullName || currentUser?.username}
              </Text>
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                <Tag color={roleInfo.color} style={{ fontSize: 10, margin: 0, padding: '0 5px' }}>
                  {roleInfo.label}
                </Tag>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color="#38bdf8" />
            <span>{branchDisplayName}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }} className="custom-sider-scroll">
          <Menu
            theme="dark"
            selectedKeys={[activeTab]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => handleNavigate(key, null)}
            style={{ backgroundColor: '#0f172a', borderRight: 0, paddingTop: 6, paddingBottom: 16 }}
          />
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', background: '#0a0f1d' }}>
          <Button
            danger
            block
            icon={<LogOut size={16} style={{ marginLeft: 6 }} />}
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 8 }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </Drawer>

      {/* Desktop Sider */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={250}
          style={{
            overflow: 'hidden',
            height: '100vh',
            position: 'sticky',
            top: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: '#0f172a',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              borderBottom: '1px solid #1e293b',
              gap: 10,
              flexShrink: 0
            }}
          >
            <img
              src={yokaLogo}
              alt="Yoka Store"
              style={{
                height: collapsed ? 32 : 38,
                maxWidth: collapsed ? 36 : 140,
                objectFit: 'contain'
              }}
            />
            {!collapsed && (
              <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'block' }}>
                  يوكا ستور
                </span>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>لوحة الإدارة المركزية</span>
              </div>
            )}
          </div>

          <div
            style={{
              height: 'calc(100vh - 64px - 48px)',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
            className="custom-sider-scroll"
          >
            <Menu
              theme="dark"
              selectedKeys={[activeTab]}
              mode="inline"
              items={menuItems}
              onClick={({ key }) => handleNavigate(key, null)}
              style={{ backgroundColor: '#0f172a', borderRight: 0 }}
            />
          </div>
        </Sider>
      )}

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header
          style={{
            padding: '0 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            position: 'sticky',
            top: 0,
            zIndex: 90
          }}
        >
          <Space size="middle">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuIcon size={20} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            )}

            <Tag color="purple" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
              {branchDisplayName}
            </Tag>

            {/* Quick Access Buttons for Admin to switch to POS or Supervisor View */}
            <Space size="small">
              <Button
                size="small"
                icon={<Crown size={14} style={{ marginLeft: 4, color: '#d97706' }} />}
                onClick={() => navigate('/supervisor-dashboard')}
                style={{ borderRadius: 6, fontWeight: 600, borderColor: '#f59e0b', color: '#b45309' }}
              >
                لوحة المشرف (Supervisor Hub)
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<ScanLine size={14} style={{ marginLeft: 4 }} />}
                onClick={() => {
                  if (onSwitchToPos) onSwitchToPos();
                  else navigate('/pos');
                }}
                style={{ borderRadius: 6, fontWeight: 600, backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                واجهة الكاشير (POS)
              </Button>
            </Space>
          </Space>

          <Space size="middle">
            <Space>
              <Avatar style={{ backgroundColor: '#4f46e5' }} icon={<ShieldCheck size={18} />} />
              <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
                <Text strong style={{ display: 'block', fontSize: 14 }}>
                  {currentUser?.fullName || currentUser?.username}
                </Text>
                <Tag color={roleInfo.color} style={{ fontSize: 11, margin: 0, padding: '0 6px' }}>
                  {roleInfo.label}
                </Tag>
              </div>
            </Space>

            <Button
              type="text"
              danger
              icon={<LogOut size={16} style={{ marginLeft: 6 }} />}
              onClick={onLogout}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              تسجيل الخروج
            </Button>
          </Space>
        </Header>

        {/* Content Area */}
        <Content style={{ margin: isMobile ? '8px 8px 24px' : '16px', minHeight: 280, minWidth: 0, overflowX: 'hidden' }}>
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
            <Products
              currentUser={currentUser}
              autoOpenCreate={tabExtra?.autoOpenCreate}
              onResetAction={() => setTabExtra(null)}
            />
          )}
          {activeTab === 'groups_items' && (
            <GroupsAndItems
              autoOpenCreate={tabExtra?.autoOpenCreate}
              onResetAction={() => setTabExtra(null)}
            />
          )}
          {activeTab === 'stock_audit' && (
            <StockAudit onNavigateToAdjustments={(tab) => handleNavigate(tab)} currentUser={currentUser} />
          )}
          {activeTab === 'stock_adjustments' && (
            <StockAdjustments
              currentUser={currentUser}
              autoOpenCreate={tabExtra?.autoOpenCreate}
              onResetAction={() => setTabExtra(null)}
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
          {activeTab === 'branch_treasury' && (
            <BranchTreasury
              currentUser={currentUser}
              autoOpenCreate={tabExtra?.autoOpenCreate}
              onResetAction={() => setTabExtra(null)}
            />
          )}
          {activeTab === 'treasury_admin' && <TreasuryAdmin />}
          {activeTab === 'branches_daily' && <BranchesDaily />}
          {activeTab === 'admin_journals' && <AdminJournals />}
          {activeTab === 'sales_reports' && (
            <SalesReportsPage currentUser={currentUser} />
          )}
          {activeTab === 'retail_analytics' && (
            <RetailAnalytics currentUser={currentUser} onNavigate={handleNavigate} />
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
    </Layout>
  );
}
