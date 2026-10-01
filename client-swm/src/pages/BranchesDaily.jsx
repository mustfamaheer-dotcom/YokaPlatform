import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
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
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function BranchesDaily() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [branchesList, setBranchesList] = useState([]);

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'yesterday' | 'range'
  const [singleDate, setSingleDate] = useState(dayjs());
  const selectedDate = singleDate || dayjs();
  const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);
  const [timeRange, setTimeRange] = useState(null); // [startTime, endTime]
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  // Invoice Details Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [thermalModalVisible, setThermalModalVisible] = useState(false);
  const printAreaRef = useRef(null);
  const summaryPrintRef = useRef(null);

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
    setSummaryModalVisible(true);
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
      {/* 1. Standardized Page Header */}
      <div className="swm-page-header">
        <button
          className="swm-back-home-btn"
          onClick={() => navigate('/dashboard/home')}
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <HomeIcon size={15} />
          <span>الرئيسية</span>
        </button>

        <div className="swm-page-title-area">
          <h2>يومية الفروع (Branches Daily Overview)</h2>
          <p>مراقبة مالية وتشغيلية لحظية لمبيعات الفروع، فواتير نقاط البيع، والتدفقات النقدية وطرق التحصيل</p>
        </div>

        <div className="swm-page-actions">
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
        </div>
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
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {/* Total Inflow (المبيعات / الوارد) */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
              height: '100%'
            }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Statistic
              title={<Text strong style={{ color: '#047857', fontSize: 'clamp(12px, 3.2vw, 14px)' }}>📥 إجمالي الوارد (المبيعات)</Text>}
              value={kpi.totalInflow}
              precision={2}
              suffix="ج.م"
              prefix={<ArrowUpOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#065f46', fontWeight: 800, fontSize: 'clamp(17px, 4vw, 22px)' }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: '#047857' }}>
              مبيعات الفواتير المعتمدة
            </div>
          </Card>
        </Col>

        {/* Total Outflow (المصروفات / المنصرف) */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
              height: '100%'
            }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Statistic
              title={<Text strong style={{ color: '#b91c1c', fontSize: 'clamp(12px, 3.2vw, 14px)' }}>📤 إجمالي المنصرف</Text>}
              value={kpi.totalOutflow}
              precision={2}
              suffix="ج.م"
              prefix={<ArrowDownOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#991b1b', fontWeight: 800, fontSize: 'clamp(17px, 4vw, 22px)' }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: '#b91c1c' }}>
              مصروفات الفروع المعتمدة
            </div>
          </Card>
        </Col>

        {/* Net Cashflow (الصافي) */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: kpi.netCashflow >= 0 ? '#eff6ff' : '#fff1f2',
              border: `1px solid ${kpi.netCashflow >= 0 ? '#bfdbfe' : '#fecdd3'}`,
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.08)',
              height: '100%'
            }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Statistic
              title={<Text strong style={{ color: kpi.netCashflow >= 0 ? '#1d4ed8' : '#be123c', fontSize: 'clamp(12px, 3.2vw, 14px)' }}>💎 الصافي المتبقي</Text>}
              value={kpi.netCashflow}
              precision={2}
              suffix="ج.م"
              prefix={<DollarCircleOutlined style={{ color: kpi.netCashflow >= 0 ? '#2563eb' : '#e11d48' }} />}
              valueStyle={{ color: kpi.netCashflow >= 0 ? '#1e40af' : '#9f1239', fontWeight: 800, fontSize: 'clamp(17px, 4vw, 22px)' }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: kpi.netCashflow >= 0 ? '#1d4ed8' : '#be123c' }}>
              {kpi.netCashflow >= 0 ? 'فائض نقدي متاح' : 'عجز في اليومية'}
            </div>
          </Card>
        </Col>

        {/* Total Invoices Count & Items Sold */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              height: '100%'
            }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Statistic
              title={<Text strong style={{ color: '#475569', fontSize: 'clamp(12px, 3.2vw, 14px)' }}>🧾 الفواتير والعمليات</Text>}
              value={kpi.invoicesCount}
              suffix="فاتورة"
              prefix={<ShoppingOutlined style={{ color: '#6366f1' }} />}
              valueStyle={{ color: '#1e293b', fontWeight: 800, fontSize: 'clamp(17px, 4vw, 22px)' }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
              القطع المباعة: <strong>{kpi.totalItemsSold || 0} قطعة</strong>
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
            scroll={{ x: 'max-content' }}
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
          scroll={{ x: 'max-content' }}
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
            key="thermal"
            icon={<PrinterOutlined />}
            onClick={() => setThermalModalVisible(true)}
            style={{ backgroundColor: '#0f172a', color: '#fff' }}
          >
            طباعة إيصال حراري (80mm)
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (printAreaRef.current) {
                printHtmlContent({
                  title: `فاتورة مبيعات - ${selectedInvoice?.invoice_number}`,
                  htmlContent: printAreaRef.current.innerHTML,
                  pageType: 'a4'
                });
              }
            }}
            style={{ backgroundColor: '#16a34a' }}
          >
            طباعة الفاتورة (A4)
          </Button>
        ]}
        width={780}
      >
        {invoiceLoading || !selectedInvoice ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div ref={printAreaRef} className="printable-invoice" style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
            {/* Branded Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>فاتورة مبيعات نقطة البيع والمعارض • قسم الحسابات</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>الفرع: <strong>{selectedInvoice.branch_name || selectedInvoice.branch_code}</strong></div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  فاتورة مبيعات نقدية
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  رقم الفاتورة: <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13.5 }}>{selectedInvoice.invoice_number}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  التاريخ: {dayjs(selectedInvoice.invoice_date).format('YYYY-MM-DD hh:mm A')}
                </div>
              </div>
            </div>

            {/* Metadata Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>الفرع:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>{selectedInvoice.branch_name || selectedInvoice.branch_code}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>الكاشير / البائع:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>{selectedInvoice.cashier_name || 'كاشير الفرع'}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>العميل:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>{selectedInvoice.customer_name || 'عميل مباشر'}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>طريقة السداد:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a', marginTop: 1 }}>
                    {selectedInvoice.payment_method === 'cash' ? 'نقداً (كاش)' : (selectedInvoice.payment_method === 'card' ? 'بطاقة بنكية' : (selectedInvoice.payment_method === 'split' ? 'دفع مقسم' : selectedInvoice.payment_method))}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Items Table */}
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 12 }}>
              <table
                className="print-table"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'right',
                  fontSize: '11px'
                }}
              >
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '30px', textAlign: 'center' }}>م</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '120px', textAlign: 'center' }}>كود الصنف</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>اسم المنتج والمواصفات</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'center' }}>اللون والمقاس</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '60px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'left' }}>سعر الوحدة</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '100px', textAlign: 'left' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #cbd5e1'
                      }}
                    >
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.product_code || '-'}
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        {[item.color, item.size].filter(Boolean).join(' • ') || '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace' }}>
                        {parseFloat(item.unit_price || 0).toLocaleString()} ج.م
                      </td>
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, fontFamily: 'monospace' }}>
                        {parseFloat(item.line_total || 0).toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Breakdown */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={14}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>تفصيل سداد الفاتورة:</div>
                  {renderPaymentTags(selectedInvoice.payment_breakdown, selectedInvoice.final_amount)}
                  <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                    الاستبدال والاسترجاع خلال 14 يوماً مع إحضار أصل الفاتورة والباركود بحالته الأصلية.
                  </div>
                </div>
              </Col>
              <Col xs={24} md={10}>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#475569' }}>
                    <span>المجموع الفرعي:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{parseFloat(selectedInvoice.subtotal || 0).toLocaleString()} ج.م</span>
                  </div>
                  {parseFloat(selectedInvoice.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#dc2626' }}>
                      <span>قيمة الخصم:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-{parseFloat(selectedInvoice.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #0f172a', marginTop: 6, paddingTop: 6, fontSize: 14, fontWeight: 900, color: '#16a34a' }}>
                    <span>الصافي المطلوب:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 16 }}>{parseFloat(selectedInvoice.final_amount || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Footer */}
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>شكراً لزيارتكم متجر Yoka Store</span>
              <span>تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* THERMAL RECEIPT MODAL (80mm)                             */}
      {/* ========================================================= */}
      <Modal
        open={thermalModalVisible}
        onCancel={() => setThermalModalVisible(false)}
        footer={null}
        width={380}
        destroyOnHidden
      >
        <ThermalReceipt
          invoice={selectedInvoice}
          onClose={() => setThermalModalVisible(false)}
        />
      </Modal>

      {/* ========================================================= */}
      {/* DAILY SUMMARY PRINT MODAL (A4)                          */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>معاينة وطباعة تقرير اليومية الشامل للفرع (A4)</span>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => {
                if (summaryPrintRef.current) {
                  printHtmlContent({
                    title: 'تقرير اليومية الشامل للفرع - يوكا ستور',
                    htmlContent: summaryPrintRef.current.innerHTML,
                    pageType: 'a4-landscape'
                  });
                }
              }}
              style={{ backgroundColor: '#0f172a' }}
            >
              طباعة التقرير (A4 Landscape)
            </Button>
          </div>
        }
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSummaryModalVisible(false)}>إغلاق</Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (summaryPrintRef.current) {
                printHtmlContent({
                  title: 'تقرير اليومية الشامل للفرع - يوكا ستور',
                  htmlContent: summaryPrintRef.current.innerHTML,
                  pageType: 'a4-landscape'
                });
              }
            }}
            style={{ backgroundColor: '#0f172a' }}
          >
            طباعة التقرير
          </Button>
        ]}
        width={920}
        destroyOnHidden
      >
        <div ref={summaryPrintRef} style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
          {/* Header */}
          <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
            <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>تقرير إغلاق اليومية والتدفقات النقدية للفروع والمعارض</div>
                <div style={{ fontSize: 10.5, color: '#64748b' }}>
                  الفرع: <strong>{selectedBranch === 'all' ? 'جميع الفروع مجمعة' : branchesList.find(b => b.id === selectedBranch)?.branch_name}</strong>
                  {' • '}التاريخ: <strong>{dateMode === 'today' ? dayjs().format('YYYY-MM-DD') : dateMode === 'yesterday' ? dayjs().subtract(1, 'day').format('YYYY-MM-DD') : (dateMode === 'range' && dateRange?.[0] && dateRange?.[1]) ? `${dateRange[0].format('YYYY-MM-DD')} إلى ${dateRange[1].format('YYYY-MM-DD')}` : (singleDate ? singleDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))}</strong>
                </div>
              </div>
            </div>
            <div className="doc-badge-box" style={{ textAlign: 'left' }}>
              <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                تقرير اليومية للفرع
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>
                تاريخ الاستخراج: {dayjs().format('YYYY-MM-DD HH:mm')}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="swm-modal-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي الوارد (مبيعات)</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.totalInflow || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>المصروفات المنصرفة</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.totalOutflow || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '2px solid #0f172a', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f1f5f9' }}>
              <div style={{ fontSize: 10.5, color: '#0f172a', fontWeight: 800 }}>صافي التدفق النقدي</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.netCashflow || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>عدد الفواتير المنفذة</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', marginTop: 2 }}>
                {kpi.invoicesCount || 0} فاتورة
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي القطع المباعة</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', marginTop: 2 }}>
                {kpi.totalItemsSold || 0} قطعة
              </div>
            </div>
          </div>

          {/* Payment Breakdown Cards */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>تفصيل المتحصلات بحسب وسيلة الدفع:</div>
            <div className="swm-modal-payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>نقداً (كاش بالدرج):</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                  {parseFloat(paymentBreakdown.cash || 0).toLocaleString()} ج.م
                </div>
              </div>
              <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>بطاقات / فيزا:</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                  {parseFloat(paymentBreakdown.card || 0).toLocaleString()} ج.م
                </div>
              </div>
              <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>تحويل إنستاباي / بنكي:</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }}>
                  {parseFloat(paymentBreakdown.bank_transfer || 0).toLocaleString()} ج.م
                </div>
              </div>
              <div style={{ padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                <span style={{ fontSize: 10.5, color: '#64748b' }}>محافظ إلكترونية:</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#d97706', fontFamily: 'monospace' }}>
                  {parseFloat(paymentBreakdown.wallet || 0).toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 14, borderTop: '1px dashed #94a3b8' }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>مسؤول الكاشير / البائع</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>مدير الفرع / المعرض</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>اعتماد الإدارة المالية</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
          </div>

          {/* Verification Footer */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>تقرير يومية رسمي معتمد صادر من منظومة Yoka SWM</span>
            <span>تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
