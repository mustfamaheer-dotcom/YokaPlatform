import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Tag,
  Space,
  Button,
  Progress,
  Radio,
  Spin,
  Tooltip
} from 'antd';
import {
  LayoutDashboard,
  TrendingUp,
  Store,
  Users,
  Boxes,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  ShieldCheck,
  Calendar,
  Layers,
  Truck,
  FileSpreadsheet,
  ShoppingBag,
  ScanLine,
  Receipt,
  BookOpenCheck,
  CheckCircle2,
  Database,
  Server,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;

export default function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [dateMode, setDateMode] = useState('today'); // 'today' | '7days' | '30days' | 'all'

  // Financial & Operational Data
  const [kpi, setKpi] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netCashflow: 0,
    invoicesCount: 0,
    totalItemsSold: 0
  });

  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cash: 0,
    card: 0,
    transfer: 0
  });

  const [branchesComparison, setBranchesComparison] = useState([]);

  const [stats, setStats] = useState({
    productsCount: 0,
    branchesCount: 0,
    usersCount: 0,
    pendingOrdersCount: 0
  });

  const [systemHealth, setSystemHealth] = useState(null);

  const fetchDashboardData = async (mode = dateMode) => {
    setLoading(true);
    try {
      let startDateStr = null;
      let endDateStr = null;

      const today = dayjs().format('YYYY-MM-DD');

      if (mode === 'today') {
        startDateStr = today;
        endDateStr = today;
      } else if (mode === '7days') {
        startDateStr = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
        endDateStr = today;
      } else if (mode === '30days') {
        startDateStr = dayjs().subtract(29, 'day').format('YYYY-MM-DD');
        endDateStr = today;
      } else {
        // 'all' time - no date filter bounds
        startDateStr = undefined;
        endDateStr = undefined;
      }

      const params = {};
      if (startDateStr && endDateStr) {
        params.start_date = startDateStr;
        params.end_date = endDateStr;
      }

      const [dailyRes, prodRes, branchRes, userRes, orderRes, healthRes] = await Promise.allSettled([
        api.get('/api/swm/branches-daily', { params }),
        api.get('/api/swm/products?limit=1'),
        api.get('/api/swm/branches'),
        api.get('/api/swm/users?limit=1'),
        api.get('/api/swm/orders?limit=1&status=pending'),
        api.get('/health')
      ]);

      // Daily Financials & Branches Comparison
      if (dailyRes.status === 'fulfilled' && dailyRes.value.data?.success) {
        const d = dailyRes.value.data.data;
        setKpi({
          totalInflow: d.kpi?.totalInflow || 0,
          totalOutflow: d.kpi?.totalOutflow || 0,
          netCashflow: d.kpi?.netCashflow || 0,
          invoicesCount: d.kpi?.invoicesCount || 0,
          totalItemsSold: d.kpi?.totalItemsSold || 0
        });
        setPaymentBreakdown({
          cash: d.paymentMethods?.cash?.amount || 0,
          card: d.paymentMethods?.card?.amount || 0,
          transfer: d.paymentMethods?.transfer?.amount || 0
        });
        setBranchesComparison(d.branchComparison || []);
      }

      // Catalog & Operational Stats
      const productsCount = prodRes.status === 'fulfilled' ? prodRes.value.data?.meta?.total || prodRes.value.data?.data?.length || 0 : 0;
      const branchesCount = branchRes.status === 'fulfilled' ? branchRes.value.data?.data?.length || 0 : 0;
      const usersCount = userRes.status === 'fulfilled' ? userRes.value.data?.meta?.total || userRes.value.data?.data?.length || 0 : 0;
      const pendingOrdersCount = orderRes.status === 'fulfilled' ? orderRes.value.data?.meta?.total || 0 : 0;
      const health = healthRes.status === 'fulfilled' ? healthRes.value.data : null;

      setStats({
        productsCount,
        branchesCount,
        usersCount,
        pendingOrdersCount
      });
      setSystemHealth(health);
    } catch (e) {
      console.error('Executive Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(dateMode);
  }, [dateMode]);

  // Payment totals & percentages
  const totalPaymentSum = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.transfer;
  const cashPct = totalPaymentSum > 0 ? Math.round((paymentBreakdown.cash / totalPaymentSum) * 100) : 0;
  const cardPct = totalPaymentSum > 0 ? Math.round((paymentBreakdown.card / totalPaymentSum) * 100) : 0;
  const transferPct = totalPaymentSum > 0 ? Math.round((paymentBreakdown.transfer / totalPaymentSum) * 100) : 0;

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 1. Header & Period Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutDashboard size={20} color="#4f46e5" />
            <Title level={4} style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(16px, 4vw, 20px)' }}>
              لوحة المتابعة التنفيذية والإدارية
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            مراقبة الأداء المالي، مبيعات الفروع، وحالة المخزون المركزي لحظة بلحظة
          </Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: 'auto' }}>
          <Radio.Group
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            buttonStyle="solid"
            size="middle"
            style={{ display: 'flex' }}
          >
            <Radio.Button value="today" style={{ fontSize: 13, padding: '0 12px' }}>اليوم</Radio.Button>
            <Radio.Button value="7days" style={{ fontSize: 13, padding: '0 12px' }}>7 أيام</Radio.Button>
            <Radio.Button value="30days" style={{ fontSize: 13, padding: '0 12px' }}>30 يوم</Radio.Button>
            <Radio.Button value="all" style={{ fontSize: 13, padding: '0 12px' }}>الكل</Radio.Button>
          </Radio.Group>

          <Button
            icon={<RefreshCw size={15} style={{ marginLeft: 4 }} />}
            onClick={() => fetchDashboardData(dateMode)}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            تحديث
          </Button>
        </div>
      </div>

      {/* ─── FEATURED MODULE CARD: COMPREHENSIVE BRANCH SALES & REPORTS (لوحة مبيعات وتقارير الفروع الشاملة) ─── */}
      <div
        className="unified-nav-card"
        role="button"
        tabIndex={0}
        onClick={() => onNavigate('sales_reports')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate('sales_reports');
          }
        }}
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 18,
          minHeight: 'auto',
          height: 'auto',
          cursor: 'pointer',
          boxShadow: '0 8px 24px -4px rgba(49, 46, 129, 0.28)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          border: '1.5px solid #4338ca',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <BarChart3 size={28} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                بطاقة تقارير ومبيعات الفرع الشاملة والتحليلات (Comprehensive Sales & Reports)
              </span>
              <Tag color="cyan" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6, margin: 0 }}>
                لوحة المدير حصرياً
              </Tag>
            </div>
            <Paragraph style={{ color: '#c7d2fe', fontSize: 13, margin: 0, maxWidth: 660, lineHeight: 1.5 }}>
              تحليلات المبيعات وصافي الإيرادات، الرسوم البيانية التفاعلية (Recharts)، أداء البائعين، تدقيق المرتجعات، ودفتر المصروفات بنطاق زمني مخصص.
            </Paragraph>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: '#93c5fd', display: 'block' }}>إجمالي المبيعات المحققة</span>
            <strong style={{ fontSize: 17, color: '#ffffff', fontWeight: 800 }}>
              {kpi.totalInflow.toLocaleString('ar-EG')} ج.م
            </strong>
          </div>
          <Button
            type="primary"
            icon={<ArrowLeft size={16} />}
            style={{
              backgroundColor: '#38bdf8',
              borderColor: '#38bdf8',
              color: '#0f172a',
              borderRadius: 10,
              fontWeight: 800,
              height: 42,
              padding: '0 18px',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)'
            }}
          >
            فتح التقارير والرسوم
          </Button>
        </div>
      </div>

      {/* 2. Top Financial KPIs - 2 columns on mobile, 4 on desktop */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {/* Card 1: Sales / Inflow */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            onClick={() => onNavigate('branches_daily')}
            style={{
              borderRadius: 14,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
              height: '100%',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ color: '#047857', fontSize: 13 }}>
                📥 إجمالي المبيعات
              </Text>
              <ArrowUpRight size={16} color="#059669" />
            </div>
            <div style={{ color: '#065f46', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800 }}>
              {kpi.totalInflow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              <span style={{ fontSize: 12, fontWeight: 500, marginRight: 4 }}>ج.م</span>
            </div>
            <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
              {dateMode === 'today' ? 'مبيعات اليوم المحصلة' : 'إجمالي المبيعات بالفترة'}
            </div>
          </Card>
        </Col>

        {/* Card 2: Invoices Count */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            onClick={() => onNavigate('branches_daily')}
            style={{
              borderRadius: 14,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              cursor: 'pointer',
              height: '100%',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.08)'
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ color: '#1d4ed8', fontSize: 13 }}>
                🧾 فواتير العمليات
              </Text>
              <FileSpreadsheet size={16} color="#2563eb" />
            </div>
            <div style={{ color: '#1e40af', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800 }}>
              {kpi.invoicesCount.toLocaleString('ar-EG')}
              <span style={{ fontSize: 12, fontWeight: 500, marginRight: 4 }}>فاتورة</span>
            </div>
            <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4 }}>
              {kpi.totalItemsSold.toLocaleString('ar-EG')} قطعة مباعة
            </div>
          </Card>
        </Col>

        {/* Card 3: Net Cashflow */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 14,
              backgroundColor: kpi.netCashflow >= 0 ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${kpi.netCashflow >= 0 ? '#bbf7d0' : '#fecdd3'}`,
              height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ color: kpi.netCashflow >= 0 ? '#15803d' : '#be123c', fontSize: 13 }}>
                💎 صافي التدفق
              </Text>
              <Wallet size={16} color={kpi.netCashflow >= 0 ? '#16a34a' : '#e11d48'} />
            </div>
            <div style={{ color: kpi.netCashflow >= 0 ? '#14532d' : '#9f1239', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800 }}>
              {kpi.netCashflow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              <span style={{ fontSize: 12, fontWeight: 500, marginRight: 4 }}>ج.م</span>
            </div>
            <div style={{ fontSize: 11, color: kpi.netCashflow >= 0 ? '#15803d' : '#be123c', marginTop: 4 }}>
              الوارد مطروحاً منه المصروفات
            </div>
          </Card>
        </Col>

        {/* Card 4: Expenses / Outflow */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            onClick={() => onNavigate('treasury_admin')}
            style={{
              borderRadius: 14,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              cursor: 'pointer',
              height: '100%',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
            }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text strong style={{ color: '#b91c1c', fontSize: 13 }}>
                📤 المصروفات
              </Text>
              <ArrowDownRight size={16} color="#dc2626" />
            </div>
            <div style={{ color: '#991b1b', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: 800 }}>
              {kpi.totalOutflow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              <span style={{ fontSize: 12, fontWeight: 500, marginRight: 4 }}>ج.م</span>
            </div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
              سندات صرف ومصروفات تشغيلية
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Operational Pulse Strip (Catalog, Branches, Online Orders, Staff) */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <div
            className="stat-metric-card"
            onClick={() => onNavigate('products')}
            style={{ cursor: 'pointer', height: '100%' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              <Boxes size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>كتالوج المخزون</Text>
              <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: '#1e1b4b' }}>
                {stats.productsCount.toLocaleString('ar-EG')} <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>صنف</span>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div
            className="stat-metric-card"
            onClick={() => onNavigate('branches')}
            style={{ cursor: 'pointer', height: '100%' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
              <Store size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>الفروع والمستودعات</Text>
              <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: '#064e3b' }}>
                {stats.branchesCount.toLocaleString('ar-EG')} <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>فرع</span>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div
            className="stat-metric-card"
            onClick={() => onNavigate('orders')}
            style={{ cursor: 'pointer', height: '100%' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <ShoppingBag size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>طلبات أونلاين معلقة</Text>
              <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: '#5b21b6' }}>
                {stats.pendingOrdersCount.toLocaleString('ar-EG')} <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>طلب</span>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div
            className="stat-metric-card"
            onClick={() => onNavigate('users')}
            style={{ cursor: 'pointer', height: '100%' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Users size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>الموظفين والمستخدمين</Text>
              <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 700, color: '#78350f' }}>
                {stats.usersCount.toLocaleString('ar-EG')} <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>مستخدم</span>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 4. Middle Section: Branch Performance + Payment Channels Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Branch Sales Performance */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <Store size={18} color="#059669" />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>أداء ومبيعات الفروع المباشر</span>
                </Space>
                <Button
                  type="link"
                  size="small"
                  onClick={() => onNavigate('branches_daily')}
                  style={{ fontWeight: 600, color: '#4f46e5', padding: 0 }}
                >
                  عرض اليومية المفصلة ⬅
                </Button>
              </div>
            }
            variant="borderless"
            style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            {branchesComparison.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                <Store size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>لا توجد مبيعات مسجلة في هذا النطاق الزمني</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {branchesComparison.map((b) => {
                  const sharePct = kpi.totalInflow > 0 ? Math.min(100, Math.round((b.total_inflow / kpi.totalInflow) * 100)) : 0;
                  return (
                    <div
                      key={b.branch_id}
                      style={{
                        background: '#f8fafc',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                        <Space size={6}>
                          <Tag color="purple" style={{ fontWeight: 600, margin: 0 }}>
                            {b.branch_name}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>({b.branch_code})</Text>
                        </Space>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                            {Number(b.total_inflow || 0).toLocaleString()} ج.م
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', marginRight: 6 }}>
                            ({sharePct}%)
                          </span>
                        </div>
                      </div>

                      <Progress
                        percent={sharePct}
                        strokeColor="#4f46e5"
                        showInfo={false}
                        size="small"
                        style={{ margin: '4px 0 6px' }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                        <span>عدد الفواتير: <strong>{b.invoices_count || 0}</strong></span>
                        <span>القطع المباعة: <strong>{b.items_sold || 0}</strong></span>
                        <span>صافي الفرع: <strong style={{ color: b.net_balance >= 0 ? '#059669' : '#dc2626' }}>{Number(b.net_balance || 0).toLocaleString()} ج.م</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Payment Channels Distribution */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <CreditCard size={18} color="#2563eb" />
                <span style={{ fontWeight: 700, fontSize: 15 }}>توزيع قنوات السداد والتحصيل</span>
              </Space>
            }
            variant="borderless"
            style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Cash */}
              <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space size={6}>
                    <Wallet size={16} color="#16a34a" />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>💵 نقداً (كاش)</span>
                  </Space>
                  <div>
                    <strong style={{ color: '#14532d', fontSize: 14 }}>{paymentBreakdown.cash.toLocaleString()} ج.م</strong>{' '}
                    <span style={{ color: '#15803d', fontSize: 11 }}>({cashPct}%)</span>
                  </div>
                </div>
                <Progress percent={cashPct} strokeColor="#16a34a" showInfo={false} size="small" />
              </div>

              {/* Visa / Card */}
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space size={6}>
                    <CreditCard size={16} color="#2563eb" />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1e40af' }}>💳 بطاقات بنكية (فيزا / ماستر)</span>
                  </Space>
                  <div>
                    <strong style={{ color: '#1e3a8a', fontSize: 14 }}>{paymentBreakdown.card.toLocaleString()} ج.م</strong>{' '}
                    <span style={{ color: '#2563eb', fontSize: 11 }}>({cardPct}%)</span>
                  </div>
                </div>
                <Progress percent={cardPct} strokeColor="#2563eb" showInfo={false} size="small" />
              </div>

              {/* Transfers / InstaPay */}
              <div style={{ background: '#fdf4ff', padding: '12px 14px', borderRadius: 10, border: '1px solid #f5d0fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Space size={6}>
                    <TrendingUp size={16} color="#a21caf" />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#86198f' }}>📱 إنستاباي ومحافظ إلكترونية</span>
                  </Space>
                  <div>
                    <strong style={{ color: '#701a75', fontSize: 14 }}>{paymentBreakdown.transfer.toLocaleString()} ج.م</strong>{' '}
                    <span style={{ color: '#a21caf', fontSize: 11 }}>({transferPct}%)</span>
                  </div>
                </div>
                <Progress percent={transferPct} strokeColor="#c026d3" showInfo={false} size="small" />
              </div>

              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', paddingTop: 4 }}>
                إجمالي المبالغ المسددة: <strong>{totalPaymentSum.toLocaleString()} ج.م</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 5. Quick Administrative Navigation - Direct Action Buttons for Mobile */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 18, background: '#4f46e5', borderRadius: 2 }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>بوابات التحكم والعمليات السريعة</span>
          </div>
        }
        variant="borderless"
        style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 16 }}
        styles={{ body: { padding: '16px' } }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('sales_reports')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #c7d2fe',
                background: '#eef2ff'
              }}
            >
              <BarChart3 size={18} color="#4f46e5" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#3730a3' }}>التقارير الشاملة</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('branches_daily')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#faf5ff'
              }}
            >
              <FileSpreadsheet size={18} color="#7c3aed" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#581c87' }}>يومية الفروع</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('orders')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#eff6ff'
              }}
            >
              <ShoppingBag size={18} color="#2563eb" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1e40af' }}>طلبات المتجر</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('pos')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#ecfdf5'
              }}
            >
              <ScanLine size={18} color="#059669" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#065f46' }}>كاشير ونقاط بيع</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('products')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc'
              }}
            >
              <Boxes size={18} color="#4f46e5" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#312e81' }}>كتالوج المخزون</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('treasury_admin')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#fffbeb'
              }}
            >
              <Wallet size={18} color="#d97706" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#78350f' }}>إدارة الخزائن</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('admin_journals')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#fdf4ff'
              }}
            >
              <BookOpenCheck size={18} color="#c026d3" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#701a75' }}>اليوميات والقيود</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('suppliers')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#fef2f2'
              }}
            >
              <Truck size={18} color="#dc2626" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#991b1b' }}>الموردين والحسابات</span>
            </Button>
          </Col>

          <Col xs={12} sm={8} md={6}>
            <Button
              block
              onClick={() => onNavigate('transfers')}
              style={{
                height: 52,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 12px',
                border: '1px solid #e2e8f0',
                background: '#f0fdfa'
              }}
            >
              <Layers size={18} color="#0d9488" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#134e4a' }}>أذونات التحويل</span>
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 6. System & Infrastructure Health */}
      <Card
        title={
          <Space>
            <Server size={18} color="#475569" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>حالة البنية التحتية والاتصال الحي</span>
          </Space>
        }
        variant="borderless"
        style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: '14px 16px' } }}
      >
        <Row gutter={[16, 12]}>
          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: '#64748b' }}>محرك قاعدة البيانات</div>
            <div style={{ marginTop: 4 }}>
              <Tag color="cyan" style={{ margin: 0, fontWeight: 600 }}>
                {systemHealth?.dbClient === 'pg' ? 'PostgreSQL (Cloud)' : 'MySQL 8.0'}
              </Tag>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: '#64748b' }}>اتصال السيرفر</div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot" />
              <span style={{ color: '#059669', fontWeight: 600, fontSize: 13 }}>متصل وجاهز</span>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: '#64748b' }}>البيئة التشغيلية</div>
            <div style={{ marginTop: 4 }}>
              <Tag color="geekblue" style={{ margin: 0 }}>
                {systemHealth?.environment || 'production'}
              </Tag>
            </div>
          </Col>

          <Col xs={12} sm={6}>
            <div style={{ fontSize: 12, color: '#64748b' }}>زمن التشغيل (Uptime)</div>
            <div style={{ marginTop: 4, fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
              {systemHealth?.uptime ? `${Math.round(systemHealth.uptime)} ثانية` : 'نشط مستقر'}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
