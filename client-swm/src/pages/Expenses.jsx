import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Typography,
  Space,
  Statistic,
  message,
  Popconfirm,
  Badge,
  Progress,
  Segmented,
  Tooltip,
  Alert,
  Avatar,
  Divider
} from 'antd';
import {
  PlusOutlined,
  DollarOutlined,
  WalletOutlined,
  FileTextOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Expenses({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [staff, setStaff] = useState([]);
  const [filterDate, setFilterDate] = useState(dayjs());
  const [filterCategory, setFilterCategory] = useState(null);

  // Analytics & Charts State
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('14'); // '7' | '14' | '30'
  const [showCharts, setShowCharts] = useState(true);
  const [hoveredTrendDay, setHoveredTrendDay] = useState(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const selectedCategory = Form.useWatch('category', form);

  // Fetch branch staff for salesperson selection
  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/swm/users');
      if (res.data.success) {
        setStaff(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  // Fetch expenses and metrics
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        date: filterDate ? filterDate.format('YYYY-MM-DD') : undefined,
        category: filterCategory || undefined
      };
      const res = await api.get('/api/swm/expenses', { params });
      if (res.data.success) {
        setExpenses(res.data.data || []);
        setMetrics(res.data.summary || null);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل المصروفات');
    } finally {
      setLoading(false);
    }
  };

  // Fetch visual analytics for charts
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/api/swm/expenses/analytics', {
        params: { days: analyticsPeriod }
      });
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filterDate, filterCategory]);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsPeriod]);

  // Handle Create Expense
  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        category: values.category,
        subcategory: values.category === 'utility_bill' ? values.subcategory : undefined,
        amount: values.amount,
        recipient_name: values.recipient_name,
        salesperson_id: values.salesperson_id,
        description: values.description,
        payment_method: 'cash'
      };

      const res = await api.post('/api/swm/expenses', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم تسجيل المصروف بنجاح وتحديث رصيد الدرج');
        setModalVisible(false);
        form.resetFields();
        fetchExpenses();
        fetchAnalytics();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'رقم السند',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 140,
      render: (ref) => <Text strong code>{ref}</Text>
    },
    {
      title: 'الوقت والتاريخ',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 140,
      render: (d, row) => (
        <div>
          <Text strong>{dayjs(row.created_at || d).format('HH:mm:ss')}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{dayjs(d).format('YYYY-MM-DD')}</div>
        </div>
      )
    },
    {
      title: 'نوع المصروف',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (cat, row) => {
        const catMap = {
          sales_withdrawal: <Tag color="orange">صرف نقدية (سحب بائع)</Tag>,
          utility_bill: <Tag color="blue">دفع فواتير ومرافق</Tag>,
          refunded_expense: <Tag color="green">مصروف مرتد للدرج</Tag>
        };
        return (
          <div>
            {catMap[cat] || <Tag>{cat}</Tag>}
            {row.subcategory && <Tag color="cyan" style={{ marginTop: 2 }}>{row.subcategory}</Tag>}
          </div>
        );
      }
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount, row) => (
        <Text
          strong
          style={{
            fontSize: 16,
            color: row.category === 'refunded_expense' ? '#16a34a' : '#dc2626'
          }}
        >
          {row.category === 'refunded_expense' ? '+' : '-'}{parseFloat(amount).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'البيان / المستلم',
      dataIndex: 'description',
      key: 'description',
      render: (desc, row) => (
        <div>
          <div>{desc || <Text type="secondary">-</Text>}</div>
          {row.recipient_name && (
            <div style={{ fontSize: 11, color: '#2563eb' }}>المستلم: {row.recipient_name}</div>
          )}
        </div>
      )
    },
    {
      title: 'المسجل / البائع',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by_name',
      width: 160,
      render: (name, row) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>{name || row.recorded_by_username || 'الفرع'}</span>
        </Space>
      )
    }
  ];

  // =========================================================
  // HELPER: RENDER DONUT SLICES (Zero-dependency SVG)
  // =========================================================
  const renderDonutChart = () => {
    const categories = analytics?.category_breakdown || [];
    const total = analytics?.total_period_expenses || 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius; // ~345.57

    if (!categories.length || total === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
          <PieChartOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد مصروفات مسجلة في هذه الفترة</div>
        </div>
      );
    }

    let cumulativePct = 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
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
            {categories.map((c, i) => {
              const strokeDash = (c.percentage / 100) * circumference;
              const strokeOffset = -((cumulativePct / 100) * circumference);
              cumulativePct += c.percentage;

              return (
                <circle
                  key={c.category || i}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={c.color}
                  strokeWidth="18"
                  strokeDasharray={`${strokeDash} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
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
            <Text style={{ fontSize: 10, color: '#64748b' }}>إجمالي الفترة</Text>
            <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
              {total > 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
            </Text>
            <Text style={{ fontSize: 9, color: '#94a3b8' }}>ج.م</Text>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((c) => (
            <div key={c.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <Space size={6}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.color, display: 'inline-block' }} />
                  <Text strong style={{ fontSize: 12 }}>{c.label}</Text>
                </Space>
                <span>
                  <strong style={{ color: '#0f172a' }}>{c.amount.toFixed(0)} ج.م</strong>{' '}
                  <span style={{ color: '#64748b', fontSize: 11 }}>({c.percentage}%)</span>
                </span>
              </div>
              <Progress
                percent={c.percentage}
                strokeColor={c.color}
                showInfo={false}
                size="small"
                style={{ margin: 0 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // =========================================================
  // HELPER: RENDER DAILY SPENDING TREND CHART (SVG Responsive)
  // =========================================================
  const renderTrendChart = () => {
    const trend = analytics?.daily_trend || [];
    if (!trend.length) {
      return (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
          <BarChartOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
          <div>لا توجد حركات يومية مسجلة في هذه الفترة</div>
        </div>
      );
    }

    const maxVal = Math.max(...trend.map((d) => d.total), 200);
    const chartHeight = 120;
    const svgWidth = 460;
    const paddingLeft = 30;
    const paddingRight = 10;
    const availableWidth = svgWidth - paddingLeft - paddingRight;
    const barWidth = Math.max(10, Math.min(32, (availableWidth / trend.length) - 6));
    const step = availableWidth / trend.length;

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        {hoveredTrendDay && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 10,
              background: '#0f172a',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            <div>تاريخ: <strong>{hoveredTrendDay.date}</strong> ({hoveredTrendDay.label})</div>
            <div>المصروفات: <strong style={{ color: '#f87171' }}>{hoveredTrendDay.total.toFixed(2)} ج.م</strong></div>
            <div>سحب بائعين: {hoveredTrendDay.withdrawals.toFixed(0)} ج.م | فواتير: {hoveredTrendDay.bills.toFixed(0)} ج.م</div>
          </div>
        )}

        <svg width="100%" height="150" viewBox={`0 0 ${svgWidth} 150`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="highBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1="20" x2={svgWidth - paddingRight} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1="70" x2={svgWidth - paddingRight} y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1="120" x2={svgWidth - paddingRight} y2="120" stroke="#e2e8f0" strokeWidth="1" />

          {/* Bars */}
          {trend.map((d, idx) => {
            const h = maxVal > 0 ? (d.total / maxVal) * (chartHeight - 20) : 0;
            const x = paddingLeft + (idx * step) + (step - barWidth) / 2;
            const y = 120 - h;
            const isHigh = d.total > (analytics?.average_daily_spend * 1.4);

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
                  rx="3"
                  fill={isHigh ? 'url(#highBarGrad)' : 'url(#barGrad)'}
                  opacity={hoveredTrendDay?.date === d.date ? 1 : 0.85}
                />
                {/* Value on top of bar if high */}
                {h > 15 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                    fontWeight="600"
                  >
                    {d.total > 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total.toFixed(0)}
                  </text>
                )}
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y="136"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <WalletOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            صفحة المصروفات وتحليلات النقدية (Expenses & Cash Flow)
          </Title>
          <Text type="secondary">
            تسجيل ومتابعة سحب البائعين، الفواتير، وتحليل أنماط الصرف لاتخاذ قرارات مالية حاسمة
          </Text>
        </div>

        <Space wrap>
          <Button
            icon={showCharts ? <EyeInvisibleOutlined /> : <PieChartOutlined />}
            onClick={() => setShowCharts(!showCharts)}
            style={{ borderColor: '#2563eb', color: '#2563eb' }}
          >
            {showCharts ? 'إخفاء الرسوم البيانية' : 'عرض لوحة التحليلات والتشارتس'}
          </Button>

          <Button icon={<ReloadOutlined />} onClick={() => { fetchExpenses(); fetchAnalytics(); }} loading={loading || analyticsLoading}>
            تحديث
          </Button>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
            style={{ backgroundColor: '#2563eb', fontWeight: 'bold' }}
          >
            تسجيل مصروف جديد
          </Button>
        </Space>
      </div>

      {/* ========================================================= */}
      {/* KPI Cards: Today's Overview */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي المصروفات (المسحوبة اليوم)"
              value={metrics?.total_out || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#dc2626', fontWeight: 'bold' }}
              prefix={<ArrowDownOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              صافي المنصرف: <strong>{(metrics?.net_expense || 0).toFixed(2)} ج.م</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="سحب البائعين (صرف نقدية)"
              value={metrics?.total_withdrawals || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
              prefix={<UserOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              مسحوبات عهدة وبائعين
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="دفع الفواتير والتشغيل"
              value={metrics?.total_bills || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              prefix={<FileTextOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              مرافق وتشغيل وشحن
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="مصروف مرتد للدرج (+)"
              value={metrics?.total_refunded || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              prefix={<ArrowUpOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              إعادة نقدية غير مستهلكة
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* INTERACTIVE CHARTS & DECISION INTELLIGENCE PANEL */}
      {/* ========================================================= */}
      {showCharts && (
        <Card
          size="small"
          style={{
            borderRadius: 12,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <Space>
                <BarChartOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>لوحة الرسوم البيانية وقرارات الصرف (Spending Analytics & Decision Insights)</span>
              </Space>

              <Space>
                <span style={{ fontSize: 12, color: '#64748b' }}>المدى الزمني:</span>
                <Segmented
                  size="small"
                  value={analyticsPeriod}
                  onChange={setAnalyticsPeriod}
                  options={[
                    { label: 'آخر 7 أيام', value: '7' },
                    { label: 'آخر 14 يوم', value: '14' },
                    { label: 'آخر 30 يوم', value: '30' }
                  ]}
                />
              </Space>
            </div>
          }
        >
          {/* Smart Decision Insights Alert Bar */}
          <div style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Alert
                  type={analytics?.top_category ? 'info' : 'success'}
                  showIcon
                  icon={<ThunderboltOutlined style={{ color: '#2563eb' }} />}
                  message={
                    <Text strong style={{ fontSize: 13 }}>
                      {analytics?.top_category
                        ? `البند الأعلى استهلاكاً للنقدية: ${analytics.top_category.label} (${analytics.top_category.percentage}% من إجمالي الفترة)`
                        : 'لا توجد حركات مسجلة بالمدى المحدد'}
                    </Text>
                  }
                  description={
                    <div style={{ fontSize: 12 }}>
                      مجموع المنصرف على هذا البند:{' '}
                      <strong style={{ color: analytics?.top_category?.color || '#2563eb' }}>
                        {(analytics?.top_category?.amount || 0).toFixed(2)} ج.م
                      </strong>
                      . يُنصح بمراجعته دورياً للتحكم في بنود التكلفة المرتفعة.
                    </div>
                  }
                  style={{ borderRadius: 8, background: '#eff6ff', borderColor: '#bfdbfe' }}
                />
              </Col>

              <Col xs={24} md={12}>
                <Alert
                  type={analytics?.is_high_spend_today ? 'warning' : 'success'}
                  showIcon
                  icon={analytics?.is_high_spend_today ? <AlertOutlined style={{ color: '#d97706' }} /> : <CheckCircleOutlined style={{ color: '#16a34a' }} />}
                  message={
                    <Text strong style={{ fontSize: 13 }}>
                      {analytics?.is_high_spend_today
                        ? `تنبيه مالي: صرف اليوم أعلى من المتوسط اليومي المعتاد`
                        : `مؤشر السيولة: معدل الصرف اليومي مستقر وضمن الحدود الطبيعية`}
                    </Text>
                  }
                  description={
                    <div style={{ fontSize: 12 }}>
                      متوسط الصرف اليومي: <strong>{(analytics?.average_daily_spend || 0).toFixed(2)} ج.م</strong> | صرف اليوم:{' '}
                      <strong>{(analytics?.today_spend || 0).toFixed(2)} ج.م</strong>.
                    </div>
                  }
                  style={{ borderRadius: 8, background: analytics?.is_high_spend_today ? '#fffbeb' : '#f0fdf4', borderColor: analytics?.is_high_spend_today ? '#fde68a' : '#bbf7d0' }}
                />
              </Col>
            </Row>
          </div>

          {/* Charts Row */}
          <Row gutter={[16, 16]}>
            {/* Chart 1: Donut Breakdown by Category */}
            <Col xs={24} lg={12}>
              <Card
                size="small"
                style={{ borderRadius: 8, height: '100%' }}
                title={
                  <Space>
                    <PieChartOutlined style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: 13 }}>توزيع المصروفات حسب التصنيف (Category Breakdown)</span>
                  </Space>
                }
              >
                {renderDonutChart()}
              </Card>
            </Col>

            {/* Chart 2: Daily Spending Trend */}
            <Col xs={24} lg={12}>
              <Card
                size="small"
                style={{ borderRadius: 8, height: '100%' }}
                title={
                  <Space>
                    <LineChartOutlined style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: 13 }}>منحنى ومقارنة الصرف اليومي (Spending Trend Over Days)</span>
                  </Space>
                }
              >
                {renderTrendChart()}
              </Card>
            </Col>
          </Row>

          {/* Staff Spending Row (if staff data exists) */}
          {analytics?.staff_breakdown?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Card
                size="small"
                style={{ borderRadius: 8 }}
                title={
                  <Space>
                    <UserOutlined style={{ color: '#ea580c' }} />
                    <span style={{ fontSize: 13 }}>توزيع المصروفات والمسحوبات حسب الموظف (By Staff Member)</span>
                  </Space>
                }
              >
                <Row gutter={[12, 12]}>
                  {analytics.staff_breakdown.map((s) => {
                    const pct = analytics.total_period_expenses > 0
                      ? (s.amount / analytics.total_period_expenses) * 100
                      : 0;
                    return (
                      <Col xs={24} sm={12} md={8} lg={4} key={s.userId || s.name}>
                        <Card size="small" style={{ background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                          <Avatar style={{ backgroundColor: '#2563eb', marginBottom: 6 }}>
                            {s.name.charAt(0)}
                          </Avatar>
                          <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </div>
                          <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 14, margin: '2px 0' }}>
                            {s.amount.toFixed(0)} ج.م
                          </div>
                          <Progress percent={Math.round(pct)} size="small" strokeColor="#ea580c" />
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.count} سند صرف</div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================= */}
      {/* Filter and Table Card */}
      {/* ========================================================= */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
            <span>سجل الحركات التفصيلي:</span>
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="اختر التاريخ"
              allowClear
              style={{ width: 150 }}
            />
            <Select
              placeholder="جميع البنود"
              value={filterCategory}
              onChange={setFilterCategory}
              allowClear
              style={{ width: 220 }}
            >
              <Option value="sales_withdrawal">صرف نقدية (سحب البائعين)</Option>
              <Option value="utility_bill">دفع فواتير ومرافق</Option>
              <Option value="refunded_expense">مصروف مرتد للدرج</Option>
            </Select>
          </div>
        }
      >
        <Table
          dataSource={expenses}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="middle"
          bordered
        />
      </Card>

      {/* ========================================================= */}
      {/* Create Expense Modal */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusOutlined style={{ color: '#2563eb' }} />
            <span>تسجيل حركة مصروفات / سحب نقدية</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            category: 'sales_withdrawal',
            subcategory: 'other'
          }}
        >
          <Form.Item
            name="category"
            label="نوع المصروف"
            rules={[{ required: true, message: 'يرجى اختيار نوع المصروف' }]}
          >
            <Select size="large">
              <Option value="sales_withdrawal">صرف نقدية (سحب البائعين)</Option>
              <Option value="utility_bill">دفع فواتير (مياه - كهرباء - إيجار - منظفات - شحن - مصاريف أخرى)</Option>
              <Option value="refunded_expense">مصروف مرتد (سحب البائعين - إعادة إلى الدرج)</Option>
            </Select>
          </Form.Item>

          {selectedCategory === 'utility_bill' && (
            <Form.Item
              name="subcategory"
              label="بند الفاتورة / نوع المصروف الفرعي"
              rules={[{ required: true, message: 'يرجى تحديد بند الفاتورة' }]}
            >
              <Select size="large">
                <Option value="water">مياه</Option>
                <Option value="electricity">كهرباء</Option>
                <Option value="rent">إيجار</Option>
                <Option value="cleaning">منظفات</Option>
                <Option value="shipping">شحن</Option>
                <Option value="other">مصاريف أخرى</Option>
              </Select>
            </Form.Item>
          )}

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="amount"
                label="المبلغ (ج.م)"
                rules={[
                  { required: true, message: 'يرجى إدخال المبلغ' },
                  { type: 'number', min: 0.1, message: 'يجب أن يكون المبلغ أكبر من صفر' }
                ]}
              >
                <InputNumber
                  size="large"
                  placeholder="0.00"
                  style={{ width: '100%' }}
                  precision={2}
                  prefix={<DollarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="salesperson_id"
                label="البائع المعني"
              >
                <Select placeholder="اختر البائع" allowClear size="large">
                  {staff.map((u) => (
                    <Option key={u.id} value={u.id}>
                      {u.full_name || u.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="recipient_name"
            label="اسم المستلم"
            rules={[
              {
                required: selectedCategory === 'sales_withdrawal',
                message: 'يرجى إدخال اسم البائع أو المستلم'
              }
            ]}
          >
            <Input size="large" placeholder="مثال: أحمد محمود (بائع الوردية الصباحية)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="البيان / ملاحظات إضافية"
          >
            <TextArea rows={3} placeholder="اكتب تفاصيل إضافية عن سبب الصرف أو رقم الإيصال..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setModalVisible(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} size="large" style={{ backgroundColor: '#2563eb' }}>
              حفظ وخصم من الدرج
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
