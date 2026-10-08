import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Typography,
  Space,
  App,
  Spin,
  Row,
  Col
} from 'antd';
import {
  BarChart3,
  Wallet,
  Boxes,
  Sliders,
  Lock,
  LogOut,
  ScanLine,
  Building,
  ArrowLeft,
  TrendingUp,
  Percent,
  ClipboardList,
  AlertTriangle,
  Power,
  Database,
  Sparkles
} from 'lucide-react';
import api from '../../api';
import yokaLogo from '../../assets/yokaStoreTransparent.png';
import ExitBackupModal from '../../components/ExitBackupModal';

const { Title, Text, Paragraph } = Typography;

export default function SupervisorDashboard({ currentUser, onSwitchToPos, onLogout }) {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const branchName = currentUser?.branch_name || currentUser?.branchName || 'الفرع الرئيسي';

  // Fast Navigation Handlers
  const handleReturnToPos = () => {
    if (onSwitchToPos) {
      onSwitchToPos();
    } else {
      navigate('/pos');
    }
  };

  const handleLockToCashier = async () => {
    try {
      const res = await api.post('/api/auth/switch-to-cashier');
      if (res.data.success) {
        const { accessToken, user } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        message.info(res.data.message || 'تم قفل وضع المشرف والعودة لوضع البائع بأمان');
        navigate('/pos', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في قفل وضع المشرف');
    }
  };

  // Quick Stats for Cards
  const [safeBalance, setSafeBalance] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [stockAlertsCount, setStockAlertsCount] = useState(0);
  const [exitBackupModalOpen, setExitBackupModalOpen] = useState(false);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const [safeRes, auditRes, shiftRes, alertRes] = await Promise.allSettled([
          api.get('/api/swm/treasury/branch-safe', { params: { branch_id: branchId } }),
          api.get('/api/swm/stock-audit', { params: { branch_id: branchId, limit: 1 } }),
          api.get('/api/swm/pos/shift/current'),
          api.get('/api/swm/products/stock-alerts', { params: { branch_id: branchId } })
        ]);

        if (safeRes.status === 'fulfilled' && safeRes.value.data.success) {
          setSafeBalance(parseFloat(safeRes.value.data.data?.safe?.cash_balance || 0));
        }
        if (auditRes.status === 'fulfilled' && auditRes.value.data.success) {
          setTotalItems(auditRes.value.data.data?.kpi?.totalItems || 0);
        }
        if (shiftRes.status === 'fulfilled' && shiftRes.value.data.success) {
          setTodaySales(parseFloat(shiftRes.value.data.data?.live_snapshot?.gross_sales?.total || 0));
        }
        if (alertRes.status === 'fulfilled' && alertRes.value.data.success) {
          setStockAlertsCount(alertRes.value.data.data?.summary?.total_alerts || 0);
        }
      } catch (e) {
        // non-blocking
      }
    };

    if (branchId) {
      fetchQuickStats();
    }
  }, [branchId]);

  // Primary Navigation Cards Configuration
  const navigationCards = [
    {
      id: 'sales-reports',
      title: 'بطاقة المبيعات الشاملة والتقارير',
      englishTitle: 'Comprehensive Sales & Analytics',
      path: '/supervisor/sales-reports',
      desc: 'تحليلات المبيعات وصافي الإيرادات، الرسوم البيانية التفاعلية، أداء البائعين، تدقيق المرتجعات، والمصروفات اليومية بنطاق زمني مخصص.',
      icon: <BarChart3 size={32} color="#4f46e5" />,
      gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
      accentColor: '#4f46e5',
      tag: 'تقارير ورسوم بيانية',
      metric: `${todaySales.toLocaleString()} ج.م`,
      metricLabel: 'مبيعات الوردية الحالية'
    },
    {
      id: 'treasury',
      title: 'بطاقة الخزنة وتوريد النقدية',
      englishTitle: 'Safe & Treasury Rollover',
      path: '/supervisor/treasury',
      desc: 'متابعة النقدية والفيزا والمحافظ المتراكمة تلقائياً من إغلاق الورديات اليومية، وتسليم النقدية للفرع الرئيسي وتصفير الخزينة.',
      icon: <Wallet size={32} color="#059669" />,
      gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      accentColor: '#059669',
      tag: 'تراكم يومي تلقائي',
      metric: `${safeBalance.toLocaleString()} ج.م`,
      metricLabel: 'النقدية المتراكمة بالخزينة'
    },
    {
      id: 'inventory',
      title: 'بطاقة المخزون والجرد الفعلي',
      englishTitle: 'Inventory & Stock-Take',
      path: '/supervisor/inventory',
      desc: 'قائمة أرصدة أصناف الفرع، إدخال الجرد الفعلي المباشر، وتوليد واعتماد سندات تسوية الكميات (Shortage/Surplus) وتحديث الأرصدة فورياً.',
      icon: <Boxes size={32} color="#0284c7" />,
      gradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      accentColor: '#0284c7',
      tag: 'جرد وتسوية فورية',
      metric: `${totalItems} صنف`,
      metricLabel: 'أصناف الفرع المسجلة'
    },
    {
      id: 'settings',
      title: 'بطاقة إعدادات وقواعد الفواتير',
      englishTitle: 'Invoice Rules & Permissions',
      path: '/supervisor/settings',
      desc: 'تحديد سقف الخصم المسموح للبائعين، صلاحيات فواتير المرتجع، واشتراط بيانات العملاء وتطبيقها لحظياً على شاشات البيع (POS).',
      icon: <Sliders size={32} color="#d97706" />,
      gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      accentColor: '#d97706',
      tag: 'صلاحيات كاشير الفرع',
      metric: 'مطبق لحظياً',
      metricLabel: 'حالة الرقابة على الكاشير'
    },
    {
      id: 'stock-alerts',
      title: 'بطاقة تنبيهات ونواقص المخزون',
      englishTitle: 'Stock Alerts & Warnings',
      path: '/alerts',
      desc: 'متابعة لحظية للأصناف التي نفدت من المخزن بالكامل (0 قطع) والأصناف التي أوشكت على النفاد (قطعة أو قطعتين فقط بالفرع).',
      icon: <AlertTriangle size={32} color="#dc2626" />,
      gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
      accentColor: '#dc2626',
      tag: 'نواقص وكميات حرجة',
      metric: `${stockAlertsCount} صنف حرج`,
      metricLabel: 'أصناف تتطلب التوريد'
    },
    {
      id: 'exit-backup',
      title: 'بطاقة خروج ونسخ احتياطي',
      englishTitle: 'Exit & System Backup',
      action: () => setExitBackupModalOpen(true),
      desc: 'إجراء تفريغ ونسخ احتياطي فوري وشامل لقاعدة بيانات المتجر والنظام (SQL Dump)، ثم إنهاء الجلسة وإغلاق نافذة النظام بأمان.',
      icon: <Power size={32} color="#475569" />,
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      accentColor: '#475569',
      tag: 'أمان وإغلاق النظام',
      metric: 'نسخ وخروج',
      metricLabel: 'إغلاق شفت العمل'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* ─── 1. TOP HEADER & NAVIGATION BAR ───────────────────────────── */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Left: Branding & Branch Scoping */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={yokaLogo}
            alt="Yoka Store"
            style={{
              height: 38,
              objectFit: 'contain'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                لوحة تحكم مشرف الفرع
              </span>
              <Tag
                color="indigo"
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  borderRadius: 6,
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Building size={12} />
                {branchName} (ID: {branchId})
              </Tag>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Yoka Enterprise SWM - إدارة الفروع الذكية
            </span>
          </div>
        </div>

        {/* Right: Operational Actions & Session Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick Return to POS Terminal */}
          <Space size="small">
            <Button
              type="primary"
              icon={<ScanLine size={16} style={{ marginLeft: 6 }} />}
              onClick={handleReturnToPos}
              style={{
                backgroundColor: '#059669',
                borderColor: '#059669',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                height: 38,
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              العودة للكاشير (POS)
            </Button>

            <Button
              danger
              icon={<Lock size={15} style={{ marginLeft: 6 }} />}
              onClick={handleLockToCashier}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                height: 38,
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="قفل وضع المشرف والعودة لحساب كاشير آمن"
            >
              قفل المشرف (عودة للبائع)
            </Button>
          </Space>

          {/* Supervisor Identity Profile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: 8
            }}
          >
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>
                {currentUser?.fullName || currentUser?.username}
              </span>
              <span style={{ fontSize: 10, color: '#64748b' }}>مشرف الفرع المعتمد</span>
            </div>
          </div>

          {/* Logout */}
          <Button
            type="text"
            danger
            icon={<LogOut size={16} />}
            onClick={onLogout}
            title="تسجيل الخروج النهائي"
            style={{ padding: '4px 8px' }}
          >
            خروج
          </Button>
        </div>
      </header>

      {/* ─── 2. MAIN WORKSPACE: THE 4 NAVIGATION CARDS ONLY ─────────────── */}
      <main
        style={{
          flex: 1,
          padding: '32px 28px 48px',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Welcome Hub Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            color: '#ffffff',
            borderRadius: 16,
            padding: '24px 32px',
            marginBottom: 32,
            boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                مرحباً بك، {currentUser?.fullName || currentUser?.username} <Sparkles size={20} style={{ color: '#F59E0B' }} />
              </span>
              <Tag color="cyan" style={{ fontWeight: 700, fontSize: 12, borderRadius: 6 }}>
                لوحة بطاقات المشرف
              </Tag>
            </div>
            <Paragraph style={{ color: '#c7d2fe', fontSize: 14, margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
              اختر أحد الأقسام أدناه للانتقال إلى الصفحة المخصصة لإدارة مبيعات وتقارير الفرع، تسليم نقدية الخزينة للفرع الرئيسي، الجرد الفعلي للمخزون، أو ضبط صلاحيات الكاشير.
            </Paragraph>
          </div>
        </div>

        {/* ─── THE 6 CLICKABLE NAVIGATION CARDS GRID (Unified Grid) ─── */}
        <div className="unified-dashboard-grid">
          {navigationCards.map((card) => (
            <div
              key={card.id}
              className="unified-nav-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (card.action) {
                  card.action();
                } else if (card.path) {
                  navigate(card.path);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (card.action) {
                    card.action();
                  } else if (card.path) {
                    navigate(card.path);
                  }
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = card.accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Top Accent Strip */}
              <div
                className="unified-nav-card-accent"
                style={{
                  background: card.accentColor
                }}
              />

              {/* Card Header with Icon, Tag, and Main Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      background: card.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}
                  >
                    {card.icon}
                  </div>
                  <Tag
                    style={{
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '4px 10px',
                      color: card.accentColor,
                      background: card.gradient,
                      borderColor: 'transparent'
                    }}
                  >
                    {card.tag}
                  </Tag>
                </div>

                {/* Title & Subtitle */}
                <div style={{ marginBottom: 10 }}>
                  <Title level={3} style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 19, color: '#0f172a' }}>
                    {card.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                    {card.englishTitle}
                  </Text>
                </div>

                {/* Description */}
                <Paragraph style={{ color: '#475569', fontSize: 13.5, lineHeight: 1.6, minHeight: 46, marginBottom: 20 }}>
                  {card.desc}
                </Paragraph>
              </div>

              {/* Bottom Footer: Metric Badge & Action Link */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>{card.metricLabel}</span>
                  <strong style={{ fontSize: 16, color: '#0f172a', fontWeight: 800 }}>{card.metric}</strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: card.accentColor,
                    fontWeight: 800,
                    fontSize: 13
                  }}
                >
                  <span>{card.action ? 'بدء الإجراء' : 'فتح القسم'}</span>
                  <ArrowLeft size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Exit & Backup Modal */}
      <ExitBackupModal
        open={exitBackupModalOpen}
        onCancel={() => setExitBackupModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
