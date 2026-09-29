import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Tag,
  Typography,
  Table,
  Spin,
  Space,
  Tabs,
  Badge,
  Tooltip,
  Empty,
  Segmented,
  Progress
} from 'antd';
import {
  BarChart3,
  TrendingUp,
  RotateCcw,
  Users,
  DollarSign,
  Receipt,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  LabelList
} from 'recharts';
import dayjs from 'dayjs';
import SupervisorPageLayout from './SupervisorPageLayout';
import api from '../../../api';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const CATEGORY_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];
const PAYMENT_COLORS = {
  cash: '#10b981',
  visa: '#3b82f6',
  transfer: '#8b5cf6'
};

export default function SalesReportsPage({ currentUser }) {
  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const branchName = currentUser?.branch_name || currentUser?.branchName || 'الفرع الرئيسي';

  // Global Date Filter State
  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [topProductView, setTopProductView] = useState('chart');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = { branch_id: branchId, period };
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/api/swm/analytics/sales-dashboard', { params });
      if (res.data.success) {
        setSalesData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load sales dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [branchId, period, dateRange]);

  const handlePresetChange = (presetKey) => {
    setPeriod(presetKey);
    if (presetKey === 'today') {
      setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
    } else if (presetKey === 'week') {
      setDateRange([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')]);
    } else if (presetKey === 'month') {
      setDateRange([dayjs().startOf('month'), dayjs().endOf('day')]);
    }
  };

  const handleCustomRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      setPeriod('custom');
    } else {
      setDateRange([dayjs().startOf('month'), dayjs()]);
      setPeriod('month');
    }
  };

  // Metrics extracted from backend
  const metrics = salesData?.sales_metrics || {};
  const returns = salesData?.returns_analysis || {};
  const profitLoss = salesData?.profit_loss || {};
  const financials = salesData?.advanced_financials || {};
  const trends = salesData?.graphical_analytics?.sales_trends || [];
  const rawTopProducts = salesData?.graphical_analytics?.top_products || [];
  const topProducts = rawTopProducts.map(p => ({
    ...p,
    units_sold: Number(p.units_sold || 0),
    total_revenue: Number(p.total_revenue || 0)
  }));

  const rawTopCategories = salesData?.graphical_analytics?.top_categories || [];
  const topCategories = rawTopCategories
    .map(c => ({
      category_name: c.category_name || 'عام',
      units_sold: Number(c.units_sold || 0),
      total_revenue: Number(c.total_revenue || 0)
    }))
    .filter(c => c.total_revenue > 0);

  const totalCatRevenue = topCategories.reduce((acc, c) => acc + c.total_revenue, 0);
  const topSellers = salesData?.graphical_analytics?.customer_analytics?.top_sellers || [];
  const returnsItems = returns.returns_items || [];
  const expensesList = profitLoss.expenses_list || [];

  // Pie chart data for payment methods
  const paymentPieData = [
    { name: 'نقدية (Cash)', value: financials.net_cash || 0, color: PAYMENT_COLORS.cash },
    { name: 'فيزا (Visa)', value: financials.net_visa || 0, color: PAYMENT_COLORS.visa },
    { name: 'تحويل بنكي (Transfer)', value: financials.net_transfer || 0, color: PAYMENT_COLORS.transfer }
  ].filter(p => p.value > 0);

  // Return Log Table Columns
  const returnColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 150,
      render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>{v}</span>
    },
    {
      title: 'الصنف المرتجع',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (val, r) => (
        <div>
          <strong style={{ color: '#0f172a' }}>{val || 'صنف غير محدد'}</strong>
          {r.product_code && (
            <div style={{ fontSize: 11, color: '#64748b' }}>كود: {r.product_code}</div>
          )}
        </div>
      )
    },
    {
      title: 'الكمية المرتجعة',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'center',
      render: (q) => <Tag color="error" style={{ fontWeight: 800, fontSize: 12 }}>{q} قطعة</Tag>
    },
    {
      title: 'سعر الوحدة',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (p) => `${parseFloat(p || 0).toLocaleString()} ج.م`
    },
    {
      title: 'إجمالي المسترد للعميل',
      dataIndex: 'line_total',
      key: 'line_total',
      width: 150,
      render: (amt) => (
        <strong style={{ color: '#b91c1c', fontSize: 13.5 }}>
          -{parseFloat(amt || 0).toLocaleString()} ج.م
        </strong>
      )
    },
    {
      title: 'البائع المستلم',
      dataIndex: 'salesperson_name',
      key: 'salesperson_name',
      width: 130,
      render: (sp) => <Tag color="blue">{sp || 'كاشير'}</Tag>
    },
    {
      title: 'العميل',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (c, r) => (
        <div>
          <span>{c || 'عميل نقدي'}</span>
          {r.customer_phone && (
            <div style={{ fontSize: 11, color: '#64748b' }}>{r.customer_phone}</div>
          )}
        </div>
      )
    },
    {
      title: 'تاريخ المرتجع',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 160,
      render: (d) => (d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—')
    }
  ];

  // Expenses Ledger Columns
  const expenseColumns = [
    {
      title: 'رقم الإيصال / السند',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 150,
      render: (ref) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>{ref}</span>
    },
    {
      title: 'نوع المصروف',
      key: 'type',
      width: 160,
      render: (_, r) => {
        if (r.is_refunded) {
          return (
            <Tag color="success" style={{ fontWeight: 800, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={12} />
              <span>مصروف مرتد (استرداد)</span>
            </Tag>
          );
        }
        return (
          <Tag color="gold" style={{ fontWeight: 800, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={12} />
            <span>صرف نقدية (مصروف)</span>
          </Tag>
        );
      }
    },
    {
      title: 'البند والتصنيف',
      dataIndex: 'category',
      key: 'category',
      render: (cat, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {cat === 'sales_withdrawal' ? 'سحب بائعين' :
             cat === 'utility_bill' ? 'فواتير ومرافق' :
             cat === 'refunded_expense' ? 'مصروف مرتد للدرج' :
             cat === 'shipping' ? 'مصاريف شحن' :
             cat === 'buffet' ? 'نثريات وضيافة' : (cat || 'عام')}
          </span>
          {r.subcategory && (
            <span style={{ fontSize: 11, color: '#64748b', marginRight: 6 }}>({r.subcategory})</span>
          )}
        </div>
      )
    },
    {
      title: 'البيان والملاحظات',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '—'
    },
    {
      title: 'المبلغ المسجل',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amt, r) => (
        <strong style={{ color: r.is_refunded ? '#16a34a' : '#b45309', fontSize: 13.5 }}>
          {r.is_refunded ? '+' : '-'}{parseFloat(amt || 0).toLocaleString()} ج.م
        </strong>
      )
    },
    {
      title: 'المسؤول / المدخل',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by_name',
      width: 130,
      render: (name) => <Tag color="default">{name}</Tag>
    },
    {
      title: 'تاريخ التسجيل',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 140,
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—')
    }
  ];

  return (
    <SupervisorPageLayout
      currentUser={currentUser}
      pageTitle="تقارير ومبيعات الفرع الشاملة والتحليلات"
      pageIcon={<BarChart3 size={20} />}
      pageSubtitle="لوحة التقارير المركزية: المؤشرات المالية، تدقيق المرتجعات، دفتر المصروفات والمرتدات، والرسوم البيانية التفاعلية"
    >
      {/* ─── GLOBAL DATE FILTER BAR (CRITICAL: DRIVES ALL TABS AND SECTIONS) ─── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1.5px solid #e2e8f0',
          padding: '16px 22px',
          boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                النطاق الزمني الشامل للتقارير
              </span>
              <Tag color="indigo" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                فلتر موحد لكافة الجداول والرسوم
              </Tag>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              يتم تطبيق هذا الفلتر لحظياً على كافة الرسوم البيانية وسجل المرتجعات ودفتر المصروفات
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Space.Compact>
            <Button
              type={period === 'today' ? 'primary' : 'default'}
              onClick={() => handlePresetChange('today')}
              style={{ fontWeight: 700 }}
            >
              اليوم
            </Button>
            <Button
              type={period === 'week' ? 'primary' : 'default'}
              onClick={() => handlePresetChange('week')}
              style={{ fontWeight: 700 }}
            >
              آخر 7 أيام
            </Button>
            <Button
              type={period === 'month' ? 'primary' : 'default'}
              onClick={() => handlePresetChange('month')}
              style={{ fontWeight: 700 }}
            >
              هذا الشهر
            </Button>
          </Space.Compact>

          <RangePicker
            value={dateRange}
            onChange={handleCustomRangeChange}
            format="YYYY-MM-DD"
            style={{ borderRadius: 8, height: 38, borderColor: period === 'custom' ? '#4f46e5' : '#cbd5e1' }}
          />

          <Button
            type="primary"
            icon={<RefreshCw size={15} style={{ marginLeft: 6 }} />}
            onClick={fetchDashboardData}
            loading={loading}
            style={{
              backgroundColor: '#4f46e5',
              borderColor: '#4f46e5',
              borderRadius: 8,
              height: 38,
              fontWeight: 700
            }}
          >
            تحديث
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {/* ─── 4 CORE EXECUTIVE FINANCIAL CARDS ─── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Card 1: Gross Sales */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>إجمالي مبيعات الفرع</span>
                <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                  {metrics.sales_count || 0} فاتورة
                </Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '8px 0 4px' }}>
                {(metrics.gross_sales || 0).toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={14} color="#16a34a" />
                متوسط الفاتورة: <strong>{(metrics.aov || 0).toLocaleString()} ج.م</strong>
              </div>
            </div>
          </Col>

          {/* Card 2: Net Revenue */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(22, 101, 52, 0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>صافي الإيرادات المحققة</span>
                <Tag color="green" style={{ fontWeight: 700, borderRadius: 6, margin: 0, fontSize: 10 }}>صافي بعد الخصم</Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#14532d', margin: '8px 0 4px' }}>
                {(financials.net_revenue || metrics.net_sales || 0).toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 12, color: '#15803d' }}>
                معدل التحويل: <strong>{metrics.conversion_rate || 100}%</strong>
              </div>
            </div>
          </Col>

          {/* Card 3: Returns Total & Rate */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(185, 28, 28, 0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>إجمالي المرتجعات</span>
                <Tag color="error" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                  {returns.returns_count || 0} عملية
                </Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#b91c1c', margin: '8px 0 4px' }}>
                {(returns.gross_returns || 0).toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={14} />
                نسبة المرتجع: <strong>{returns.returns_percentage || 0}%</strong> من المبيعات
              </div>
            </div>
          </Col>

          {/* Card 4: Net Operational Expenses & Profit */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(180, 83, 9, 0.06)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>المصروفات التشغيلية المعتمدة</span>
                <Tag color="gold" style={{ fontWeight: 700, borderRadius: 6, margin: 0, fontSize: 10 }}>
                  صافي المصروف
                </Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#b45309', margin: '8px 0 4px' }}>
                {(profitLoss.total_expenses || 0).toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>
                صافي الربح التقديري: <strong>{(profitLoss.net_profit || 0).toLocaleString()} ج.م</strong> ({profitLoss.net_profit_margin || 0}%)
              </div>
            </div>
          </Col>
        </Row>

        {/* ─── NAVIGATION SUB-TABS ─── */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            marginBottom: 24
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: (
                  <span style={{ fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={17} />
                    الرسوم البيانية والتحليلات البصرية
                  </span>
                ),
                children: (
                  <div>
                    {/* Visual Charts: Row 1 (Sales Trend & Profit Curve) */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col xs={24} lg={15}>
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            padding: '20px',
                            height: 360
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                              <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                                📈 منحنى الإيرادات والمبيعات اليومية
                              </Text>
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                تتبع دقيق لإجمالي المبيعات، وصافي الإيرادات بعد خصم المرتجعات
                              </div>
                            </div>
                            <Tag color="indigo" style={{ fontWeight: 700, borderRadius: 6 }}>محدث لحظياً</Tag>
                          </div>

                          {trends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" tick={{ fill: '#475569', fontSize: 11.5, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#475569', fontSize: 11.5, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <ChartTooltip
                                  contentStyle={{
                                    borderRadius: 10,
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    fontFamily: "'Cairo', sans-serif"
                                  }}
                                  formatter={(val, name) => [
                                    `${Number(val).toLocaleString()} ج.م`,
                                    name === 'gross_sales' ? 'إجمالي المبيعات' : name === 'net_sales' ? 'صافي المبيعات' : 'المرتجعات'
                                  ]}
                                  labelFormatter={(l) => `التاريخ: ${l}`}
                                />
                                <Legend
                                  wrapperStyle={{ fontFamily: "'Cairo', sans-serif", fontWeight: 600, paddingTop: 6 }}
                                  formatter={(val) =>
                                    val === 'gross_sales' ? 'إجمالي المبيعات' : val === 'net_sales' ? 'صافي المبيعات' : 'المرتجعات'
                                  }
                                />
                                <Area type="monotone" dataKey="gross_sales" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorGross)" />
                                <Area type="monotone" dataKey="net_sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              لا توجد حركات مبيعات في النطاق الزمني المحدد
                            </div>
                          )}
                        </div>
                      </Col>

                      {/* Payment Methods Distribution */}
                      <Col xs={24} lg={9}>
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            padding: '20px',
                            height: 360,
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <Text strong style={{ fontSize: 15, color: '#0f172a', marginBottom: 6 }}>
                            💳 توزيع المحصلات المالية (Payment Methods)
                          </Text>
                          <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 12 }}>
                            النقدية والفيزا والتحويلات البنكية المحققة
                          </div>

                          {paymentPieData.length > 0 ? (
                            <div style={{ flex: 1, position: 'relative' }}>
                              <ResponsiveContainer width="100%" height={210}>
                                <PieChart>
                                  <Pie
                                    data={paymentPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {paymentPieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <ChartTooltip formatter={(v) => `${Number(v).toLocaleString()} ج.م`} />
                                </PieChart>
                              </ResponsiveContainer>

                              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 11.5, marginTop: 4 }}>
                                {paymentPieData.map((p, idx) => (
                                  <div key={idx} style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 4 }} />
                                    <span style={{ fontWeight: 700, color: '#334155' }}>{p.name.split(' ')[0]}</span>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.value.toLocaleString()} ج.م</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              لا توجد تدفقات نقدية مسجلة
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>

                    {/* Visual Charts: Row 2 (Top-Selling Products & Top Categories) */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      {/* Top Products BarChart & Leaderboard (Sleek Dark Card with White Labels) */}
                      <Col xs={24} lg={15}>
                        <div
                          style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                            border: '1px solid #334155',
                            borderRadius: 16,
                            padding: '22px',
                            minHeight: 400,
                            boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.35)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <Text strong style={{ fontSize: 16, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>🏆</span> أعلى المنتجات مبيعاً بالفرع (Top Selling Products)
                              </Text>
                              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                مرتبة حسب إجمالي الإيرادات المحققة والكميات المباعة
                              </div>
                            </div>
                            <Space size={8}>
                              <Segmented
                                value={topProductView}
                                onChange={setTopProductView}
                                options={[
                                  { label: '📊 رسم بياني', value: 'chart' },
                                  { label: '📋 قائمة الصدارة', value: 'table' }
                                ]}
                                size="small"
                                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', fontWeight: 600 }}
                              />
                              <Tag color="gold" style={{ fontWeight: 700, margin: 0 }}>أفضل {topProducts.length} أصناف</Tag>
                            </Space>
                          </div>

                          {topProducts.length > 0 ? (
                            topProductView === 'chart' ? (
                              <div dir="ltr" style={{ width: '100%', height: 320, direction: 'ltr' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={topProducts}
                                    layout="vertical"
                                    margin={{ top: 10, right: 125, left: 10, bottom: 5 }}
                                  >
                                    <defs>
                                      <linearGradient id="topProductGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#38bdf8" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                    <XAxis
                                      type="number"
                                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                      stroke="#64748b"
                                      tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}
                                    />
                                    <YAxis
                                      dataKey="product_name"
                                      type="category"
                                      orientation="left"
                                      width={195}
                                      stroke="#475569"
                                      tick={({ x, y, payload }) => {
                                        const full = payload?.value || '';
                                        const label = full.length > 24 ? `${full.substring(0, 23)}…` : full;
                                        return (
                                          <g transform={`translate(${x},${y})`}>
                                            <text
                                              x={-10}
                                              y={4}
                                              textAnchor="end"
                                              fill="#ffffff"
                                              fontSize={12.5}
                                              fontWeight={700}
                                              fontFamily="'Cairo', sans-serif"
                                            >
                                              {label}
                                            </text>
                                          </g>
                                        );
                                      }}
                                    />
                                    <ChartTooltip
                                      contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: 10,
                                        color: '#ffffff',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                        fontFamily: "'Cairo', sans-serif",
                                        direction: 'rtl',
                                        textAlign: 'right'
                                      }}
                                      itemStyle={{ color: '#ffffff' }}
                                      labelStyle={{ color: '#94a3b8' }}
                                      formatter={(val, name, item) => [
                                        `${Number(val).toLocaleString()} ج.م (${item?.payload?.units_sold || 0} قطعة)`,
                                        'الإيراد المحقق'
                                      ]}
                                    />
                                    <Bar dataKey="total_revenue" fill="url(#topProductGrad)" radius={[0, 6, 6, 0]}>
                                      <LabelList
                                        dataKey="total_revenue"
                                        position="right"
                                        content={({ x, y, width, height, value }) => {
                                          if (value === undefined || value === null) return null;
                                          const text = `${Number(value).toLocaleString()} ج.م`;
                                          return (
                                            <text
                                              x={(x || 0) + (width || 0) + 8}
                                              y={(y || 0) + (height || 0) / 2 + 4}
                                              fill="#38bdf8"
                                              fontSize={12}
                                              fontWeight={800}
                                              fontFamily="'Cairo', sans-serif"
                                              textAnchor="start"
                                            >
                                              {text}
                                            </text>
                                          );
                                        }}
                                      />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div style={{ height: 310, overflowY: 'auto', paddingRight: 4 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {topProducts.map((p, idx) => {
                                    const medals = ['🥇', '🥈', '🥉'];
                                    const rankBadge = idx < 3 ? medals[idx] : `#${idx + 1}`;
                                    const rev = Number(p.total_revenue || 0);
                                    const maxRev = Math.max(...topProducts.map(x => Number(x.total_revenue || 0)), 1);
                                    const pct = Math.min(100, Math.round((rev / maxRev) * 100));

                                    return (
                                      <div
                                        key={p.product_code || idx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          border: '1px solid rgba(255, 255, 255, 0.1)',
                                          borderRadius: 10,
                                          padding: '10px 14px',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                          <span style={{ fontSize: idx < 3 ? 18 : 13, fontWeight: 800, width: 26, textAlign: 'center', color: '#94a3b8' }}>
                                            {rankBadge}
                                          </span>
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {p.product_name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                              {p.product_code && <span>كود: {p.product_code}</span>}
                                              {p.category_name && <Tag color="default" style={{ fontSize: 10, padding: '0 4px', margin: 0, background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: 'none' }}>{p.category_name}</Tag>}
                                            </div>
                                          </div>
                                        </div>

                                        <div style={{ textAlign: 'left', minWidth: 140, paddingLeft: 8 }}>
                                          <div style={{ fontWeight: 800, fontSize: 13.5, color: '#38bdf8' }}>
                                            {rev.toLocaleString()} ج.م
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{p.units_sold} قطعة</span>
                                            <Progress percent={pct} showInfo={false} size="small" strokeColor="#38bdf8" style={{ width: 45, margin: 0 }} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )
                          ) : (
                            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                              لا توجد مبيعات أصناف في هذا النطاق
                            </div>
                          )}
                        </div>
                      </Col>

                      {/* Top Categories Donut Chart & Breakdown */}
                      <Col xs={24} lg={9}>
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 16,
                            padding: '22px',
                            minHeight: 400,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 15.5, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                              🏷️ تصنيفات المنتجات الأكثر طلباً (Categories)
                            </Text>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              حصة كل قسم وتصنيف من إجمالي مبيعات الفرع
                            </div>
                          </div>

                          {topCategories.length > 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <ResponsiveContainer width="100%" height={210}>
                                <PieChart>
                                  <Pie
                                    data={topCategories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={topCategories.length > 1 ? 4 : 0}
                                    dataKey="total_revenue"
                                    nameKey="category_name"
                                  >
                                    {topCategories.map((entry, index) => (
                                      <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <ChartTooltip
                                    contentStyle={{
                                      borderRadius: 10,
                                      border: '1px solid #e2e8f0',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                      fontFamily: "'Cairo', sans-serif"
                                    }}
                                    formatter={(v, n, item) => [
                                      `${Number(v).toLocaleString()} ج.م (${item?.payload?.units_sold || 0} قطعة)`,
                                      'الإيراد'
                                    ]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>
                                {topCategories.map((c, idx) => {
                                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                                  const pct = totalCatRevenue > 0 ? Math.round((c.total_revenue / totalCatRevenue) * 100) : 0;
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '4px 8px',
                                        background: '#f8fafc',
                                        borderRadius: 8,
                                        fontSize: 12
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{c.category_name}</span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>({pct}%)</span>
                                      </div>
                                      <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{c.total_revenue.toLocaleString()} ج.م</span>
                                        <span style={{ fontSize: 10.5, color: '#64748b', marginRight: 4 }}>({c.units_sold} قطعة)</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                              لا توجد تصنيفات مسجلة في هذا النطاق
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>

                    {/* Staff Performance KPIs Table */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding: '18px 22px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={18} color="#4f46e5" />
                          <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                            أداء ومبيعات طاقم الفرع (Salesperson KPIs)
                          </Text>
                        </div>
                        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 700 }}>
                          {topSellers.length} بائعين مسجلين
                        </Tag>
                      </div>

                      <Table
                        size="small"
                        dataSource={topSellers}
                        rowKey={(r) => r.salesperson_id || r.salesperson_name}
                        pagination={false}
                        columns={[
                          {
                            title: 'اسم البائع',
                            dataIndex: 'salesperson_name',
                            key: 'salesperson_name',
                            render: (val) => <strong style={{ color: '#1e293b' }}>{val || 'غير محدد'}</strong>
                          },
                          {
                            title: 'عدد الفواتير',
                            dataIndex: 'invoices_count',
                            key: 'invoices_count',
                            align: 'center',
                            render: (v) => <Tag color="blue">{v || 0} فاتورة</Tag>
                          },
                          {
                            title: 'إجمالي المبيعات المحققة',
                            dataIndex: 'total_sales',
                            key: 'total_sales',
                            align: 'left',
                            render: (v) => (
                              <strong style={{ color: '#059669', fontSize: 13 }}>
                                {(v || 0).toLocaleString()} ج.م
                              </strong>
                            )
                          },
                          {
                            title: 'متوسط الفاتورة (AOV)',
                            key: 'aov',
                            align: 'left',
                            render: (_, r) => {
                              const count = parseInt(r.invoices_count || 1, 10);
                              const sales = parseFloat(r.total_sales || 0);
                              const aov = count > 0 ? (sales / count) : 0;
                              return <span style={{ color: '#475569' }}>{aov.toFixed(1)} ج.م</span>;
                            }
                          }
                        ]}
                      />
                    </div>
                  </div>
                )
              },
              {
                key: 'returns',
                label: (
                  <span style={{ fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={17} color="#dc2626" />
                    تدقيق وسجل المرتجعات التفصيلي (Returns Log)
                    {returnsItems.length > 0 && (
                      <Badge count={returnsItems.length} overflowCount={999} style={{ backgroundColor: '#dc2626', marginRight: 4 }} />
                    )}
                  </span>
                ),
                children: (
                  <div>
                    {/* Returns Summary Header */}
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 12,
                        padding: '16px 20px',
                        marginBottom: 18,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div>
                        <Title level={5} style={{ margin: 0, color: '#991b1b', fontWeight: 800 }}>
                          سجل الأصناف وفواتير المرتجع المعتمدة بالفرع
                        </Title>
                        <Text style={{ fontSize: 12.5, color: '#b91c1c' }}>
                          تفاصيل كل قطعة مرتجعة مع اسم البائع المستلم وقيمة الاسترداد خلال الفترة المحددة
                        </Text>
                      </div>

                      <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#7f1d1d', display: 'block' }}>إجمالي فواتير المرتجع</span>
                          <strong style={{ fontSize: 16, color: '#991b1b' }}>{returns.returns_count || 0}</strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#7f1d1d', display: 'block' }}>إجمالي القطع المرتجعة</span>
                          <strong style={{ fontSize: 16, color: '#991b1b' }}>
                            {returnsItems.reduce((acc, cur) => acc + parseInt(cur.quantity || 1, 10), 0)} قطعة
                          </strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#7f1d1d', display: 'block' }}>إجمالي القيمة المستردة</span>
                          <strong style={{ fontSize: 16, color: '#dc2626' }}>
                            -{(returns.gross_returns || 0).toLocaleString()} ج.م
                          </strong>
                        </div>
                      </div>
                    </div>

                    <Table
                      size="small"
                      dataSource={returnsItems}
                      columns={returnColumns}
                      rowKey={(r) => r.id}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      locale={{
                        emptyText: (
                          <Empty
                            description="لا توجد مرتجعات مسجلة في هذا النطاق الزمني المحدد"
                            style={{ padding: '32px 0' }}
                          />
                        )
                      }}
                    />
                  </div>
                )
              },
              {
                key: 'expenses',
                label: (
                  <span style={{ fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <DollarSign size={17} color="#d97706" />
                    دفتر المصروفات التشغيلية والمردودات (Expenses Ledger)
                    {expensesList.length > 0 && (
                      <Badge count={expensesList.length} overflowCount={999} style={{ backgroundColor: '#f59e0b', marginRight: 4 }} />
                    )}
                  </span>
                ),
                children: (
                  <div>
                    {/* Expenses Summary Header */}
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 12,
                        padding: '16px 20px',
                        marginBottom: 18,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div>
                        <Title level={5} style={{ margin: 0, color: '#92400e', fontWeight: 800 }}>
                          دفتر قيود وسندات الصرف والاسترداد (Expenses & Refunds Ledger)
                        </Title>
                        <Text style={{ fontSize: 12.5, color: '#b45309' }}>
                          تسجيل دقيق لكافة المصروفات المنصرفة من الفرع، والمبالغ المرتدة إلى الدرج/الخزينة
                        </Text>
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#78350f', display: 'block' }}>إجمالي المصروفات المنصرفة</span>
                          <strong style={{ fontSize: 16, color: '#b45309' }}>
                            -{(profitLoss.total_expenses_out || profitLoss.total_expenses || 0).toLocaleString()} ج.م
                          </strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#166534', display: 'block' }}>إجمالي المصروف المرتد (المسترد)</span>
                          <strong style={{ fontSize: 16, color: '#16a34a' }}>
                            +{(profitLoss.total_expenses_refunded || 0).toLocaleString()} ج.م
                          </strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: '#78350f', display: 'block' }}>صافي المصروف التشغيلي</span>
                          <strong style={{ fontSize: 16, color: '#0f172a' }}>
                            {(profitLoss.total_expenses || 0).toLocaleString()} ج.م
                          </strong>
                        </div>
                      </div>
                    </div>

                    <Table
                      size="small"
                      dataSource={expensesList}
                      columns={expenseColumns}
                      rowKey={(r) => r.id}
                      pagination={{ pageSize: 10, showSizeChanger: true }}
                      locale={{
                        emptyText: (
                          <Empty
                            description="لا توجد قيود مصروفات مسجلة في هذا النطاق الزمني المحدد"
                            style={{ padding: '32px 0' }}
                          />
                        )
                      }}
                    />
                  </div>
                )
              }
            ]}
          />
        </div>
      </Spin>
    </SupervisorPageLayout>
  );
}
