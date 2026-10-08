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
  Statistic,
  Tabs,
  Badge,
  Tooltip
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
  CreditCard
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
  Legend
} from 'recharts';
import dayjs from 'dayjs';
import api from '../../../api';
import SafeChartContainer from '../../../components/common/SafeChartContainer';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PAYMENT_COLORS = {
  cash: '#10b981',
  visa: '#3b82f6',
  transfer: '#8b5cf6'
};

export default function ComprehensiveSalesCard({ branchId }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [salesData, setSalesData] = useState(null);

  const fetchSalesDashboard = async () => {
    setLoading(true);
    try {
      let params = { branch_id: branchId };
      if (period === 'custom' && dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        params.period = period;
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
    fetchSalesDashboard();
  }, [branchId, period, dateRange]);

  const handlePresetChange = (presetKey) => {
    setPeriod(presetKey);
    if (presetKey === 'today') {
      setDateRange([dayjs(), dayjs()]);
    } else if (presetKey === 'week') {
      setDateRange([dayjs().subtract(7, 'day'), dayjs()]);
    } else if (presetKey === 'month') {
      setDateRange([dayjs().startOf('month'), dayjs()]);
    }
  };

  const handleCustomRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      setPeriod('custom');
    }
  };

  // Metrics extracted
  const metrics = salesData?.sales_metrics || {};
  const returns = salesData?.returns_analysis || {};
  const profitLoss = salesData?.profit_loss || {};
  const financials = salesData?.advanced_financials || {};
  const trends = salesData?.graphical_analytics?.sales_trends || [];
  const topSellers = salesData?.graphical_analytics?.customer_analytics?.top_sellers || [];

  // Pie chart data for payment methods
  const paymentPieData = [
    { name: 'نقدية (Cash)', value: financials.net_cash || 0, color: PAYMENT_COLORS.cash },
    { name: 'فيزا (Visa)', value: financials.net_visa || 0, color: PAYMENT_COLORS.visa },
    { name: 'تحويل بنكي (Transfer)', value: financials.net_transfer || 0, color: PAYMENT_COLORS.transfer }
  ].filter(p => p.value > 0);

  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: 24,
        background: '#ffffff',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* ─── Card Header with Global Date Filter ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                1. بطاقة مبيعات الفرع الشاملة
              </Title>
              <Tag color="indigo" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                مباشر
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              تحليلات المبيعات، مؤشرات الأداء، تقارير المرتجعات والمصروفات بدقة لحظية
            </Text>
          </div>
        </div>

        {/* Global Date Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Space.Compact>
            <Button
              type={period === 'today' ? 'primary' : 'default'}
              size="small"
              onClick={() => handlePresetChange('today')}
              style={{ fontWeight: 600 }}
            >
              اليوم
            </Button>
            <Button
              type={period === 'week' ? 'primary' : 'default'}
              size="small"
              onClick={() => handlePresetChange('week')}
              style={{ fontWeight: 600 }}
            >
              آخر 7 أيام
            </Button>
            <Button
              type={period === 'month' ? 'primary' : 'default'}
              size="small"
              onClick={() => handlePresetChange('month')}
              style={{ fontWeight: 600 }}
            >
              هذا الشهر
            </Button>
          </Space.Compact>

          <RangePicker
            size="small"
            value={dateRange}
            onChange={handleCustomRangeChange}
            format="YYYY-MM-DD"
            style={{ borderRadius: 6, borderColor: period === 'custom' ? '#4f46e5' : '#cbd5e1' }}
          />

          <Button
            size="small"
            icon={<Filter size={13} />}
            onClick={fetchSalesDashboard}
            loading={loading}
            style={{ borderRadius: 6 }}
          >
            تحديث
          </Button>
        </div>
      </div>

      {/* ─── 4 Core Financial Metric Badges ─── */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Gross Sales */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 20px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>إجمالي مبيعات الفرع</span>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {metrics.sales_count || 0} فاتورة
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '6px 0 2px' }}>
                {(metrics.gross_sales || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={13} color="#16a34a" />
                متوسط الفاتورة: <strong>{(metrics.aov || 0).toLocaleString()} ج.م</strong>
              </div>
            </div>
          </Col>

          {/* Net Revenue */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>صافي الإيرادات المحققة</span>
                <Tag color="green" style={{ margin: 0, fontWeight: 700, borderRadius: 6, fontSize: 10 }}>صافي بعد الخصم والمرتجع</Tag>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#14532d', margin: '6px 0 2px' }}>
                {(financials.net_revenue || metrics.net_sales || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#15803d' }}>
                معدل التحويل: <strong>{metrics.conversion_rate || 100}%</strong>
              </div>
            </div>
          </Col>

          {/* Returns Total & Rate */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#991b1b', fontWeight: 700 }}>إجمالي المرتجعات</span>
                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {returns.returns_count || 0} عملية
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#b91c1c', margin: '6px 0 2px' }}>
                {(returns.gross_returns || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={13} />
                نسبة المرتجع من المبيعات: <strong>{returns.returns_percentage || 0}%</strong>
              </div>
            </div>
          </Col>

          {/* Operational Expenses & Profit */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: '16px 20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 12, color: '#92400e', fontWeight: 700 }}>المصروفات التشغيلية</span>
                <Tag color="gold" style={{ margin: 0, fontWeight: 700, borderRadius: 6, fontSize: 10 }}>معتمدة</Tag>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#b45309', margin: '6px 0 2px' }}>
                {(profitLoss.total_expenses || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#92400e' }}>
                صافي الربح التقديري: <strong>{(profitLoss.net_profit || 0).toLocaleString()} ج.م</strong>
              </div>
            </div>
          </Col>
        </Row>

        {/* ─── Visual Charts Section (Recharts) ─── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Main Sales & Net Revenue Trend Chart */}
          <Col xs={24} lg={16}>
            <div
              className="swm-chart-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px',
                height: 340
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={16} /> منحنى المبيعات وصافي الإيرادات والمرتجعات اليومية
                </Text>
                <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>تحديث تلقائي</Tag>
              </div>

              {trends.length > 0 ? (
                <SafeChartContainer height={270}>
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height} minWidth={0}>
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
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) => val.slice(5)}
                          stroke="#94a3b8"
                          fontSize={11}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                          formatter={(val, name) => [
                            `${Number(val).toLocaleString()} ج.م`,
                            name === 'gross_sales' ? 'إجمالي المبيعات' : name === 'net_sales' ? 'صافي المبيعات' : 'المرتجعات'
                          ]}
                          labelFormatter={(l) => `التاريخ: ${l}`}
                        />
                        <Legend
                          formatter={(val) =>
                            val === 'gross_sales' ? 'إجمالي المبيعات' : val === 'net_sales' ? 'صافي المبيعات' : 'المرتجعات'
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="gross_sales"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorGross)"
                        />
                        <Area
                          type="monotone"
                          dataKey="net_sales"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorNet)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </SafeChartContainer>
              ) : (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  لا توجد حركات مبيعات في النطاق الزمني المحدد
                </div>
              )}
            </div>
          </Col>

          {/* Payment Method Distribution Pie Chart */}
          <Col xs={24} lg={8}>
            <div
              className="swm-chart-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px',
                height: 340,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Text strong style={{ fontSize: 14, color: '#0f172a', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={16} /> توزيع المحصلات النقدية والبنكية
              </Text>

              {paymentPieData.length > 0 ? (
                <div style={{ flex: 1, position: 'relative' }}>
                  <SafeChartContainer height={220}>
                    {({ width, height }) => (
                      <ResponsiveContainer width={width} height={height} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={paymentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
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
                    )}
                  </SafeChartContainer>

                  {/* Legend underneath */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 11, marginTop: 4 }}>
                    {paymentPieData.map((p, idx) => (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 4 }} />
                        <span style={{ fontWeight: 600, color: '#334155' }}>{p.name.split(' ')[0]}</span>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.value.toLocaleString()} ج.م</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  لا توجد تدفقات نقدية مسجلة في هذا النطاق
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* ─── Salesperson Leaderboard & Performance ─── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#4f46e5" />
              <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                أداء ومبيعات طاقم الفرع (Salesperson KPIs)
              </Text>
            </div>
            <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 700 }}>
              {topSellers.length} بائعين نشطين
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
                render: (val) => (
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {val || 'غير محدد (كاشير عام)'}
                  </span>
                )
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
      </Spin>
    </Card>
  );
}
