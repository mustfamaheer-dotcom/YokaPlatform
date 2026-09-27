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
  Progress,
  Badge,
  Alert,
  Tooltip,
  Divider,
  DatePicker,
  Select
} from 'antd';
import {
  ShopOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  TagsOutlined,
  TrophyOutlined,
  TeamOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  CreditCardOutlined,
  WalletOutlined,
  BankOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;

export default function RetailAnalytics({ currentUser, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(29, 'day'), dayjs()]);
  const [isAllTime, setIsAllTime] = useState(false);
  
  // Default to user's branch if retail branch account, otherwise 'retail' for all retail branches
  const initialBranch = currentUser?.branchType === 'retail_branch' && currentUser?.branchId
    ? String(currentUser.branchId)
    : 'retail';

  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [branchesList, setBranchesList] = useState([]);
  const [data, setData] = useState(null);
  const [hoveredTrendDay, setHoveredTrendDay] = useState(null);

  const isRetailUser = currentUser?.branchType === 'retail_branch';

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
      console.error('Fetch retail analytics error:', err);
      message.error(err.response?.data?.message || 'فشل في تحميل إحصائيات فروع التجزئة');
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
  const insights = data?.insights || [];
  const selectedBranchMeta = data?.selected_branch || {};
  const branchesComparison = data?.branches_comparison || [];
  const staffPerformance = data?.staff_performance || [];

  // Retail only branches list
  const retailBranches = branchesList.filter((b) => b.branch_type === 'retail_branch');
  const topBranchPerformer = branchesComparison.length > 0 ? branchesComparison[0] : null;

  // =========================================================
  // HELPER: RENDER PAYMENT METHODS DONUT CHART (SVG)
  // =========================================================
  const renderPaymentDonut = () => {
    const total = kpi.total_revenue || 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius;

    if (!paymentMethods.length || total === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
          <PieChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد معاملات تحصيل مسجلة لفروع التجزئة في هذا المدى الزمني</div>
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

          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paymentMethods.map((pm) => (
              <div key={pm.key} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                  <Space size={6}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: pm.color, display: 'inline-block' }} />
                    <Text strong style={{ fontSize: 13 }}>{pm.name_ar || pm.label}</Text>
                  </Space>
                  <span>
                    <strong style={{ color: '#0f172a' }}>{pm.amount.toFixed(0)} ج.م</strong>{' '}
                    <span style={{ color: '#64748b', fontSize: 11 }}>({pm.percentage}%)</span>
                  </span>
                </div>

                <Progress
                  percent={pm.percentage}
                  strokeColor={pm.color}
                  showInfo={false}
                  size="small"
                  style={{ margin: 0 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  {pm.count} معاملة بيع
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
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          <LineChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد بيانات مبيعات يومية كافية في هذا المدى الزمني</div>
        </div>
      );
    }

    const maxSales = Math.max(...dailyTrend.map((d) => d.pos_revenue || d.total_revenue || 0), 100);
    const chartHeight = 150;
    const chartWidth = 560;
    const stepX = chartWidth / (dailyTrend.length > 1 ? dailyTrend.length - 1 : 1);

    const points = dailyTrend.map((d, index) => {
      const sales = d.pos_revenue || d.total_revenue || 0;
      const x = index * stepX;
      const y = chartHeight - (sales / maxSales) * (chartHeight - 20) - 10;
      return { x, y, ...d, sales };
    });

    const pathData = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );
    const fillPathData = `${pathData} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`;

    return (
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: 10 }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 160, overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="retailTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={chartHeight - pct * (chartHeight - 20) - 10}
              x2={chartWidth}
              y2={chartHeight - pct * (chartHeight - 20) - 10}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
          ))}

          <path d={fillPathData} fill="url(#retailTrendGradient)" />
          <path d={pathData} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredTrendDay?.date === p.date ? 6 : 3.5}
              fill={hoveredTrendDay?.date === p.date ? '#15803d' : '#ffffff'}
              stroke="#16a34a"
              strokeWidth="2.5"
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={() => setHoveredTrendDay(p)}
              onMouseLeave={() => setHoveredTrendDay(null)}
            />
          ))}
        </svg>

        {hoveredTrendDay && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 16,
              background: '#0f172a',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              zIndex: 10
            }}
          >
            <div>📅 {hoveredTrendDay.date}</div>
            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>
              مبيعات الصالة: {hoveredTrendDay.sales.toFixed(2)} ج.م
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 11 }}>
              عدد الفواتير: {hoveredTrendDay.pos_invoices_count || hoveredTrendDay.total_orders || 0} فاتورة
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          <span>{dailyTrend[0]?.date}</span>
          <span>منحنى مبيعات فروع التجزئة اليومية</span>
          <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  // Products Table Columns
  const productColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 50,
      render: (r) => (
        <Badge
          count={r}
          style={{
            backgroundColor: r === 1 ? '#eab308' : r === 2 ? '#94a3b8' : r === 3 ? '#b45309' : '#e2e8f0',
            color: r <= 3 ? '#fff' : '#475569'
          }}
        />
      )
    },
    {
      title: 'اسم المنتج',
      dataIndex: 'name',
      key: 'name',
      render: (text, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{text}</Text>
          {row.sku && <div style={{ fontSize: 11, color: '#94a3b8' }}>كود: {row.sku}</div>}
        </div>
      )
    },
    {
      title: 'الكمية المباعة',
      dataIndex: 'units_sold',
      key: 'units_sold',
      width: 120,
      render: (units) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
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
        <strong style={{ color: '#16a34a', fontSize: 14 }}>
          {rev.toFixed(2)} ج.م
        </strong>
      )
    },
    {
      title: 'الحصة من الإجمالي',
      dataIndex: 'revenue_percentage',
      key: 'revenue_percentage',
      width: 140,
      render: (pct) => (
        <div style={{ width: 110 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{pct}%</div>
          <Progress percent={pct} size="small" strokeColor="#16a34a" showInfo={false} />
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ========================================================= */}
      {/* HEADER BAR & CONTROLS */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
            <ShopOutlined style={{ color: '#16a34a', marginLeft: 8 }} />
            إحصائيات وتحليلات فروع التجزئة (Retail Branches Analytics)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            متابعة دقيقة لمبيعات الصالات ونقاط البيع (POS)، أداء الكاشير والبائعين، وطرق التحصيل
          </Text>
        </div>

        <Space size="middle" wrap>
          {/* Retail Branch Filter Selector */}
          <Space size={6}>
            <ShopOutlined style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>الفرع:</span>
          </Space>

          <Select
            value={selectedBranch}
            onChange={(val) => setSelectedBranch(val)}
            disabled={isRetailUser && !!currentUser?.branchId}
            style={{ minWidth: 230 }}
            popupMatchSelectWidth={false}
          >
            <Select.Option value="retail">
              <Space>
                <Tag color="green" style={{ margin: 0 }}>🏬 تجزئة</Tag>
                <span>جميع فروع التجزئة (Retail Branches)</span>
              </Space>
            </Select.Option>
            {retailBranches.length > 0 && (
              <Select.OptGroup label="معارض وفروع التجزئة المتاحة">
                {retailBranches.map((b) => (
                  <Select.Option key={b.id} value={String(b.id)}>
                    🏬 {b.branch_name} ({b.branch_code})
                  </Select.Option>
                ))}
              </Select.OptGroup>
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

      {/* Active Scope Summary Banner */}
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
            <ShopOutlined style={{ color: '#16a34a', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>نطاق الفرع المختار:</span>
            <Tag color="green" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
              {selectedBranchMeta.name || (selectedBranch === 'retail' ? 'جميع فروع التجزئة' : 'فرع التجزئة المحدد')}
            </Tag>
          </Space>

          <Divider type="vertical" style={{ height: 18 }} />

          <Space size={6}>
            <CalendarOutlined style={{ color: '#2563eb', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>الفترة الزمنية النشطة:</span>
            <Tag color={isAllTime || !dateRange ? 'purple' : 'blue'} style={{ fontSize: 12, padding: '3px 10px', fontWeight: 600 }}>
              {isAllTime || !dateRange
                ? 'سجل المبيعات الكامل (كل الأوقات)'
                : `من ${dateRange[0]?.format('YYYY-MM-DD')} إلى ${dateRange[1]?.format('YYYY-MM-DD')} (${(dateRange[1]?.diff(dateRange[0], 'day') || 0) + 1} يوم)`}
            </Tag>
          </Space>
        </Space>

        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          تحليلات مخصصة لنقاط البيع والمعارض والمبيعات المباشرة
        </span>
      </div>

      {/* ========================================================= */}
      {/* RETAIL KPIS ROW */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 1: Retail Revenue */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <Statistic
              title="إجمالي مبيعات فروع التجزئة"
              value={kpi.total_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: 'clamp(16px, 3.8vw, 20px)' }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              مبيعات الصالات ونقاط البيع (POS)
            </div>
          </Card>
        </Col>

        {/* KPI 2: Total Invoices */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <Statistic
              title="إجمالي عدد الفواتير"
              value={kpi.total_orders || 0}
              suffix="فاتورة"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: 'clamp(16px, 3.8vw, 20px)' }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              فواتير صالة مكتملة ومنفذة
            </div>
          </Card>
        </Col>

        {/* KPI 3: Average Ticket Value */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <Statistic
              title="متوسط قيمة الفاتورة"
              value={kpi.average_order_value || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#0284c7', fontWeight: 'bold', fontSize: 'clamp(16px, 3.8vw, 20px)' }}
              prefix={<RiseOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              معدل إنفاق العميل في الزيارة
            </div>
          </Card>
        </Col>

        {/* KPI 4: Units Sold */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <Statistic
              title="القطع والوحدات المباعة"
              value={kpi.total_units_sold || 0}
              suffix="قطعة"
              valueStyle={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 'clamp(16px, 3.8vw, 20px)' }}
              prefix={<TagsOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              سحوبات من مخزون المعارض
            </div>
          </Card>
        </Col>

        {/* KPI 5: Top Retail Product */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, background: '#fffbeb', borderTop: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <TrophyOutlined style={{ color: '#f59e0b', marginLeft: 4 }} />
              المنتج الأكثر طلباً بالصالات
            </div>
            <Text strong ellipsis style={{ fontSize: 14, color: '#b45309', display: 'block' }}>
              {kpi.top_product_name || 'لا يوجد'}
            </Text>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              الأعلى مبيعاً في المعارض
            </div>
          </Card>
        </Col>

        {/* KPI 6: Top Performing Branch */}
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <ShopOutlined style={{ color: '#059669', marginLeft: 4 }} />
              أفضل فرع تجزئة أداءً
            </div>
            <Text strong ellipsis style={{ fontSize: 14, color: '#059669', display: 'block' }}>
              {topBranchPerformer?.branch_name || 'الفرع المحدد'}
            </Text>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              {topBranchPerformer ? `${topBranchPerformer.pos_sales.toFixed(0)} ج.م (${topBranchPerformer.share_percentage}%)` : 'فرع وحيد'}
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
            <ThunderboltOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            <Text strong style={{ fontSize: 14 }}>رؤى وتوصيات اتخاذ القرار لفروع التجزئة</Text>
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
      {/* CHARTS ROW 1: PAYMENT METHODS & DAILY SALES TREND */}
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
                <span style={{ fontSize: 14, fontWeight: 600 }}>طرق التحصيل ونقاط البيع بالمعارض (POS Payments)</span>
              </Space>
            }
          >
            {renderPaymentDonut()}
          </Card>
        </Col>

        {/* CHART 2: DAILY SALES & INVOICES TREND */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <LineChartOutlined style={{ color: '#16a34a' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>منحنى المبيعات اليومية لفروع التجزئة (Daily Trend)</span>
              </Space>
            }
          >
            {renderTrendChart()}
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* CHARTS ROW 2: TOP SELLING PRODUCTS & STAFF PERFORMANCE */}
      {/* ========================================================= */}
      <Row gutter={[16, 16]}>
        {/* TOP PRODUCTS TABLE */}
        <Col xs={24} lg={15}>
          <Card
            size="small"
            style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <TrophyOutlined style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>المنتجات الأكثر مبيعاً في فروع التجزئة (Best Sellers)</span>
                </Space>
                <Tag color="green">{topProducts.length} منتج مسجل</Tag>
              </div>
            }
          >
            <Table
              dataSource={topProducts}
              columns={productColumns}
              rowKey="rank"
              loading={loading}
              pagination={{ pageSize: 6 }}
              size="middle"
              bordered
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        {/* STAFF PERFORMANCE */}
        <Col xs={24} lg={9}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            title={
              <Space>
                <TeamOutlined style={{ color: '#059669' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>أداء البائعين والكاشير (Staff Performance)</span>
                {staffPerformance.length > 0 && (
                  <Badge count={staffPerformance.length} style={{ backgroundColor: '#059669', fontSize: 10 }} />
                )}
              </Space>
            }
          >
            {staffPerformance.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
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
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* CHARTS ROW 3: RETAIL BRANCHES PERFORMANCE COMPARISON */}
      {/* ========================================================= */}
      {branchesComparison.length > 0 && selectedBranch === 'retail' && (
        <Card
          size="small"
          style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ShopOutlined style={{ color: '#16a34a' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  مقارنة أداء وحصص مبيعات فروع التجزئة (Retail Branches Comparison)
                </span>
              </Space>
              <Tag color="green">{branchesComparison.length} فرع مسجل</Tag>
            </div>
          }
        >
          <Table
            dataSource={branchesComparison}
            rowKey="branch_id"
            pagination={false}
            size="middle"
            bordered
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'فرع التجزئة',
                dataIndex: 'branch_name',
                key: 'branch_name',
                render: (name, row) => (
                  <Space>
                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                    <Tag color="green">فرع تجزئة</Tag>
                    {row.branch_code && <span style={{ fontSize: 11, color: '#94a3b8' }}>({row.branch_code})</span>}
                  </Space>
                )
              },
              {
                title: 'مبيعات الصالة (POS)',
                dataIndex: 'pos_sales',
                key: 'pos_sales',
                width: 200,
                render: (amt, row) => (
                  <div>
                    <strong style={{ color: '#16a34a', fontSize: 14 }}>{parseFloat(amt).toFixed(2)} ج.م</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{row.pos_count} فاتورة منفذة</div>
                  </div>
                )
              },
              {
                title: 'متوسط الفاتورة بالفرع',
                key: 'avg_branch',
                width: 170,
                render: (_, row) => {
                  const avg = row.pos_count > 0 ? (row.pos_sales / row.pos_count) : 0;
                  return (
                    <Text strong style={{ color: '#0284c7' }}>
                      {avg.toFixed(2)} ج.م
                    </Text>
                  );
                }
              },
              {
                title: 'الحصة من مبيعات التجزئة',
                dataIndex: 'share_percentage',
                key: 'share_percentage',
                width: 220,
                render: (pct) => (
                  <div style={{ width: 180 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: '#64748b' }}>المساهمة</span>
                      <strong>{pct}%</strong>
                    </div>
                    <Progress percent={pct} strokeColor="#16a34a" size="small" showInfo={false} />
                  </div>
                )
              },
              {
                title: 'تخصيص',
                key: 'action',
                width: 140,
                render: (_, row) => (
                  <Button
                    size="small"
                    type="link"
                    icon={<ArrowRightOutlined />}
                    onClick={() => setSelectedBranch(String(row.branch_id))}
                  >
                    تحليلات هذا الفرع
                  </Button>
                )
              }
            ]}
          />
        </Card>
      )}
    </div>
  );
}
