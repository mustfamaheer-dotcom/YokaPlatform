import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, Typography } from 'antd';
import {
  ShoppingCart,
  ScanLine,
  Receipt,
  Wallet,
  MapPin,
  LogOut,
  Crown,
  ArrowRight,
  Home as HomeIcon,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  Power,
  Database,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import POS from '../POS';
import ExpensesSelection from '../ExpensesSelection';
import Expenses from '../Expenses';
import DailyShift from '../DailyShift';
import SupervisorUnlockModal from '../../components/SupervisorUnlockModal';
import ExitBackupModal from '../../components/ExitBackupModal';
import api from '../../api';
import yokaLogo from '../../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;

export default function SellerApp({ currentUser, onSwitchToAdmin, onLogout, onSupervisorUnlock }) {
  const navigate = useNavigate();
  // Navigation within Seller POS app: 'dashboard' | 'terminal' | 'expenses_selection' | 'expenses' | 'shift'
  const [sellerTab, setSellerTab] = useState('dashboard');
  const [tabExtra, setTabExtra] = useState(null);
  const [posMode, setPosMode] = useState('sale'); // 'sale' | 'return'

  // Elevated User & Supervisor Unlock Modal State
  const [activeUser, setActiveUser] = useState(currentUser);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [exitBackupModalOpen, setExitBackupModalOpen] = useState(false);
  const [stockAlertsCount, setStockAlertsCount] = useState(0);

  useEffect(() => {
    setActiveUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const fetchAlertsCount = async () => {
      try {
        const branchId = currentUser?.branch_id || currentUser?.branchId;
        const res = await api.get('/api/swm/products/stock-alerts', { params: { branch_id: branchId } });
        if (res.data.success) {
          setStockAlertsCount(res.data.data?.summary?.total_alerts || 0);
        }
      } catch (e) {
        // non-blocking
      }
    };
    fetchAlertsCount();
  }, [currentUser]);

  const isSupervisor = Boolean(
    activeUser && (
      activeUser.role === 'supervisor' ||
      ['super_admin', 'admin'].includes(activeUser.role) ||
      activeUser.isSupervisor === true
    )
  );

  const branchName = activeUser?.branchName || activeUser?.branch_name || currentUser?.branchName || 'الفرع الرئيسي';

  const handleSupervisorSuccess = (elevatedUser) => {
    setActiveUser(elevatedUser);
    setSupervisorModalOpen(false);
    if (onSupervisorUnlock) {
      onSupervisorUnlock(elevatedUser);
    }
  };

  // Keyboard shortcut listener: F11 on the home dashboard opens New Sale immediately
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (sellerTab === 'dashboard' && e.key === 'F11') {
        e.preventDefault();
        handleOpenSaleInvoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sellerTab]);

  // Navigation handlers
  const handleOpenSaleInvoice = () => {
    setPosMode('sale');
    setTabExtra({ mode: 'sale' });
    setSellerTab('terminal');
  };

  const handleOpenSalesReturn = () => {
    setPosMode('return');
    setTabExtra({ mode: 'return' });
    setSellerTab('terminal');
  };

  const handleNavigateSeller = (tab, extra = null) => {
    setSellerTab(tab);
    setTabExtra(extra);
  };

  // Standardized 6 Navigation Cards for Cashier Portal
  const sellerCards = [
    {
      id: 'sales',
      title: 'المبيعات الفورية (POS)',
      englishTitle: 'Fast Sales Terminal & Barcode',
      action: handleOpenSaleInvoice,
      desc: 'فتح شاشة البيع المباشر وإصدار الفواتير وتسجيل الباركود ومحاسبة العملاء فورياً مع دعم كامل لماسح الباركود.',
      icon: <ShoppingCart size={32} color="#059669" />,
      gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      accentColor: '#059669',
      tag: 'اختصار F11',
      metric: 'إصدار فواتير بيع',
      metricLabel: 'نقطة البيع السريعة'
    },
    {
      id: 'shift',
      title: 'يومية الوردية وتقفيل الشفت',
      englishTitle: 'Daily Shift & Cash Register',
      action: () => setSellerTab('shift'),
      desc: 'مطابقة مبيعات الكاش والفيزا والتحويلات، جرد النقدية، وإجراء تقفيل وتسليم الوردية اليومية للفرع.',
      icon: <Receipt size={32} color="#4f46e5" />,
      gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
      accentColor: '#4f46e5',
      tag: 'تقفيل وتسليم',
      metric: 'جرد وتقفيل الوردية',
      metricLabel: 'حالة درج النقدية'
    },
    {
      id: 'expenses',
      title: 'مصروفات الفرع وسندات الصرف',
      englishTitle: 'Branch Expenses & Vouchers',
      action: () => setSellerTab('expenses_selection'),
      desc: 'إدارة المصروفات التشغيلية اليومية، تسجيل سند صرف جديد أو استرداد مبالغ مصروفات الفرع المعتمدة.',
      icon: <Wallet size={32} color="#d97706" />,
      gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      accentColor: '#d97706',
      tag: 'سندات معتمدة',
      metric: 'سند صرف جديد',
      metricLabel: 'مصروفات تشغيلية'
    },
    {
      id: 'stock-alerts',
      title: 'تنبيهات ونواقص المخزون',
      englishTitle: 'Stock Alerts & Warnings',
      action: () => navigate('/alerts'),
      desc: 'متابعة لحظية للأصناف التي نفدت من المخزن بالكامل (0 قطع) أو أوشكت على النفاد (قطعة أو قطعتين).',
      icon: <AlertTriangle size={32} color="#dc2626" />,
      gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
      accentColor: '#dc2626',
      tag: stockAlertsCount > 0 ? `${stockAlertsCount} صنف حرج` : 'المخزون مستقر',
      metric: stockAlertsCount > 0 ? `${stockAlertsCount} صنف حرج` : 'مستقر',
      metricLabel: 'أصناف تتطلب التوريد'
    },
    {
      id: 'exit-backup',
      title: 'خروج ونسخ احتياطي فوري',
      englishTitle: 'Exit & System Backup',
      action: () => setExitBackupModalOpen(true),
      desc: 'إجراء تفريغ ونسخ احتياطي فوري لقاعدة بيانات المتجر والنظام (SQL Dump)، ثم تسجيل الخروج بأمان.',
      icon: <Power size={32} color="#475569" />,
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      accentColor: '#475569',
      tag: 'حفظ وتأمين',
      metric: 'نسخ وخروج',
      metricLabel: 'إنهاء الوردية بأمان'
    }
  ];

  // Seller Operational Navigation Cards (No reports in POS)
  const visibleSellerCards = sellerCards;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header: Simply displays the store name and the current logged-in branch */}
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {/* Right side: Store Name & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={yokaLogo} alt="Yoka Store" style={{ height: 34, objectFit: 'contain' }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
              يوكا ستور (Yoka Store)
            </span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              نظام نقاط البيع السحابي
            </span>
          </div>
        </div>

        {/* Left side: Current Logged-in Branch, Supervisor Toggle, and Cashier Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Current Logged-in Branch */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '6px 14px',
              borderRadius: 8
            }}
          >
            <MapPin size={15} color="#0284c7" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              الفرع: {branchName}
            </span>
          </div>

          {/* Reinstate Supervisor Unlock Button & Status Indicator */}
          {isSupervisor ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Tag
                color="gold"
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #fcd34d',
                  background: '#fffbeb',
                  color: '#b45309',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <Crown size={14} color="#d97706" />
                <span>وضع المشرف مفعّل</span>
              </Tag>

              {onSwitchToAdmin && (
                <Button
                  size="small"
                  type="primary"
                  icon={<Crown size={12} style={{ marginLeft: 4 }} />}
                  onClick={onSwitchToAdmin}
                  style={{
                    backgroundColor: '#4f46e5',
                    borderColor: '#4f46e5',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    height: 32
                  }}
                >
                  لوحة الإدارة
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={() => setSupervisorModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #f59e0b',
                color: '#b45309',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                height: 34,
                padding: '0 14px',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fef3c7';
                e.currentTarget.style.borderColor = '#d97706';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.28)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(245, 158, 11, 0.15)';
              }}
              title="دخول المشرف لفك قيود البائع وتفعيل الصلاحيات الإشرافية"
            >
              <Lock size={15} color="#d97706" />
              <span>دخول المشرف (Unlock)</span>
            </Button>
          )}

          {/* User info and Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              {currentUser?.fullName || currentUser?.username}
            </span>
            <Button
              type="text"
              danger
              icon={<LogOut size={16} />}
              onClick={onLogout}
              title="تسجيل الخروج"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 6px' }}
            />
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main style={{ flex: 1, padding: '16px 20px 32px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* VIEW A: Pure Navigation Hub (Centralized Grid containing 6 Large Clickable Navigation Cards) */}
        {sellerTab === 'dashboard' && (
          <div
            style={{
              padding: '16px 12px 36px',
              maxWidth: 1280,
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Welcome Hub Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0B0F17 0%, #151D2A 50%, #0B0F17 100%)',
                color: '#DFCA95',
                borderRadius: 16,
                padding: '24px 32px',
                marginBottom: 28,
                border: '1.5px solid rgba(200, 164, 92, 0.4)',
                boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.5), 0 0 25px rgba(200, 164, 92, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#DFCA95' }}>
                    مرحباً بك، {currentUser?.fullName || currentUser?.username} 👋
                  </span>
                  <Tag style={{ fontWeight: 700, fontSize: 12, borderRadius: 6, backgroundColor: 'rgba(200, 164, 92, 0.15)', borderColor: '#C8A45C', color: '#DFCA95' }}>
                    بوابة الكاشير والمبيعات السريعة
                  </Tag>
                </div>
                <Paragraph style={{ color: '#E2D4B7', fontSize: 14, margin: 0, maxWidth: 850, lineHeight: 1.6 }}>
                  الفرع الحالي: <strong style={{ color: '#F3E8C8' }}>{branchName}</strong> • اختر أحد الأقسام أدناه لبدء عملية بيع فورية، تقفيل وتسليم الوردية، تسجيل المصروفات، أو مراجعة نواقص المخزون.
                </Paragraph>
              </div>
            </div>

            {/* Centralized Grid of Operational Navigation Cards */}
            <div className="unified-dashboard-grid">
              {visibleSellerCards.map((card) => (
                <div
                  key={card.id}
                  className="unified-nav-card"
                  onClick={card.action}
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
                      <strong style={{ fontSize: 15, color: '#0f172a', fontWeight: 800 }}>{card.metric}</strong>
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
                      <span>بدء الإجراء</span>
                      <ArrowLeft size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW B: Fast Transactional POS Terminal (Keyboard-driven F11/F1/F4) */}
        {sellerTab === 'terminal' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <Button
                icon={<HomeIcon size={16} style={{ marginLeft: 6 }} />}
                onClick={() => setSellerTab('dashboard')}
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                العودة للوحة الرئيسية
              </Button>
            </div>
            <POS
              currentUser={activeUser}
              initialInvoiceType={posMode}
              tabExtra={tabExtra}
              onNavigate={handleNavigateSeller}
            />
          </div>
        )}

        {/* VIEW C: Expenses Selection (New Expense vs Returned Expense cards) */}
        {sellerTab === 'expenses_selection' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <Button
                icon={<HomeIcon size={16} style={{ marginLeft: 6 }} />}
                onClick={() => setSellerTab('dashboard')}
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                العودة للوحة الرئيسية
              </Button>
            </div>
            <ExpensesSelection
              currentUser={activeUser}
              onNavigate={handleNavigateSeller}
            />
          </div>
        )}

        {/* VIEW D: Expenses Management / Records */}
        {sellerTab === 'expenses' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <Button
                icon={<HomeIcon size={16} style={{ marginLeft: 6 }} />}
                onClick={() => setSellerTab('dashboard')}
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                العودة للوحة الرئيسية
              </Button>
            </div>
            <Expenses
              currentUser={activeUser}
              onNavigate={handleNavigateSeller}
              tabExtra={tabExtra}
              onResetTabExtra={() => setTabExtra(null)}
            />
          </div>
        )}

        {/* VIEW E: Daily Shift Report */}
        {sellerTab === 'shift' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <Button
                icon={<HomeIcon size={16} style={{ marginLeft: 6 }} />}
                onClick={() => setSellerTab('dashboard')}
                style={{ borderRadius: 8, fontWeight: 700 }}
              >
                العودة للوحة الرئيسية
              </Button>
            </div>
            <DailyShift
              currentUser={activeUser}
              onNavigate={handleNavigateSeller}
            />
          </div>
        )}
      </main>

      {/* Supervisor Authentication Modal for In-Place Restriction Override */}
      <SupervisorUnlockModal
        open={supervisorModalOpen}
        onCancel={() => setSupervisorModalOpen(false)}
        onSuccess={handleSupervisorSuccess}
        currentUser={activeUser}
      />

      {/* Exit & Backup Modal */}
      <ExitBackupModal
        open={exitBackupModalOpen}
        onCancel={() => setExitBackupModalOpen(false)}
        currentUser={activeUser}
      />
    </div>
  );
}
