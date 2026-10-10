import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Avatar,
  Space,
  Typography,
  Tag,
  Card,
  Row,
  Col,
  Alert,
  Spin,
  Badge,
  Result,
  Drawer,
  Dropdown
} from 'antd';
import {
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  LogOut,
  ShieldCheck,
  MapPin,
  Layers,
  ShoppingBag,
  Receipt,
  Truck,
  Wallet,
  Store,
  Users as UsersIcon,
  ClipboardCheck,
  ArrowLeftRight,
  ScanLine,
  Lock,
  Sparkles,
  Menu,
  X,
  Home
} from 'lucide-react';
import ScrollToTopTabs from '../../components/ScrollToTopTabs';
import api from '../../api';
import yokaLogo from '../../assets/yokaStoreTransparent.png';

// Sub-Pages
import GroupsAndItems from '../GroupsAndItems';
import StockAudit from '../StockAudit';
import Transfers from '../Transfers';
import Purchases from '../Purchases';
import Suppliers from '../Suppliers';
import SellerPayrollAndExpenseCategoriesCards from '../../components/SellerPayrollAndExpenseCategoriesCards';
import Branches from '../Branches';
import UsersPage from '../Users';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function WarehouseManagerApp({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [permissions, setPermissions] = useState(currentUser?.wmPermissions || null);
  const [loadingPerms, setLoadingPerms] = useState(!currentUser?.wmPermissions);
  const [tabExtra, setTabExtra] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Sync latest permissions from API
  useEffect(() => {
    let isMounted = true;
    const fetchLatestPermissions = async () => {
      try {
        if (!currentUser?.id) return;
        const res = await api.get(`/api/swm/wm-permissions/${currentUser.id}`);
        if (res.data?.success && isMounted) {
          setPermissions(res.data.data);
          // Update stored user
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const u = JSON.parse(storedUser);
              u.wmPermissions = res.data.data;
              localStorage.setItem('user', JSON.stringify(u));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Failed to fetch latest permissions:', err);
      } finally {
        if (isMounted) setLoadingPerms(false);
      }
    };

    fetchLatestPermissions();
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  const validTabs = useMemo(() => new Set([
    'home', 'groups_items', 'stock_audit', 'purchases', 'suppliers',
    'inventory_counts', 'stock_adjustments', 'transfers', 'alerts',
    'analytics', 'system_backup', 'permissions',
    'payroll_expenses', 'payroll', 'branches', 'users',
    'cat_payroll', 'cat_system', 'cat_inventory', 'cat_purchases'
  ]), []);

  // Extract route after /warehouse-manager or /swm-admin/warehouse-manager safely
  const pathParts = useMemo(() => {
    const raw = location.pathname.replace(/^(\/swm-admin)?(\/warehouse-manager)?\/?/, '');
    return raw ? raw.split('/').filter(Boolean) : [];
  }, [location.pathname]);

  const activeTab = useMemo(() => {
    if (pathParts.length === 0) return 'home';
    let first = pathParts[0];
    // Normalize aliases to primary tab ids
    if (first === 'payroll' || first === 'cat_payroll') first = 'payroll_expenses';
    if (first === 'cat_system') first = 'branches';
    if (first === 'cat_inventory') first = 'groups_items';
    if (first === 'cat_purchases') first = 'purchases';

    if (!validTabs.has(first)) return 'home';
    return first;
  }, [pathParts, validTabs]);

  const handleNavigate = (tab, extra = null) => {
    setTabExtra(extra);
    let target = tab;
    if (target === 'payroll' || target === 'cat_payroll') target = 'payroll_expenses';
    if (target === 'cat_system') target = 'branches';
    if (target === 'cat_inventory') target = 'groups_items';
    if (target === 'cat_purchases') target = 'purchases';

    if (!target || target === 'home') {
      navigate('/warehouse-manager');
    } else {
      navigate(`/warehouse-manager/${target}`);
    }
  };

  const handleNavigateToCategory = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.children.length > 0) {
      handleNavigate(cat.children[0].id);
    }
  };

  // Build the 5 authorized functional categories
  const categories = useMemo(() => {
    const p = permissions || {};

    const cat1Children = [
      p.perm_groups_items !== false && {
        id: 'groups_items',
        title: 'المجموعات والأصناف',
        subtitle: 'شجرة التصنيفات، المقاسات، الألوان، ومواصفات الأصناف',
        icon: <Layers size={20} color="#16a34a" />
      },
      p.perm_stock_audit !== false && {
        id: 'stock_audit',
        title: 'الجرد الفعلي وسندات التسوية',
        subtitle: 'الجرد الميداني والمطابقة الفورية، معالجة العجز والزيادة، وسندات التسوية',
        icon: <ClipboardCheck size={20} color="#16a34a" />
      },
      p.perm_transfers !== false && {
        id: 'transfers',
        title: 'أذونات الصرف والتحويل',
        subtitle: 'التحويل بين الفروع والمستودعات وسندات استلام البضائع',
        icon: <ArrowLeftRight size={20} color="#16a34a" />
      }
    ].filter(Boolean);

    const cat2Children = [
      p.perm_purchases !== false && {
        id: 'purchases',
        title: 'فواتير المشتريات والتوريد',
        subtitle: 'تسجيل ومراجعة فواتير الشراء، تكلفة الوحدة، ودفعات الموردين',
        icon: <Receipt size={20} color="#d97706" />
      },
      p.perm_suppliers !== false && {
        id: 'suppliers',
        title: 'الموردين والحسابات',
        subtitle: 'دليل الموردين، كشوف الحسابات التفصيلية، والأرصدة الدائنة',
        icon: <Truck size={20} color="#d97706" />
      }
    ].filter(Boolean);

    const cat3Children = [
      p.perm_payroll !== false && {
        id: 'payroll_expenses',
        title: 'القبض الخاص ومسير الرواتب',
        subtitle: 'تسوية مرتبات وعمولات البائعين، السلف والخصومات، ومسحوبات العاملين',
        icon: <Wallet size={20} color="#9333ea" />
      }
    ].filter(Boolean);

    const cat4Children = [
      p.perm_branches !== false && {
        id: 'branches',
        title: 'الفروع والمستودعات',
        subtitle: 'إدارة الفروع، نقاط البيع، والمستودعات وتعيين الصلاحيات',
        icon: <Store size={20} color="#e11d48" />
      },
      p.perm_users !== false && {
        id: 'users',
        title: 'المستخدمين والموظفين',
        subtitle: 'إدارة حسابات العاملين، المشرفين، والبائعين وصلاحيات الوصول',
        icon: <UsersIcon size={20} color="#e11d48" />
      }
    ].filter(Boolean);

    return [
      {
        id: 'cat_inventory',
        number: '1',
        title: 'إدارة المخزون والأصناف',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        children: cat1Children
      },
      {
        id: 'cat_purchases',
        number: '2',
        title: 'المشتريات والتوريد',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        children: cat2Children
      },
      {
        id: 'cat_payroll',
        number: '3',
        title: 'القبض الخاص ورواتب ومسحوبات العاملين',
        color: '#9333ea',
        bgColor: '#faf5ff',
        borderColor: '#e9d5ff',
        children: cat3Children
      },
      {
        id: 'cat_system',
        number: '4',
        title: 'إدارة النظام والفروع',
        color: '#e11d48',
        bgColor: '#fff1f2',
        borderColor: '#fecdd3',
        children: cat4Children
      }
    ].filter((cat) => cat.children.length > 0);
  }, [permissions]);

  // Find active item metadata for breadcrumbs
  const activeMeta = useMemo(() => {
    for (const cat of categories) {
      const found = cat.children.find((c) => c.id === activeTab);
      if (found) {
        return { item: found, category: cat };
      }
    }
    return null;
  }, [activeTab, categories]);

  // Permission guard check for active tab
  const isTabPermitted = useMemo(() => {
    if (activeTab === 'home') return true;
    const p = permissions || {};
    switch (activeTab) {
      case 'groups_items': return p.perm_groups_items !== false;
      case 'stock_audit':
      case 'stock_adjustments': return p.perm_stock_audit !== false;
      case 'transfers': return p.perm_transfers !== false;
      case 'purchases': return p.perm_purchases !== false;
      case 'suppliers': return p.perm_suppliers !== false;
      case 'payroll_expenses': return p.perm_payroll !== false;
      case 'branches': return p.perm_branches !== false;
      case 'users': return p.perm_users !== false;
      default: return false;
    }
  }, [activeTab, permissions]);

  if (loadingPerms) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Spin size="large" />
        <span style={{ color: '#64748b', fontSize: 14 }}>جاري التحقق من صلاحيات مدير المخازن...</span>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl', backgroundColor: '#F8FAFC' }}>
      <ScrollToTopTabs activeTab={activeTab} />

      {/* TOP HEADER (Responsive on Mobile, Tablet & Desktop) */}
      <Header
        className="swm-top-header"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          height: isMobile ? 56 : isTablet ? 60 : 64,
          padding: 0,
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1600,
            margin: '0 auto',
            height: '100%',
            padding: isMobile ? '0 10px' : isTablet ? '0 14px' : '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box'
          }}
        >
          {/* Right Section: Brand & Navigation Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, minWidth: 0 }}>
          <div
            onClick={() => handleNavigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
          >
            <img src={yokaLogo} alt="Yoka Store" style={{ height: isMobile ? 28 : isTablet ? 32 : 34, objectFit: 'contain' }} />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span style={{ color: '#0F172A', fontSize: isMobile ? 13.5 : 14, fontWeight: 800, display: 'block' }}>
                يوكا ستور
              </span>
              {!isMobile && (
                <span style={{ color: '#7e22ce', fontSize: isTablet ? 10.5 : 11, fontWeight: 700 }}>
                  بوابة مدير المخازن
                </span>
              )}
            </div>
          </div>

          <div style={{ height: 24, width: 1, backgroundColor: '#E2E8F0', margin: '0 2px' }} />

          {/* Navigation Hub Button with Home Icon - Visible on All Screens */}
          <Button
            type={activeTab === 'home' ? 'primary' : 'default'}
            icon={<Home size={isMobile ? 14 : 16} style={{ marginLeft: 3 }} />}
            onClick={() => handleNavigate('home')}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              fontSize: isMobile ? 12 : 12.5,
              height: isMobile ? 32 : 36,
              padding: isMobile ? '0 10px' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: activeTab === 'home' ? '#7e22ce' : '#FFFFFF',
              borderColor: activeTab === 'home' ? '#7e22ce' : '#CBD5E1',
              color: activeTab === 'home' ? '#FFFFFF' : '#0F172A'
            }}
          >
            {isMobile ? 'الرئيسية' : (isTablet ? 'الرئيسية' : 'الرئيسية (لوحة الأقسام)')}
          </Button>

          {!isMobile && (
            <Tag
              style={{
                fontSize: isTablet ? 11 : 12,
                padding: isTablet ? '2px 6px' : '3px 8px',
                fontWeight: 700,
                borderRadius: 8,
                backgroundColor: '#FAF5FF',
                color: '#7E22CE',
                border: '1px solid #E9D5FF',
                margin: 0
              }}
            >
              <MapPin size={12} style={{ marginLeft: 4, display: 'inline' }} />
              {currentUser?.branchName || 'الإدارة المركزية والمخازن'}
            </Tag>
          )}
        </div>

        {/* Left Section: User info & logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
          {isMobile ? (
            /* Mobile Quick Action Buttons */
            <>
              <Button
                type="default"
                icon={<Menu size={15} style={{ marginLeft: 4 }} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12
                }}
              >
                الأقسام
              </Button>

              <Avatar
                size={32}
                style={{ backgroundColor: '#7e22ce', border: '1px solid #6b21a8' }}
                icon={<ShieldCheck size={16} />}
              />

              <Button
                type="text"
                danger
                icon={<LogOut size={16} />}
                onClick={onLogout}
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="خروج"
              />
            </>
          ) : (
            /* Desktop / Tablet User Block */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar
                  style={{ backgroundColor: '#7e22ce', border: '1px solid #6b21a8' }}
                  icon={<ShieldCheck size={18} />}
                />
                <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
                  <Text strong style={{ display: 'block', fontSize: 13, color: '#0F172A' }}>
                    {currentUser?.fullName || currentUser?.username}
                  </Text>
                  <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}>
                    مدير المخازن
                  </Tag>
                </div>
              </div>

              <div style={{ height: 28, width: 1, backgroundColor: '#E2E8F0', margin: '0 4px' }} />

              <Button
                type="text"
                danger
                icon={<LogOut size={16} style={{ marginLeft: 4 }} />}
                onClick={onLogout}
                style={{ fontWeight: 700, fontSize: 13, borderRadius: 8 }}
              >
                خروج
              </Button>
            </>
          )}
        </div>
        </div>
      </Header>

      {/* MOBILE NAVIGATION DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={yokaLogo} alt="Yoka Store" style={{ height: 26, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>بوابة مدير المخازن</span>
          </div>
        }
        placement="right"
        width={Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.88 : 320)}
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 } }}
      >
        {/* User Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1.5px solid #A855F7',
            color: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar
              size={40}
              style={{ backgroundColor: '#7e22ce', border: '1.5px solid #A855F7' }}
              icon={<ShieldCheck size={22} />}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.fullName || currentUser?.username}
              </div>
              <Tag color="purple" style={{ fontSize: 10.5, margin: '2px 0 0', borderRadius: 4 }}>
                مدير المخازن المعتمد
              </Tag>
            </div>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: '#DDD6FE',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              borderTop: '1px solid rgba(168, 85, 247, 0.25)',
              paddingTop: 8
            }}
          >
            <MapPin size={12} color="#DDD6FE" />
            <span>{currentUser?.branchName || 'الإدارة المركزية والمخازن'}</span>
          </div>
        </div>

        {/* Primary Shortcuts */}
        <Button
          type="primary"
          icon={<Home size={16} style={{ marginLeft: 6 }} />}
          onClick={() => {
            handleNavigate('home');
            setMobileDrawerOpen(false);
          }}
          style={{
            height: 42,
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: activeTab === 'home' ? '#7e22ce' : '#FFFFFF',
            borderColor: activeTab === 'home' ? '#7e22ce' : '#CBD5E1',
            color: activeTab === 'home' ? '#FFFFFF' : '#0F172A'
          }}
        >
          الرئيسية (لوحة الأقسام)
        </Button>

        {/* Categories Fast Jump */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 8, padding: '0 4px' }}>
            أقسام إدارة المخازن:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  handleNavigateToCategory(cat.id);
                  setMobileDrawerOpen(false);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: cat.bgColor,
                  border: `1px solid ${cat.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {cat.number}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>
                    {cat.title}
                  </span>
                </div>
                <ChevronLeft size={14} color="#64748B" />
              </div>
            ))}
          </div>
        </div>

        {/* Logout at bottom of drawer */}
        <Button
          danger
          type="primary"
          icon={<LogOut size={16} style={{ marginLeft: 6 }} />}
          onClick={() => {
            setMobileDrawerOpen(false);
            onLogout();
          }}
          style={{
            height: 42,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto'
          }}
        >
          تسجيل الخروج
        </Button>
      </Drawer>

      {/* MAIN CONTENT AREA */}
      <Content style={{ width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box', padding: isMobile ? '10px 8px 36px' : '16px' }}>
        {/* Breadcrumb Trail when not on home (Fully Clickable & Interactive) */}
        {activeTab !== 'home' && (
          <div
            className="swm-breadcrumb-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: isMobile ? '8px 10px' : '8px 16px',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexWrap: 'wrap', minWidth: 0 }}>
              {/* 1. Clickable Home Link */}
              <Button
                type="link"
                size="small"
                onClick={() => handleNavigate('home')}
                style={{
                  padding: '2px 8px',
                  fontWeight: 800,
                  color: '#7e22ce',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 6,
                  backgroundColor: 'rgba(126, 34, 206, 0.08)',
                  border: '1px solid rgba(126, 34, 206, 0.25)',
                  height: 28,
                  fontSize: isMobile ? 11.5 : 12.5,
                  cursor: 'pointer'
                }}
                title="الرجوع للوحة الأقسام الرئيسية"
              >
                <Home size={14} color="#7e22ce" />
                <span>الرئيسية</span>
              </Button>

              {activeMeta && (
                <>
                  <ChevronLeft size={14} color="#94a3b8" />

                  {/* 2. Interactive Category Dropdown & Direct Jump (Middle of tree now fully interactive) */}
                  <Dropdown
                    menu={{
                      items: activeMeta.category.children.map((child) => ({
                        key: child.id,
                        label: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                            {child.icon}
                            <span
                              style={{
                                fontWeight: child.id === activeTab ? 700 : 500,
                                color: child.id === activeTab ? '#7e22ce' : '#0F172A'
                              }}
                            >
                              {child.title}
                            </span>
                            {child.id === activeTab && (
                              <Tag color="purple" style={{ fontSize: 10, margin: '0 4px' }}>
                                الحالي
                              </Tag>
                            )}
                          </div>
                        ),
                        onClick: () => {
                          if (child.isExternalRoute) {
                            navigate(child.isExternalRoute);
                          } else {
                            handleNavigate(child.id);
                          }
                        }
                      }))
                    }}
                    trigger={['hover', 'click']}
                  >
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleNavigateToCategory(activeMeta.category.id)}
                      style={{
                        padding: '2px 8px',
                        fontSize: isMobile ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        height: 28,
                        cursor: 'pointer'
                      }}
                      title="انقر للانتقال للقسم في الرئيسية، أو اختر صفحة أخرى من القائمة المنسدلة"
                    >
                      <span style={{ maxWidth: isMobile ? 120 : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeMeta.category.title}
                      </span>
                      <ChevronDown size={12} color="#64748B" />
                    </Button>
                  </Dropdown>

                  <ChevronLeft size={14} color="#94a3b8" />

                  {/* 3. Active Current Page Tag / Button */}
                  <Tag
                    color="purple"
                    style={{
                      fontSize: isMobile ? 11 : 12.5,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      margin: 0,
                      border: '1px solid #E9D5FF',
                      backgroundColor: '#FAF5FF',
                      color: '#7E22CE',
                      maxWidth: isMobile ? 140 : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => handleNavigate(activeTab)}
                    title="الصفحة الحالية — انقر لإعادة التحميل"
                  >
                    <span>{activeMeta.item.title}</span>
                  </Tag>
                </>
              )}
            </div>

            <Button
              size="small"
              icon={<ArrowRight size={14} style={{ marginLeft: 4 }} />}
              onClick={() => handleNavigate('home')}
              style={{
                borderRadius: 6,
                fontWeight: 600,
                fontSize: isMobile ? 11.5 : 12,
                marginRight: isMobile ? 'auto' : 0
              }}
            >
              العودة للرئيسية
            </Button>
          </div>
        )}

        {/* 1. HOME DASHBOARD: 5 AUTHORIZED SECTIONS */}
        {activeTab === 'home' && (
          <div>
            {/* Top Welcome Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0B0F17 0%, #151D2A 50%, #0B0F17 100%)',
                borderRadius: 16,
                padding: '26px 30px',
                color: '#DFCA95',
                marginBottom: 24,
                border: '1px solid rgba(200, 164, 92, 0.4)',
                boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.5), 0 0 25px rgba(200, 164, 92, 0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle metallic gold highlight glow */}
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 140,
                  height: 140,
                  background: 'radial-gradient(circle, rgba(200, 164, 92, 0.25) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />
              <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                <Title level={3} style={{ color: '#DFCA95', margin: '0 0 8px 0', fontWeight: 800, letterSpacing: -0.2 }}>
                  مرحباً بك، {currentUser?.fullName || currentUser?.username}
                </Title>
                <Paragraph style={{ color: '#E2D4B7', margin: 0, fontSize: 14, maxWidth: 850, lineHeight: 1.6 }}>
                  بصفتك <strong style={{ color: '#F3E8C8' }}>مدير المخازن</strong>، تمتلك صلاحية الإشراف والمتابعة على الأقسام المعتمدة أدناه. يتم التحكم في إتاحة كل قسم وخاصية من قبل إدارة النظام المركزية.
                </Paragraph>
              </div>
            </div>

            {/* The Authorized Sections Cards */}
            <Row gutter={[20, 20]}>
              {categories.map((cat) => (
                <Col xs={24} md={12} lg={12} xl={8} key={cat.id}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 16,
                      border: '1.5px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                      overflow: 'hidden'
                    }}
                    styles={{ body: { padding: '22px' } }}
                  >
                    {/* Category Title Header */}
                    <div
                      onClick={() => handleNavigateToCategory(cat.id)}
                      title={`انتقال إلى ${cat.title}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        borderBottom: '1px solid #F1F5F9',
                        marginBottom: 16,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Space align="center" size={10}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#0B0F17',
                            border: '1.5px solid #C8A45C',
                            color: '#DFCA95',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 15,
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                          }}
                        >
                          {cat.number}
                        </span>
                        <Text strong style={{ fontSize: 16, color: '#0F172A' }}>
                          {cat.title}
                        </Text>
                      </Space>
                      <Space size={6}>
                        <Tag
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 12,
                            color: '#C8A45C',
                            backgroundColor: 'rgba(200, 164, 92, 0.08)',
                            border: '1px solid rgba(200, 164, 92, 0.35)',
                            padding: '2px 8px'
                          }}
                        >
                          {cat.children.length} أقسام
                        </Tag>
                        <ChevronLeft size={16} color="#94A3B8" />
                      </Space>
                    </div>

                    {/* Sub-Items List with Elevated Dark BG & Gold Text Hover */}
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                      {cat.children.map((child) => (
                        <div
                          key={child.id}
                          className="admin-nav-item-card"
                          onClick={() => {
                            if (child.isExternalRoute) {
                              navigate(child.isExternalRoute);
                            } else {
                              handleNavigate(child.id);
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              className="nav-item-icon-box"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.25s ease'
                              }}
                            >
                              {child.icon}
                            </div>
                            <div>
                              <Text
                                strong
                                className="nav-item-title"
                                style={{ display: 'block', fontSize: 13.5, color: '#0F172A', transition: 'color 0.25s ease' }}
                              >
                                {child.title}
                              </Text>
                              <Text
                                className="nav-item-sub"
                                style={{ fontSize: 11.5, color: '#64748B', transition: 'color 0.25s ease' }}
                              >
                                {child.subtitle}
                              </Text>
                            </div>
                          </div>
                          <ChevronLeft size={16} className="nav-item-chevron" style={{ color: '#94A3B8', transition: 'all 0.25s ease' }} />
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* 2. SUB-PAGES ROUTING WITH GRANULAR PERMISSION ENFORCEMENT */}
        {!isTabPermitted && activeTab !== 'home' ? (
          <Result
            status="403"
            title="تم إيقاف هذه الصلاحية"
            subTitle="تم إيقاف صلاحية الدخول لهذا القسم لحساب مدير المخازن بواسطة إدارة النظام. يرجى مراجعة المسؤول العام لتفعيلها."
            extra={
              <Button type="primary" onClick={() => handleNavigate('home')} style={{ backgroundColor: '#7e22ce' }}>
                العودة للرئيسية
              </Button>
            }
          />
        ) : (
          <>
            {/* 1. إدارة المخزون والأصناف */}
            {activeTab === 'groups_items' && (
              <GroupsAndItems
                currentUser={currentUser}
                autoOpenCreate={tabExtra?.autoOpenCreate}
                onResetAction={() => setTabExtra(null)}
              />
            )}
            {(activeTab === 'stock_audit' || activeTab === 'stock_adjustments') && (
              <StockAudit currentUser={currentUser} />
            )}
            {activeTab === 'transfers' && (
              <Transfers
                currentUser={currentUser}
                autoOpenCreate={tabExtra?.autoOpenCreate}
                onResetAction={() => setTabExtra(null)}
              />
            )}

            {/* 2. المشتريات والتوريد */}
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

            {/* 3. القبض الخاص ورواتب ومسحوبات العاملين */}
            {activeTab === 'payroll_expenses' && (
              <div style={{ padding: '4px' }}>
                <SellerPayrollAndExpenseCategoriesCards currentUser={currentUser} />
              </div>
            )}

            {/* 4. إدارة النظام والفروع */}
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
          </>
        )}
      </Content>
    </Layout>
  );
}
