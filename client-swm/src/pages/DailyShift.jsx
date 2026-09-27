import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  Tag,
  Typography,
  Space,
  Statistic,
  message,
  Timeline,
  Tabs,
  Badge,
  Divider,
  Modal,
  Descriptions,
  Segmented,
  Tooltip
} from 'antd';
import {
  ScheduleOutlined,
  DollarOutlined,
  CreditCardOutlined,
  SwapOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  FileTextOutlined,
  RiseOutlined,
  InboxOutlined,
  CarOutlined,
  EyeOutlined,
  FilterOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  CopyOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text } = Typography;
const { Option } = Select;

export default function DailyShift({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);
  const selectedStaffId = selectedSalesperson;

  // Filter for Completed Orders Tab (POS vs ECP)
  const [orderFilterType, setOrderFilterType] = useState('all'); // 'all' | 'pos' | 'ecp'

  // POS Invoice detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  // ECP Order detail modal
  const [selectedEcpOrder, setSelectedEcpOrder] = useState(null);
  const [ecpModalVisible, setEcpModalVisible] = useState(false);
  const [shiftPrintModalVisible, setShiftPrintModalVisible] = useState(false);
  const shiftPrintRef = useRef(null);
  const ecpPrintRef = useRef(null);

  // Fetch branch staff
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

  // Fetch shift summary for today only
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const params = {
        date: todayStr,
        salesperson_id: selectedSalesperson || undefined
      };
      const res = await api.get('/api/swm/pos/shift/summary', { params });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في جلب تقرير الوردية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [selectedSalesperson]);

  // View & reprint POS invoice
  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await api.get(`/api/swm/pos/invoices/${invoiceId}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
        setReceiptModalVisible(true);
      }
    } catch (err) {
      message.error('فشل في تحميل تفاصيل الفاتورة');
    }
  };

  // View ECP Order details
  const handleViewEcpOrder = (order) => {
    setSelectedEcpOrder(order);
    setEcpModalVisible(true);
  };

  // Print shift closing summary
  const handlePrintShift = () => {
    setShiftPrintModalVisible(true);
  };

  const kpi = data?.kpi || {};

  // Today's completed orders
  const baseOrdersList = data?.completed_orders || [];

  const filteredCompletedOrders = baseOrdersList.filter(o => {
    if (orderFilterType === 'all') return true;
    return o.orderType === orderFilterType;
  });

  // Completed Orders Table Columns
  const completedOrderColumns = [
    {
      title: 'نوع الطلب',
      dataIndex: 'orderType',
      key: 'orderType',
      width: 140,
      render: (type) => (
        type === 'ecp' ? (
          <Tag color="purple" icon={<InboxOutlined />} style={{ padding: '2px 8px', fontWeight: 600 }}>
            متجر إلكتروني (ECP)
          </Tag>
        ) : (
          <Tag color="green" icon={<ShoppingCartOutlined />} style={{ padding: '2px 8px', fontWeight: 600 }}>
            صالة بيع (POS)
          </Tag>
        )
      )
    },
    {
      title: 'رقم المعاملة / الطلب',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 170,
      render: (num) => <Text strong code style={{ fontSize: 13 }}>{num}</Text>
    },
    {
      title: 'التوقيت والتاريخ',
      dataIndex: 'time',
      key: 'time',
      width: 150,
      render: (t) => (
        <div>
          <Text strong>{dayjs(t).format('HH:mm:ss')}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{dayjs(t).format('YYYY-MM-DD')}</div>
        </div>
      )
    },
    {
      title: 'العميل وبيانات التواصل',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, row) => (
        <div>
          <Text strong>{name || 'عميل نقدي'}</Text>
          {row.customerPhone && row.customerPhone !== '-' && (
            <div style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PhoneOutlined />
              <span>{row.customerPhone}</span>
            </div>
          )}
          {row.city && row.city !== '-' && (
            <div style={{ fontSize: 11, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4 }}>
              <EnvironmentOutlined />
              <span>{row.city}</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 160,
      render: (pm, row) => {
        const pmStr = String(pm || '').toLowerCase();
        let tagColor = 'green';
        let label = pm || 'كاش';

        if (pmStr.includes('card') || pmStr.includes('فيزا') || pmStr.includes('visa')) {
          tagColor = 'blue';
          label = 'بطاقة / فيزا';
        } else if (pmStr.includes('insta') || pmStr.includes('wallet') || pmStr.includes('تحويل') || pmStr.includes('فودافون')) {
          tagColor = 'purple';
          label = 'تحويل / إنستاباي';
        } else if (pmStr.includes('cod') || pmStr.includes('استلام')) {
          tagColor = 'orange';
          label = 'دفع عند الاستلام (COD)';
        }

        return (
          <Space direction="vertical" size={2}>
            <Tag color={tagColor}>{label}</Tag>
            {row.carrier && (
              <Tag icon={<CarOutlined />} color="cyan" style={{ fontSize: 11 }}>
                {row.carrier}
              </Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'إجمالي المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amt) => (
        <Text strong style={{ color: '#16a34a', fontSize: 16 }}>
          {parseFloat(amt).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st) => (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          {st === 'delivered' ? 'تم التسليم' : 'مكتمل'}
        </Tag>
      )
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 110,
      render: (_, row) => (
        <Space size="small">
          {row.orderType === 'pos' ? (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handleViewInvoice(row.rawId)}
            >
              طباعة
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => handleViewEcpOrder(row.details || row)}
            >
              التفاصيل
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Invoices table columns
  const invoiceColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 150,
      render: (num) => <Text strong code>{num}</Text>
    },
    {
      title: 'الوقت',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      render: (d) => dayjs(d).format('HH:mm:ss')
    },
    {
      title: 'العميل',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (name, row) => (
        <div>
          <Text strong>{name || 'نقدي'}</Text>
          {row.customer_phone && (
            <div style={{ fontSize: 11, color: '#64748b' }}>{row.customer_phone}</div>
          )}
        </div>
      )
    },
    {
      title: 'البائع',
      dataIndex: 'cashier_name',
      key: 'cashier_name',
      width: 140,
      render: (name, row) => name || row.cashier_username || 'الفرع'
    },
    {
      title: 'طريقة الدفع والتفصيل',
      dataIndex: 'payment_breakdown',
      key: 'payment_breakdown',
      render: (bd) => {
        let parsed = bd;
        if (typeof bd === 'string') {
          try { parsed = JSON.parse(bd); } catch (e) { parsed = {}; }
        }
        return (
          <Space direction="vertical" size={2}>
            {parseFloat(parsed?.cash || 0) > 0 && (
              <Tag color="green">كاش: {parseFloat(parsed.cash).toFixed(2)} ج.م</Tag>
            )}
            {parseFloat(parsed?.card || 0) > 0 && (
              <Tag color="blue">فيزا: {parseFloat(parsed.card).toFixed(2)} ج.م</Tag>
            )}
            {parseFloat(parsed?.transfer || 0) > 0 && (
              <Tag color="purple">تحويل: {parseFloat(parsed.transfer).toFixed(2)} ج.م</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'الإجمالي النهائي',
      dataIndex: 'final_amount',
      key: 'final_amount',
      width: 130,
      render: (amt) => <Text strong style={{ color: '#16a34a', fontSize: 15 }}>{parseFloat(amt).toFixed(2)} ج.م</Text>
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 90,
      render: (_, row) => (
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => handleViewInvoice(row.id)}
        >
          طباعة
        </Button>
      )
    }
  ];

  // Expenses table columns
  const expenseColumns = [
    {
      title: 'رقم السند',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 140,
      render: (ref) => <Text strong code>{ref}</Text>
    },
    {
      title: 'الوقت',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 100,
      render: (d, row) => dayjs(row.created_at || d).format('HH:mm:ss')
    },
    {
      title: 'نوع المصروف',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (cat, row) => {
        const catMap = {
          sales_withdrawal: <Tag color="orange">صرف نقدية (سحب بائع)</Tag>,
          utility_bill: <Tag color="blue">دفع فواتير</Tag>,
          refunded_expense: <Tag color="green">مصروف مرتد</Tag>
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
      width: 120,
      render: (amt, row) => (
        <Text strong style={{ color: row.category === 'refunded_expense' ? '#16a34a' : '#dc2626', fontSize: 15 }}>
          {row.category === 'refunded_expense' ? '+' : '-'}{parseFloat(amt).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'البيان',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'المسجل / البائع',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 140,
      render: (name, row) => name || row.created_by_username || 'الفرع'
    }
  ];

  // Parsed address for selected ECP order
  const selectedEcpAddr = selectedEcpOrder
    ? (typeof selectedEcpOrder.shipping_address === 'string'
        ? JSON.parse(selectedEcpOrder.shipping_address || '{}')
        : selectedEcpOrder.shipping_address || {})
    : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Filter and Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <ScheduleOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            صفحة يومية البائع والوردية (Daily Shift Closing)
          </Title>
          <Text type="secondary">
            متابعة دقيقة لمبيعات الشيفت، الطلبات المكتملة، حركات الخزينة والدرج، وتفصيل وسائل الدفع
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag
            color="blue"
            icon={<CalendarOutlined />}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid #bfdbfe'
            }}
          >
            <span>وردية اليوم:</span>
            <strong style={{ color: '#1d4ed8' }}>{dayjs().format('YYYY-MM-DD')}</strong>
          </Tag>

          <Select
            placeholder="جميع البائعين"
            value={selectedSalesperson}
            onChange={(val) => setSelectedSalesperson(val)}
            allowClear
            style={{ width: 170 }}
          >
            {staff.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.full_name || s.username}
              </Option>
            ))}
          </Select>

          <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>
            تحديث
          </Button>

          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrintShift}
            style={{ backgroundColor: '#0f172a' }}
          >
            طباعة تقرير الشيفت
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Primary Financial & Operational KPIs Row 1 */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 1: Total Completed Sales */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي المبيعات المحققة"
              value={kpi.total_sales || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: 22 }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>صالة: <strong>{(kpi.pos_sales || 0).toFixed(0)} ج.م</strong></span>
              <span>أونلاين: <strong>{(kpi.ecp_sales || 0).toFixed(0)} ج.م</strong></span>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Completed Orders Count */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="الطلبات والمعاملات المكتملة"
              value={kpi.completed_count || 0}
              suffix="طلب / فاتورة"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: 22 }}
              prefix={<InboxOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>صالة: <strong>{data?.pos_count || 0}</strong></span>
              <span>متجر أونلاين: <strong>{data?.ecp_count || 0}</strong></span>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Average Order Value (AOV) */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="متوسط قيمة الطلب (AOV)"
              value={kpi.average_order_value || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#0284c7', fontWeight: 'bold', fontSize: 22 }}
              prefix={<RiseOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              معدل إنفاق العميل بالمعاملة
            </div>
          </Card>
        </Col>

        {/* KPI 4: Net Shift Revenue */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #059669', background: '#f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="صافي إيراد الوردية (Net Revenue)"
              value={kpi.net_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#059669', fontWeight: 'bold', fontSize: 22 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              إجمالي المبيعات - المصروفات
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* Payment & Drawer Breakdown Row 2 */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 5: Cash in Drawer */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #10b981' }}>
            <Statistic
              title="المقبوضات النقدية (كاش)"
              value={kpi.cash_sales || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#10b981', fontWeight: 600 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              كاش المعرض + تحصيل المندوب (COD)
            </div>
          </Card>
        </Col>

        {/* KPI 6: Cards & Digital Transfers */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #9333ea' }}>
            <Statistic
              title="المدفوعات الإلكترونية والمحافظ"
              value={(kpi.card_sales || 0) + (kpi.transfer_sales || 0)}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#9333ea', fontWeight: 600 }}
              prefix={<CreditCardOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>فيزا: <strong>{(kpi.card_sales || 0).toFixed(0)} ج.م</strong></span>
              <span>إنستاباي/محافظ: <strong>{(kpi.transfer_sales || 0).toFixed(0)} ج.م</strong></span>
            </div>
          </Card>
        </Col>

        {/* KPI 7: Total Expenses */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #dc2626' }}>
            <Statistic
              title="إجمالي المصروفات والسحوبات"
              value={kpi.total_expenses || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#dc2626', fontWeight: 600 }}
              prefix={<ArrowDownOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              عدد السندات المسجلة: <strong>{data?.expenses_count || 0}</strong>
            </div>
          </Card>
        </Col>

        {/* KPI 8: Expected Drawer Cash */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#fffbeb', borderTop: '4px solid #ea580c' }}>
            <Statistic
              title="النقدية المتوقعة بالدرج"
              value={kpi.expected_drawer_cash || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
              prefix={<WalletOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              رصيد البداية: <strong>{(kpi.opening_balance || 0).toFixed(2)} ج.م</strong>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* Tabs Section: Completed Orders, Timeline, Invoices, Expenses */}
      {/* ========================================================= */}
      <Card size="small" style={{ borderRadius: 10 }}>
        <Tabs
          defaultActiveKey="completed_orders"
          items={[
            {
              key: 'completed_orders',
              label: (
                <span>
                  <CheckCircleOutlined style={{ marginLeft: 6, color: '#16a34a' }} />
                  الطلبات المكتملة (Completed Orders)
                  <Badge count={filteredCompletedOrders.length} style={{ marginRight: 8, backgroundColor: '#16a34a' }} />
                </span>
              ),
              children: (
                <div>
                  {/* Filters Bar inside Completed Orders */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <Space wrap>
                      <Segmented
                        value={orderFilterType}
                        onChange={setOrderFilterType}
                        options={[
                          { label: 'الكل (All)', value: 'all' },
                          { label: 'فواتير الصالة (POS)', value: 'pos' },
                          { label: 'طلبات المتجر (ECP)', value: 'ecp' }
                        ]}
                      />
                    </Space>

                    <Text type="secondary" style={{ fontSize: 13 }}>
                      طلبات وردية اليوم المكتملة: <strong>{filteredCompletedOrders.length}</strong> طلب بقيمة{' '}
                      <strong style={{ color: '#16a34a' }}>
                        {filteredCompletedOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0).toFixed(2)} ج.م
                      </strong>
                    </Text>
                  </div>

                  <Table
                    dataSource={filteredCompletedOrders}
                    columns={completedOrderColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 12 }}
                    size="middle"
                    bordered
                  />
                </div>
              )
            },
            {
              key: 'timeline',
              label: (
                <span>
                  <ScheduleOutlined style={{ marginLeft: 6 }} />
                  السجل الزمني للوردية (Timeline)
                  <Badge count={data?.timeline?.length || 0} style={{ marginRight: 8, backgroundColor: '#2563eb' }} />
                </span>
              ),
              children: (
                <div style={{ padding: '16px 8px', maxHeight: 520, overflowY: 'auto' }}>
                  {data?.timeline?.length > 0 ? (
                    <Timeline
                      mode="right"
                      items={data.timeline.map((event) => {
                        const isSale = event.type === 'sale';
                        return {
                          color: isSale ? 'green' : 'red',
                          dot: isSale ? (
                            <ShoppingCartOutlined style={{ fontSize: 16, color: '#16a34a' }} />
                          ) : (
                            <WalletOutlined style={{ fontSize: 16, color: '#dc2626' }} />
                          ),
                          children: (
                            <Card
                              size="small"
                              style={{
                                marginBottom: 12,
                                borderRadius: 8,
                                borderRight: `4px solid ${isSale ? '#16a34a' : '#dc2626'}`
                              }}
                              styles={{ body: { padding: 10 } }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  <Text strong style={{ fontSize: 14 }}>
                                    {isSale ? `فاتورة بيع #${event.number}` : `سند صرف #${event.number}`}
                                  </Text>
                                  {isSale ? (
                                    <Tag color={event.source === 'ecp' ? 'purple' : 'green'}>
                                      {event.source === 'ecp' ? 'متجر أونلاين' : 'فاتورة صالة'}
                                    </Tag>
                                  ) : (
                                    <Tag color="orange">{event.category || 'مصروف'}</Tag>
                                  )}
                                </Space>
                                <Text strong style={{ fontSize: 16, color: isSale ? '#16a34a' : '#dc2626' }}>
                                  {isSale ? '+' : '-'}{event.amount?.toFixed(2)} ج.م
                                </Text>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12 }}>
                                <span>
                                  {isSale ? `العميل: ${event.customer_name || 'نقدي'}` : event.description}
                                </span>
                                <span>
                                  <UserOutlined style={{ marginLeft: 4 }} />
                                  {event.salesperson_name || 'الفرع'}
                                </span>
                                <span>{dayjs(event.time).format('YYYY-MM-DD HH:mm:ss')}</span>
                              </div>
                            </Card>
                          )
                        };
                      })}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                      لا توجد حركات مسجلة لهذه الوردية حتى الآن
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'invoices',
              label: (
                <span>
                  <ShoppingCartOutlined style={{ marginLeft: 6 }} />
                  فواتير الصالة (POS Invoices)
                  <Badge count={data?.invoices?.length || 0} style={{ marginRight: 8, backgroundColor: '#16a34a' }} />
                </span>
              ),
              children: (
                <Table
                  dataSource={data?.invoices || []}
                  columns={invoiceColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              )
            },
            {
              key: 'expenses',
              label: (
                <span>
                  <WalletOutlined style={{ marginLeft: 6 }} />
                  المصروفات والسحوبات
                  <Badge count={data?.expenses?.length || 0} style={{ marginRight: 8, backgroundColor: '#dc2626' }} />
                </span>
              ),
              children: (
                <Table
                  dataSource={data?.expenses || []}
                  columns={expenseColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                />
              )
            }
          ]}
        />
      </Card>

      {/* POS Invoice Thermal Receipt Modal */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={null}
        width={380}
        destroyOnHidden
      >
        <ThermalReceipt
          invoice={selectedInvoice}
          items={selectedInvoice?.items || []}
          onClose={() => setReceiptModalVisible(false)}
        />
      </Modal>

      {/* ECP Order Details Modal */}
      <Modal
        title={
          <Space>
            <InboxOutlined style={{ color: '#7c3aed' }} />
            <span>تفاصيل طلب المتجر الإلكتروني: {selectedEcpOrder?.order_number || selectedEcpOrder?.orderNumber}</span>
          </Space>
        }
        open={ecpModalVisible}
        onCancel={() => setEcpModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setEcpModalVisible(false)}>
            إغلاق
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (ecpPrintRef.current) {
                printHtmlContent({
                  title: `تفاصيل الطلب - ${selectedEcpOrder?.order_number || selectedEcpOrder?.orderNumber}`,
                  htmlContent: ecpPrintRef.current.innerHTML,
                  pageType: 'a4'
                });
              }
            }}
            style={{ backgroundColor: '#7c3aed' }}
          >
            طباعة تفاصيل الطلب (A4)
          </Button>
        ]}
        width={680}
        destroyOnHidden
      >
        {selectedEcpOrder && (
          <div ref={ecpPrintRef} className="printable-order" style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
            {/* Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 10, marginBottom: 12 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 44, maxWidth: 110, objectFit: 'contain' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h2>
                  <div style={{ fontSize: 11, color: '#475569' }}>تفاصيل طلب شحن وتوصيل متجر أونلاين</div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 6 }}>
                  طلب متجر إلكتروني
                </div>
                <div style={{ marginTop: 4, fontSize: 11.5, fontFamily: 'monospace', fontWeight: 700 }}>
                  #{selectedEcpOrder.order_number || selectedEcpOrder.orderNumber}
                </div>
              </div>
            </div>

            <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="رقم الطلب">
                <Text strong code>{selectedEcpOrder.order_number || selectedEcpOrder.orderNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color="green">تم التسليم والتحصيل</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="اسم المستلم">
                {selectedEcpAddr.recipient_name || selectedEcpOrder.customerName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="رقم الهاتف">
                {selectedEcpAddr.phone || selectedEcpOrder.customerPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="المحافظة / المدينة">
                {selectedEcpAddr.city || selectedEcpOrder.city || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="العنوان التفصيلي">
                {selectedEcpAddr.street_address || selectedEcpAddr.address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="شركة الشحن">
                <Tag color="cyan">{selectedEcpOrder.shipping_carrier || selectedEcpOrder.carrier || 'مندوب المتجر'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="رقم البوليصة">
                {selectedEcpOrder.tracking_number || selectedEcpOrder.trackingNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="عدد الطرود">
                {selectedEcpOrder.parcel_count || selectedEcpOrder.parcelCount || 1} طرد
              </Descriptions.Item>
              <Descriptions.Item label="وسيلة الدفع">
                <Tag color="purple">{selectedEcpOrder.payment_method || selectedEcpOrder.paymentMethod || 'الدفع عند الاستلام'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="إجمالي الطلب" span={2}>
                <Text strong style={{ color: '#16a34a', fontSize: 16, fontFamily: 'monospace' }}>
                  {parseFloat(selectedEcpOrder.total_amount || selectedEcpOrder.amount || 0).toFixed(2)} ج.م
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedEcpOrder.customer_notes && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>ملاحظات العميل:</div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{selectedEcpOrder.customer_notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* SHIFT CLOSING SUMMARY PRINT MODAL (A4)                   */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%' }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>معاينة وطباعة تقرير تقفيل الوردية والكاشير (A4)</span>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => {
                if (shiftPrintRef.current) {
                  printHtmlContent({
                    title: 'تقرير تقفيل وردية الكاشير - يوكا ستور',
                    htmlContent: shiftPrintRef.current.innerHTML,
                    pageType: 'a4'
                  });
                }
              }}
              style={{ backgroundColor: '#0f172a' }}
            >
              طباعة التقرير (A4)
            </Button>
          </div>
        }
        open={shiftPrintModalVisible}
        onCancel={() => setShiftPrintModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setShiftPrintModalVisible(false)}>إغلاق</Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (shiftPrintRef.current) {
                printHtmlContent({
                  title: 'تقرير تقفيل وردية الكاشير - يوكا ستور',
                  htmlContent: shiftPrintRef.current.innerHTML,
                  pageType: 'a4'
                });
              }
            }}
            style={{ backgroundColor: '#0f172a' }}
          >
            طباعة تقرير الشيفت
          </Button>
        ]}
        width={850}
        destroyOnHidden
      >
        <div ref={shiftPrintRef} style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
          {/* Header */}
          <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
            <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>تقرير تقفيل الوردية وجرد النقدية وحركة المبيعات اليومية</div>
                <div style={{ fontSize: 10.5, color: '#64748b' }}>
                  المسؤول / الكاشير: <strong>{selectedSalesperson ? staff.find(s => s.id === selectedSalesperson)?.full_name || 'موظف محدد' : 'كافة كاشيرات الفرع'}</strong>
                </div>
              </div>
            </div>
            <div className="doc-badge-box" style={{ textAlign: 'left' }}>
              <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                إغلاق وردية كاشير
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>
                تاريخ الشيفت: {dayjs().format('YYYY-MM-DD')}
              </div>
            </div>
          </div>

          {/* Operational KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي مبيعات الوردية</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.total_sales || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>عدد المعاملات والطلبات</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', marginTop: 2 }}>
                {kpi.completed_count || 0} معاملة
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>متوسط قيمة المعاملة</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0284c7', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.average_order_value || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '2px solid #059669', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#ecfdf5' }}>
              <div style={{ fontSize: 10.5, color: '#065f46', fontWeight: 800 }}>صافي إيراد الوردية</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#059669', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.net_revenue || 0).toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Cash Drawer Reconciliation Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              مطابقة وتسوية درج الكاش والمتحصلات المالية (Cashier Drawer Reconciliation):
            </div>
            <Row gutter={[16, 10]}>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>النقدية المستلمة (كاش بالدرج):</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.cash_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>مدفوعات البطاقات والفيزا:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.card_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>إنستاباي والتحويلات:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.transfer_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>محافظ إلكترونية:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#d97706', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.wallet_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 14, borderTop: '1px dashed #94a3b8' }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>توقيع الكاشير المسلّم للوردية</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>توقيع مشرف الوردية / مدير الفرع</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>المراجع المالي واستلام النقدية</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
          </div>

          {/* Verification Footer */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>تقرير تقفيل وردية رسمي صادر من منظومة Yoka SWM</span>
            <span>وقت وتاريخ الاستخراج: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
