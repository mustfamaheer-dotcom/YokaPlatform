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
  Result
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
  Store,
  Users as UsersIcon,
  ClipboardCheck,
  ArrowLeftRight,
  Clock,
  FileSpreadsheet,
  ScanLine,
  Lock,
  Sparkles
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
import DailyShift from '../DailyShift';
import BranchesDaily from '../BranchesDaily';
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

  // Extract route after /warehouse-manager
  const pathParts = useMemo(() => {
    const raw = location.pathname.replace(/^\/warehouse-manager\/?/, '');
    return raw ? raw.split('/').filter(Boolean) : [];
  }, [location.pathname]);

  const activeTab = useMemo(() => {
    if (pathParts.length === 0) return 'home';
    return pathParts[0];
  }, [pathParts]);

  const handleNavigate = (tab, extra = null) => {
    setTabExtra(extra);
    if (!tab || tab === 'home') {
      navigate('/warehouse-manager');
    } else {
      navigate(`/warehouse-manager/${tab}`);
    }
  };

  // Build the 5 authorized functional categories
  const categories = useMemo(() => {
    const p = permissions || {};

    const cat1Children = [
      p.perm_pos !== false && {
        id: 'pos_link',
        title: 'شاشة نقطة البيع (POS)',
        subtitle: 'الدخول لنظام مبيعات الكاشير المباشر وإصدار الفواتير',
        icon: <ScanLine size={20} color="#0284c7" />,
        isExternalRoute: '/pos'
      },
      p.perm_daily_shift !== false && {
        id: 'daily_shift',
        title: 'العمليات والوردية اليومية',
        subtitle: 'حركات الكاشير وتقفيل الوردية اليومية للفرع',
        icon: <Clock size={20} color="#0284c7" />
      },
      p.perm_branches_daily !== false && {
        id: 'branches_daily',
        title: 'يومية الفروع المجمعة',
        subtitle: 'كشف الحساب اليومي الشامل لمبيعات ومصروفات الفروع',
        icon: <FileSpreadsheet size={20} color="#0284c7" />
      }
    ].filter(Boolean);

    const cat2Children = [
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

    const cat3Children = [
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

    const cat4Children = [
      p.perm_payroll !== false && {
        id: 'payroll_expenses',
        title: 'القبض الخاص ومسير الرواتب',
        subtitle: 'تسوية مرتبات وعمولات البائعين، السلف والخصومات، ومسحوبات العاملين',
        icon: <Wallet size={20} color="#9333ea" />
      }
    ].filter(Boolean);

    const cat5Children = [
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
        id: 'cat_pos',
        number: '1',
        title: 'نقاط البيع والعمليات اليومية',
        color: '#0284c7',
        bgColor: '#f0f9ff',
        borderColor: '#bae6fd',
        children: cat1Children
      },
      {
        id: 'cat_inventory',
        number: '2',
        title: 'إدارة المخزون والأصناف',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        children: cat2Children
      },
      {
        id: 'cat_purchases',
        number: '3',
        title: 'المشتريات والتوريد',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        children: cat3Children
      },
      {
        id: 'cat_payroll',
        number: '4',
        title: 'القبض الخاص ورواتب ومسحوبات العاملين',
        color: '#9333ea',
        bgColor: '#faf5ff',
        borderColor: '#e9d5ff',
        children: cat4Children
      },
      {
        id: 'cat_system',
        number: '5',
        title: 'إدارة النظام والفروع',
        color: '#e11d48',
        bgColor: '#fff1f2',
        borderColor: '#fecdd3',
        children: cat5Children
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
      case 'daily_shift': return p.perm_daily_shift !== false;
      case 'branches_daily': return p.perm_branches_daily !== false;
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

      {/* TOP HEADER */}
      <Header
        className="swm-top-header"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Right Section: Brand & Navigation Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            onClick={() => handleNavigate('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
          >
            <img src={yokaLogo} alt="Yoka Store" style={{ height: 34, objectFit: 'contain' }} />
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span style={{ color: '#0F172A', fontSize: 14, fontWeight: 800, display: 'block' }}>
                يوكا ستور
              </span>
              <span style={{ color: '#7e22ce', fontSize: 11, fontWeight: 700 }}>
                بوابة مدير المخازن
              </span>
            </div>
          </div>

          <div style={{ height: 24, width: 1, backgroundColor: '#E2E8F0', margin: '0 4px' }} />

          {/* Navigation Hub Button */}
          <Button
            type={activeTab === 'home' ? 'primary' : 'default'}
            icon={<Compass size={16} style={{ marginLeft: 4 }} />}
            onClick={() => handleNavigate('home')}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: activeTab === 'home' ? '#7e22ce' : '#FFFFFF',
              borderColor: activeTab === 'home' ? '#7e22ce' : '#CBD5E1',
              color: activeTab === 'home' ? '#FFFFFF' : '#0F172A'
            }}
          >
            الرئيسية (لوحة الأقسام)
          </Button>

          {/* POS Direct Link Button if allowed */}
          {permissions?.perm_pos !== false && (
            <Button
              type="dashed"
              icon={<ScanLine size={15} style={{ marginLeft: 4 }} />}
              onClick={() => navigate('/pos')}
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

          <Tag
            style={{
              fontSize: 12,
              padding: '3px 8px',
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
        </div>

        {/* Left Section: User info & logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
        </div>
      </Header>

      {/* MAIN CONTENT AREA */}
      <Content style={{ width: '100%', maxWidth: 1600, margin: '0 auto', boxSizing: 'border-box', padding: '16px' }}>
        {/* Breadcrumb Trail when not on home */}
        {activeTab !== 'home' && activeMeta && (
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
                style={{ padding: 0, fontWeight: 700, color: '#7e22ce' }}
              >
                الرئيسية
              </Button>
              <ChevronLeft size={14} color="#94a3b8" />
              <Text type="secondary" style={{ fontSize: 12.5 }}>
                {activeMeta.category.title}
              </Text>
              <ChevronLeft size={14} color="#94a3b8" />
              <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                {activeMeta.item.title}
              </Text>
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

        {/* 1. HOME DASHBOARD: 5 AUTHORIZED SECTIONS */}
        {activeTab === 'home' && (
          <div>
            {/* Top Welcome Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #7e22ce 0%, #4c1d95 100%)',
                borderRadius: 16,
                padding: '24px 28px',
                color: '#FFFFFF',
                marginBottom: 24,
                boxShadow: '0 10px 25px -5px rgba(126, 34, 206, 0.25)',
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
                <Paragraph style={{ color: '#e9d5ff', margin: 0, fontSize: 14, maxWidth: 800 }}>
                  بصفتك <strong>مدير المخازن</strong>، تمتلك صلاحية الإشراف والمتابعة على الأقسام المعتمدة أدناه. يتم التحكم في إتاحة كل قسم وخاصية من قبل إدارة النظام المركزية.
                </Paragraph>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {permissions?.perm_pos !== false && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<ScanLine size={18} style={{ marginLeft: 6 }} />}
                    onClick={() => navigate('/pos')}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#7e22ce',
                      fontWeight: 800,
                      borderRadius: 10,
                      border: 'none',
                      height: 44
                    }}
                  >
                    فتح نقطة البيع (POS)
                  </Button>
                )}
              </div>
            </div>

            {/* The 5 Authorized Sections Cards */}
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
                    bodyStyle={{ padding: '20px' }}
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
                      <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700 }}>
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
                                justifyContent: 'center'
                              }}
                            >
                              {child.icon}
                            </div>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13.5, color: '#0f172a' }}>
                                {child.title}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
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
            {/* 1. نقاط البيع والعمليات اليومية */}
            {activeTab === 'daily_shift' && <DailyShift currentUser={currentUser} />}
            {activeTab === 'branches_daily' && <BranchesDaily />}

            {/* 2. إدارة المخزون والأصناف */}
            {activeTab === 'groups_items' && (
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

            {/* 3. المشتريات والتوريد */}
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

            {/* 4. القبض الخاص ورواتب ومسحوبات العاملين */}
            {activeTab === 'payroll_expenses' && (
              <div style={{ padding: '4px' }}>
                <SellerPayrollAndExpenseCategoriesCards currentUser={currentUser} />
              </div>
            )}

            {/* 5. إدارة النظام والفروع */}
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
