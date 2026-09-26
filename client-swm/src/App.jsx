import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Space, Typography, Tag, Dropdown, Alert, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShopOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  ContactsOutlined,
  FileTextOutlined,
  ScanOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  EnvironmentOutlined,
  WalletOutlined,
  ScheduleOutlined,
  SwapOutlined,
  AppstoreOutlined,
  AuditOutlined,
  FileSearchOutlined,
  DiffOutlined,
  FundViewOutlined,
  BankOutlined,
  CrownOutlined,
  LockOutlined,
  UnlockOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BranchesDaily from './pages/BranchesDaily';
import AdminJournals from './pages/AdminJournals';
import StockAudit from './pages/StockAudit';
import StockAdjustments from './pages/StockAdjustments';
import Products from './pages/Products';
import GroupsAndItems from './pages/GroupsAndItems';
import Branches from './pages/Branches';
import Users from './pages/Users';
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
  super_admin: { label: 'مدير عام النظام (Super Admin)', color: 'red' },
  admin: { label: 'مدير إداري (Admin)', color: 'volcano' },
  supervisor: { label: 'مشرف فرع (Supervisor)', color: 'orange' },
  salesperson: { label: 'بائع / كاشير (Cashier)', color: 'blue' },
  branch_account: { label: 'حساب فرع مباشر (Branch Terminal)', color: 'cyan' }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pos');
  const [collapsed, setCollapsed] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);

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
          setActiveTab('dashboard');
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
      setActiveTab('dashboard');
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

  // Dynamic role-based menu definition
  const menuItems = useMemo(() => {
    if (!currentUser) return [];

    // Menu for E-Commerce warehouse users (Orders ECP replaces POS; regular POS and expenses removed)
    if (isEcomWarehouse) {
      const items = [
        {
          key: 'orders',
          icon: <InboxOutlined />,
          label: 'طلبات المتجر الإلكتروني (ECP)'
        },
        {
          key: 'daily_shift',
          icon: <ScheduleOutlined />,
          label: 'صفحة يومية البائع / الشيفت'
        }
      ];

      // Sensitive operations: ONLY visible when in Supervisor mode!
      if (isSupervisor) {
        items.push(
          {
            key: 'branch_treasury',
            icon: <BankOutlined />,
            label: 'خزنة المستودع'
          },
          {
            key: 'stock_audit',
            icon: <FileSearchOutlined />,
            label: 'الجرد المجمع للمستودع'
          },
          {
            key: 'stock_adjustments',
            icon: <DiffOutlined />,
            label: 'سند التسوية للمستودع'
          },
          {
            key: 'transfers',
            icon: <SwapOutlined />,
            label: 'أذونات الصرف والتحويل'
          },
          {
            key: 'users',
            icon: <TeamOutlined />,
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
          icon: <ScanOutlined />,
          label: 'فاتورة جديدة (شاشة البيع - POS)'
        },
        {
          key: 'daily_shift',
          icon: <ScheduleOutlined />,
          label: 'صفحة يومية البائع'
        }
      ];

      // Sensitive operations: ONLY visible when in Supervisor mode!
      if (isSupervisor) {
        items.push(
          {
            key: 'retail_analytics',
            icon: <BarChartOutlined />,
            label: 'إحصائيات فروع التجزئة (Retail)'
          },
          {
            key: 'branch_treasury',
            icon: <BankOutlined />,
            label: 'خزنة الفرع'
          },
          {
            key: 'stock_audit',
            icon: <FileSearchOutlined />,
            label: 'الجرد المجمع للفرع'
          },
          {
            key: 'stock_adjustments',
            icon: <DiffOutlined />,
            label: 'سند التسوية للفرع'
          }
        );
      }

      return items;
    }

    const role = currentUser.role;
    const excludedForWarehouseAdmin = ['pos', 'daily_shift', 'orders'];

    const allItems = [
      { key: 'pos', icon: <ScanOutlined />, label: 'فاتورة جديدة (شاشة البيع - POS)', roles: ['super_admin', 'admin', 'supervisor', 'salesperson', 'branch_account'] },
      { key: 'retail_analytics', icon: <ShopOutlined />, label: 'إحصائيات فروع التجزئة (Retail)', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'ecom_analytics', icon: <InboxOutlined />, label: 'إحصائيات المتجر الإلكتروني (E-Com)', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'daily_shift', icon: <ScheduleOutlined />, label: 'صفحة يومية البائع', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'orders', icon: <InboxOutlined />, label: 'طلبات المتجر الإلكتروني (ECP)', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'dashboard', icon: <DashboardOutlined />, label: 'لوحة التحكم', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'branches_daily', icon: <AuditOutlined />, label: 'يومية الفروع', roles: ['super_admin', 'admin'] },
      { key: 'admin_journals', icon: <FundViewOutlined />, label: 'اليوميات الإدارية', roles: ['super_admin', 'admin'] },
      { key: 'treasury_admin', icon: <BankOutlined />, label: 'إدارة الخزائن', roles: ['super_admin', 'admin'] },
      { key: 'transfers', icon: <SwapOutlined />, label: 'إذن الصرف (توزيع المنتجات)', roles: ['super_admin', 'admin'] },
      { key: 'stock_audit', icon: <FileSearchOutlined />, label: 'الجرد المجمع', roles: ['super_admin', 'admin'] },
      { key: 'stock_adjustments', icon: <DiffOutlined />, label: 'سند التسوية', roles: ['super_admin', 'admin'] },
      { key: 'groups_items', icon: <AppstoreOutlined />, label: 'المجموعات والأصناف', roles: ['super_admin', 'admin'] },
      { key: 'products', icon: <ShoppingOutlined />, label: 'كتالوج المنتجات والمخزون', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] },
      { key: 'purchases', icon: <FileTextOutlined />, label: 'فواتير المشتريات والتوريد', roles: ['super_admin', 'admin'] },
      { key: 'suppliers', icon: <ContactsOutlined />, label: 'الموردين والحسابات', roles: ['super_admin', 'admin'] },
      { key: 'branches', icon: <ShopOutlined />, label: 'الفروع والمستودعات', roles: ['super_admin', 'admin'] },
      { key: 'users', icon: <TeamOutlined />, label: 'طاقم عمل الفرع', roles: ['super_admin', 'admin', 'supervisor', 'branch_account'] }
    ];

    return allItems
      .filter((item) => {
        if (!item.roles.includes(role)) return false;
        if (isWarehouseAdmin && excludedForWarehouseAdmin.includes(item.key)) return false;
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
    } else if (isWarehouseAdmin && ['pos', 'daily_shift', 'orders'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isEcomWarehouse, isRetailBranch, isSupervisor, isWarehouseAdmin, activeTab]);

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const roleInfo = currentUser?.isMainWarehouse
    ? { label: 'مدير المستودع الرئيسي (Warehouse Admin)', color: 'purple' }
    : (ROLE_LABELS[currentUser.role] || { label: currentUser.role, color: 'default' });
  const branchDisplayName = currentUser.branchName || (isAdminPortal ? 'المستودع الرئيسي' : 'الفرع المحدد');

  // Check if current active tab is permitted
  const isTabAllowed = menuItems.some((m) => m.key === activeTab);

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={250}
        style={{
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
            gap: 10
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
                Yoka SWM
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                {isEcomWarehouse ? 'مستودع المتجر الإلكتروني (E-Com)' : (isRetailBranch ? 'فرع تجزئة (POS & نقدية)' : (isAdminPortal ? 'إدارة العمليات' : 'بوابة الفرع'))}
              </Text>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          selectedKeys={[activeTab]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setActiveTab(key)}
          style={{ backgroundColor: '#0f172a', marginTop: 12 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}
        >
          <Space size="small" wrap align="middle">
            <Tag color={currentUser.isMainWarehouse ? 'purple' : (isAdminPortal ? 'geekblue' : (isEcomWarehouse ? 'magenta' : (isRetailBranch ? 'green' : 'cyan')))} style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
              {currentUser.isMainWarehouse ? '🏢 المستودع الرئيسي والعمليات' : (isAdminPortal ? '👑 لوحة تحكم الإدارة العامة' : (isEcomWarehouse ? '🛒 مستودع المتجر الإلكتروني (E-Com)' : (isRetailBranch ? '🏪 فرع تجزئة ونقاط البيع' : '🏪 بوابة الفرع والمستودع')))}
            </Tag>
            <Tag icon={<EnvironmentOutlined />} color="geekblue" style={{ fontSize: 13, padding: '3px 10px' }}>
              {branchDisplayName}
            </Tag>

            {(isRetailBranch || isEcomWarehouse) && (
              <div style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
                {isSupervisor ? (
                  <Space size="small">
                    <Tag color="gold" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
                      <CrownOutlined style={{ marginLeft: 4, color: '#d97706' }} /> وضع المشرف مفعّل
                    </Tag>
                    <Button
                      size="small"
                      danger
                      icon={<LockOutlined />}
                      onClick={handleLockToCashier}
                      style={{ borderRadius: 6, fontWeight: 500 }}
                    >
                      قفل المشرف (عودة للبائع)
                    </Button>
                  </Space>
                ) : (
                  <Space size="small">
                    <Tag color="blue" style={{ fontSize: 13, padding: '3px 10px' }}>
                      <UserOutlined style={{ marginLeft: 4 }} /> وضع الكاشير (بائع)
                    </Tag>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CrownOutlined />}
                      onClick={() => setUnlockModalVisible(true)}
                      style={{ backgroundColor: '#d97706', borderColor: '#d97706', borderRadius: 6, fontWeight: 500 }}
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
                icon={isAdminPortal ? <SafetyCertificateOutlined /> : (isEcomWarehouse ? <InboxOutlined /> : <ShopOutlined />)}
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
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              تسجيل الخروج
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: '16px', minHeight: 280 }}>
          {!isTabAllowed ? (
            <Alert
              message="غير مصرح"
              description="ليس لديك صلاحية للوصول إلى هذه الصفحة بناءً على دورك الوظيفي ونوع حسابك."
              type="warning"
              showIcon
            />
          ) : (
            <>
              {activeTab === 'pos' && <POS />}
              {activeTab === 'retail_analytics' && <RetailAnalytics currentUser={currentUser} onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'ecom_analytics' && <EcomAnalytics currentUser={currentUser} onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'daily_shift' && <DailyShift currentUser={currentUser} />}
              {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'branches_daily' && <BranchesDaily />}
              {activeTab === 'admin_journals' && <AdminJournals />}
              {activeTab === 'transfers' && <Transfers currentUser={currentUser} />}
              {activeTab === 'stock_audit' && <StockAudit onNavigateToAdjustments={(tab) => setActiveTab(tab)} currentUser={currentUser} />}
              {activeTab === 'stock_adjustments' && <StockAdjustments currentUser={currentUser} />}
              {activeTab === 'groups_items' && <GroupsAndItems />}
              {activeTab === 'orders' && <Orders currentUser={currentUser} />}
              {activeTab === 'purchases' && <Purchases />}
              {activeTab === 'suppliers' && <Suppliers />}
              {activeTab === 'products' && <Products currentUser={currentUser} />}
              {activeTab === 'branches' && <Branches />}
              {activeTab === 'users' && <Users currentUser={currentUser} />}
              {activeTab === 'branch_treasury' && <BranchTreasury currentUser={currentUser} />}
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
