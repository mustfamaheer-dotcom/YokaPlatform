import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  DatePicker,
  TimePicker,
  Select,
  Tag,
  Typography,
  Space,
  Statistic,
  Progress,
  Divider,
  Modal,
  Badge,
  Tooltip,
  message,
  Radio,
  Empty,
  Spin,
  Alert
} from 'antd';
import {
  ShopOutlined,
  DollarCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  MobileOutlined,
  EyeOutlined,
  PrinterOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function BranchesDaily() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [branchesList, setBranchesList] = useState([]);

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'yesterday' | 'range'
  const [singleDate, setSingleDate] = useState(dayjs());
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);
  const [timeRange, setTimeRange] = useState(null); // [startTime, endTime]
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  // Invoice Details Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const printAreaRef = useRef(null);

  // Fetch Branches List
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

  // Fetch Daily Summary Data
  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      let startDateStr = null;
      let endDateStr = null;

      if (dateMode === 'today') {
        const todayStr = dayjs().format('YYYY-MM-DD');
        startDateStr = todayStr;
        endDateStr = todayStr;
      } else if (dateMode === 'yesterday') {
        const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        startDateStr = yesterdayStr;
        endDateStr = yesterdayStr;
      } else if (dateMode === 'range') {
        if (dateRange && dateRange[0] && dateRange[1]) {
          startDateStr = dateRange[0].format('YYYY-MM-DD');
          endDateStr = dateRange[1].format('YYYY-MM-DD');
        } else {
          const todayStr = dayjs().format('YYYY-MM-DD');
          startDateStr = todayStr;
          endDateStr = todayStr;
        }
      }

      const params = {
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        start_date: startDateStr,
        end_date: endDateStr,
        payment_method: paymentFilter !== 'all' ? paymentFilter : undefined,
        page,
        limit: pagination.pageSize
      };

      if (timeRange && timeRange[0] && timeRange[1]) {
        params.start_time = timeRange[0].format('HH:mm:ss');
        params.end_time = timeRange[1].format('HH:mm:ss');
      }

      const res = await api.get('/api/swm/branches-daily', { params });
      if (res.data.success) {
        setData(res.data.data);
        setPagination(prev => ({
          ...prev,
          current: res.data.data?.pagination?.page || 1,
          total: res.data.data?.pagination?.total || 0
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات يومية الفروع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [selectedBranch, dateMode, singleDate, dateRange, timeRange, paymentFilter]);

  // View Invoice Details
  const handleViewInvoice = async (invoiceId) => {
    setInvoiceLoading(true);
    setInvoiceModalVisible(true);
    try {
      const res = await api.get(`/api/swm/pos/invoices/${invoiceId}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
      }
    } catch (err) {
      message.error('فشل في تحميل تفاصيل الفاتورة');
      setInvoiceModalVisible(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Print Daily Summary Page
  const handlePrintSummary = () => {
    window.print();
  };

  const kpi = data?.kpi || {
    totalInflow: 0,
    totalOutflow: 0,
    netCashflow: 0,
    invoicesCount: 0,
    totalItemsSold: 0
  };

  const paymentBreakdown = data?.paymentBreakdown || {
    cash: { amount: 0, percentage: 0, count: 0 },
    card: { amount: 0, percentage: 0, count: 0 },
    transfer: { amount: 0, percentage: 0, count: 0 }
  };

  const branchesSummary = data?.branchesSummary || [];
  const invoicesList = data?.invoices || [];

  // Helper for Payment Breakdown Tags
  const renderPaymentTags = (bd, total) => {
    if (typeof bd === 'string') {
      try { bd = JSON.parse(bd); } catch (e) { bd = {}; }
    }

    if (!bd || typeof bd !== 'object' || Object.keys(bd).length === 0) {
      return <Tag color="green">💵 نقداً {parseFloat(total || 0).toLocaleString()} ج.م</Tag>;
    }

    const cash = parseFloat(bd.cash || 0);
    const card = parseFloat(bd.card || bd.visa || 0);
    const transfer = parseFloat(bd.transfer || bd.bank_transfer || bd.e_wallet || 0);

    const tags = [];
    if (cash > 0) {
      tags.push(
        <Tag key="c" color="green" style={{ margin: '2px 0' }}>
          💵 كاش: {cash.toLocaleString()} ج.م
        </Tag>
      );
    }
    if (card > 0) {
      tags.push(
        <Tag key="v" color="blue" style={{ margin: '2px 0' }}>
          💳 فيزا: {card.toLocaleString()} ج.م
        </Tag>
      );
    }
    if (transfer > 0) {
      tags.push(
        <Tag key="t" color="orange" style={{ margin: '2px 0' }}>
          📱 تحويل: {transfer.toLocaleString()} ج.م
        </Tag>
      );
    }

    return (
      <Space direction="vertical" size={2}>
        {tags.length > 0 ? tags : <Tag color="default">سداد غير محدد</Tag>}
      </Space>
    );
  };

  // Invoices Table Columns
  const invoiceColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      render: (num) => (
        <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
          {num}
        </Tag>
      )
    },
    {
      title: 'الفرع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      width: 160,
      render: (name, record) => (
        <div>
          <Tag color="purple" style={{ fontWeight: 600 }}>
            <ShopOutlined /> {name}
          </Tag>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {record.branch_code}
          </div>
        </div>
      )
    },
    {
      title: 'التاريخ والتوقيت',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 150,
      render: (date) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {dayjs(date).format('YYYY-MM-DD')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> {dayjs(date).format('hh:mm A')}
          </Text>
        </div>
      )
    },
    {
      title: 'الكاشير / البائع',
      key: 'cashier',
      width: 130,
      render: (_, record) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#6366f1' }} />
          <Text>{record.cashier_name || record.cashier_username || 'كاشير الفرع'}</Text>
        </Space>
      )
    },
    {
      title: 'العميل',
      key: 'customer',
      width: 140,
      render: (_, record) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {record.customer_name || 'عميل مباشر'}
          </Text>
          {record.customer_phone && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.customer_phone}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'الأصناف',
      key: 'items_count',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Tooltip title={`إجمالي القطع المباعة: ${record.total_qty || record.items_count || 1}`}>
          <Tag color="cyan" style={{ fontWeight: 600 }}>
            {record.items_count || 1} صنف
          </Tag>
        </Tooltip>
      )
    },
    {
      title: 'إجمالي الفاتورة',
      dataIndex: 'final_amount',
      key: 'final_amount',
      width: 130,
      align: 'right',
      render: (amt, record) => (
        <div>
          <Text strong style={{ color: '#0f766e', fontSize: 14 }}>
            {parseFloat(amt || 0).toLocaleString()} ج.م
          </Text>
          {parseFloat(record.discount_amount || 0) > 0 && (
            <div style={{ fontSize: 11, color: '#dc2626' }}>
              خصم: {parseFloat(record.discount_amount).toLocaleString()} ج.م
            </div>
          )}
        </div>
      )
    },
    {
      title: 'طريقة السداد',
      key: 'payment_methods',
      width: 160,
      render: (_, record) => renderPaymentTags(record.payment_breakdown, record.final_amount)
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewInvoice(record.id)}
        >
          عرض
        </Button>
      )
    }
  ];

  // Branch Comparison Columns
  const branchSummaryColumns = [
    {
      title: 'الفرع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name, record) => (
        <Space>
          <Tag color="purple" style={{ fontWeight: 700, fontSize: 13 }}>
            {name}
          </Tag>
          <Text type="secondary" code>{record.branch_code}</Text>
        </Space>
      )
    },
    {
      title: 'عدد الفواتير',
      dataIndex: 'invoices_count',
      key: 'invoices_count',
      align: 'center',
      render: (cnt) => <Tag color="blue">{cnt} فاتورة</Tag>
    },
    {
      title: 'القطع المباعة',
      dataIndex: 'items_sold',
      key: 'items_sold',
      align: 'center',
      render: (qty) => <Text strong>{qty} قطعة</Text>
    },
    {
      title: 'إجمالي الوارد (المبيعات)',
      dataIndex: 'total_inflow',
      key: 'total_inflow',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
          {parseFloat(val || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'إجمالي المنصرف (المصروفات)',
      dataIndex: 'total_outflow',
      key: 'total_outflow',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: parseFloat(val || 0) > 0 ? '#dc2626' : '#94a3b8', fontSize: 14 }}>
          {parseFloat(val || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'الصافي المتبقي',
      dataIndex: 'net_cashflow',
      key: 'net_cashflow',
      align: 'right',
      render: (val) => {
        const num = parseFloat(val || 0);
        return (
          <Text strong style={{ color: num >= 0 ? '#2563eb' : '#dc2626', fontSize: 15, fontWeight: 700 }}>
            {num.toLocaleString()} ج.م
          </Text>
        );
      }
    },
    {
      title: 'طرق التحصيل (كاش / فيزا / تحويل)',
      key: 'collection_breakdown',
      render: (_, record) => (
        <Space size="small" wrap>
          {record.cash > 0 && <Tag color="green">كاش: {record.cash.toLocaleString()}</Tag>}
          {record.card > 0 && <Tag color="blue">فيزا: {record.card.toLocaleString()}</Tag>}
          {record.transfer > 0 && <Tag color="orange">تحويل: {record.transfer.toLocaleString()}</Tag>}
        </Space>
      )
    },
    {
      title: 'تصفية',
      key: 'filter_action',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          type="dashed"
          onClick={() => setSelectedBranch(record.branch_id)}
        >
          عزل الفرع
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header and Page Title */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>
            <AuditOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            يومية الفروع (Branches Daily Overview)
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            مراقبة مالية وتشغيلية لحظية لمبيعات الفروع، فواتير نقاط البيع، والتدفقات النقدية وطرق التحصيل
          </Text>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => fetchData(pagination.current)}
          >
            تحديث لحظي
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrintSummary}
            style={{ backgroundColor: '#4f46e5' }}
          >
            طباعة تقرير اليومية الشامل
          </Button>
        </Space>
      </div>

      {/* 2. Advanced Control and Filter Bar */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Branch Filter */}
          <Col xs={24} sm={12} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <ShopOutlined /> الفرع المستهدف:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
              placeholder="اختر الفرع..."
            >
              <Option value="all">🌐 جميع الفروع مجمعة (All Branches)</Option>
              {branchesList.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.branch_name} ({b.branch_code})
                </Option>
              ))}
            </Select>
          </Col>

          {/* Quick Date Selector */}
          <Col xs={24} sm={12} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <CalendarOutlined /> الفترة الزمنية:
            </Text>
            <Radio.Group
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%', display: 'flex' }}
            >
              <Radio.Button value="today" style={{ flex: 1, textAlign: 'center' }}>اليوم</Radio.Button>
              <Radio.Button value="yesterday" style={{ flex: 1, textAlign: 'center' }}>أمس</Radio.Button>
              <Radio.Button value="range" style={{ flex: 1, textAlign: 'center' }}>فترة مخصصة</Radio.Button>
            </Radio.Group>
          </Col>

          {/* Custom Date Range Picker */}
          {dateMode === 'range' && (
            <Col xs={24} sm={12} lg={6}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                تحديد التواريخ (من - إلى):
              </Text>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                allowClear={false}
              />
            </Col>
          )}

          {/* Optional Time Range Filter */}
          <Col xs={24} sm={12} lg={dateMode === 'range' ? 6 : 6}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <ClockCircleOutlined /> نطاق ساعات محدد (اختياري):
            </Text>
            <TimePicker.RangePicker
              style={{ width: '100%' }}
              format="HH:mm"
              value={timeRange}
              onChange={(times) => setTimeRange(times)}
              placeholder={['من الساعة', 'إلى الساعة']}
            />
          </Col>

          {/* Payment Method Filter */}
          <Col xs={24} sm={12} lg={dateMode === 'range' ? 6 : 6}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              طريقة الدفع:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={paymentFilter}
              onChange={(v) => setPaymentFilter(v)}
            >
              <Option value="all">كافة طرق الدفع</Option>
              <Option value="cash">💵 نقداً (كاش فقط)</Option>
              <Option value="card">💳 بطاقات / فيزا فقط</Option>
              <Option value="transfer">📱 تحويلات إلكترونية فقط</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 3. High-Level Financial KPI Overview Cards (الوارد، المنصرف، الصافي) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Total Inflow (المبيعات / الوارد) */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: '#047857', fontSize: 15 }}>📥 إجمالي الوارد (المبيعات المحصلة)</Text>}
              value={kpi.totalInflow}
              precision={2}
              suffix="ج.م"
              prefix={<ArrowUpOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#065f46', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#047857' }}>
              مجموع مبيعات الفواتير المعتمدة خلال الفترة
            </div>
          </Card>
        </Col>

        {/* Total Outflow (المصروفات / المنصرف) */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: '#b91c1c', fontSize: 15 }}>📤 إجمالي المنصرف (المصروفات)</Text>}
              value={kpi.totalOutflow}
              precision={2}
              suffix="ج.م"
              prefix={<ArrowDownOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#991b1b', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>
              مجموع المصروفات المعتمدة من الفروع
            </div>
          </Card>
        </Col>

        {/* Net Cashflow (الصافي) */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: kpi.netCashflow >= 0 ? '#eff6ff' : '#fff1f2',
              border: `1px solid ${kpi.netCashflow >= 0 ? '#bfdbfe' : '#fecdd3'}`,
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.08)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: kpi.netCashflow >= 0 ? '#1d4ed8' : '#be123c', fontSize: 15 }}>💎 الصافي المتبقي (Net Flow)</Text>}
              value={kpi.netCashflow}
              precision={2}
              suffix="ج.م"
              prefix={<DollarCircleOutlined style={{ color: kpi.netCashflow >= 0 ? '#2563eb' : '#e11d48' }} />}
              valueStyle={{ color: kpi.netCashflow >= 0 ? '#1e40af' : '#9f1239', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: kpi.netCashflow >= 0 ? '#1d4ed8' : '#be123c' }}>
              الوارد - المنصرف = {kpi.netCashflow >= 0 ? 'فائض نقدي متاح' : 'عجز في اليومية'}
            </div>
          </Card>
        </Col>

        {/* Total Invoices Count & Items Sold */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
          >
            <Statistic
              title={<Text strong style={{ color: '#475569', fontSize: 15 }}>🧾 الفواتير والقطع المباعة</Text>}
              value={kpi.invoicesCount}
              suffix="فاتورة"
              prefix={<ShoppingOutlined style={{ color: '#6366f1' }} />}
              valueStyle={{ color: '#1e293b', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              إجمالي القطع المباعة: <strong>{kpi.totalItemsSold || 0} قطعة</strong>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Payment Methods Detailed Breakdown (تفصيل طرق الدفع) */}
      <Card
        title={
          <Space>
            <DollarCircleOutlined style={{ color: '#16a34a' }} />
            <span>تفصيل طرق التحصيل والدفع (Payment Methods Breakdown)</span>
          </Space>
        }
        style={{ marginBottom: 16, borderRadius: 12 }}
      >
        <Row gutter={[16, 16]}>
          {/* Cash */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                borderRadius: 10,
                border: '1px solid #bbf7d0',
                backgroundColor: '#f0fdf4'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ color: '#166534', fontSize: 14 }}>💵 نقداً (كاش خزانة)</Text>
                <Tag color="green">{paymentBreakdown.cash.count} عملية</Tag>
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                {paymentBreakdown.cash.amount.toLocaleString()} ج.م
              </div>
              <div style={{ marginTop: 6 }}>
                <Progress
                  percent={paymentBreakdown.cash.percentage}
                  strokeColor="#16a34a"
                  size="small"
                  status="active"
                />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                يمثل {paymentBreakdown.cash.percentage}% من إجمالي المبيعات المحصلة
              </Text>
            </Card>
          </Col>

          {/* Visa / Cards */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                borderRadius: 10,
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ color: '#1e40af', fontSize: 14 }}>💳 بطاقات وفيزا (Cards & POS)</Text>
                <Tag color="blue">{paymentBreakdown.card.count} عملية</Tag>
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>
                {paymentBreakdown.card.amount.toLocaleString()} ج.م
              </div>
              <div style={{ marginTop: 6 }}>
                <Progress
                  percent={paymentBreakdown.card.percentage}
                  strokeColor="#2563eb"
                  size="small"
                  status="active"
                />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                يمثل {paymentBreakdown.card.percentage}% من إجمالي المبيعات المحصلة
              </Text>
            </Card>
          </Col>

          {/* Transfers / InstaPay / E-Wallets */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                borderRadius: 10,
                border: '1px solid #fed7aa',
                backgroundColor: '#fff7ed'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ color: '#9a3412', fontSize: 14 }}>📱 تحويلات إلكترونية (إنستاباي ومحافظ)</Text>
                <Tag color="orange">{paymentBreakdown.transfer.count} عملية</Tag>
              </div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: '#c2410c' }}>
                {paymentBreakdown.transfer.amount.toLocaleString()} ج.م
              </div>
              <div style={{ marginTop: 6 }}>
                <Progress
                  percent={paymentBreakdown.transfer.percentage}
                  strokeColor="#f97316"
                  size="small"
                  status="active"
                />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                يمثل {paymentBreakdown.transfer.percentage}% من إجمالي المبيعات المحصلة
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 5. Branch-by-Branch Comparison Table (ملخص مقارنة الفروع) */}
      {selectedBranch === 'all' && branchesSummary.length > 0 && (
        <Card
          title={
            <Space>
              <ShopOutlined style={{ color: '#4f46e5' }} />
              <span>مقارنة أداء الفروع خلال الفترة (Branch-by-Branch Performance)</span>
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={branchesSummary}
            columns={branchSummaryColumns}
            rowKey="branch_id"
            pagination={false}
            size="middle"
          />
        </Card>
      )}

      {/* 6. Detailed Sales Invoices Log (سجل الفواتير التفصيلي اللحظي) */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space>
              <FileTextOutlined style={{ color: '#6366f1' }} />
              <span>سجل الفواتير التفصيلي اللحظي (Invoices Log)</span>
              <Tag color="geekblue">{pagination.total} فاتورة مسجلة</Tag>
            </Space>
          </div>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={invoicesList}
          columns={invoiceColumns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (p) => fetchData(p),
            showTotal: (total) => `إجمالي الفواتير: ${total}`
          }}
          size="middle"
        />
      </Card>

      {/* 7. Invoice Details Modal (معاينة الفاتورة والأصناف) */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#4f46e5' }} />
            <span>تفاصيل فاتورة البيع: {selectedInvoice?.invoice_number}</span>
          </Space>
        }
        open={invoiceModalVisible}
        onCancel={() => setInvoiceModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setInvoiceModalVisible(false)}>
            إغلاق
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (printAreaRef.current) {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html dir="rtl">
                    <head>
                      <title>فاتورة ${selectedInvoice?.invoice_number}</title>
                      <style>
                        body { font-family: sans-serif; padding: 20px; direction: rtl; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background: #f3f4f6; }
                      </style>
                    </head>
                    <body>
                      ${printAreaRef.current.innerHTML}
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
              }
            }}
            style={{ backgroundColor: '#16a34a' }}
          >
            طباعة الفاتورة
          </Button>
        ]}
        width={750}
      >
        {invoiceLoading || !selectedInvoice ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div ref={printAreaRef}>
            {/* Header info */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary">الفرع: </Text>
                  <Text strong>{selectedInvoice.branch_name || selectedInvoice.branch_code}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">التاريخ: </Text>
                  <Text strong>{dayjs(selectedInvoice.invoice_date).format('YYYY-MM-DD hh:mm A')}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">الكاشير / البائع: </Text>
                  <Text strong>{selectedInvoice.cashier_name || 'كاشير الفرع'}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">العميل: </Text>
                  <Text strong>{selectedInvoice.customer_name || 'عميل مباشر'}</Text>
                </Col>
              </Row>
            </div>

            {/* Items Table */}
            <Table
              size="small"
              pagination={false}
              dataSource={selectedInvoice.items || []}
              rowKey="id"
              columns={[
                {
                  title: 'الصنف / الكود',
                  key: 'prod',
                  render: (_, r) => (
                    <div>
                      <Text strong>{r.product_name}</Text>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{r.product_code}</div>
                    </div>
                  )
                },
                {
                  title: 'اللون / المقاس',
                  key: 'variant',
                  render: (_, r) => (
                    <Space size="small">
                      {r.color && <Tag color="blue">{r.color}</Tag>}
                      {r.size && <Tag color="cyan">{r.size}</Tag>}
                      {!r.color && !r.size && <Text type="secondary">—</Text>}
                    </Space>
                  )
                },
                {
                  title: 'الكمية',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'center',
                  render: (qty) => <Tag color="geekblue">{qty}</Tag>
                },
                {
                  title: 'سعر الوحدة',
                  dataIndex: 'unit_price',
                  key: 'unit_price',
                  align: 'right',
                  render: (p) => `${parseFloat(p || 0).toLocaleString()} ج.م`
                },
                {
                  title: 'الإجمالي',
                  dataIndex: 'line_total',
                  key: 'line_total',
                  align: 'right',
                  render: (t) => <strong>{parseFloat(t || 0).toLocaleString()} ج.م</strong>
                }
              ]}
            />

            {/* Totals & Breakdown */}
            <Divider style={{ margin: '16px 0' }} />
            <Row justify="space-between" align="bottom">
              <Col span={12}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>تفصيل طرق السداد:</Text>
                {renderPaymentTags(selectedInvoice.payment_breakdown, selectedInvoice.final_amount)}
              </Col>
              <Col span={12} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary">المجموع الفرعي: </Text>
                  <Text>{parseFloat(selectedInvoice.subtotal || 0).toLocaleString()} ج.م</Text>
                </div>
                {parseFloat(selectedInvoice.discount_amount || 0) > 0 && (
                  <div style={{ marginBottom: 4, color: '#dc2626' }}>
                    <Text type="secondary" style={{ color: '#dc2626' }}>الخصم: </Text>
                    <Text>-{parseFloat(selectedInvoice.discount_amount).toLocaleString()} ج.م</Text>
                  </div>
                )}
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 8 }}>
                  الإجمالي النهائي: {parseFloat(selectedInvoice.final_amount || 0).toLocaleString()} ج.م
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
