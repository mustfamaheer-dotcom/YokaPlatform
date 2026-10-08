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
  Landmark,
  Store,
  Users as UsersIcon,
  ClipboardCheck,
  ArrowLeftRight,
  Clock,
  FileSpreadsheet,
  ScanLine,
  Sparkles,
  BarChart3,
  TrendingUp,
  PackageCheck,
  BookOpenCheck,
  LayoutDashboard,
  Sliders,
  Crown,
  Award
} from 'lucide-react';
import ScrollToTopTabs from '../../components/ScrollToTopTabs';
import yokaLogo from '../../assets/yokaStoreTransparent.png';

// Sub-Pages
import Dashboard from '../Dashboard';
import BranchesDaily from '../BranchesDaily';
import AdminJournals from '../AdminJournals';
import StockAudit from '../StockAudit';
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
import BranchShiftMonitor from '../BranchShiftMonitor';
import Customers from '../Customers';
import StoreSettings from '../StoreSettings';
import LoyaltySettings from '../LoyaltySettings';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const ROLE_LABELS = {
  super_admin: { label: 'مدير عام النظام', color: 'red' },
  admin: { label: 'مدير إداري', color: 'volcano' },
  warehouse_manager: { label: 'مدير المخازن', color: 'purple' },
  supervisor: { label: 'مشرف فرع', color: 'orange' },
  salesperson: { label: 'بائع / كاشير', color: 'blue' }
};

export default function AdminApp({ currentUser, onSwitchToPos, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabExtra, setTabExtra] = useState(null);

  // Extract route after /dashboard
  const pathParts = useMemo(() => {
    const raw = location.pathname.replace(/^\/dashboard\/?/, '');
    return raw ? raw.split('/').filter(Boolean) : [];
  }, [location.pathname]);

  const activeTab = useMemo(() => {
    if (pathParts.length === 0) return 'home';
    if (pathParts[0] === 'hub') return 'home';
    return pathParts[0];
  }, [pathParts]);

  const handleNavigate = (tab, extra = null) => {
    setTabExtra(extra);
    if (!tab || tab === 'home' || tab === 'hub') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  const handleNavigateToCategory = (catId) => {
    navigate('/dashboard');
    setTimeout(() => {
      const el = document.getElementById(catId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Check if current user is system owner / central admin (POS is for store cashiers, not the central owner)
  const isSystemOwner = useMemo(() => {
    return ['super_admin', 'admin', 'general_manager'].includes(currentUser?.role) || !currentUser?.branch_id;
  }, [currentUser]);

  // Build the 6 Administrative System Categories (Exact same UI style as Warehouse Manager)
  const categories = useMemo(() => {
    return [
      {
        id: 'cat_pos',
        number: '1',
        title: 'نقاط البيع والعمليات اليومية',
        color: '#0284c7',
        bgColor: '#f0f9ff',
        borderColor: '#bae6fd',
        children: [
          !isSystemOwner ? {
            id: 'pos_link',
            title: 'شاشة نقطة البيع (POS)',
            subtitle: 'الدخول لنظام مبيعات الكاشير المباشر وإصدار الفواتير',
            icon: <ScanLine size={20} color="#0284c7" />,
            isExternalRoute: '/pos'
          } : null,
          {
            id: 'branches_daily',
            title: 'لوحة الـ KPIs',
            subtitle: 'مؤشرات الأداء الرئيسية والمبيعات اليومية للفروع',
            icon: <FileSpreadsheet size={20} color="#0284c7" />
          },
          {
            id: 'daily_shift',
            title: 'مبيعات الفروع المباشرة',
            subtitle: 'حركات الكاشير والمبيعات المباشرة وتقفيل الورديات',
            icon: <Clock size={20} color="#0284c7" />
          },
          {
            id: 'branch_shifts',
            title: 'مراقبة الورديات',
            subtitle: 'متابعة حية لتواجد الكاشيرية، ومواعيد فتح وإغلاق الفروع',
            icon: <Store size={20} color="#0284c7" />
          }
        ].filter(Boolean)
      },
      {
        id: 'cat_inventory',
        number: '2',
        title: 'إدارة المخزون والأصناف',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        children: [
          {
            id: 'groups_items',
            title: 'دليل المنتجات',
            subtitle: 'شجرة التصنيفات، المقاسات، الألوان، وبطاقات المنتجات والباركود',
            icon: <Layers size={20} color="#16a34a" />
          },
          {
            id: 'stock_audit',
            title: 'جرد المخزون',
            subtitle: 'الجرد الميداني والمطابقة الفورية، معالجة العجز والزيادة، وسندات التسوية',
            icon: <ClipboardCheck size={20} color="#16a34a" />
          },
          {
            id: 'transfers',
            title: 'التحويلات بين الفروع',
            subtitle: 'التحويل بين الفروع والمستودعات وسندات استلام البضائع',
            icon: <ArrowLeftRight size={20} color="#16a34a" />
          }
        ]
      },
      {
        id: 'cat_purchases',
        number: '3',
        title: 'المشتريات والموردين',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        children: [
          {
            id: 'purchases',
            title: 'أوامر وفواتير الشراء',
            subtitle: 'تسجيل ومراجعة فواتير الشراء، تكلفة الوحدة، ودفعات الموردين',
            icon: <Receipt size={20} color="#d97706" />
          },
          {
            id: 'suppliers',
            title: 'حسابات الموردين',
            subtitle: 'دليل الموردين، كشوف الحسابات التفصيلية، والأرصدة الدائنة',
            icon: <Truck size={20} color="#d97706" />
          }
        ]
      },
      {
        id: 'cat_finance',
        number: '4',
        title: 'المالية والخزائن ومسير الرواتب',
        color: '#059669',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        children: [
          {
            id: 'treasury_admin',
            title: 'الخزينة المركزية',
            subtitle: 'حركة السيولة المركزية، التحويلات البنكية، وتصفير الخزائن',
            icon: <Landmark size={20} color="#059669" />
          },
          {
            id: 'payroll_expenses',
            title: 'مسير الرواتب وبنود المصروفات',
            subtitle: 'تسوية وصرف مرتبات وعمولات البائعين، السلف، وإدارة بنود المصروفات',
            icon: <Wallet size={20} color="#059669" />
          },
          {
            id: 'admin_journals',
            title: 'اليوميات والرقابة',
            subtitle: 'سجلات التدقيق الإداري، القيود المحاسبية، ودفتر العمليات',
            icon: <BookOpenCheck size={20} color="#059669" />
          }
        ]
      },
      {
        id: 'cat_management',
        number: '5',
        title: 'إدارة النظام والفروع',
        color: '#4f46e5',
        bgColor: '#faf5ff',
        borderColor: '#e9d5ff',
        children: [
          {
            id: 'branches',
            title: 'إدارة الفروع',
            subtitle: 'إدارة الفروع، نقاط البيع، والمستودعات وتعيين الصلاحيات',
            icon: <Store size={20} color="#4f46e5" />
          },
          {
            id: 'users',
            title: 'المستخدمين والصلاحيات',
            subtitle: 'إدارة حسابات المديرين، المشرفين، والبائعين وصلاحيات مدير المخازن',
            icon: <UsersIcon size={20} color="#4f46e5" />
          },
          {
            id: 'loyalty_settings',
            title: 'إعدادات ومحرك نقاط الولاء',
            subtitle: 'ضبط قواعد احتساب واستبدال النقاط التلقائية ومعادلات الخصم لنقاط البيع (POS)',
            icon: <Award size={20} color="#4f46e5" />
          }
        ]
      },
      {
        id: 'cat_analytics',
        number: '6',
        title: 'التقارير والتحليلات المتقدمة',
        color: '#0284c7',
        bgColor: '#f0f9ff',
        borderColor: '#bae6fd',
        children: [
          {
            id: 'sales_reports',
            title: 'الرسوم البيانية، مقارنة الفروع، وتقييم أداء البائعين',
            subtitle: 'تحليلات المبيعات والإيرادات المركزية وتقييم الأداء',
            icon: <BarChart3 size={20} color="#0284c7" />
          }
        ]
      }
    ];
  }, []);

  // Lookup active sub-item title and category
  const activeMeta = useMemo(() => {
    if (activeTab === 'home') return null;
    for (const cat of categories) {
      for (const item of cat.children) {
        if (item.id === activeTab || (activeTab === 'kpis_dashboard' && item.id === 'kpis_dashboard')) {
          return { category: cat, item };
        }
      }
    }
    return null;
  }, [categories, activeTab]);

  const role = currentUser?.role || 'admin';
  const roleInfo = ROLE_LABELS[role] || { label: 'مدير إداري', color: 'volcano' };

  return (
    <Layout
      style={{
        minHeight: '100vh',
        direction: 'rtl',
        backgroundColor: '#F8FAFC'
      }}
    >
      <ScrollToTopTabs activeTab={activeTab} />

      {/* ─── FULL-WIDTH ULTRA-MODERN TOP NAVIGATION BAR (Matching Warehouse Manager) ─── */}
      <Header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          height: 64,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Right Section: Branding & Direct Navigation Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo & Platform Name */}
          <div
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
              style={{ height: 34, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span
                style={{
                  color: '#0F172A',
                  fontSize: 14,
                  fontWeight: 800,
                  display: 'block'
                }}
              >
                يوكا ستور
              </span>
              <span style={{ color: '#C8A45C', fontSize: 11, fontWeight: 700 }}>
                لوحة الإدارة والتحكم الشامل
              </span>
            </div>
          </div>

          <div
            style={{
              height: 24,
              width: 1,
              backgroundColor: '#E2E8F0',
              margin: '0 2px'
            }}
          />

          {/* Primary Navigation Hub Button */}
          <Button
            type="primary"
            icon={<Compass size={16} style={{ marginLeft: 4, color: activeTab === 'home' ? '#DFCA95' : '#0B0F17' }} />}
            onClick={() => handleNavigate('home')}
            style={{
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 12.5,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: activeTab === 'home' ? '#0B0F17' : '#FFFFFF',
              borderColor: activeTab === 'home' ? '#C8A45C' : '#CBD5E1',
              color: activeTab === 'home' ? '#DFCA95' : '#0F172A',
              boxShadow: activeTab === 'home' ? '0 2px 8px rgba(11, 15, 23, 0.25)' : 'none'
            }}
          >
            الرئيسية (لوحة الأقسام)
          </Button>

          {/* POS Direct Link Button - Only visible for branch operators, not central system owner / admin */}
          {!isSystemOwner && (
            <Button
              type="dashed"
              icon={<ScanLine size={15} style={{ marginLeft: 4 }} />}
              onClick={() => (onSwitchToPos ? onSwitchToPos() : navigate('/pos'))}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                height: 34,
                color: '#0284c7',
                borderColor: '#38bdf8'
              }}
            >
              نقطة البيع (POS)
            </Button>
          )}

          {/* Global Cross-Branch Tag/Button */}
          <Tag
            style={{
              fontSize: 12,
              padding: '6px 12px',
              fontWeight: 800,
              borderRadius: 8,
              backgroundColor: '#0B0F17',
              color: '#DFCA95',
              border: '1px solid #C8A45C',
              boxShadow: '0 2px 6px rgba(11, 15, 23, 0.18)',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <MapPin size={13} style={{ marginLeft: 4, display: 'inline', color: '#DFCA95' }} />
            كافة الفروع والمستودعات — صلاحيات شاملة
          </Tag>
        </div>

        {/* Left Section: User info & logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              style={{ backgroundColor: '#0B0F17', border: '1.5px solid #C8A45C', color: '#DFCA95' }}
              icon={<ShieldCheck size={18} color="#DFCA95" />}
            />
            <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
              <Text strong style={{ display: 'block', fontSize: 13, color: '#0F172A' }}>
                {currentUser?.fullName || currentUser?.username}
              </Text>
              <Tag color={roleInfo.color} style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}>
                {roleInfo.label}
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
        </div>
      </Header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <Content style={{ width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box', padding: '16px' }}>
        {/* Breadcrumb Trail when not on home (Fully Clickable & Interactive) */}
        {activeTab !== 'home' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '8px 16px',
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* 1. Clickable Home Link */}
              <Button
                type="link"
                size="small"
                onClick={() => handleNavigate('home')}
                style={{
                  padding: '2px 8px',
                  fontWeight: 800,
                  color: '#C8A45C',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(200, 164, 92, 0.08)',
                  border: '1px solid rgba(200, 164, 92, 0.25)',
                  height: 28,
                  cursor: 'pointer'
                }}
                title="الرجوع للوحة الأقسام الرئيسية"
              >
                <Compass size={14} color="#C8A45C" />
                <span>الرئيسية</span>
              </Button>

              {activeMeta && (
                <>
                  <ChevronLeft size={14} color="#94a3b8" />

                  {/* 2. Interactive Category Dropdown & Direct Jump */}
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
                                color: child.id === activeTab ? '#C8A45C' : '#0F172A'
                              }}
                            >
                              {child.title}
                            </span>
                            {child.id === activeTab && (
                              <Tag color="gold" style={{ fontSize: 10, margin: '0 4px' }}>
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
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        height: 28,
                        cursor: 'pointer'
                      }}
                      title="انقر للانتقال للقسم في الرئيسية، أو اختر صفحة أخرى من القائمة المنسدلة"
                    >
                      <span>{activeMeta.category.title}</span>
                      <ChevronDown size={12} color="#64748B" />
                    </Button>
                  </Dropdown>

                  <ChevronLeft size={14} color="#94a3b8" />

                  {/* 3. Active Current Page Tag / Button */}
                  <Tag
                    color="gold"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      margin: 0,
                      border: '1px solid #FDE68A',
                      backgroundColor: '#FFFBEB',
                      color: '#92400E'
                    }}
                    onClick={() => handleNavigate(activeTab)}
                    title="الصفحة الحالية — انقر لإعادة التحميل"
                  >
                    <span>{activeMeta.item.title}</span>
                  </Tag>
                </>
              )}
            </div>

            {/* Back to Home Sections Button */}
            <Button
              size="small"
              icon={<ArrowRight size={13} style={{ marginLeft: 4 }} />}
              onClick={() => handleNavigate('home')}
              style={{
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                borderColor: '#CBD5E1',
                height: 28,
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              العودة للوحة الأقسام
            </Button>
          </div>
        )}

        {/* 1. HOME VIEW: 6 AUTHORIZED ADMINISTRATIVE SECTIONS */}
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
                <Paragraph style={{ color: '#E2D4B7', margin: 0, fontSize: 14.5, maxWidth: 950, lineHeight: 1.7 }}>
                  بصفتك <strong style={{ color: '#F3E8C8' }}>مدير النظام المركزي</strong>، تمتلك صلاحيات كاملة وشاملة لإدارة ومراقبة كافة الفروع، المستودعات، المخزون، والعمليات المالية والتنفيذية.
                </Paragraph>
              </div>
            </div>

            {/* The 6 Authorized Sections Cards */}
            <Row gutter={[20, 20]}>
              {categories.map((cat) => (
                <Col xs={24} md={12} lg={12} xl={8} key={cat.id} id={cat.id}>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        borderBottom: '1px solid #F1F5F9',
                        marginBottom: 16
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

        {/* 2. SUB-PAGES DIRECT CONTAINER */}
        {(activeTab === 'dashboard' || activeTab === 'kpis_dashboard') && (
          <Dashboard onNavigate={handleNavigate} />
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
        {(activeTab === 'products' || activeTab === 'groups_items') && (
          <GroupsAndItems
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
        {activeTab === 'branches_daily' && <BranchesDaily currentUser={currentUser} />}
        {activeTab === 'admin_journals' && <AdminJournals currentUser={currentUser} />}
        {(activeTab === 'sales_reports' || activeTab === 'retail_analytics') && (
          <SalesReportsPage currentUser={currentUser} isAdmin={true} />
        )}
        {activeTab === 'ecom_analytics' && (
          <EcomAnalytics currentUser={currentUser} onNavigate={handleNavigate} />
        )}
        {activeTab === 'ecom_inventory' && (
          <EcomInventory currentUser={currentUser} onNavigate={handleNavigate} />
        )}
        {activeTab === 'daily_shift' && <DailyShift currentUser={currentUser} />}
        {activeTab === 'branch_shifts' && <BranchShiftMonitor currentUser={currentUser} />}
        {activeTab === 'customers' && <Customers currentUser={currentUser} />}
        {(activeTab === 'loyalty_settings' || activeTab === 'loyalty') && (
          <LoyaltySettings currentUser={currentUser} onNavigate={handleNavigate} />
        )}
        {(activeTab === 'store_settings' || activeTab === 'settings' || activeTab === 'storefront') && (
          <StoreSettings currentUser={currentUser} />
        )}
      </Content>
    </Layout>
  );
}
