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
  Modal,
  DatePicker,
  Tabs
} from 'antd';
import {
  InboxOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CarOutlined,
  EyeOutlined,
  TagsOutlined,
  CreditCardOutlined,
  WalletOutlined,
  BankOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;

export default function EcomAnalytics({ currentUser, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(29, 'day'), dayjs()]);
  const [isAllTime, setIsAllTime] = useState(false);
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

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        branch_id: 'ecom'
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
      console.error('Fetch ecom analytics error:', err);
      message.error(err.response?.data?.message || 'فشل في تحميل إحصائيات المتجر الإلكتروني');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, isAllTime]);

  const kpi = data?.kpi || {};
  const topProducts = data?.top_products || [];
  const paymentMethods = data?.payment_methods || [];
  const dailyTrend = data?.daily_sales_trend || [];
  const topCities = data?.top_cities || [];
  const allShippingZones = data?.all_shipping_zones || [];
  const insights = data?.insights || [];
  const staffPerformance = data?.staff_performance || [];

  // =========================================================
  // HELPER: RENDER E-COMMERCE PAYMENT METHODS DONUT CHART (SVG)
  // =========================================================
  const renderPaymentDonut = () => {
    const total = kpi.total_revenue || 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius;

    if (!paymentMethods.length || total === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
          <PieChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد معاملات دفع مسجلة للمتجر في هذا المدى الزمني</div>
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
              <Text style={{ fontSize: 10, color: '#64748b' }}>إجمالي تحصيل المتجر</Text>
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
                    {pm.provider && (
                      <Tag color={pm.provider === 'instapay' ? 'purple' : pm.provider === 'vodafone' ? 'red' : 'gold'} style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                        {pm.provider === 'instapay' ? 'إنستاباي' : pm.provider === 'vodafone' ? 'فودافون كاش' : pm.provider === 'cash' ? 'عند الاستلام' : pm.provider}
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
                    حساب المتجر: <strong>{pm.account_number}</strong> {pm.account_name ? `(${pm.account_name})` : ''}
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
  // HELPER: RENDER DAILY SALES & ORDERS TREND CHART (SVG)
  // =========================================================
  const renderTrendChart = () => {
    if (!dailyTrend.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          <LineChartOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد طلبات متجر إلكتروني كافية في هذا المدى الزمني</div>
        </div>
      );
    }

    const maxSales = Math.max(...dailyTrend.map((d) => d.ecp_revenue || d.total_revenue || 0), 100);
    const chartHeight = 150;
    const chartWidth = 560;
    const stepX = chartWidth / (dailyTrend.length > 1 ? dailyTrend.length - 1 : 1);

    const points = dailyTrend.map((d, index) => {
      const sales = d.ecp_revenue || d.total_revenue || 0;
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
            <linearGradient id="ecomTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
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

          <path d={fillPathData} fill="url(#ecomTrendGradient)" />
          <path d={pathData} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredTrendDay?.date === p.date ? 6 : 3.5}
              fill={hoveredTrendDay?.date === p.date ? '#7c3aed' : '#ffffff'}
              stroke="#8b5cf6"
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
            <div style={{ color: '#a78bfa', fontWeight: 'bold' }}>
              مبيعات المتجر: {hoveredTrendDay.sales.toFixed(2)} ج.م
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 11 }}>
              عدد الطلبات: {hoveredTrendDay.ecp_orders_count || hoveredTrendDay.total_orders || 0} طلب
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          <span>{dailyTrend[0]?.date}</span>
          <span>منحنى مبيعات وطلبات المتجر الإلكتروني اليومي</span>
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
      title: 'الكمية المطلوبة أونلاين',
      dataIndex: 'units_sold',
      key: 'units_sold',
      width: 140,
      render: (units) => (
        <Tag color="purple" style={{ fontWeight: 600 }}>
          {units} قطعة
        </Tag>
      )
    },
    {
      title: 'إجمالي المبيعات',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 150,
      render: (rev) => (
        <strong style={{ color: '#8b5cf6', fontSize: 14 }}>
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
          <Progress percent={pct} size="small" strokeColor="#8b5cf6" showInfo={false} />
        </div>
      )
    }
  ];

  // E-Commerce Warehouse Staff & Preparers Columns
  const staffColumns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_, __, index) => (
        <Badge
          count={index + 1}
          style={{
            backgroundColor: index === 0 ? '#10b981' : index === 1 ? '#0284c7' : '#64748b',
            color: '#fff'
          }}
        />
      )
    },
    {
      title: 'الموظف / مسؤول تجهيز طرود المتجر',
      dataIndex: 'staff_name',
      key: 'staff_name',
      render: (name, row) => (
        <div>
          <Space>
            <UserOutlined style={{ color: '#8b5cf6' }} />
            <Text strong style={{ fontSize: 13 }}>{name}</Text>
          </Space>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            <Tag color={row.role === 'supervisor' ? 'blue' : 'purple'} style={{ fontSize: 10, padding: '0 6px', lineHeight: '18px' }}>
              {row.role_label}
            </Tag>
            {row.username && <span style={{ marginRight: 6 }}>@{row.username}</span>}
          </div>
        </div>
      )
    },
    {
      title: 'مستودع التبعية',
      dataIndex: 'branch_name',
      key: 'branch_name',
      width: 180,
      render: (branchName) => (
        <Tag color="cyan">
          📦 {branchName || 'مستودع المتجر الإلكتروني'}
        </Tag>
      )
    },
    {
      title: 'الطلبات المجهزة / المنفذة',
      dataIndex: 'invoice_count',
      key: 'invoice_count',
      width: 140,
      render: (count) => (
        <Tag color="geekblue" style={{ fontWeight: 600, fontSize: 12 }}>
          {count || 0} طلب
        </Tag>
      )
    },
    {
      title: 'إجمالي المبيعات المحققة',
      dataIndex: 'total_sales',
      key: 'total_sales',
      width: 160,
      render: (sales) => (
        <strong style={{ color: '#16a34a', fontSize: 13 }}>
          {parseFloat(sales || 0).toFixed(2)} ج.م
        </strong>
      )
    },
    {
      title: 'متوسط قيمة الطلب',
      dataIndex: 'avg_ticket',
      key: 'avg_ticket',
      width: 140,
      render: (ticket) => (
        <span style={{ color: '#0284c7', fontWeight: 600 }}>
          {parseFloat(ticket || 0).toFixed(2)} ج.م
        </span>
      )
    },
    {
      title: 'الحصة من مبيعات المتجر',
      dataIndex: 'share_percentage',
      key: 'share_percentage',
      width: 160,
      render: (share) => (
        <div style={{ width: 120 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{share || 0}%</div>
          <Progress percent={parseFloat(share || 0)} size="small" strokeColor="#8b5cf6" showInfo={false} />
        </div>
      )
    },
    {
      title: 'الحالة بالمستودع',
      key: 'status',
      width: 130,
      render: () => (
        <Tag color="success">
          نشط بالمستودع
        </Tag>
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
            <InboxOutlined style={{ color: '#8b5cf6', marginLeft: 8 }} />
            إحصائيات وتحليلات المتجر الإلكتروني (E-Commerce / ECP Analytics)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            متابعة فورية لمبيعات وطلبات الموقع، طرق الدفع الرقمية وإنستاباي، ونسب تسليم وشحن المحافظات
          </Text>
        </div>

        <Space size="middle" wrap>
          <Tag color="purple" style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600 }}>
            🛒 مستودع المتجر الإلكتروني (ECP)
          </Tag>

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
          background: '#fdf4ff',
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid #f5d0fe'
        }}
      >
        <Space size={14} wrap align="center">
          <Space size={6}>
            <InboxOutlined style={{ color: '#9333ea', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#701a75' }}>نطاق العمليات:</span>
            <Tag color="magenta" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
              المتجر الإلكتروني ومستودع الأونلاين (E-Commerce Store)
            </Tag>
          </Space>

          <Divider type="vertical" style={{ height: 18 }} />

          <Space size={6}>
            <CalendarOutlined style={{ color: '#9333ea', fontSize: 15 }} />
            <span style={{ fontSize: 12, color: '#701a75' }}>الفترة الزمنية النشطة:</span>
            <Tag color={isAllTime || !dateRange ? 'purple' : 'magenta'} style={{ fontSize: 12, padding: '3px 10px', fontWeight: 600 }}>
              {isAllTime || !dateRange
                ? 'سجل طلبات المتجر الكامل (كل الأوقات)'
                : `من ${dateRange[0]?.format('YYYY-MM-DD')} إلى ${dateRange[1]?.format('YYYY-MM-DD')} (${(dateRange[1]?.diff(dateRange[0], 'day') || 0) + 1} يوم)`}
            </Tag>
          </Space>
        </Space>

        <span style={{ fontSize: 12, color: '#a21caf' }}>
          تحليلات رقمية مخصصة لطلبات الأونلاين والشحن وطرق التحصيل الإلكترونية
        </span>
      </div>

      {/* ========================================================= */}
      {/* E-COMMERCE KPIS ROW */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 1: E-Commerce Revenue */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي مبيعات المتجر الإلكتروني"
              value={kpi.total_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              صافي قيمة طلبات الأونلاين (ECP)
            </div>
          </Card>
        </Col>

        {/* KPI 2: Total Online Orders */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي عدد طلبات المتجر"
              value={kpi.total_orders || 0}
              suffix="طلب"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              طلبات مؤكدة وقيد التوصيل
            </div>
          </Card>
        </Col>

        {/* KPI 3: Average Order Value (AOV) */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="متوسط سلة المشتريات (AOV)"
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

        {/* KPI 4: Units Sold Online */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="نسبة تسليم وإتمام الشحنات"
              value={kpi.fulfillment_rate || 100}
              suffix="%"
              valueStyle={{ color: '#059669', fontWeight: 'bold', fontSize: 20 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              معدل نجاح تسليم الطلبات للعملاء
            </div>
          </Card>
        </Col>

        {/* KPI 5: Shipping Revenue */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #0d9488', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="رسوم الشحن المحصلة"
              value={kpi.total_shipping_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#0d9488', fontWeight: 'bold', fontSize: 20 }}
              prefix={<CarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              تحصيل خدمات التوصيل
            </div>
          </Card>
        </Col>

        {/* KPI 6: Top Online Product */}
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card size="small" style={{ borderRadius: 10, background: '#fffbeb', borderTop: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <TrophyOutlined style={{ color: '#f59e0b', marginLeft: 4 }} />
              المنتج البطل أونلاين
            </div>
            <Text strong ellipsis style={{ fontSize: 15, color: '#b45309', display: 'block' }}>
              {kpi.top_product_name || 'لا يوجد'}
            </Text>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              الأعلى طلباً على الموقع
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
            <ThunderboltOutlined style={{ color: '#8b5cf6', fontSize: 16 }} />
            <Text strong style={{ fontSize: 14 }}>رؤى وتوصيات اتخاذ القرار الذكية للمتجر الإلكتروني</Text>
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
      {/* CHARTS ROW 1: PAYMENT METHODS & DAILY ORDERS TREND */}
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
                <span style={{ fontSize: 14, fontWeight: 600 }}>طرق الدفع المعتمدة للمتجر (Payment Channels)</span>
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
                <LineChartOutlined style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>منحنى مبيعات وطلبات المتجر اليومي (Daily Online Trend)</span>
              </Space>
            }
          >
            {renderTrendChart()}
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* CHARTS ROW 2: TOP SELLING PRODUCTS & SHIPPING GOVERNORATES */}
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
                  <span style={{ fontSize: 14, fontWeight: 600 }}>المنتجات الأكثر مبيعاً أونلاين (Top Online Products)</span>
                </Space>
                <Tag color="purple">{topProducts.length} منتج مسجل</Tag>
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
            />
          </Card>
        </Col>

        {/* GEOGRAPHIC DEMAND & STAFF PERFORMANCE TABS */}
        <Col xs={24} lg={9}>
          <Card
            size="small"
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            bodyStyle={{ paddingTop: 8 }}
          >
            <Tabs
              defaultActiveKey="shipping"
              items={[
                {
                  key: 'shipping',
                  label: (
                    <Space size={4}>
                      <EnvironmentOutlined style={{ color: '#0284c7' }} />
                      <span>شحن المحافظات</span>
                      {allShippingZones.length > 0 && (
                        <Badge count={topCities.length} style={{ backgroundColor: '#0284c7' }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ background: '#f0fdf4', padding: '6px 10px', borderRadius: 6, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, flex: 1, marginLeft: 8 }}>
                          <span style={{ color: '#166534' }}>رسوم الشحن:</span>
                          <strong style={{ color: '#15803d' }}>{(kpi.total_shipping_revenue || 0).toFixed(2)} ج.م</strong>
                        </div>
                        {allShippingZones.length > 0 && (
                          <Button
                            size="small"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => setShowAllShippingModal(true)}
                            style={{ padding: 0, fontSize: 12, color: '#0284c7' }}
                          >
                            كافة الأسعار ({allShippingZones.length})
                          </Button>
                        )}
                      </div>

                      {topCities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
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
                          <div>لا توجد شحنات مسجلة للمحافظات في هذه الفترة</div>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'staff',
                  label: (
                    <Space size={4}>
                      <TeamOutlined style={{ color: '#8b5cf6' }} />
                      <span>مسؤولو التجهيز والمبيعات</span>
                      <Badge count={staffPerformance.length} style={{ backgroundColor: '#8b5cf6' }} />
                    </Space>
                  ),
                  children: (
                    <div>
                      <div style={{ marginBottom: 10, background: '#faf5ff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e9d5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: '#6b21a8' }}>مستودع المتجر الإلكتروني:</span>
                        <strong style={{ color: '#7c3aed' }}>{staffPerformance.length} موظف مسجل</strong>
                      </div>

                      {staffPerformance.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                          {staffPerformance.map((st, i) => (
                            <div
                              key={st.username || i}
                              style={{
                                background: '#f8fafc',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Space size={6}>
                                  <Badge count={i + 1} style={{ backgroundColor: i === 0 ? '#10b981' : '#64748b' }} />
                                  <Text strong style={{ fontSize: 13 }}>{st.staff_name}</Text>
                                  <Tag color={st.role === 'supervisor' ? 'blue' : 'purple'} style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                                    {st.role_label}
                                  </Tag>
                                </Space>
                                <Tag color="purple" style={{ fontWeight: 600 }}>
                                  {st.invoice_count} طلب
                                </Tag>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', background: '#ffffff', padding: '6px 8px', borderRadius: 4 }}>
                                <span>المبيعات: <strong style={{ color: '#16a34a' }}>{parseFloat(st.total_sales || 0).toFixed(0)} ج.م</strong></span>
                                <span>المتوسط: <strong style={{ color: '#0284c7' }}>{parseFloat(st.avg_ticket || 0).toFixed(0)} ج.م</strong></span>
                                <span>الحصة: <strong style={{ color: '#8b5cf6' }}>{st.share_percentage || 0}%</strong></span>
                              </div>
                              <Progress percent={parseFloat(st.share_percentage || 0)} size="small" strokeColor="#8b5cf6" style={{ marginTop: 6, marginBottom: 0 }} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                          <TeamOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
                          <div>لا يوجد موظفون مسجلون بمستودع المتجر الإلكتروني</div>
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
      {/* ROW 3: DETAILED E-COMMERCE WAREHOUSE SELLERS & PREPARERS */}
      {/* ========================================================= */}
      <Card
        size="small"
        style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <TeamOutlined style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                إحصائيات وأداء مسؤولي مبيعات وتجهيز طرود المتجر الإلكتروني (E-Com Warehouse Staff Performance)
              </span>
            </Space>
            <Space>
              <Tag color="purple">مستودع المتجر الإلكتروني (BR-ECOM)</Tag>
              <Tag color="cyan">{staffPerformance.length} موظف مسجل</Tag>
            </Space>
          </div>
        }
      >
        <Table
          dataSource={staffPerformance}
          columns={staffColumns}
          rowKey={(r) => r.username || r.staff_name}
          loading={loading}
          pagination={false}
          size="middle"
          bordered
        />
      </Card>

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
        width={750}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            بيانات الشحن مستخلصة ومطابقة لجدول أسعار الشحن والتوصيل المعتمد لمتجر YMS
          </Text>
        </div>
        <Table
          dataSource={allShippingZones}
          rowKey="city_name"
          pagination={{ pageSize: 8 }}
          size="small"
          bordered
          columns={[
            {
              title: 'المدينة / المحافظة',
              dataIndex: 'city_name',
              key: 'city_name',
              render: (name, row) => (
                <Space>
                  <Text strong>{name}</Text>
                  {row.city_code && <Tag color="geekblue" style={{ fontSize: 10 }}>{row.city_code}</Tag>}
                </Space>
              )
            },
            {
              title: 'سعر الشحن المعتمد',
              dataIndex: 'shipping_fee',
              key: 'shipping_fee',
              width: 140,
              render: (fee) => <Tag color="blue">{parseFloat(fee).toFixed(0)} ج.م</Tag>
            },
            {
              title: 'المدة التقديرية',
              dataIndex: 'estimated_days',
              key: 'estimated_days',
              width: 120,
              render: (days) => <span style={{ color: '#64748b' }}>{days || '-'}</span>
            },
            {
              title: 'عدد الشحنات',
              dataIndex: 'count',
              key: 'count',
              width: 110,
              render: (count) => (
                <Tag color={count > 0 ? 'cyan' : 'default'} style={{ fontWeight: 600 }}>
                  {count} طلب
                </Tag>
              )
            },
            {
              title: 'إجمالي المبيعات',
              dataIndex: 'revenue',
              key: 'revenue',
              width: 130,
              render: (rev) => <strong style={{ color: '#16a34a' }}>{parseFloat(rev).toFixed(0)} ج.م</strong>
            }
          ]}
        />
      </Modal>
    </div>
  );
}
