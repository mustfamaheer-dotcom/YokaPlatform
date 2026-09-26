import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Statistic,
  message,
  Segmented,
  Progress,
  Badge,
  Alert,
  Tooltip,
  Divider,
  Modal,
  DatePicker,
  Select,
  Tabs
} from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  WalletOutlined,
  TagsOutlined,
  FireOutlined,
  ShopOutlined,
  TeamOutlined,
  EyeOutlined,
  CarOutlined,
  BankOutlined,
  SettingOutlined,
  CalendarOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;

export default function Analytics({ currentUser, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(29, 'day'), dayjs()]);
  const [isAllTime, setIsAllTime] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('all'); // 'all' | 'retail' | branch_id
  const [branchesList, setBranchesList] = useState([]);
  const [data, setData] = useState(null);
  const [hoveredTrendDay, setHoveredTrendDay] = useState(null);
  const [showAllShippingModal, setShowAllShippingModal] = useState(false);

  const rangePresets = [
    { label: 'اليوم', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: 'أمس', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
    { label: 'آخر 7 أيام', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
    { label: 'آخر 14 يوم', value: [dayjs().subtract(13, 'day').startOf('day'), dayjs().endOf('day')] },
    { label: 'آخر 30 يوم', value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
    { label: 'هذا الشهر', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'الشهر الماضي', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] }
  ];

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data.success) {
        setBranchesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        branch_id: selectedBranch
      };
      if (isAllTime || !dateRange || !dateRange[0] || !dateRange[1]) {
        params.days = 'all';
      } else {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/api/swm/analytics/overview', { params });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, isAllTime, selectedBranch]);

  const kpi = data?.kpi || {};
  const topProducts = data?.top_products || [];
  const paymentMethods = data?.payment_methods || [];
  const dailyTrend = data?.daily_sales_trend || [];
  const topCities = data?.top_cities || [];
  const allShippingZones = data?.all_shipping_zones || [];
  const insights = data?.insights || [];
  const selectedBranchMeta = data?.selected_branch || {};
  const branchesComparison = data?.branches_comparison || [];
  const staffPerformance = data?.staff_performance || [];

  // =========================================================
  // HELPER: RENDER PAYMENT METHODS DONUT CHART (SVG)
  // =========================================================
  const renderPaymentDonut = () => {
    const total = kpi.total_revenue || 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius; // ~345.57

    if (!paymentMethods.length || total === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
          <PieChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد معاملات دفع مسجلة في هذا المدى الزمني</div>
        </div>
      );
    }

    let cumulativePct = 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="18"
              />
              {paymentMethods.map((pm, i) => {
                const strokeDash = (pm.percentage / 100) * circumference;
                const strokeOffset = -((cumulativePct / 100) * circumference);
                cumulativePct += pm.percentage;

                return (
                  <circle
                    key={pm.key || i}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={pm.color}
                    strokeWidth="18"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                );
              })}
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none'
              }}
            >
              <Text style={{ fontSize: 10, color: '#64748b' }}>إجمالي التحصيل</Text>
              <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                {total > 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>ج.م</Text>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paymentMethods.map((pm) => (
              <div key={pm.key} style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                  <Space size={6}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: pm.color, display: 'inline-block' }} />
                    <Text strong style={{ fontSize: 13 }}>{pm.name_ar || pm.label}</Text>
                    {pm.provider && (
                      <Tag color={pm.provider === 'instapay' ? 'purple' : pm.provider === 'vodafone' ? 'red' : 'gold'} style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                        {pm.provider === 'instapay' ? 'إنستاباي' : pm.provider === 'vodafone' ? 'فودافون كاش' : pm.provider === 'cash' ? 'كاش' : pm.provider}
                      </Tag>
                    )}
                  </Space>
                  <span>
                    <strong style={{ color: '#0f172a' }}>{pm.amount.toFixed(0)} ج.م</strong>{' '}
                    <span style={{ color: '#64748b', fontSize: 11 }}>({pm.percentage}%)</span>
                  </span>
                </div>

                {pm.account_number && (
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, paddingRight: 16 }}>
                    حساب: <strong>{pm.account_number}</strong> {pm.account_name ? `(${pm.account_name})` : ''}
                  </div>
                )}

                <Progress
                  percent={pm.percentage}
                  strokeColor={pm.color}
                  showInfo={false}
                  size="small"
                  style={{ margin: 0 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  {pm.count} طلب
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // =========================================================
  // HELPER: RENDER DAILY SALES TREND CHART (SVG)
  // =========================================================
  const renderTrendChart = () => {
    if (!dailyTrend.length) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
          <LineChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد مبيعات مسجلة في هذا المدى الزمني</div>
        </div>
      );
    }

    const maxVal = Math.max(...dailyTrend.map((d) => d.revenue), 500);
    const chartHeight = 130;
    const svgWidth = 520;
    const paddingLeft = 35;
    const paddingRight = 15;
    const availableWidth = svgWidth - paddingLeft - paddingRight;
    const barWidth = Math.max(12, Math.min(36, (availableWidth / dailyTrend.length) - 8));
    const step = availableWidth / dailyTrend.length;

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        {hoveredTrendDay && (
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: 12,
              background: '#0f172a',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <div>تاريخ: <strong>{hoveredTrendDay.date}</strong> ({hoveredTrendDay.label})</div>
            <div>الإيراد: <strong style={{ color: '#4ade80' }}>{hoveredTrendDay.revenue.toFixed(2)} ج.م</strong></div>
            <div>عدد الطلبات: <strong>{hoveredTrendDay.orders}</strong> طلب</div>
          </div>
        )}

        <svg width="100%" height="160" viewBox={`0 0 ${svgWidth} 160`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="ecpBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1="20" x2={svgWidth - paddingRight} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1="75" x2={svgWidth - paddingRight} y2="75" stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1="130" x2={svgWidth - paddingRight} y2="130" stroke="#e2e8f0" strokeWidth="1" />

          {/* Bars */}
          {dailyTrend.map((d, idx) => {
            const h = maxVal > 0 ? (d.revenue / maxVal) * (chartHeight - 20) : 0;
            const x = paddingLeft + (idx * step) + (step - barWidth) / 2;
            const y = 130 - h;

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredTrendDay(d)}
                onMouseLeave={() => setHoveredTrendDay(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, h)}
                  rx="4"
                  fill="url(#salesBarGrad)"
                  opacity={hoveredTrendDay?.date === d.date ? 1 : 0.85}
                />
                {/* Revenue text above bar */}
                {h > 20 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#15803d"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {d.revenue > 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue.toFixed(0)}
                  </text>
                )}
                {/* Date Label */}
                <text
                  x={x + barWidth / 2}
                  y="146"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Top Products Table Columns
  const productColumns = [
    {
      title: 'الترتيب',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (rank) => {
        if (rank === 1) return <Tag color="gold" style={{ fontWeight: 'bold' }}>🥇 1</Tag>;
        if (rank === 2) return <Tag color="default" style={{ fontWeight: 'bold' }}>🥈 2</Tag>;
        if (rank === 3) return <Tag color="orange" style={{ fontWeight: 'bold' }}>🥉 3</Tag>;
        return <Text strong style={{ color: '#64748b' }}>#{rank}</Text>;
      }
    },
    {
      title: 'اسم المنتج',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <div>
          <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{name}</Text>
          {row.sku && row.sku !== 'N/A' && (
            <div style={{ fontSize: 11, color: '#64748b' }}>كود: {row.sku}</div>
          )}
        </div>
      )
    },
    {
      title: 'القطع المباعة',
      dataIndex: 'units_sold',
      key: 'units_sold',
      width: 120,
      render: (units) => (
        <Tag color="blue" icon={<FireOutlined />} style={{ padding: '2px 8px', fontWeight: 600 }}>
          {units} قطعة
        </Tag>
      )
    },
    {
      title: 'إجمالي الإيرادات',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 150,
      render: (rev) => (
        <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
          {parseFloat(rev).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'الحصة من المبيعات',
      dataIndex: 'revenue_percentage',
      key: 'revenue_percentage',
      width: 170,
      render: (pct) => (
        <div style={{ width: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
            <span style={{ color: '#64748b' }}>النسبة</span>
            <strong>{pct}%</strong>
          </div>
          <Progress percent={pct} strokeColor="#10b981" size="small" showInfo={false} />
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header & Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            لوحة الإحصائيات والتحليلات الذكية (Business Intelligence & Analytics)
          </Title>
          <Text type="secondary">
            تحليل دقيق ومباشر لحركة المنتجات الأكثر مبيعاً، سلوك طرق الدفع، ومنحنى المبيعات لاتخاذ القرارات
          </Text>
        </div>

        <Space wrap align="center">
          <Space size={6}>
            <ShopOutlined style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>الفرع:</span>
          </Space>

          <Select
            value={selectedBranch}
            onChange={(val) => setSelectedBranch(val)}
            style={{ minWidth: 230 }}
            popupMatchSelectWidth={false}
          >
            <Select.Option value="all">
              <Space>
                <Tag color="blue" style={{ margin: 0 }}>🌐 الكل</Tag>
                <span>جميع الفروع والمستودعات</span>
              </Space>
            </Select.Option>
            <Select.Option value="retail">
              <Space>
                <Tag color="green" style={{ margin: 0 }}>🏬 تجزئة</Tag>
                <span>جميع فروع التجزئة فقط</span>
              </Space>
            </Select.Option>
            {branchesList.length > 0 && (
              <>
                <Select.OptGroup label="معارض وفروع التجزئة (Retail Branches)">
                  {branchesList
                    .filter((b) => b.branch_type === 'retail_branch')
                    .map((b) => (
                      <Select.Option key={b.id} value={String(b.id)}>
                        🏬 {b.branch_name} ({b.branch_code})
                      </Select.Option>
                    ))}
                </Select.OptGroup>
                <Select.OptGroup label="المستودعات والمركز">
                  {branchesList
                    .filter((b) => b.branch_type !== 'retail_branch')
                    .map((b) => (
                      <Select.Option key={b.id} value={String(b.id)}>
                        📦 {b.branch_name} ({b.branch_code})
                      </Select.Option>
                    ))}
                </Select.OptGroup>
              </>
            )}
          </Select>

          <Divider type="vertical" style={{ height: 24 }} />

          <Space size={6}>
            <CalendarOutlined style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>المدى الزمني:</span>
          </Space>

          <DatePicker.RangePicker
            value={isAllTime ? null : dateRange}
            onChange={(dates) => {
              if (!dates || !dates[0] || !dates[1]) {
                setIsAllTime(true);
                setDateRange(null);
              } else {
                setIsAllTime(false);
                setDateRange(dates);
              }
            }}
            format="YYYY-MM-DD"
            placeholder={['من تاريخ', 'إلى تاريخ']}
            presets={rangePresets}
            allowClear
            style={{ borderRadius: 8, minWidth: 240 }}
          />

          <Button
            type={isAllTime ? 'primary' : 'default'}
            onClick={() => {
              setIsAllTime(true);
              setDateRange(null);
            }}
            style={{ borderRadius: 8 }}
          >
            كل الأوقات
          </Button>

          <Button icon={<ReloadOutlined />} onClick={fetchAnalytics} loading={loading} style={{ borderRadius: 8 }}>
            تحديث
          </Button>
        </Space>
      </div>

      {/* Active Branch and Range Summary Alert / Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#f8fafc',
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid #e2e8f0'
        }}
      >
        <Space size={14} wrap align="center">
          <Space size={6}>
            <ShopOutlined style={{ color: '#2563eb', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>نطاق الفرع المختار:</span>
            <Tag color="geekblue" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
              {selectedBranchMeta.name || (selectedBranch === 'retail' ? 'جميع فروع التجزئة' : 'جميع الفروع والمستودعات')}
            </Tag>
          </Space>

          <Divider type="vertical" style={{ height: 18 }} />

          <Space size={6}>
            <CalendarOutlined style={{ color: '#2563eb', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>الفترة الزمنية النشطة:</span>
            <Tag color={isAllTime || !dateRange ? 'purple' : 'blue'} style={{ fontSize: 12, padding: '3px 10px', fontWeight: 600 }}>
              {isAllTime || !dateRange
                ? 'سجل المبيعات والطلبات الكامل (كل الأوقات)'
                : `من ${dateRange[0]?.format('YYYY-MM-DD')} إلى ${dateRange[1]?.format('YYYY-MM-DD')} (${(dateRange[1]?.diff(dateRange[0], 'day') || 0) + 1} يوم)`}
            </Tag>
          </Space>
        </Space>

        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          تصفية تفاعلية للفروع مع تحليلات المنتجات وطرق الدفع وأداء البائعين
        </span>
      </div>

      {/* ========================================================= */}
      {/* STRATEGIC TOP KPIS ROW */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 1: Total Revenue */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي المبيعات المحققة"
              value={kpi.total_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              صالة: <strong>{(kpi.pos_revenue || 0).toFixed(0)}</strong> | أونلاين: <strong>{(kpi.ecp_revenue || 0).toFixed(0)}</strong>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Total Orders */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي عدد الطلبات"
              value={kpi.total_orders || 0}
              suffix="طلب"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              معاملات مؤكدة ومنفذة
            </div>
          </Card>
        </Col>

        {/* KPI 3: Average Order Value (AOV) */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="متوسط قيمة الطلب (AOV)"
              value={kpi.average_order_value || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#0284c7', fontWeight: 'bold', fontSize: 20 }}
              prefix={<RiseOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              معدل إنفاق العميل بالطلب
            </div>
          </Card>
        </Col>

        {/* KPI 4: Total Units Sold */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="القطع والوحدات المباعة"
              value={kpi.total_units_sold || 0}
              suffix="قطعة"
              valueStyle={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 20 }}
              prefix={<TagsOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              من المخزون الفعلي
            </div>
          </Card>
        </Col>

        {/* KPI 5: Delivery & Fulfillment Rate */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="نسبة تسليم وإتمام الطلبات"
              value={kpi.fulfillment_rate || 100}
              suffix="%"
              valueStyle={{ color: '#059669', fontWeight: 'bold', fontSize: 20 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              معدل نجاح التوصيل
            </div>
          </Card>
        </Col>

        {/* KPI 6: Top Performer Product */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, background: '#fffbeb', borderTop: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <TrophyOutlined style={{ color: '#f59e0b', marginLeft: 4 }} />
              المنتج البطل (Top Performer)
            </div>
            <Text strong ellipsis style={{ fontSize: 15, color: '#b45309', display: 'block' }}>
              {kpi.top_product_name || 'لا يوجد'}
            </Text>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              الأعلى تحقيقاً للعوائد
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* SMART ACTIONABLE DECISION INSIGHTS */}
      {/* ========================================================= */}
      {insights.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ThunderboltOutlined style={{ color: '#2563eb', fontSize: 16 }} />
            <Text strong style={{ fontSize: 14 }}>رؤى وتوصيات اتخاذ القرار الذكية (Smart Actionable Insights)</Text>
          </div>
          <Row gutter={[12, 12]}>
            {insights.map((ins, idx) => (
              <Col xs={24} md={8} key={idx}>
                <Alert
                  type={ins.type}
                  showIcon
                  message={<Text strong style={{ fontSize: 13 }}>{ins.title}</Text>}
                  description={<div style={{ fontSize: 12, color: '#475569' }}>{ins.description}</div>}
                  style={{ borderRadius: 8, height: '100%' }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* ========================================================= */}
      {/* CHARTS ROW 1: PRODUCTS ANALYTICS & PAYMENT METHODS */}
      {/* ========================================================= */}
      <Row gutter={[16, 16]}>
        {/* CHART 1: PAYMENT METHODS BREAKDOWN */}
        <Col xs={24} lg={10}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <PieChartOutlined style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>تحليل طرق الدفع والتحصيل (Payment Methods)</span>
              </Space>
            }
          >
            {renderPaymentDonut()}
          </Card>
        </Col>

        {/* CHART 2: DAILY SALES & ORDERS TREND */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <LineChartOutlined style={{ color: '#10b981' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>منحنى المبيعات والطلبات اليومي (Daily Sales Trend)</span>
              </Space>
            }
          >
            {renderTrendChart()}
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* CHARTS ROW 2: TOP SELLING PRODUCTS TABLE & GEOGRAPHIC DEMAND */}
      {/* ========================================================= */}
      <Row gutter={[16, 16]}>
        {/* TOP PRODUCTS TABLE */}
        <Col xs={24} lg={16}>
          <Card
            size="small"
            style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <TrophyOutlined style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>المنتجات الأكثر مبيعاً وتحقيقاً للإيرادات (Best Sellers)</span>
                </Space>
                <Tag color="blue">{topProducts.length} منتج مسجل</Tag>
              </div>
            }
          >
            <Table
              dataSource={topProducts}
              columns={productColumns}
              rowKey="rank"
              loading={loading}
              pagination={{ pageSize: 7 }}
              size="middle"
              bordered
            />
          </Card>
        </Col>

        {/* RIGHT COLUMN: STAFF PERFORMANCE & GEOGRAPHIC DEMAND */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            bodyStyle={{ padding: '8px 12px' }}
          >
            <Tabs
              defaultActiveKey={['retail', '3', '5', '6'].includes(selectedBranch) ? 'staff' : (selectedBranch === '2' ? 'shipping' : 'staff')}
              items={[
                {
                  key: 'staff',
                  label: (
                    <Space size={4}>
                      <TeamOutlined style={{ color: '#059669' }} />
                      <span>أداء البائعين والكاشير</span>
                      {staffPerformance.length > 0 && (
                        <Badge count={staffPerformance.length} style={{ backgroundColor: '#059669', fontSize: 10 }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div>
                      {staffPerformance.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingTop: 6 }}>
                          {staffPerformance.map((st, i) => (
                            <div
                              key={st.staff_name + i}
                              style={{
                                background: '#f8fafc',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space size={6}>
                                  <Badge count={i + 1} style={{ backgroundColor: i === 0 ? '#10b981' : '#64748b' }} />
                                  <Text strong style={{ fontSize: 13 }}>{st.staff_name}</Text>
                                  {st.branch_name && (
                                    <Tag color="geekblue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                                      {st.branch_name}
                                    </Tag>
                                  )}
                                </Space>
                                <Tag color="cyan" style={{ fontWeight: 600 }}>
                                  {st.invoice_count} فاتورة
                                </Tag>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginTop: 4, background: '#ffffff', padding: '4px 8px', borderRadius: 4 }}>
                                <span>إجمالي المبيعات: <strong style={{ color: '#16a34a' }}>{parseFloat(st.total_sales).toFixed(2)} ج.م</strong></span>
                                <span>متوسط الفاتورة: <strong style={{ color: '#0284c7' }}>{parseFloat(st.avg_ticket || 0).toFixed(0)} ج.م</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          <TeamOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
                          <div>لا توجد فواتير بيع مسجلة للبائعين في هذه الفترة</div>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'shipping',
                  label: (
                    <Space size={4}>
                      <EnvironmentOutlined style={{ color: '#0284c7' }} />
                      <span>شحن المحافظات</span>
                      {topCities.length > 0 && (
                        <Badge count={topCities.length} style={{ backgroundColor: '#0284c7', fontSize: 10 }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div>
                      <div style={{ marginBottom: 10, background: '#f0fdf4', padding: '6px 10px', borderRadius: 6, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#166534' }}>رسوم الشحن المحصلة:</span>
                        <Space>
                          <strong style={{ color: '#15803d' }}>{(kpi.total_shipping_revenue || 0).toFixed(2)} ج.م</strong>
                          {allShippingZones.length > 0 && (
                            <Button
                              size="small"
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => setShowAllShippingModal(true)}
                              style={{ padding: 0, fontSize: 11, color: '#0284c7', marginRight: 8 }}
                            >
                              كافة المحافظات ({allShippingZones.length})
                            </Button>
                          )}
                        </Space>
                      </div>

                      {topCities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                          {topCities.map((c, i) => (
                            <div
                              key={c.city + (c.city_code || '')}
                              style={{
                                background: '#f8fafc',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space size={6}>
                                  <Badge count={i + 1} style={{ backgroundColor: i === 0 ? '#f59e0b' : '#64748b' }} />
                                  <Text strong style={{ fontSize: 13 }}>{c.city}</Text>
                                  {c.city_code && (
                                    <Tag color="geekblue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                                      {c.city_code}
                                    </Tag>
                                  )}
                                </Space>
                                <Tag color="cyan" style={{ fontWeight: 600 }}>
                                  {c.count} طلب ({c.percentage}%)
                                </Tag>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginTop: 4, background: '#ffffff', padding: '4px 8px', borderRadius: 4 }}>
                                <span>سعر الشحن: <strong style={{ color: '#0284c7' }}>{c.shipping_fee > 0 ? `${c.shipping_fee} ج.م` : 'مجاني/مخصص'}</strong></span>
                                {c.estimated_days && c.estimated_days !== '-' && (
                                  <span>التوصيل: <strong style={{ color: '#475569' }}>{c.estimated_days}</strong></span>
                                )}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                <span>قيمة المبيعات: <strong style={{ color: '#16a34a' }}>{c.revenue.toFixed(0)} ج.م</strong></span>
                                {c.shipping_collected > 0 && (
                                  <span>رسوم شحن: <strong style={{ color: '#059669' }}>{c.shipping_collected.toFixed(0)} ج.م</strong></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          <EnvironmentOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
                          <div>لا توجد شحنات مسجلة للمحافظات في هذا الفرع/الفترة</div>
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* CHARTS ROW 3: MULTI-BRANCH PERFORMANCE COMPARISON */}
      {/* ========================================================= */}
      {branchesComparison.length > 0 && (selectedBranch === 'all' || selectedBranch === 'retail') && (
        <Card
          size="small"
          style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ShopOutlined style={{ color: '#2563eb' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  مقارنة أداء وحصص مبيعات الفروع (Branch Performance Breakdown)
                </span>
              </Space>
              <Tag color="blue">{branchesComparison.length} فرع مسجل</Tag>
            </div>
          }
        >
          <Table
            dataSource={branchesComparison}
            rowKey="branch_id"
            pagination={false}
            size="middle"
            bordered
            columns={[
              {
                title: 'الفرع / المستودع',
                dataIndex: 'branch_name',
                key: 'branch_name',
                render: (name, row) => (
                  <Space>
                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                    <Tag color={row.branch_type === 'retail_branch' ? 'green' : (row.branch_type === 'ecom_warehouse' ? 'purple' : 'geekblue')}>
                      {row.branch_type === 'retail_branch' ? 'فرع تجزئة' : (row.branch_type === 'ecom_warehouse' ? 'متجر إلكتروني' : 'مستودع رئيسي')}
                    </Tag>
                    {row.branch_code && <span style={{ fontSize: 11, color: '#94a3b8' }}>({row.branch_code})</span>}
                  </Space>
                )
              },
              {
                title: 'مبيعات الصالة (POS)',
                dataIndex: 'pos_sales',
                key: 'pos_sales',
                width: 170,
                render: (amt, row) => (
                  <div>
                    <strong style={{ color: '#0f172a' }}>{parseFloat(amt).toFixed(2)} ج.م</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{row.pos_count} فاتورة</div>
                  </div>
                )
              },
              {
                title: 'مبيعات المتجر (ECP)',
                dataIndex: 'ecp_sales',
                key: 'ecp_sales',
                width: 170,
                render: (amt, row) => (
                  <div>
                    <strong style={{ color: '#8b5cf6' }}>{parseFloat(amt).toFixed(2)} ج.م</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{row.ecp_count} طلب</div>
                  </div>
                )
              },
              {
                title: 'إجمالي مبيعات الفرع',
                dataIndex: 'total_sales',
                key: 'total_sales',
                width: 180,
                render: (amt) => (
                  <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
                    {parseFloat(amt).toFixed(2)} ج.م
                  </Text>
                )
              },
              {
                title: 'الحصة من الإجمالي',
                dataIndex: 'share_percentage',
                key: 'share_percentage',
                width: 190,
                render: (pct) => (
                  <div style={{ width: 160 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#64748b' }}>المساهمة</span>
                      <strong>{pct}%</strong>
                    </div>
                    <Progress percent={pct} strokeColor="#2563eb" size="small" showInfo={false} />
                  </div>
                )
              },
              {
                title: 'تخصيص',
                key: 'action',
                width: 130,
                render: (_, row) => (
                  <Button
                    size="small"
                    type="link"
                    icon={<ArrowRightOutlined />}
                    onClick={() => setSelectedBranch(String(row.branch_id))}
                  >
                    تحليلات الفرع
                  </Button>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* ========================================================= */}
      {/* ALL SHIPPING RATES & GOVERNORATES MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: '#2563eb' }} />
            <span>قائمة أسعار الشحن والتوصيل للمحافظات والمدن المصرية ومعدلات الطلب</span>
          </Space>
        }
        open={showAllShippingModal}
        onCancel={() => setShowAllShippingModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowAllShippingModal(false)}>
            إغلاق
          </Button>
        ]}
        width={850}
      >
        <Table
          dataSource={allShippingZones}
          rowKey="rate_id"
          pagination={{ pageSize: 10 }}
          size="middle"
          bordered
          columns={[
            {
              title: 'المدينة / المحافظة',
              dataIndex: 'city_name',
              key: 'city_name',
              render: (name, row) => (
                <Space>
                  <Text strong>{name}</Text>
                  {row.city_code && <Tag color="blue">{row.city_code}</Tag>}
                </Space>
              )
            },
            {
              title: 'سعر الشحن المعتمد',
              dataIndex: 'shipping_fee',
              key: 'shipping_fee',
              width: 140,
              render: (fee) => <strong style={{ color: '#0284c7' }}>{fee} ج.م</strong>
            },
            {
              title: 'المدة المتوقعة',
              dataIndex: 'estimated_days',
              key: 'estimated_days',
              width: 130,
              render: (days) => <span style={{ color: '#64748b' }}>{days}</span>
            },
            {
              title: 'عدد الطلبات',
              dataIndex: 'count',
              key: 'count',
              width: 100,
              render: (cnt) => (
                <Tag color={cnt > 0 ? 'green' : 'default'} style={{ fontWeight: cnt > 0 ? 'bold' : 'normal' }}>
                  {cnt} طلب
                </Tag>
              )
            },
            {
              title: 'إجمالي المبيعات',
              dataIndex: 'revenue',
              key: 'revenue',
              width: 130,
              render: (rev) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{parseFloat(rev || 0).toFixed(0)} ج.م</span>
            },
            {
              title: 'الحالة',
              dataIndex: 'is_active',
              key: 'is_active',
              width: 90,
              render: (active) => (
                <Tag color={active ? 'success' : 'error'}>
                  {active ? 'نشط' : 'معطل'}
                </Tag>
              )
            }
          ]}
        />
      </Modal>
    </div>
  );
}
