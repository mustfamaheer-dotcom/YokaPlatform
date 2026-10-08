import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Space, Typography, Tag, Avatar, Card, Badge, Tooltip, Row, Col, Drawer } from 'antd';
import {
  PackageCheck,
  LogOut,
  Crown,
  Lock,
  Boxes,
  Truck,
  MapPin,
  Navigation,
  Wallet,
  Store,
  TrendingUp,
  ArrowRight,
  Menu as MenuIcon,
  Home
} from 'lucide-react';
import api from '../../api';
import yokaLogo from '../../assets/yokaStoreTransparent.png';
import Orders from '../Orders';
import EcomInventory from '../EcomInventory';
import SupervisorUnlockModal from '../../components/SupervisorUnlockModal';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

export default function EcomWarehouseApp({ currentUser, onLogout, onSupervisorUnlock }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hub');
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.isSupervisor === true || ['admin', 'super_admin'].includes(currentUser?.role);

  const handleLockToStaff = () => {
    if (currentUser?.isElevated) {
      const original = { ...currentUser };
      delete original.isElevated;
      delete original.isSupervisor;
      original.role = original.originalRole || 'salesperson';
      localStorage.setItem('user', JSON.stringify(original));
      if (onSupervisorUnlock) onSupervisorUnlock(original);
    }
  };

  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const fetchPendingOrdersCount = async () => {
    try {
      const res = await api.get('/api/swm/orders/pending-count');
      if (res.data?.success) {
        setPendingOrdersCount(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch pending orders count:', e);
    }
  };

  useEffect(() => {
    fetchPendingOrdersCount();

    const handleOrdersChange = () => {
      fetchPendingOrdersCount();
    };

    window.addEventListener('ecp-orders-updated', handleOrdersChange);
    window.addEventListener('focus', handleOrdersChange);
    const interval = setInterval(fetchPendingOrdersCount, 20000);

    return () => {
      window.removeEventListener('ecp-orders-updated', handleOrdersChange);
      window.removeEventListener('focus', handleOrdersChange);
      clearInterval(interval);
    };
  }, []);

  const navigationCards = [
    {
      key: 'orders',
      title: 'طلبات العملاء والشحنات',
      subtitle: 'فحص الطرود وبوالص الشحن والتسليم',
      icon: <Truck size={22} color="#60a5fa" />,
      accentColor: '#2563eb',
      activeBg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(37, 99, 235, 0.35)',
      glowColor: 'rgba(37, 99, 235, 0.25)',
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} طلب جديد` : 'الطلبات',
      badgeColor: pendingOrdersCount > 0 ? 'red' : 'blue'
    },
    {
      key: 'rates',
      title: 'تكاليف شحن المحافظات والمدن',
      subtitle: 'ضبط أسعار ورسوم التوصيل لكل محافظة',
      icon: <MapPin size={22} color="#34d399" />,
      accentColor: '#059669',
      activeBg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(5, 150, 105, 0.35)',
      glowColor: 'rgba(5, 150, 105, 0.25)',
      badge: 'التوصيل',
      badgeColor: 'green'
    },
    {
      key: 'carriers',
      title: 'شركات وجهات الشحن',
      subtitle: 'شركات الشحن، بوسطة، وروابط التتبع',
      icon: <Navigation size={22} color="#38bdf8" />,
      accentColor: '#0284c7',
      activeBg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(2, 132, 199, 0.35)',
      glowColor: 'rgba(2, 132, 199, 0.25)',
      badge: 'شركات الشحن',
      badgeColor: 'cyan'
    },
    {
      key: 'payments',
      title: 'طرق الدفع وحسابات التحويل',
      subtitle: 'فودافون كاش، إنستاباي، وتأكيد الإيصالات',
      icon: <Wallet size={22} color="#c084fc" />,
      accentColor: '#9333ea',
      activeBg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(147, 51, 234, 0.35)',
      glowColor: 'rgba(147, 51, 234, 0.25)',
      badge: 'المدفوعات',
      badgeColor: 'purple'
    },
    {
      key: 'store_settings',
      title: 'إعدادات واجهة المتجر والهيرو',
      subtitle: 'اللافتات الترويجية وبيانات التواصل للمتجر',
      icon: <Store size={22} color="#fbbf24" />,
      accentColor: '#d97706',
      activeBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(217, 119, 6, 0.35)',
      glowColor: 'rgba(217, 119, 6, 0.25)',
      badge: 'المظهر',
      badgeColor: 'gold'
    },
    {
      key: 'visitor_analytics',
      title: 'تحليلات وسلوك الزوار والمدن',
      subtitle: 'إحصائيات الزيارات ومعدلات التحويل بالمحافظات',
      icon: <TrendingUp size={22} color="#f472b6" />,
      accentColor: '#ec4899',
      activeBg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(236, 72, 153, 0.35)',
      glowColor: 'rgba(236, 72, 153, 0.25)',
      badge: 'التحليلات',
      badgeColor: 'magenta'
    },
    {
      key: 'inventory',
      title: 'مخزون ومعروضات المتجر',
      subtitle: 'الأرصدة المتاحة للبيع أونلاين والأسعار',
      icon: <PackageCheck size={22} color="#a3e635" />,
      accentColor: '#65a30d',
      activeBg: 'linear-gradient(135deg, rgba(101, 163, 13, 0.22) 0%, #1e293b 100%)',
      iconActiveBg: 'rgba(101, 163, 13, 0.35)',
      glowColor: 'rgba(101, 163, 13, 0.25)',
      badge: 'المخزون',
      badgeColor: 'lime'
    }
  ];

  const currentCard = navigationCards.find((c) => c.key === activeTab);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }} dir="rtl">
      {/* Top Application Header */}
      <Header
        style={{
          background: '#0f172a',
          padding: isMobile ? '0 12px' : '0 20px',
          height: isMobile ? 56 : (isTablet ? 60 : 64),
          lineHeight: 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxSizing: 'border-box'
        }}
      >
        {/* Brand & Warehouse Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 14 }}>
          <img
            src={yokaLogo}
            alt="Yoka Store"
            style={{ height: isMobile ? 32 : 38, objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: isMobile ? 14 : 16 }}>
                يوكا ستور
              </span>
              <Tag
                color="purple"
                style={{
                  fontWeight: 700,
                  fontSize: isMobile ? 10 : 12,
                  borderRadius: 6,
                  padding: isMobile ? '1px 6px' : '2px 8px',
                  border: 'none',
                  background: 'rgba(147, 51, 234, 0.25)',
                  color: '#c084fc',
                  margin: 0,
                  lineHeight: 'normal'
                }}
              >
                {isMobile ? 'مستودع أونلاين' : 'مستودع المتجر الإلكتروني (E-Com Warehouse)'}
              </Tag>
              {!isMobile && (
                <Tag
                  color="cyan"
                  style={{
                    fontSize: 11,
                    borderRadius: 4,
                    margin: 0,
                    lineHeight: 'normal'
                  }}
                >
                  {currentUser?.branchCode || 'BR-ECOM'}
                </Tag>
              )}
            </div>
            {!isMobile && (
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, lineHeight: 1.2 }}>
                مركز تجهيز وتعبئة وشحن طلبات الأونلاين وإدارة المعروضات
              </div>
            )}
          </div>

          {/* Direct Home Button with Home Icon */}
          <Button
            type="primary"
            icon={<Home size={isMobile ? 13 : 15} style={{ marginLeft: 3 }} />}
            onClick={() => setActiveTab('hub')}
            style={{
              backgroundColor: activeTab === 'hub' ? '#9333ea' : 'rgba(255,255,255,0.12)',
              borderColor: activeTab === 'hub' ? '#9333ea' : 'rgba(255,255,255,0.25)',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: isMobile ? 11 : 12,
              height: isMobile ? 30 : 32,
              padding: isMobile ? '0 8px' : undefined
            }}
          >
            الرئيسية
          </Button>
        </div>

        {/* User Info & Supervisor Switch & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12 }}>
          {['admin', 'super_admin'].includes(currentUser?.role) && (
            <Button
              size="small"
              onClick={() => navigate('/dashboard')}
              style={{
                borderRadius: 6,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,255,255,0.12)',
                borderColor: 'rgba(255,255,255,0.25)',
                fontSize: isMobile ? 11 : 12,
                padding: isMobile ? '0 8px' : undefined
              }}
            >
              {isMobile ? 'الإدارة' : 'العودة للإدارة المركزية'}
            </Button>
          )}

          {/* Supervisor Status Indicator */}
          {isSupervisor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag
                color="gold"
                style={{
                  fontSize: isMobile ? 11 : 12,
                  padding: isMobile ? '2px 6px' : '4px 10px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 6,
                  margin: 0,
                  lineHeight: 'normal'
                }}
              >
                <Crown size={13} style={{ marginLeft: 3, color: '#d97706' }} />
                {!isMobile ? ' وضع المشرف مفعّل' : 'مشرف'}
              </Tag>
              {currentUser?.isElevated && (
                <Button
                  size="small"
                  danger
                  icon={<Lock size={12} style={{ marginLeft: isMobile ? 0 : 4 }} />}
                  onClick={handleLockToStaff}
                  style={{ borderRadius: 6, fontSize: 11, padding: isMobile ? '0 6px' : undefined }}
                >
                  {!isMobile && 'قفل المشرف'}
                </Button>
              )}
            </div>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<Crown size={13} style={{ marginLeft: isMobile ? 0 : 4 }} />}
              onClick={() => setUnlockModalVisible(true)}
              style={{
                backgroundColor: '#d97706',
                borderColor: '#d97706',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: isMobile ? 11 : 12,
                padding: isMobile ? '0 8px' : undefined
              }}
            >
              {isMobile ? 'مشرف' : 'دخول المشرف (Unlock)'}
            </Button>
          )}

          {/* User Profile (Desktop) */}
          {!isMobile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Avatar
                style={{ backgroundColor: '#9333ea', flexShrink: 0 }}
                icon={<Boxes size={18} />}
              />
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                  {currentUser?.fullName || currentUser?.username}
                </span>
                <span style={{ color: '#cbd5e1', fontSize: 10, lineHeight: 1.2, marginTop: 2 }}>
                  {isSupervisor ? 'مشرف مستودع وتجهيز' : 'مسؤول تجهيز وشحن أونلاين'}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <Button
            type="text"
            danger
            icon={<LogOut size={16} style={{ marginLeft: isMobile ? 0 : 4 }} />}
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#f87171',
              fontWeight: 500,
              padding: isMobile ? '4px 6px' : undefined
            }}
          >
            {!isMobile && 'خروج'}
          </Button>
        </div>
      </Header>

      {/* Mobile Drawer */}
      <Drawer
        title="قائمة مستودع الأونلاين"
        placement="right"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        width={Math.min(320, windowWidth)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* User info card */}
          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar style={{ backgroundColor: '#9333ea' }} icon={<Boxes size={20} />} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{currentUser?.fullName || currentUser?.username}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{isSupervisor ? 'مشرف مستودع وتجهيز' : 'مسؤول تجهيز وشحن أونلاين'}</div>
              <Tag color="cyan" style={{ marginTop: 4, fontSize: 10 }}>{currentUser?.branchCode || 'BR-ECOM'}</Tag>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>أقسام المستودع</div>
            <Button
              type={activeTab === 'hub' ? 'primary' : 'default'}
              block
              icon={<Home size={16} style={{ marginLeft: 6 }} />}
              onClick={() => { setActiveTab('hub'); setMobileDrawerVisible(false); }}
              style={{ textAlign: 'right', display: 'flex', alignItems: 'center' }}
            >
              الرئيسية (لوحة الخدمات)
            </Button>
            {navigationCards.map((c) => (
              <Button
                key={c.key}
                type={activeTab === c.key ? 'primary' : 'text'}
                block
                icon={React.cloneElement(c.icon, { size: 16, style: { marginLeft: 6 } })}
                onClick={() => { setActiveTab(c.key); setMobileDrawerVisible(false); }}
                style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}
              >
                <span>{c.title}</span>
                {c.badge && (
                  <Tag color={c.badgeColor} style={{ marginRight: 'auto', marginInlineEnd: 0, fontSize: 10 }}>
                    {c.badge}
                  </Tag>
                )}
              </Button>
            ))}
          </div>

          {/* Central Admin shortcut */}
          {['admin', 'super_admin'].includes(currentUser?.role) && (
            <Button
              block
              onClick={() => { navigate('/dashboard'); setMobileDrawerVisible(false); }}
              style={{ marginTop: 8 }}
            >
              العودة للإدارة المركزية
            </Button>
          )}

          {/* Logout */}
          <Button
            danger
            block
            icon={<LogOut size={16} style={{ marginLeft: 6 }} />}
            onClick={onLogout}
            style={{ marginTop: 8 }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </Drawer>

      {/* Main Workspace Content Area */}
      <Content style={{ padding: isMobile ? '14px 10px 32px' : '24px 24px 40px', minHeight: 'calc(100vh - 64px)' }}>
        {activeTab === 'hub' ? (
          <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 8 }}>
            {/* Hub Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: '0 0 8px 0', fontWeight: 800, color: '#0f172a' }}>
                لوحة خدمات وعمليات المتجر الإلكتروني
              </Title>
              <Text style={{ color: '#64748b', fontSize: 15 }}>
                اختر القسم المطلوب لإدارة الطلبات والشحنات، أسعار التوصيل، طرق الدفع، أو إعدادات المتجر
              </Text>
            </div>

            {/* In-page Center Cards Grid */}
            <Row gutter={[20, 20]}>
              {navigationCards.map((card) => (
                <Col xs={24} sm={12} md={8} lg={8} key={card.key}>
                  <Card
                    hoverable
                    onClick={() => setActiveTab(card.key)}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                      transition: 'all 0.25s ease',
                      height: '100%',
                      cursor: 'pointer',
                      background: '#fff',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    styles={{ body: { padding: '24px 22px' } }}
                  >
                    {/* Top Accent Strip */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        left: 0,
                        height: 4,
                        background: card.accentColor
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Icon Container */}
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: `${card.accentColor}15`,
                          border: `1px solid ${card.accentColor}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {React.cloneElement(card.icon, { size: 26, color: card.accentColor })}
                      </div>

                      {/* Card Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#0f172a',
                              lineHeight: 1.3
                            }}
                          >
                            {card.title}
                          </span>
                          {card.badge && (
                            <Tag
                              color={card.badgeColor}
                              style={{
                                margin: 0,
                                fontSize: 11,
                                borderRadius: 6,
                                padding: '1px 8px',
                                fontWeight: 600
                              }}
                            >
                              {card.badge}
                            </Tag>
                          )}
                        </div>

                        <div
                          style={{
                            color: '#64748b',
                            fontSize: 13,
                            lineHeight: 1.45,
                            marginBottom: 16
                          }}
                        >
                          {card.subtitle}
                        </div>

                        {/* Action link */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: card.accentColor,
                            fontWeight: 700,
                            fontSize: 13
                          }}
                        >
                          <span>دخول للقسم</span>
                          <span style={{ fontSize: 16 }}>←</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <div>
            {/* Top Back Navigation Bar */}
            <div
              style={{
                marginBottom: isMobile ? 14 : 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                background: '#fff',
                padding: isMobile ? '10px 12px' : '14px 20px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, flexWrap: 'wrap' }}>
                <Button
                  type="primary"
                  icon={<Home size={15} style={{ marginLeft: isMobile ? 2 : 6 }} />}
                  onClick={() => setActiveTab('hub')}
                  style={{
                    backgroundColor: '#0f172a',
                    borderColor: '#0f172a',
                    borderRadius: 8,
                    fontWeight: 700,
                    height: isMobile ? 34 : 38,
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: isMobile ? 12 : 13,
                    padding: isMobile ? '0 10px' : undefined
                  }}
                >
                  الرجوع للرئيسية
                </Button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentCard && (
                    <div
                      style={{
                        width: isMobile ? 30 : 36,
                        height: isMobile ? 30 : 36,
                        borderRadius: 8,
                        background: `${currentCard.accentColor}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {React.cloneElement(currentCard.icon, { size: isMobile ? 16 : 20, color: currentCard.accentColor })}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#0f172a' }}>
                        {currentCard?.title}
                      </Text>
                      {currentCard?.badge && (
                        <Tag color={currentCard.badgeColor} style={{ margin: 0, borderRadius: 4, fontSize: isMobile ? 10 : 12 }}>
                          {currentCard.badge}
                        </Tag>
                      )}
                    </div>
                    {!isMobile && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>
                        {currentCard?.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isMobile && (
                <div>
                  <Button
                    onClick={() => setActiveTab('hub')}
                    style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                  >
                    لوحة الأقسام (Hub)
                  </Button>
                </div>
              )}
            </div>

            {/* Page Section Content */}
            {['orders', 'rates', 'carriers', 'payments', 'store_settings', 'visitor_analytics'].includes(activeTab) && (
              <Orders
                currentUser={currentUser}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
                hideTabs={true}
                hideHeader={true}
              />
            )}
            {activeTab === 'inventory' && (
              <EcomInventory
                currentUser={currentUser}
                onNavigate={(tab) => {
                  if (tab === 'orders') setActiveTab('orders');
                  else if (tab === 'analytics') setActiveTab('visitor_analytics');
                }}
              />
            )}
          </div>
        )}
      </Content>

      {/* Supervisor Unlock Dialog */}
      <SupervisorUnlockModal
        open={unlockModalVisible}
        onCancel={() => setUnlockModalVisible(false)}
        onSuccess={(updatedUser) => {
          setUnlockModalVisible(false);
          if (onSupervisorUnlock) onSupervisorUnlock(updatedUser);
        }}
        currentUser={currentUser}
      />
    </Layout>
  );
}
