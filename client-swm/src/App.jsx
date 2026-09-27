import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Space, Typography, Tag, Dropdown, Alert, message, Drawer } from 'antd';
import {
  Home as HomeIcon,
  ScanLine,
  BarChart3,
  TrendingUp,
  CalendarCheck,
  ShoppingBag,
  LayoutDashboard,
  FileSpreadsheet,
  BookOpenCheck,
  Landmark,
  ArrowLeftRight,
  ClipboardCheck,
  SlidersHorizontal,
  Layers,
  Boxes,
  Receipt,
  Truck,
  Store,
  Users,
  Wallet,
  LogOut,
  ShieldCheck,
  Lock,
  Unlock,
  MapPin,
  User,
  Crown,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BranchesDaily from './pages/BranchesDaily';
import AdminJournals from './pages/AdminJournals';
import StockAudit from './pages/StockAudit';
import StockAdjustments from './pages/StockAdjustments';
import Products from './pages/Products';
import GroupsAndItems from './pages/GroupsAndItems';
import Branches from './pages/Branches';
import UsersPage from './pages/Users';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Expenses from './pages/Expenses';
import RetailAnalytics from './pages/RetailAnalytics';
import EcomAnalytics from './pages/EcomAnalytics';
import DailyShift from './pages/DailyShift';
import Transfers from './pages/Transfers';
import BranchTreasury from './pages/BranchTreasury';
import TreasuryAdmin from './pages/TreasuryAdmin';
import SupervisorUnlockModal from './components/SupervisorUnlockModal';
import yokaLogo from './assets/yokaStoreTransparent.png';
import api from './api';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const ROLE_LABELS = {
  super_admin: { label: 'مدير عام النظام', color: 'red' },
  admin: { label: 'مدير إداري', color: 'volcano' },
  supervisor: { label: 'مشرف فرع', color: 'orange' },
  salesperson: { label: 'بائع / كاشير', color: 'blue' },
  branch_account: { label: 'حساب فرع مباشر', color: 'cyan' }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [tabExtra, setTabExtra] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 840 : false);
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        const isEcom = (parsed.branchType === 'ecom_warehouse' || parsed.branchCode === 'BR-ECOM') && !['super_admin', 'admin'].includes(parsed.role);
        const isRetail = parsed.branchType === 'retail_branch' && !['super_admin', 'admin'].includes(parsed.role);
        if (isEcom) {
          setActiveTab('orders');
        } else if (isRetail || parsed.role === 'salesperson') {
          setActiveTab('pos');
        } else {
          setActiveTab('home');
        }
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/api/auth/logout', { refreshToken });
    } catch (e) {
      // ignore
    } finally {
      localStorage.clear();
      setCurrentUser(null);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    const isEcom = (user.branchType === 'ecom_warehouse' || user.branchCode === 'BR-ECOM') && !['super_admin', 'admin'].includes(user.role);
    const isRetail = user.branchType === 'retail_branch' && !['super_admin', 'admin'].includes(user.role);
    if (isEcom) {
      setActiveTab('orders');
    } else if (isRetail || user.role === 'salesperson') {
      setActiveTab('pos');
    } else {
      setActiveTab('home');
    }
  };

  const handleLockToCashier = async () => {
    try {
      const res = await api.post('/api/auth/switch-to-cashier');
      if (res.data.success) {
        const { accessToken, user } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        if (user.branchType === 'ecom_warehouse' || user.branchCode === 'BR-ECOM') {
          setActiveTab('orders');
        } else {
          setActiveTab('pos');
        }
        message.info(res.data.message || 'تم قفل وضع المشرف والعودة لوضع البائع بأمان');
      }
    } catch (err) {
      message.error('فشل في تبديل الجلسة');
    }
  };

  const isAdminPortal = currentUser && (['super_admin', 'admin'].includes(currentUser.role) || currentUser.branchType === 'main_warehouse');
  const isEcomWarehouse = currentUser && (currentUser.branchType === 'ecom_warehouse' || currentUser.branchCode === 'BR-ECOM') && !isAdminPortal;
  const isRetailBranch = currentUser && currentUser.branchType === 'retail_branch' && !isAdminPortal && !isEcomWarehouse;
  const isSupervisor = Boolean(
    currentUser && (
      currentUser.role === 'supervisor' ||
      ['super_admin', 'admin'].includes(currentUser.role) ||
      currentUser.isSupervisor === true
    )
  );
  const isWarehouseAdmin = Boolean(
    currentUser && (
      currentUser.isMainWarehouse === true ||
      (currentUser.branchType === 'main_warehouse' && currentUser.role !== 'super_admin')
    )
  );

  // Dynamic role-based menu definition with sleek Lucide icons (Pure Arabic)
  const menuItems = useMemo(() => {
    if (!currentUser) return [];

    // Menu for E-Commerce warehouse users
    if (isEcomWarehouse) {
      const items = [
        {
          key: 'orders',
          icon: <ShoppingBag size={18} />,
          label: 'طلبات المتجر الإلكتروني'
        },
        {
          key: 'daily_shift',
          icon: <CalendarCheck size={18} />,
          label: 'صفحة يومية البائع'
        }
      ];

      // Sensitive operations: ONLY visible when in Supervisor mode!
      if (isSupervisor) {
        items.push(
          {
            key: 'branch_treasury',
            icon: <Wallet size={18} />,
            label: 'خزنة المستودع'
          },
          {
            key: 'stock_audit',
            icon: <ClipboardCheck size={18} />,
            label: 'الجرد المجمع للمستودع'
          },
          {
            key: 'stock_adjustments',
            icon: <SlidersHorizontal size={18} />,
            label: 'سند التسوية للمستودع'
          },
          {
            key: 'transfers',
            icon: <ArrowLeftRight size={18} />,
            label: 'أذونات الصرف والتحويل'
          },
          {
            key: 'users',
            icon: <Users size={18} />,
            label: 'طاقم عمل المستودع'
          }
        );
      }

      return items;
    }

    // Menu for retail branch users
    if (isRetailBranch) {
      const items = [
        {
          key: 'pos',
          icon: <ScanLine size={18} />,
          label: 'فاتورة بيع جديدة'
        },
        {
          key: 'daily_shift',
          icon: <CalendarCheck size={18} />,
          label: 'صفحة يومية البائع'
        }
      ];

      // Sensitive operations: ONLY visible when in Supervisor mode!
      if (isSupervisor) {
        items.push(
          {
            key: 'retail_analytics',
            icon: <BarChart3 size={18} />,
            label: 'إحصائيات فروع التجزئة'
          },
          {
            key: 'branch_treasury',
            icon: <Wallet size={18} />,
            label: 'خزنة الفرع'
          },
          {
            key: 'stock_audit',
            icon: <ClipboardCheck size={18} />,
            label: 'الجرد المجمع للفرع'
          },
          {
            key: 'stock_adjustments',
            icon: <SlidersHorizontal size={18} />,
            label: 'سند التسوية للفرع'
          }
        );
      }

      return items;
    }

    const role = currentUser.role;

    const allItems = [
      { key: 'home', icon: <HomeIcon size={18} />, label: 'الرئيسية', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'pos', icon: <ScanLine size={18} />, label: 'فاتورة بيع جديدة', roles: ['super_admin', 'admin', 'supervisor', 'salesperson', 'branch_account'] },
      { key: 'retail_analytics', icon: <BarChart3 size={18} />, label: 'إحصائيات فروع التجزئة', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'ecom_analytics', icon: <TrendingUp size={18} />, label: 'إحصائيات المتجر الإلكتروني', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'daily_shift', icon: <CalendarCheck size={18} />, label: 'صفحة يومية البائع', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'orders', icon: <ShoppingBag size={18} />, label: 'طلبات المتجر الإلكتروني', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'branches_daily', icon: <FileSpreadsheet size={18} />, label: 'يومية الفروع', roles: ['super_admin', 'admin'] },
      { key: 'admin_journals', icon: <BookOpenCheck size={18} />, label: 'اليوميات الإدارية', roles: ['super_admin', 'admin'] },
      { key: 'treasury_admin', icon: <Landmark size={18} />, label: 'إدارة الخزائن', roles: ['super_admin', 'admin'] },
      { key: 'transfers', icon: <ArrowLeftRight size={18} />, label: 'إذن الصرف والتحويل', roles: ['super_admin', 'admin'] },
      { key: 'stock_audit', icon: <ClipboardCheck size={18} />, label: 'الجرد المجمع', roles: ['super_admin', 'admin'] },
      { key: 'stock_adjustments', icon: <SlidersHorizontal size={18} />, label: 'سند التسوية', roles: ['super_admin', 'admin'] },
      { key: 'groups_items', icon: <Layers size={18} />, label: 'المجموعات والأصناف', roles: ['super_admin', 'admin'] },
      { key: 'products', icon: <Boxes size={18} />, label: 'كتالوج المنتجات والمخزون', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'purchases', icon: <Receipt size={18} />, label: 'فواتير المشتريات والتوريد', roles: ['super_admin', 'admin'] },
      { key: 'suppliers', icon: <Truck size={18} />, label: 'الموردين والحسابات', roles: ['super_admin', 'admin'] },
      { key: 'branches', icon: <Store size={18} />, label: 'الفروع والمستودعات', roles: ['super_admin', 'admin'] },
      { key: 'users', icon: <Users size={18} />, label: 'طاقم عمل الفرع', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'نظرة عامة على النظام', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] }
    ];

    return allItems
      .filter((item) => {
        if (!item.roles.includes(role)) return false;
        return true;
      })
      .map(({ roles, ...rest }) => rest);
  }, [currentUser, isEcomWarehouse, isRetailBranch, isSupervisor, isWarehouseAdmin]);

  // Ensure active tab is allowed for current user
  useEffect(() => {
    if (isEcomWarehouse) {
      const allowed = ['orders', 'daily_shift'];
      if (isSupervisor) {
        allowed.push('branch_treasury', 'stock_audit', 'stock_adjustments', 'transfers', 'users');
      }
      if (!allowed.includes(activeTab)) {
        setActiveTab('orders');
      }
    } else if (isRetailBranch) {
      const allowed = ['pos', 'daily_shift'];
      if (isSupervisor) {
        allowed.push('retail_analytics', 'branch_treasury', 'stock_audit', 'stock_adjustments');
      }
      if (!allowed.includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [isEcomWarehouse, isRetailBranch, isSupervisor, isWarehouseAdmin, activeTab]);

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const roleInfo = currentUser?.isMainWarehouse
    ? { label: 'مدير المستودع الرئيسي', color: 'purple' }
    : (ROLE_LABELS[currentUser.role] || { label: currentUser.role, color: 'default' });
  const branchDisplayName = currentUser.branchName || (isAdminPortal ? 'المستودع الرئيسي' : 'الفرع المحدد');

  // Check if current active tab is permitted
  const isTabAllowed = menuItems.some((m) => m.key === activeTab);

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
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
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>لوحة تحكم الإدارة</Text>
            </div>
          </div>
        }
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b', background: '#131d31' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={36}
              style={{ backgroundColor: isAdminPortal ? '#4f46e5' : (isEcomWarehouse ? '#9333ea' : (isRetailBranch ? '#16a34a' : '#0d9488')) }}
              icon={isAdminPortal ? <ShieldCheck size={18} /> : (isEcomWarehouse ? <ShoppingBag size={18} /> : <Store size={18} />)}
            />
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <Text strong style={{ color: '#fff', fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.fullName || currentUser.username}
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
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 8 }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </Drawer>

      {/* Desktop Sider: only rendered when not in mobile view */}
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
                <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>
                  يوكا ستور
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  {isEcomWarehouse ? 'مستودع المتجر الإلكتروني' : (isRetailBranch ? 'فرع تجزئة ونقاط البيع' : (isAdminPortal ? 'إدارة العمليات المركزية' : 'بوابة الفرع'))}
                </Text>
              </div>
            )}
          </div>

          <div
            className="custom-sider-scroll"
            style={{
              height: 'calc(100vh - 64px - 48px)',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <Menu
              theme="dark"
              selectedKeys={[activeTab]}
              mode="inline"
              items={menuItems}
              onClick={({ key }) => handleNavigate(key, null)}
              style={{ backgroundColor: '#0f172a', borderRight: 0, marginTop: 8, paddingBottom: 16 }}
            />
          </div>
        </Sider>
      )}

      <Layout style={{ minWidth: 0, overflowX: 'hidden' }}>
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 90,
            background: '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            height: isMobile ? 56 : 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}
        >
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  type="text"
                  icon={<MenuIcon size={22} color="#0f172a" />}
                  onClick={() => setMobileDrawerOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, width: 36, height: 36 }}
                />
                <img src={yokaLogo} alt="Yoka" style={{ height: 28, objectFit: 'contain' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>يوكا ستور</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'user-header',
                        label: (
                          <div style={{ padding: '4px 2px', borderBottom: '1px solid #f1f5f9' }}>
                            <Text strong style={{ display: 'block', fontSize: 13 }}>
                              {currentUser.fullName || currentUser.username}
                            </Text>
                            <Tag color={roleInfo.color} style={{ fontSize: 11, margin: '4px 0' }}>
                              {roleInfo.label}
                            </Tag>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              📍 {branchDisplayName}
                            </div>
                          </div>
                        ),
                        disabled: true
                      },
                      {
                        key: 'nav-home',
                        icon: <HomeIcon size={14} />,
                        label: 'الرئيسية (لوحة التحكم)',
                        onClick: () => handleNavigate('home')
                      },
                      ...(isRetailBranch || isEcomWarehouse
                        ? [
                            {
                              key: 'supervisor-mode',
                              label: isSupervisor ? (
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>🔒 قفل المشرف (عودة للبائع)</span>
                              ) : (
                                <span style={{ color: '#d97706', fontWeight: 600 }}>👑 دخول المشرف (Unlock)</span>
                              ),
                              onClick: () => {
                                if (isSupervisor) handleLockToCashier();
                                else setUnlockModalVisible(true);
                              }
                            }
                          ]
                        : []),
                      {
                        type: 'divider'
                      },
                      {
                        key: 'logout-btn',
                        danger: true,
                        icon: <LogOut size={14} />,
                        label: 'تسجيل الخروج',
                        onClick: handleLogout
                      }
                    ]
                  }}
                  trigger={['click']}
                  placement="bottomLeft"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, background: '#f1f5f9' }}>
                    <Avatar
                      size={28}
                      style={{ backgroundColor: isAdminPortal ? '#4f46e5' : (isEcomWarehouse ? '#9333ea' : (isRetailBranch ? '#16a34a' : '#0d9488')) }}
                      icon={isAdminPortal ? <ShieldCheck size={14} /> : (isEcomWarehouse ? <ShoppingBag size={14} /> : <Store size={14} />)}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.fullName || currentUser.username}
                    </span>
                  </div>
                </Dropdown>
              </div>
            </>
          ) : (
            <>
              <Space size="small" wrap align="middle">
                <Tag color={currentUser.isMainWarehouse ? 'purple' : (isAdminPortal ? 'geekblue' : (isEcomWarehouse ? 'magenta' : (isRetailBranch ? 'green' : 'cyan')))} style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
                  {currentUser.isMainWarehouse ? '🏢 المستودع الرئيسي والعمليات' : (isAdminPortal ? '👑 لوحة تحكم الإدارة العامة' : (isEcomWarehouse ? '🛒 مستودع المتجر الإلكتروني' : (isRetailBranch ? '🏪 فرع تجزئة ونقاط البيع' : '🏪 بوابة الفرع والمستودع')))}
                </Tag>
                <Tag icon={<MapPin size={13} style={{ marginLeft: 4 }} />} color="geekblue" style={{ fontSize: 13, padding: '3px 10px', display: 'inline-flex', alignItems: 'center' }}>
                  {branchDisplayName}
                </Tag>

                {(isRetailBranch || isEcomWarehouse) && (
                  <div style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
                    {isSupervisor ? (
                      <Space size="small">
                        <Tag color="gold" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                          <Crown size={14} style={{ marginLeft: 4, color: '#d97706' }} /> وضع المشرف مفعّل
                        </Tag>
                        <Button
                          size="small"
                          danger
                          icon={<Lock size={13} style={{ marginLeft: 4 }} />}
                          onClick={handleLockToCashier}
                          style={{ borderRadius: 6, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}
                        >
                          قفل المشرف (عودة للبائع)
                        </Button>
                      </Space>
                    ) : (
                      <Space size="small">
                        <Tag color="blue" style={{ fontSize: 13, padding: '3px 10px', display: 'inline-flex', alignItems: 'center' }}>
                          <User size={13} style={{ marginLeft: 4 }} /> وضع الكاشير (بائع)
                        </Tag>
                        <Button
                          size="small"
                          type="primary"
                          icon={<Crown size={13} style={{ marginLeft: 4 }} />}
                          onClick={() => setUnlockModalVisible(true)}
                          style={{ backgroundColor: '#d97706', borderColor: '#d97706', borderRadius: 6, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}
                        >
                          دخول المشرف (Unlock)
                        </Button>
                      </Space>
                    )}
                  </div>
                )}
              </Space>

              <Space size="middle">
                <Space>
                  <Avatar
                    style={{ backgroundColor: isAdminPortal ? '#4f46e5' : (isEcomWarehouse ? '#9333ea' : (isRetailBranch ? '#16a34a' : '#0d9488')) }}
                    icon={isAdminPortal ? <ShieldCheck size={18} /> : (isEcomWarehouse ? <ShoppingBag size={18} /> : <Store size={18} />)}
                  />
                  <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
                    <Text strong style={{ display: 'block', fontSize: 14 }}>
                      {currentUser.fullName || currentUser.username}
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
                  onClick={handleLogout}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  تسجيل الخروج
                </Button>
              </Space>
            </>
          )}
        </Header>

        {isMobile && (
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <Tag color={currentUser.isMainWarehouse ? 'purple' : (isAdminPortal ? 'geekblue' : (isEcomWarehouse ? 'magenta' : (isRetailBranch ? 'green' : 'cyan')))} style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>
              {branchDisplayName}
            </Tag>
            {isSupervisor && (
              <Tag color="gold" style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>
                👑 وضع المشرف مفعّل
              </Tag>
            )}
          </div>
        )}

        <Content style={{ margin: isMobile ? '8px 8px 24px' : '16px', minHeight: 280, minWidth: 0, overflowX: 'hidden' }}>
          {!isTabAllowed ? (
            <Alert
              message="غير مصرح"
              description="ليس لديك صلاحية للوصول إلى هذه الصفحة بناءً على دورك الوظيفي ونوع حسابك."
              type="warning"
              showIcon
            />
          ) : (
            <>
              {activeTab === 'home' && <Home currentUser={currentUser} onNavigate={handleNavigate} />}
              {activeTab === 'pos' && <POS />}
              {activeTab === 'retail_analytics' && <RetailAnalytics currentUser={currentUser} onNavigate={handleNavigate} />}
              {activeTab === 'ecom_analytics' && <EcomAnalytics currentUser={currentUser} onNavigate={handleNavigate} />}
              {activeTab === 'daily_shift' && <DailyShift currentUser={currentUser} />}
              {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
              {activeTab === 'branches_daily' && <BranchesDaily />}
              {activeTab === 'admin_journals' && <AdminJournals />}
              {activeTab === 'transfers' && (
                <Transfers
                  currentUser={currentUser}
                  autoOpenCreate={tabExtra?.autoOpenCreate}
                  onResetAction={() => setTabExtra(null)}
                />
              )}
              {activeTab === 'stock_audit' && <StockAudit onNavigateToAdjustments={(tab) => handleNavigate(tab)} currentUser={currentUser} />}
              {activeTab === 'stock_adjustments' && (
                <StockAdjustments
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
            </>
          )}
        </Content>
      </Layout>

      <SupervisorUnlockModal
        open={unlockModalVisible}
        onCancel={() => setUnlockModalVisible(false)}
        onSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
          setUnlockModalVisible(false);
        }}
        currentUser={currentUser}
      />
    </Layout>
  );
}
