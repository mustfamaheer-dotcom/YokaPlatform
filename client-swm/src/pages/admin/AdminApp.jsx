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
  Col
} from 'antd';
import {
  Compass,
  ArrowRight,
  ChevronLeft,
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
  LayoutDashboard
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
          {
            id: 'pos_link',
            title: 'شاشة نقطة البيع (POS)',
            subtitle: 'الدخول لنظام مبيعات الكاشير المباشر وإصدار الفواتير',
            icon: <ScanLine size={20} color="#0284c7" />,
            isExternalRoute: '/pos'
          },
          {
            id: 'daily_shift',
            title: 'العمليات والوردية اليومية',
            subtitle: 'حركات الكاشير، تقفيل الوردية اليومية، وتسليم العهدة للفرع',
            icon: <Clock size={20} color="#0284c7" />
          },
          {
            id: 'branches_daily',
            title: 'يومية الفروع المجمعة',
            subtitle: 'كشف الحساب اليومي الشامل لمبيعات ومصروفات ونقدية كل فرع',
            icon: <FileSpreadsheet size={20} color="#0284c7" />
          }
        ]
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
            title: 'المجموعات والأصناف',
            subtitle: 'شجرة التصنيفات، المقاسات، الألوان، وبطاقات المنتجات والباركود',
            icon: <Layers size={20} color="#16a34a" />
          },
          {
            id: 'stock_audit',
            title: 'الجرد الفعلي وسندات التسوية',
            subtitle: 'الجرد الميداني والمطابقة الفورية، معالجة العجز والزيادة، وسندات التسوية',
            icon: <ClipboardCheck size={20} color="#16a34a" />
          },
          {
            id: 'transfers',
            title: 'أذونات الصرف والتحويل',
            subtitle: 'التحويل بين الفروع والمستودعات وسندات استلام البضائع',
            icon: <ArrowLeftRight size={20} color="#16a34a" />
          },
          {
            id: 'ecom_inventory',
            title: 'مخزون المتجر الإلكتروني',
            subtitle: 'أرصدة المستودع المخصص للطلبات الرقمية وحجز الكميات',
            icon: <PackageCheck size={20} color="#16a34a" />
          }
        ]
      },
      {
        id: 'cat_purchases',
        number: '3',
        title: 'المشتريات والتوريد',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        children: [
          {
            id: 'purchases',
            title: 'فواتير المشتريات والتوريد',
            subtitle: 'تسجيل ومراجعة فواتير الشراء، تكلفة الوحدة، ودفعات الموردين',
            icon: <Receipt size={20} color="#d97706" />
          },
          {
            id: 'suppliers',
            title: 'الموردين والحسابات',
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
            title: 'الخزينة المركزية والتحويلات',
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
            title: 'اليوميات الإدارية والرقابة',
            subtitle: 'سجلات التدقيق الإداري، القيود المحاسبية، ودفتر العمليات',
            icon: <BookOpenCheck size={20} color="#059669" />
          }
        ]
      },
      {
        id: 'cat_ecom',
        number: '5',
        title: 'مبيعات وإدارة المتجر الإلكتروني',
        color: '#6366f1',
        bgColor: '#eef2ff',
        borderColor: '#c7d2fe',
        children: [
          {
            id: 'orders',
            title: 'طلبات المتجر الإلكتروني',
            subtitle: 'متابعة حالات الطلبات والشحن وبوالص التوصيل والتجهيز',
            icon: <ShoppingBag size={20} color="#6366f1" />
          },
          {
            id: 'ecom_analytics',
            title: 'إحصائيات المتجر الإلكتروني',
            subtitle: 'تحليلات حركة الزوار، المبيعات الرقمية، ومتوسط قيمة السلة',
            icon: <TrendingUp size={20} color="#6366f1" />
          }
        ]
      },
      {
        id: 'cat_management',
        number: '6',
        title: 'إدارة النظام والفروع والتحليلات',
        color: '#4f46e5',
        bgColor: '#faf5ff',
        borderColor: '#e9d5ff',
        children: [
          {
            id: 'branches',
            title: 'الفروع والمستودعات',
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
            id: 'sales_reports',
            title: 'تحليلات المبيعات والإيرادات المركزية',
            subtitle: 'الرسوم البيانية، مقارنة أداء الفروع، وتقييم أداء البائعين',
            icon: <BarChart3 size={20} color="#4f46e5" />
          },
          {
            id: 'kpis_dashboard',
            title: 'لوحة القيادة والمؤشرات العامة',
            subtitle: 'ملخص مؤشرات الأداء الشاملة والبطاقات التحليلية التنفيذية',
            icon: <LayoutDashboard size={20} color="#4f46e5" />
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
              <span style={{ color: '#0F766E', fontSize: 11, fontWeight: 700 }}>
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
            type={activeTab === 'home' ? 'primary' : 'default'}
            icon={<Compass size={16} style={{ marginLeft: 4 }} />}
            onClick={() => handleNavigate('home')}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: activeTab === 'home' ? '#0F766E' : '#FFFFFF',
              borderColor: activeTab === 'home' ? '#0F766E' : '#CBD5E1',
              color: activeTab === 'home' ? '#FFFFFF' : '#0F172A'
            }}
          >
            الرئيسية (لوحة الأقسام)
          </Button>

          {/* POS Direct Link Button */}
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

          {/* Global Cross-Branch Tag */}
          <Tag
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
            كافة الفروع والمستودعات — صلاحيات شاملة
          </Tag>
        </div>

        {/* Left Section: User info & logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar
              style={{ backgroundColor: '#0F766E', border: '1px solid #0D5D56' }}
              icon={<ShieldCheck size={18} />}
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
        {/* Breadcrumb Trail when not on home */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                type="link"
                size="small"
                onClick={() => handleNavigate('home')}
                style={{ padding: 0, fontWeight: 700, color: '#0F766E' }}
              >
                الرئيسية
              </Button>
              {activeMeta && (
                <>
                  <ChevronLeft size={14} color="#94a3b8" />
                  <Text type="secondary" style={{ fontSize: 12.5 }}>
                    {activeMeta.category.title}
                  </Text>
                  <ChevronLeft size={14} color="#94a3b8" />
                  <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                    {activeMeta.item.title}
                  </Text>
                </>
              )}
            </div>

            <Button
              size="small"
              icon={<ArrowRight size={14} style={{ marginLeft: 4 }} />}
              onClick={() => handleNavigate('home')}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              العودة للرئيسية
            </Button>
          </div>
        )}

        {/* 1. HOME VIEW: 6 AUTHORIZED ADMINISTRATIVE SECTIONS */}
        {activeTab === 'home' && (
          <div>
            {/* Top Welcome Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                borderRadius: 16,
                padding: '24px 28px',
                color: '#FFFFFF',
                marginBottom: 24,
                boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
              }}
            >
              <div>
                <Space align="center" style={{ marginBottom: 6 }}>
                  <Sparkles size={22} color="#fde047" />
                  <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800 }}>
                    مرحباً بك، {currentUser?.fullName || currentUser?.username}
                  </Title>
                </Space>
                <Paragraph style={{ color: '#ccfbf1', margin: 0, fontSize: 14, maxWidth: 850 }}>
                  بصفتك <strong>مدير النظام المركزي</strong>، تمتلك صلاحيات كاملة وشاملة لإدارة ومراقبة كافة الفروع، المستودعات، المخزون، والعمليات المالية والتنفيذية.
                </Paragraph>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ScanLine size={18} style={{ marginLeft: 6 }} />}
                  onClick={() => (onSwitchToPos ? onSwitchToPos() : navigate('/pos'))}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0f766e',
                    fontWeight: 800,
                    borderRadius: 10,
                    border: 'none',
                    height: 44
                  }}
                >
                  فتح نقطة البيع (POS)
                </Button>
                <Button
                  size="large"
                  icon={<LayoutDashboard size={18} style={{ marginLeft: 6 }} />}
                  onClick={() => handleNavigate('kpis_dashboard')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    height: 44
                  }}
                >
                  لوحة المؤشرات (KPIs)
                </Button>
              </div>
            </div>

            {/* The 6 Authorized Sections Cards */}
            <Row gutter={[20, 20]}>
              {categories.map((cat) => (
                <Col xs={24} md={12} lg={12} xl={8} key={cat.id}>
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 14,
                      border: `1.5px solid ${cat.borderColor}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      overflow: 'hidden'
                    }}
                    styles={{ body: { padding: '20px' } }}
                  >
                    {/* Category Title Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 12,
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: 14
                      }}
                    >
                      <Space align="center">
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                            color: '#FFFFFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 14
                          }}
                        >
                          {cat.number}
                        </span>
                        <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                          {cat.title}
                        </Text>
                      </Space>
                      <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 700 }}>
                        {cat.children.length} أقسام
                      </Tag>
                    </div>

                    {/* Sub-Items List */}
                    <Space direction="vertical" style={{ width: '100%' }} size={10}>
                      {cat.children.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => {
                            if (child.isExternalRoute) {
                              navigate(child.isExternalRoute);
                            } else {
                              handleNavigate(child.id);
                            }
                          }}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = cat.color;
                            e.currentTarget.style.backgroundColor = cat.bgColor;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: cat.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center'
                              }}
                            >
                              {child.icon}
                            </div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13.5, color: '#0f172a' }}>
                                {child.title}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11.5 }}>
                                {child.subtitle}
                              </Text>
                            </div>
                          </div>
                          <ChevronLeft size={16} color="#94a3b8" />
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
