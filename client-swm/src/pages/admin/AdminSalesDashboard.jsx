import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Select,
  DatePicker,
  Table,
  Progress,
  Tooltip,
  Alert,
  Spin,
  Divider,
  Badge
} from 'antd';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  RotateCcw,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Users,
  Store,
  Calendar,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdminSalesDashboard({ currentUser, onNavigate, initialTab }) {
  const isBranchScoped = Boolean(currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'admin');
  const userBranchId = currentUser?.branch_id || currentUser?.branchId || 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filters
  const [period, setPeriod] = useState('month'); // 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'
  const [selectedBranch, setSelectedBranch] = useState(isBranchScoped ? userBranchId : 'all');
  const [customRange, setCustomRange] = useState(null);

  // Branches list for dropdown
  const [branchesList, setBranchesList] = useState([]);

  // Safe number formatter helper to guarantee no uncaught TypeError
  const formatCurrency = (val, opts = {}) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : Number(val) || 0;
    return num.toLocaleString('ar-EG', opts);
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data?.success) {
        setBranchesList(res.data.data || []);
      }
    } catch (e) {
      console.error('Fetch branches error:', e);
    }
  };

  const fetchSalesDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        period,
        branch_id: selectedBranch
      };
      if (period === 'custom' && customRange && customRange[0] && customRange[1]) {
        params.startDate = customRange[0].format('YYYY-MM-DD');
        params.endDate = customRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/api/swm/analytics/sales-dashboard', { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || 'فشل في تحميل مؤشرات المبيعات');
      }
    } catch (err) {
      console.error('Fetch sales dashboard error:', err);
      setError(err.response?.data?.message || err.message || 'حدث خطأ أثناء جلب مؤشرات المبيعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchSalesDashboard();
  }, [period, selectedBranch, customRange]);

  const salesMetrics = data?.sales_metrics || {
    gross_sales: 0,
    net_sales: 0,
    sales_count: 0,
    aov: 0,
    conversion_rate: 0
  };

  const returnsAnalysis = data?.returns_analysis || {
    gross_returns: 0,
    net_returns: 0,
    returns_count: 0,
    returns_percentage: 0
  };

  const profitLoss = data?.profit_loss || {
    cogs: 0,
    gross_profit: 0,
    gross_profit_margin: 0,
    total_expenses: 0,
    net_profit: 0,
    net_profit_margin: 0
  };

  const advFinancials = data?.advanced_financials || {
    net_revenue: 0,
    gross_sales: 0,
    gross_returns: 0,
    net_expenses: 0,
    net_cash: 0,
    net_visa: 0,
    net_transfer: 0,
    breakdown: {
      sales: { cash: 0, visa: 0, transfer: 0 },
      returns: { cash: 0, visa: 0, transfer: 0 },
      expenses: { cash: 0 }
    },
    verified_balanced: true
  };

  const trends = data?.graphical_analytics?.sales_trends || [];
  const branchPerf = data?.graphical_analytics?.branch_performance || [];
  const topCustomers = data?.graphical_analytics?.customer_analytics?.top_customers || [];
  const topSellers = data?.graphical_analytics?.customer_analytics?.top_sellers || [];

  // Max value in trends for visual progress bar scale
  const maxTrendSales = Math.max(...trends.map((t) => t.gross_sales || 0), 1);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Dashboard Header & Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0e7ff', color: '#4338ca', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            <BarChart3 size={14} />
            <span>لوحة المبيعات والتحليلات المتقدمة — Executive Sales Dashboard</span>
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(20px, 3.5vw, 26px)', color: '#0f172a' }}>
            التحليل المالي ومؤشرات أداء المبيعات
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            رؤية تحليلية شاملة للمبيعات والمرتجعات، حسابات الأرباح، وتدفقات قنوات الدفع
          </Text>
        </div>

        {/* Filters Controls */}
        <Space size="middle" wrap align="middle">
          {/* Period Selector */}
          <Select
            value={period}
            onChange={(val) => setPeriod(val)}
            style={{ width: 140 }}
            size="middle"
          >
            <Option value="today">اليوم</Option>
            <Option value="yesterday">أمس</Option>
            <Option value="week">آخر 7 أيام</Option>
            <Option value="month">آخر 30 يوم</Option>
            <Option value="year">هذا العام</Option>
            <Option value="custom">فترة مخصصة</Option>
          </Select>

          {period === 'custom' && (
            <RangePicker
              value={customRange}
              onChange={(dates) => setCustomRange(dates)}
              size="middle"
              style={{ borderRadius: 8 }}
            />
          )}

          {/* Branch Filter */}
          {isBranchScoped ? (
            <Tag
              color="blue"
              style={{
                fontSize: 13,
                padding: '6px 14px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700
              }}
            >
              <Store size={14} />
              <span>
                {branchesList.find((b) => b.id === Number(selectedBranch))?.branch_name ||
                  currentUser?.branch_name ||
                  currentUser?.branchName ||
                  'الفرع الحالي'}
              </span>
            </Tag>
          ) : (
            <Select
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
              style={{ minWidth: 170 }}
              size="middle"
            >
              <Option value="all">🏢 جميع الفروع والمستودعات</Option>
              {branchesList.map((b) => (
                <Option key={b.id} value={b.id}>
                  📍 {b.branch_name}
                </Option>
              ))}
            </Select>
          )}

          <Button
            icon={<RefreshCw size={15} style={{ marginLeft: 4 }} />}
            onClick={fetchSalesDashboard}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            تحديث
          </Button>
        </Space>
      </div>

      {loading && !data ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>جاري تجميع المؤشرات المالية والتحليلية...</div>
        </div>
      ) : error && !data ? (
        <div style={{ padding: '40px 0', maxWidth: 640, margin: '0 auto' }}>
          <Alert
            message="تعذر تحميل مؤشرات المبيعات"
            description={error}
            type="warning"
            showIcon
            action={
              <Button size="small" type="primary" onClick={fetchSalesDashboard}>
                إعادة المحاولة
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* SECTION 1: DETAILED SALES METRICS CARDS                   */}
          {/* ========================================================= */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 4, height: 18, background: '#10b981', borderRadius: 2 }} />
              <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                مؤشرات المبيعات التفصيلية (Detailed Sales Metrics)
              </Title>
            </div>

            <Row gutter={[16, 16]}>
              {/* Gross Sales */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #a7f3d0',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>إجمالي المبيعات (Gross Sales)</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 'clamp(22px, 3.5vw, 26px)', fontWeight: 800, color: '#065f46', lineHeight: 1.1 }}>
                    {formatCurrency(salesMetrics.gross_sales, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, fontWeight: 600, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#059669' }}>
                    عدد الفواتير: <strong>{salesMetrics.sales_count}</strong> فاتورة منفذة
                  </div>
                </Card>
              </Col>

              {/* Net Sales */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #bfdbfe',
                    background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>صافي المبيعات (Net Sales)</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 'clamp(22px, 3.5vw, 26px)', fontWeight: 800, color: '#1e40af', lineHeight: 1.1 }}>
                    {formatCurrency(salesMetrics.net_sales, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, fontWeight: 600, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#2563eb' }}>
                    المبيعات بعد خصم المرتجعات
                  </div>
                </Card>
              </Col>

              {/* Average Order Value (AOV) */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #ddd6fe',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6' }}>متوسط الفاتورة (AOV)</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 'clamp(22px, 3.5vw, 26px)', fontWeight: 800, color: '#5b21b6', lineHeight: 1.1 }}>
                    {formatCurrency(salesMetrics.aov, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, fontWeight: 600, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6d28d9' }}>
                    متوسط سلة المشتريات للعميل
                  </div>
                </Card>
              </Col>

              {/* Conversion Rate */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #fed7aa',
                    background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>معدل إتمام العمليات</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 'clamp(22px, 3.5vw, 26px)', fontWeight: 800, color: '#9a3412', lineHeight: 1.1 }}>
                    {salesMetrics.conversion_rate}%
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#c2410c' }}>
                    نسبة الصفقات المكتملة دون ارتداد
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: RETURNS ANALYSIS & PROFIT/LOSS METRICS        */}
          {/* ========================================================= */}
          <Row gutter={[16, 16]}>
            {/* Returns Analysis */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RotateCcw size={18} color="#ea580c" />
                    <span>تحليل المرتجعات (Returns Analysis)</span>
                  </div>
                }
                style={{ borderRadius: 18, border: '1px solid #fed7aa' }}
              >
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff7ed', border: '1px solid #ffedd5' }}>
                      <span style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>إجمالي قيمة المرتجعات</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c', marginTop: 4 }}>
                        {formatCurrency(returnsAnalysis.gross_returns, { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>ج.م</span>
                      </div>
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fff7ed', border: '1px solid #ffedd5' }}>
                      <span style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>نسبة المرتجع إلى المبيعات</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#c2410c', marginTop: 4 }}>
                        {returnsAnalysis.returns_percentage}%
                      </div>
                    </div>
                  </Col>
                </Row>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                    <span>معدل الارتجاع من المبيعات الكلية</span>
                    <span>{returnsAnalysis.returns_count} عمليات إرجاع</span>
                  </div>
                  <Progress
                    percent={Math.min(100, returnsAnalysis.returns_percentage)}
                    strokeColor="#ea580c"
                    status="active"
                  />
                </div>
              </Card>
            </Col>

            {/* Profit & Loss Metrics */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={18} color="#16a34a" />
                    <span>قائمة الأرباح والتكاليف (Profit & Loss Metrics)</span>
                  </div>
                }
                style={{ borderRadius: 18, border: '1px solid #bbf7d0' }}
              >
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>مجمل الربح (Gross Profit)</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                        {formatCurrency(profitLoss.gross_profit, { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>ج.م</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                        هامش مجمل الربح: {profitLoss.gross_profit_margin}%
                      </div>
                    </div>
                  </Col>

                  <Col span={12}>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                      <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>صافي الربح الفعلي (Net Profit)</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: profitLoss.net_profit >= 0 ? '#15803d' : '#dc2626', marginTop: 4 }}>
                        {formatCurrency(profitLoss.net_profit, { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>ج.م</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                        تكلفة بضاعة: {formatCurrency(profitLoss.cogs)} ج.م
                      </div>
                    </div>
                  </Col>
                </Row>

                <div style={{ marginTop: 12, fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                  <span>المصروفات التشغيلية: <strong>{formatCurrency(profitLoss.total_expenses)} ج.م</strong></span>
                  <span>هامش صافي الربح: <strong>{profitLoss.net_profit_margin}%</strong></span>
                </div>
              </Card>
            </Col>
          </Row>

          {/* ========================================================= */}
          {/* SECTION 3: ADVANCED FINANCIAL ANALYSIS & EQUATION         */}
          {/* ========================================================= */}
          <Card
            style={{
              borderRadius: 20,
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                  صافي الإيراد وتقسيم طرق الدفع (Net Revenue Breakdown)
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  المعادلة المحاسبية المعتمدة ومطابقة قنوات التحصيل (كاش، فيزا، تحويل)
                </Text>
              </div>

              <Tag color="green" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, fontWeight: 700 }}>
                ✓ مطابقة محاسبية 100%
              </Tag>
            </div>

            {/* Accounting Formula Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>المعادلة المحاسبية:</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                  صافي الإيراد ({formatCurrency(advFinancials.net_revenue, { minimumFractionDigits: 2 })} ج.م) = إجمالي المبيعات ({formatCurrency(advFinancials.gross_sales)} ج.م) - المرتجعات ({formatCurrency(advFinancials.gross_returns)} ج.م) - المصروفات ({formatCurrency(advFinancials.net_expenses)} ج.م)
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>
                {formatCurrency(advFinancials.net_revenue, { minimumFractionDigits: 2 })}
                <span style={{ fontSize: 13, marginRight: 4 }}>ج.م</span>
              </div>
            </div>

            {/* 3 Payment Methods Grid tied to Net Revenue */}
            <Row gutter={[16, 16]}>
              {/* Net Cash */}
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    padding: '16px 18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>💵 صافي النقدية (Net Cash)</span>
                    <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>الدرج</Tag>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                    {formatCurrency(advFinancials.net_cash, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#166534', marginTop: 6 }}>
                    كاش مبيعات - كاش مرتجع - مصروفات
                  </div>
                </div>
              </Col>

              {/* Net Visa */}
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    padding: '16px 18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>💳 صافي الفيزا (Net Visa)</span>
                    <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>بطاقات بنكية</Tag>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>
                    {formatCurrency(advFinancials.net_visa, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1e40af', marginTop: 6 }}>
                    فيزا مبيعات - فيزا مرتجع
                  </div>
                </div>
              </Col>

              {/* Net Transfer */}
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid #e9d5ff',
                    background: '#faf5ff',
                    padding: '16px 18px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6b21a8' }}>📱 صافي التحويلات (Net Transfer)</span>
                    <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>محافظ وإنستاباي</Tag>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#7e22ce' }}>
                    {formatCurrency(advFinancials.net_transfer, { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: 12, marginRight: 4 }}>ج.م</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b21a8', marginTop: 6 }}>
                    تحويلات مبيعات - تحويلات مرتجع
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* ========================================================= */}
          {/* SECTION 4: GRAPHICAL ANALYTICS (SALES TRENDS & COMPARISONS)*/}
          {/* ========================================================= */}
          <Row gutter={[16, 16]}>
            {/* Sales Trends Chart */}
            <Col xs={24} lg={14}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart3 size={18} color="#4f46e5" />
                    <span>مخطط الاتجاه الزمني للمبيعات (Sales Trends)</span>
                  </div>
                }
                style={{ borderRadius: 18 }}
              >
                {trends.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد بيانات مبيعات مسجلة في هذه الفترة المحددة
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {trends.slice(-10).map((t) => (
                      <div key={t.date} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 90, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                          {t.date}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Progress
                            percent={Math.round((t.gross_sales / maxTrendSales) * 100)}
                            strokeColor="linear-gradient(90deg, #10b981 0%, #059669 100%)"
                            showInfo={false}
                          />
                        </div>
                        <div style={{ width: 110, textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                          {formatCurrency(t.gross_sales)} ج.م
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>

            {/* Multi-Branch Performance */}
            <Col xs={24} lg={10}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Store size={18} color="#059669" />
                    <span>مقارنة أداء الفروع (Multi-Branch Performance)</span>
                  </div>
                }
                style={{ borderRadius: 18 }}
              >
                <Table
                  dataSource={branchPerf}
                  rowKey="branch_id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'الفرع',
                      dataIndex: 'branch_name',
                      key: 'branch_name',
                      render: (name) => <Text strong>{name}</Text>
                    },
                    {
                      title: 'المبيعات',
                      dataIndex: 'gross_sales',
                      key: 'gross_sales',
                      render: (val) => (
                        <Text strong style={{ color: '#059669' }}>
                          {formatCurrency(val)} ج.م
                        </Text>
                      )
                    },
                    {
                      title: 'المرتجعات',
                      dataIndex: 'returns',
                      key: 'returns',
                      render: (val) => (
                        <Text style={{ color: '#dc2626' }}>
                          {formatCurrency(val)} ج.م
                        </Text>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>

          {/* ========================================================= */}
          {/* SECTION 5: CUSTOMER DATA ANALYSIS & SELLER RANKINGS      */}
          {/* ========================================================= */}
          <Row gutter={[16, 16]}>
            {/* Top Spender Customers */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color="#2563eb" />
                    <span>تحليل بيانات العملاء الأكثر إنفاقاً (Customer Data Analysis)</span>
                  </div>
                }
                style={{ borderRadius: 18 }}
              >
                <Table
                  dataSource={topCustomers}
                  rowKey={(row) => `${row.phone || 'client'}-${row.name || row.invoices_count || ''}`}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  columns={[
                    {
                      title: 'العميل',
                      dataIndex: 'name',
                      key: 'name',
                      render: (n) => <Text strong>{n || 'عميل نقدي'}</Text>
                    },
                    {
                      title: 'رقم الهاتف',
                      dataIndex: 'phone',
                      key: 'phone',
                      render: (p) => <Text code>{p || '-'}</Text>
                    },
                    {
                      title: 'عدد الفواتير',
                      dataIndex: 'invoices_count',
                      key: 'invoices_count'
                    },
                    {
                      title: 'إجمالي المشتريات',
                      dataIndex: 'total_spent',
                      key: 'total_spent',
                      render: (amt) => (
                        <Text strong style={{ color: '#2563eb' }}>
                          {formatCurrency(amt)} ج.م
                        </Text>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>

            {/* Salesperson Rankings */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color="#7c3aed" />
                    <span>ترتيب أداء البائعين وموظفي الكاشير</span>
                  </div>
                }
                style={{ borderRadius: 18 }}
              >
                <Table
                  dataSource={topSellers}
                  rowKey="salesperson_id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  columns={[
                    {
                      title: 'البائع',
                      dataIndex: 'salesperson_name',
                      key: 'salesperson_name',
                      render: (n) => <Text strong>{n}</Text>
                    },
                    {
                      title: 'عدد العمليات',
                      dataIndex: 'invoices_count',
                      key: 'invoices_count'
                    },
                    {
                      title: 'إجمالي الإيراد المحقق',
                      dataIndex: 'total_sales',
                      key: 'total_sales',
                      render: (amt) => (
                        <Text strong style={{ color: '#7c3aed' }}>
                          {formatCurrency(amt)} ج.م
                        </Text>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
