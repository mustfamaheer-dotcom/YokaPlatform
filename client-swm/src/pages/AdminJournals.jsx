import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  DatePicker,
  Input,
  InputNumber,
  Tag,
  Typography,
  Space,
  Statistic,
  Tabs,
  Badge,
  Tooltip,
  message,
  Divider,
  Modal,
  Drawer,
  Spin,
  Alert,
  Radio,
  Progress,
  Form
} from 'antd';
import {
  AuditOutlined,
  CalendarOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  DollarOutlined,
  CreditCardOutlined,
  WalletOutlined,
  SwapOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  BankOutlined,
  TeamOutlined,
  AppstoreOutlined,
  FundViewOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdminJournals() {
  const [loading, setLoading] = useState(false);
  const [branchesList, setBranchesList] = useState([]);

  // Filters State
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs()
  ]);

  // Active Main Tab: 'expenses' | 'operations' | 'profitability'
  const [activeMainTab, setActiveMainTab] = useState('expenses');

  // Expenses Tab: Category filter dropdown ('all' | 'payroll' | 'utility_bill' | 'other')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  // Operations Tab: Active sub-section ('transfers' | 'supplier_payments' | 'purchases')
  const [activeOpSection, setActiveOpSection] = useState('transfers');

  // Backend Data State
  const [data, setData] = useState({
    expenses: {
      items: [],
      summary: {},
      payrollByEmployee: []
    },
    operations: {
      transfers: [],
      supplierPayments: [],
      purchaseInvoices: [],
      branchInflows: [],
      summary: {}
    },
    profitability: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMarginPct: 0,
      operatingExpenses: 0,
      operatingExpensesBreakdown: {},
      netProfit: 0,
      netMarginPct: 0
    }
  });

  // Create Admin Expense Drawer State
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseForm] = Form.useForm();

  // Print Report Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const printAreaRef = useRef(null);

  // Fetch Branches
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

  // Fetch Main Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const startDateStr = dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const endDateStr = dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;

      const params = {
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        start_date: startDateStr,
        end_date: endDateStr,
        expense_category: expenseCategoryFilter
      };

      const res = await api.get('/api/swm/admin-journals', { params });
      if (res.data.success) {
        setData(res.data.data || {});
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل اليوميات الإدارية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedBranch, dateRange, expenseCategoryFilter]);

  // Handle Preset Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = dayjs();
    switch (preset) {
      case 'today':
        setDateRange([today, today]);
        break;
      case 'yesterday':
        const yest = today.subtract(1, 'day');
        setDateRange([yest, yest]);
        break;
      case 'this_week':
        setDateRange([today.startOf('week'), today]);
        break;
      case 'this_month':
        setDateRange([today.startOf('month'), today]);
        break;
      case 'last_30_days':
        setDateRange([today.subtract(30, 'day'), today]);
        break;
      case 'this_year':
        setDateRange([today.startOf('year'), today]);
        break;
      default:
        break;
    }
  };

  // Submit New Administrative Expense
  const handleCreateExpense = async (values) => {
    setExpenseSubmitting(true);
    try {
      const res = await api.post('/api/swm/admin-journals/expense', values);
      if (res.data.success) {
        message.success('تم تسجيل المصروف الإداري بنجاح');
        setExpenseDrawerOpen(false);
        expenseForm.resetFields();
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل المصروف');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Print Window Execution
  const handleExecutePrint = () => {
    if (printAreaRef.current) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير اليومية الإدارية والمالية الشاملة</title>
            <style>
              body { font-family: sans-serif; padding: 25px; direction: rtl; font-size: 13px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #94a3b8; padding: 8px 10px; text-align: right; }
              th { background: #f1f5f9; font-weight: bold; }
              .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
              .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
              .kpi-card { flex: 1; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #f8fafc; text-align: center; }
              .signatures { margin-top: 45px; display: flex; justify-content: space-between; }
              .sign-box { width: 30%; text-align: center; border-top: 1px solid #475569; padding-top: 8px; font-weight: bold; }
              @media print {
                @page { size: A4 landscape; margin: 10mm; }
                button { display: none; }
              }
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
  };

  // Columns for Expenses Table
  const expenseColumns = [
    {
      title: 'رقم الإذن / المرجع',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 150,
      render: (ref) => <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ref}</Tag>
    },
    {
      title: 'الفرع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      width: 150,
      render: (name) => <Tag color="purple"><ShopOutlined /> {name}</Tag>
    },
    {
      title: 'التصنيف والنوع',
      key: 'category',
      width: 170,
      render: (_, r) => {
        let label = 'أخرى';
        let color = 'default';
        if (r.category === 'payroll' || r.category === 'sales_withdrawal' || (r.description && r.description.includes('سحب بائع'))) {
          label = 'قبض / سحب موظف';
          color = 'volcano';
        } else if (r.category === 'utility_bill') {
          label = `فاتورة (${r.subcategory || 'خدمات'})`;
          color = 'blue';
        } else if (r.subcategory === 'rent') {
          label = 'إيجار';
          color = 'orange';
        } else if (r.subcategory === 'marketing') {
          label = 'إعلانات وتسويق';
          color = 'cyan';
        } else if (r.subcategory === 'packaging') {
          label = 'تغليف وشحن';
          color = 'gold';
        }
        return <Tag color={color} style={{ fontWeight: 600 }}>{label}</Tag>;
      }
    },
    {
      title: 'المبلغ المنصرف',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (amt) => (
        <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
          {parseFloat(amt || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'البيان والملاحظات والمستلم',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || <Text type="secondary">—</Text>
    },
    {
      title: 'التاريخ',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 120,
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'المسؤول / المدخل',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by_name',
      width: 150,
      render: (name) => name ? <span style={{ fontSize: 12 }}><UserOutlined /> {name}</span> : <Text type="secondary">—</Text>
    }
  ];

  // Columns for Payroll By Employee Table
  const employeePayrollColumns = [
    {
      title: 'اسم الموظف / المستلم',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (name) => (
        <Space>
          <UserOutlined style={{ color: '#ea580c' }} />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: 'الفرع التابع له',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (b) => <Tag color="purple"><ShopOutlined /> {b}</Tag>
    },
    {
      title: 'عدد مرات الصرف',
      dataIndex: 'transactions_count',
      key: 'transactions_count',
      align: 'center',
      render: (c) => <Tag color="blue">{c} حركات</Tag>
    },
    {
      title: 'إجمالي ما قبضه بالفترة',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (amt) => (
        <Text strong style={{ color: '#c2410c', fontSize: 15 }}>
          {parseFloat(amt || 0).toLocaleString()} ج.م
        </Text>
      )
    }
  ];

  // Columns for Branch Net Inflow Table
  const branchInflowColumns = [
    {
      title: 'الفرع / المستودع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name, r) => (
        <div>
          <Text strong><ShopOutlined /> {name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{r.branch_code}</div>
        </div>
      )
    },
    {
      title: 'إجمالي المبيعات (الوارد)',
      dataIndex: 'sales_revenue',
      key: 'sales_revenue',
      align: 'right',
      render: (v) => <Text strong style={{ color: '#047857' }}>+{parseFloat(v || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'المصروفات داخل الفرع',
      dataIndex: 'branch_expenses',
      key: 'branch_expenses',
      align: 'right',
      render: (v) => <Text strong style={{ color: '#dc2626' }}>-{parseFloat(v || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'صافي الوارد الفعلي',
      dataIndex: 'net_inflow',
      key: 'net_inflow',
      align: 'right',
      render: (v) => {
        const n = parseFloat(v || 0);
        return (
          <Tag color={n >= 0 ? 'green' : 'red'} style={{ fontSize: 13, fontWeight: 800, padding: '3px 8px' }}>
            {n >= 0 ? '+' : ''}{n.toLocaleString()} ج.م
          </Tag>
        );
      }
    },
    {
      title: 'تفصيل الصافي (كاش / فيزا / تحويلات)',
      key: 'breakdown',
      render: (_, r) => (
        <Space size="small" wrap>
          <Tag color="gold">💵 كاش: {r.net_cash?.toLocaleString()} ج.م</Tag>
          <Tag color="blue">💳 فيزا: {r.card_sales?.toLocaleString()} ج.م</Tag>
          <Tag color="cyan">📱 تحويلات: {r.transfer_sales?.toLocaleString()} ج.م</Tag>
        </Space>
      )
    }
  ];

  // Columns for Stock Transfers Table
  const transferColumns = [
    {
      title: 'رقم إذن التحويل',
      dataIndex: 'transfer_number',
      key: 'transfer_number',
      width: 150,
      render: (n) => <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{n}</Tag>
    },
    {
      title: 'من مخزن / فرع',
      dataIndex: 'from_branch_name',
      key: 'from_branch_name',
      render: (b) => <Tag color="blue"><ShopOutlined /> {b}</Tag>
    },
    {
      title: 'إلى مخزن / فرع',
      dataIndex: 'to_branch_name',
      key: 'to_branch_name',
      render: (b) => <Tag color="purple"><ShopOutlined /> {b}</Tag>
    },
    {
      title: 'عدد القطع المحولة',
      dataIndex: 'total_units',
      key: 'total_units',
      align: 'center',
      render: (u) => <Tag color="success" style={{ fontWeight: 800 }}>{u} قطعة</Tag>
    },
    {
      title: 'تاريخ التحويل',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'المسؤول / المندوب',
      key: 'driver',
      render: (_, r) => r.driver_name || r.created_by_name || '—'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (st) => st === 'completed' ? <Tag color="green">مكتمل ومستلم</Tag> : <Tag color="orange">{st}</Tag>
    }
  ];

  // Columns for Supplier Payments Table
  const supplierPaymentColumns = [
    {
      title: 'رقم السند',
      dataIndex: 'payment_ref',
      key: 'payment_ref',
      render: (r) => <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r}</Tag>
    },
    {
      title: 'المورد',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'الفاتورة المرتبطة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (inv) => inv ? <Tag color="default">{inv}</Tag> : <Text type="secondary">سداد عام</Text>
    },
    {
      title: 'المبلغ المسدد',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amt) => <Text strong style={{ color: '#dc2626', fontSize: 14 }}>{parseFloat(amt || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'طريقة السداد',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (m) => <Tag color="blue">{m === 'cash' ? 'كاش نقدي' : m === 'bank_transfer' ? 'تحويل بنكي' : m}</Tag>
    },
    {
      title: 'تاريخ السداد',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'ملاحظات / مدخل السداد',
      key: 'notes',
      render: (_, r) => (
        <div>
          <div>{r.notes || '—'}</div>
          {r.recorded_by_name && <div style={{ fontSize: 11, color: '#64748b' }}>بواسطة: {r.recorded_by_name}</div>}
        </div>
      )
    }
  ];

  // Columns for Purchase Invoices Table
  const purchaseColumns = [
    {
      title: 'رقم فاتورة الشراء',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (num) => <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{num}</Tag>
    },
    {
      title: 'المورد',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'المستودع المستلم',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (w) => <Tag color="purple"><ShopOutlined /> {w || 'المستودع الرئيسي'}</Tag>
    },
    {
      title: 'إجمالي الفاتورة',
      dataIndex: 'final_amount',
      key: 'final_amount',
      align: 'right',
      render: (amt) => <Text strong>{parseFloat(amt || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'المسدد / المتبقي',
      key: 'paid',
      render: (_, r) => {
        const paid = parseFloat(r.paid_amount || 0);
        const final = parseFloat(r.final_amount || 0);
        const rem = final - paid;
        return (
          <Space size="small">
            <Tag color="green">مدفوع: {paid.toLocaleString()}</Tag>
            {rem > 0 && <Tag color="red">متبقي: {rem.toLocaleString()}</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'تاريخ التوريد',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (st) => st === 'completed' ? <Tag color="green">مكتملة ومستلمة</Tag> : <Tag color="orange">{st}</Tag>
    }
  ];

  const { expenses, operations, profitability } = data;

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header Toolbar */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            <AuditOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            اليوميات الإدارية (Administrative Journals & Financials)
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            لوحة القيادة الإدارية والمالية الشاملة: رقابة المصروفات، سداد الموردين، التحويلات، وصافي الأرباح
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchData}>
            تحديث البيانات
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setExpenseDrawerOpen(true)}
            style={{ borderColor: '#ea580c', color: '#ea580c' }}
          >
            إضافة مصروف إداري
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => setPrintModalOpen(true)}
            style={{ backgroundColor: '#0f766e' }}
          >
            طباعة تقرير اليومية الشامل (A4)
          </Button>
        </Space>
      </div>

      {/* 2. Global Filter Card (Time Presets & Branch Selector) */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '14px 20px' } }}>
        <Row gutter={[16, 12]} align="middle">
          {/* Branch Filter */}
          <Col xs={24} sm={12} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              <ShopOutlined /> نطاق الفرع أو المستودع:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
            >
              <Option value="all">🌐 كافة الفروع والمستودعات</Option>
              {branchesList.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.branch_name} ({b.branch_code})
                </Option>
              ))}
            </Select>
          </Col>

          {/* Time Presets Radio Buttons */}
          <Col xs={24} sm={24} lg={11}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              <CalendarOutlined /> فترات التقرير السريعة:
            </Text>
            <Radio.Group
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="today">اليوم</Radio.Button>
              <Radio.Button value="yesterday">أمس</Radio.Button>
              <Radio.Button value="this_week">هذا الأسبوع</Radio.Button>
              <Radio.Button value="this_month">هذا الشهر</Radio.Button>
              <Radio.Button value="last_30_days">آخر 30 يوم</Radio.Button>
              <Radio.Button value="this_year">السنة الحالية</Radio.Button>
            </Radio.Group>
          </Col>

          {/* Custom Date Range Picker */}
          <Col xs={24} sm={12} lg={7}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              تحديد فترة مخصصة (من - إلى):
            </Text>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDatePreset('custom');
                  setDateRange(dates);
                }
              }}
              allowClear={false}
            />
          </Col>
        </Row>
      </Card>

      {/* 3. Top High-Level Executive Financial KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Net Profit Card */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              backgroundColor: profitability.netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
              border: `1.5px solid ${profitability.netProfit >= 0 ? '#10b981' : '#ef4444'}`
            }}
          >
            <Statistic
              title={
                <Space>
                  {profitability.netProfit >= 0 ? (
                    <RiseOutlined style={{ color: '#059669', fontSize: 16 }} />
                  ) : (
                    <FallOutlined style={{ color: '#dc2626', fontSize: 16 }} />
                  )}
                  <Text strong style={{ color: profitability.netProfit >= 0 ? '#065f46' : '#991b1b', fontSize: 13 }}>
                    صافي الربح (المكسب الفعلي)
                  </Text>
                </Space>
              }
              value={profitability.netProfit}
              precision={2}
              suffix="ج.م"
              valueStyle={{
                color: profitability.netProfit >= 0 ? '#047857' : '#b91c1c',
                fontWeight: 800,
                fontSize: 24
              }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: profitability.netProfit >= 0 ? '#047857' : '#b91c1c' }}>
              هامش صافي الربح: <strong>{profitability.netMarginPct}%</strong> (بعد خصم كافة مصاريف التشغيل)
            </div>
          </Card>
        </Col>

        {/* Total Revenues */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#1e40af' }}>💵 إجمالي الإيرادات (المبيعات)</Text>}
              value={profitability.revenue}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#1d4ed8', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: '#1e40af' }}>
              تكلفة البضاعة المباعة (COGS): <strong>{profitability.cogs?.toLocaleString()} ج.م</strong>
            </div>
          </Card>
        </Col>

        {/* Total Operating Expenses */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#9a3412' }}>📉 إجمالي مصاريف التشغيل</Text>}
              value={profitability.operatingExpenses}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#c2410c', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: '#9a3412' }}>
              منها قبض موظفين: <strong>{expenses.summary?.totalPayroll?.toLocaleString()} ج.م</strong>
            </div>
          </Card>
        </Col>

        {/* Net Branch Inflow */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#6b21a8' }}>🏦 صافي الوارد من الفروع</Text>}
              value={operations.summary?.netBranchInflow || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#7e22ce', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: '#6b21a8' }}>
              كاش: {operations.summary?.netCash?.toLocaleString()} | فيزا: {operations.summary?.totalCardSales?.toLocaleString()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Main Tabbed Sections */}
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: '16px 20px 20px 20px' } }}
      >
        <Tabs
          activeKey={activeMainTab}
          onChange={(k) => setActiveMainTab(k)}
          size="large"
          items={[
            {
              key: 'expenses',
              label: (
                <Space>
                  <WalletOutlined style={{ color: '#ea580c', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>أ. المصروفات وقبض الموظفين</span>
                  <Tag color="volcano" style={{ borderRadius: 10 }}>{expenses.summary?.count || 0}</Tag>
                </Space>
              ),
              children: (
                <div>
                  {/* Category Dropdown and Action Bar */}
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Space size="middle" wrap>
                      <Text strong style={{ fontSize: 14 }}>
                        تصفية نوع المصروف:
                      </Text>
                      <Select
                        style={{ width: 280 }}
                        value={expenseCategoryFilter}
                        onChange={(val) => setExpenseCategoryFilter(val)}
                        size="middle"
                      >
                        <Option value="all">📋 كافة المصروفات (عرض شامل)</Option>
                        <Option value="payroll">👥 القبض الخاص لكل موظف بكل فرع (رواتب ومسحوبات)</Option>
                        <Option value="utility_bill">💡 الفواتير والخدمات (كهرباء، مياه، إيجار، إنترنت)</Option>
                        <Option value="other">📦 المصاريف الأخرى (تشغيل، إعلانات، تغليف، نثريات)</Option>
                      </Select>
                    </Space>

                    <Space wrap>
                      <Tag color="volcano" style={{ fontSize: 13, padding: '4px 10px' }}>
                        إجمالي المصروفات في النطاق: <strong>{expenses.summary?.totalExpenses?.toLocaleString()} ج.م</strong>
                      </Tag>
                    </Space>
                  </div>

                  {/* Employee Payroll Breakdown Card (visible when 'all' or 'payroll') */}
                  {(expenseCategoryFilter === 'all' || expenseCategoryFilter === 'payroll') && (
                    <Card
                      title={
                        <Space>
                          <TeamOutlined style={{ color: '#ea580c' }} />
                          <span>القبض الخاص لكل موظف بكل فرع (رواتب ومسحوبات العاملين)</span>
                          <Tag color="volcano">{expenses.payrollByEmployee?.length || 0} موظف</Tag>
                        </Space>
                      }
                      style={{ marginBottom: 16, backgroundColor: '#fffbf5', border: '1px solid #fed7aa', borderRadius: 8 }}
                      styles={{ body: { padding: 0 } }}
                    >
                      <Table
                        dataSource={expenses.payrollByEmployee || []}
                        columns={employeePayrollColumns}
                        rowKey={(r) => `${r.branch_id}-${r.employee_name}`}
                        pagination={{ pageSize: 5 }}
                        size="small"
                      />
                    </Card>
                  )}

                  {/* Detailed Expenses Table */}
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <FileTextOutlined style={{ color: '#4f46e5' }} />
                          <span>سجل حركات المصروفات التفصيلي</span>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          عدد الحركات: {expenses.items?.length || 0}
                        </Text>
                      </div>
                    }
                    styles={{ body: { padding: 0 } }}
                    style={{ borderRadius: 8 }}
                  >
                    <Table
                      dataSource={expenses.items || []}
                      columns={expenseColumns}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 20, showTotal: (t) => `إجمالي الحركات: ${t}` }}
                      size="middle"
                    />
                  </Card>
                </div>
              )
            },
            {
              key: 'operations',
              label: (
                <Space>
                  <SwapOutlined style={{ color: '#0284c7', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>ب. العمليات الإدارية وصافي الوارد من الفروع</span>
                </Space>
              ),
              children: (
                <div>
                  {/* Branch Net Inflow Card */}
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <BankOutlined style={{ color: '#059669' }} />
                          <span>صافي الوارد من الفروع بعد خصم كافة المصاريف داخل الفروع</span>
                        </Space>
                        <Space>
                          <Tag color="green" style={{ fontSize: 13, fontWeight: 700 }}>
                            إجمالي صافي الوارد: {operations.summary?.netBranchInflow?.toLocaleString()} ج.م
                          </Tag>
                        </Space>
                      </div>
                    }
                    style={{ marginBottom: 20, borderRadius: 8, border: '1px solid #a7f3d0' }}
                    styles={{ body: { padding: '12px 16px' } }}
                  >
                    {/* Method breakdown row */}
                    <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                          <Statistic
                            title={<Text strong style={{ color: '#92400e' }}>💵 صافي النقدية (كاش بعد المصاريف)</Text>}
                            value={operations.summary?.netCash || 0}
                            precision={2}
                            suffix="ج.م"
                            valueStyle={{ color: '#b45309', fontWeight: 800, fontSize: 20 }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <Statistic
                            title={<Text strong style={{ color: '#1e40af' }}>💳 مبيعات البطاقات (فيزا / ماستركارد)</Text>}
                            value={operations.summary?.totalCardSales || 0}
                            precision={2}
                            suffix="ج.م"
                            valueStyle={{ color: '#1d4ed8', fontWeight: 800, fontSize: 20 }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ backgroundColor: '#ecfeff', border: '1px solid #a5f3fc' }}>
                          <Statistic
                            title={<Text strong style={{ color: '#155e75' }}>📱 تحويلات إلكترونية (إنستاباي ومحافظ)</Text>}
                            value={operations.summary?.totalTransferSales || 0}
                            precision={2}
                            suffix="ج.م"
                            valueStyle={{ color: '#0e7490', fontWeight: 800, fontSize: 20 }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Per Branch Breakdown Table */}
                    <Table
                      dataSource={operations.branchInflows || []}
                      columns={branchInflowColumns}
                      rowKey="branch_id"
                      pagination={false}
                      size="small"
                    />
                  </Card>

                  {/* Administrative Operations Sub-Tabs */}
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <SwapOutlined style={{ color: '#4f46e5' }} />
                          <span>يومية العمليات الإدارية المركزية</span>
                        </Space>
                        <Radio.Group
                          value={activeOpSection}
                          onChange={(e) => setActiveOpSection(e.target.value)}
                          buttonStyle="solid"
                        >
                          <Radio.Button value="transfers">
                            🚚 نقل بين المخازن ({operations.transfers?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="supplier_payments">
                            💳 سداد موردين ({operations.supplierPayments?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="purchases">
                            📥 إضافة مشتريات ({operations.purchaseInvoices?.length || 0})
                          </Radio.Button>
                        </Radio.Group>
                      </div>
                    }
                    styles={{ body: { padding: 0 } }}
                    style={{ borderRadius: 8 }}
                  >
                    {activeOpSection === 'transfers' && (
                      <Table
                        dataSource={operations.transfers || []}
                        columns={transferColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size="middle"
                      />
                    )}
                    {activeOpSection === 'supplier_payments' && (
                      <Table
                        dataSource={operations.supplierPayments || []}
                        columns={supplierPaymentColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size="middle"
                      />
                    )}
                    {activeOpSection === 'purchases' && (
                      <Table
                        dataSource={operations.purchaseInvoices || []}
                        columns={purchaseColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size="middle"
                      />
                    )}
                  </Card>
                </div>
              )
            },
            {
              key: 'profitability',
              label: (
                <Space>
                  <FundViewOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>ج. تقرير الأرباح والمكسب الفعلي (P&L)</span>
                </Space>
              ),
              children: (
                <div>
                  {/* Detailed P&L Income Statement Card */}
                  <Card
                    title={
                      <Space>
                        <RiseOutlined style={{ color: '#16a34a' }} />
                        <span>قائمة الدخل وبيان الأرباح التشغيلية والمكسب الفعلي</span>
                      </Space>
                    }
                    style={{ marginBottom: 20, borderRadius: 12 }}
                  >
                    <Row gutter={[24, 24]}>
                      {/* Left: Step-by-Step P&L Formula Breakdown */}
                      <Col xs={24} lg={14}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {/* 1. Revenues */}
                          <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>1. الإيرادات (Revenues)</Text>
                              <div style={{ fontSize: 12, color: '#64748b' }}>إجمالي الأموال المحصلة من كافة المبيعات المكتملة</div>
                            </div>
                            <Text strong style={{ fontSize: 18, color: '#1d4ed8' }}>
                              +{profitability.revenue?.toLocaleString()} ج.م
                            </Text>
                          </div>

                          {/* 2. COGS */}
                          <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>2. تكلفة شراء أو إنتاج البضاعة (COGS)</Text>
                              <div style={{ fontSize: 12, color: '#64748b' }}>تكلفة المخزون الفعلي للأصناف التي تم بيعها</div>
                            </div>
                            <Text strong style={{ fontSize: 18, color: '#dc2626' }}>
                              -{profitability.cogs?.toLocaleString()} ج.م
                            </Text>
                          </div>

                          {/* 3. Gross Profit */}
                          <div style={{ padding: '14px 16px', background: '#eff6ff', borderRadius: 8, border: '1.5px solid #93c5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ fontSize: 16, color: '#1e40af' }}>3. إجمالي الربح (Gross Profit)</Text>
                              <div style={{ fontSize: 12, color: '#1e40af' }}>
                                المعادلة: الإيرادات − تكلفة شراء البضاعة (هامش الربح الإجمالي: {profitability.grossMarginPct}%)
                              </div>
                            </div>
                            <Text strong style={{ fontSize: 20, color: '#1e40af' }}>
                              ={profitability.grossProfit?.toLocaleString()} ج.م
                            </Text>
                          </div>

                          {/* 4. Operating Expenses */}
                          <div style={{ padding: '12px 16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ fontSize: 15, color: '#9a3412' }}>4. مصاريف التشغيل (Operating Expenses)</Text>
                              <div style={{ fontSize: 12, color: '#9a3412' }}>
                                رواتب العمال والمسحوبات، الفواتير، الإيجارات، الإعلانات والتغليف
                              </div>
                            </div>
                            <Text strong style={{ fontSize: 18, color: '#c2410c' }}>
                              -{profitability.operatingExpenses?.toLocaleString()} ج.م
                            </Text>
                          </div>

                          {/* 5. Net Profit (Actual Gain) */}
                          <div
                            style={{
                              padding: '16px 20px',
                              background: profitability.netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
                              borderRadius: 10,
                              border: `2px solid ${profitability.netProfit >= 0 ? '#059669' : '#dc2626'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <Text strong style={{ fontSize: 17, color: profitability.netProfit >= 0 ? '#065f46' : '#991b1b' }}>
                                5. صافي الربح (المكسب الفعلي - Net Profit)
                              </Text>
                              <div style={{ fontSize: 12, color: profitability.netProfit >= 0 ? '#047857' : '#b91c1c' }}>
                                إجمالي الربح − كل مصاريف التشغيل (هامش المكسب الصافي: {profitability.netMarginPct}%)
                              </div>
                            </div>
                            <Text strong style={{ fontSize: 24, color: profitability.netProfit >= 0 ? '#047857' : '#b91c1c' }}>
                              {profitability.netProfit >= 0 ? '+' : ''}{profitability.netProfit?.toLocaleString()} ج.م
                            </Text>
                          </div>
                        </div>
                      </Col>

                      {/* Right: Operating Expenses Breakdown Breakdown */}
                      <Col xs={24} lg={10}>
                        <Card
                          title={<Text strong style={{ fontSize: 14 }}>تفصيل مصاريف التشغيل المخصومة</Text>}
                          size="small"
                          style={{ backgroundColor: '#fafafa', borderRadius: 8 }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>👥 رواتب العمال ومسحوباتهم:</span>
                                <strong>{profitability.operatingExpensesBreakdown?.payroll?.toLocaleString() || 0} ج.م</strong>
                              </div>
                              <Progress
                                percent={profitability.operatingExpenses > 0 ? Math.round(((profitability.operatingExpensesBreakdown?.payroll || 0) / profitability.operatingExpenses) * 100) : 0}
                                strokeColor="#ea580c"
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>🏢 إيجارات المقرات والفروع:</span>
                                <strong>{profitability.operatingExpensesBreakdown?.rent?.toLocaleString() || 0} ج.م</strong>
                              </div>
                              <Progress
                                percent={profitability.operatingExpenses > 0 ? Math.round(((profitability.operatingExpensesBreakdown?.rent || 0) / profitability.operatingExpenses) * 100) : 0}
                                strokeColor="#d97706"
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>📢 إعلانات وتسويق:</span>
                                <strong>{profitability.operatingExpensesBreakdown?.marketing?.toLocaleString() || 0} ج.م</strong>
                              </div>
                              <Progress
                                percent={profitability.operatingExpenses > 0 ? Math.round(((profitability.operatingExpensesBreakdown?.marketing || 0) / profitability.operatingExpenses) * 100) : 0}
                                strokeColor="#0284c7"
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>📦 تغليف وشحن ونقل:</span>
                                <strong>{profitability.operatingExpensesBreakdown?.packaging?.toLocaleString() || 0} ج.م</strong>
                              </div>
                              <Progress
                                percent={profitability.operatingExpenses > 0 ? Math.round(((profitability.operatingExpensesBreakdown?.packaging || 0) / profitability.operatingExpenses) * 100) : 0}
                                strokeColor="#8b5cf6"
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>💡 فواتير وخدمات ونثريات أخرى:</span>
                                <strong>{((profitability.operatingExpensesBreakdown?.utilities || 0) + (profitability.operatingExpensesBreakdown?.other || 0)).toLocaleString()} ج.م</strong>
                              </div>
                              <Progress
                                percent={profitability.operatingExpenses > 0 ? Math.round((((profitability.operatingExpensesBreakdown?.utilities || 0) + (profitability.operatingExpensesBreakdown?.other || 0)) / profitability.operatingExpenses) * 100) : 0}
                                strokeColor="#64748b"
                              />
                            </div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 5. Create Administrative Expense Drawer */}
      <Drawer
        title="تسجيل مصروف إداري / تشغيلي جديد"
        width={500}
        placement="left"
        open={expenseDrawerOpen}
        onClose={() => setExpenseDrawerOpen(false)}
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={handleCreateExpense}
          initialValues={{
            expense_date: dayjs().format('YYYY-MM-DD'),
            category: 'payroll',
            branch_id: branchesList[0]?.id || 1
          }}
        >
          <Form.Item
            name="branch_id"
            label="الفرع أو المستودع المعني بالمصروف"
            rules={[{ required: true, message: 'يرجى اختيار الفرع' }]}
          >
            <Select placeholder="اختر الفرع...">
              {branchesList.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.branch_name} ({b.branch_code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="نوع وتصنيف المصروف"
            rules={[{ required: true, message: 'يرجى تحديد التصنيف' }]}
          >
            <Select>
              <Option value="payroll">👥 قبض موظف / سحب بائع / رواتب</Option>
              <Option value="utility_bill">💡 فواتير (كهرباء، مياه، غاز، إنترنت)</Option>
              <Option value="rent">🏢 إيجار الفرع أو المقر</Option>
              <Option value="marketing">📢 إعلانات وتسويق وحملات</Option>
              <Option value="packaging">📦 تغليف ومواد تعبئة وشحن</Option>
              <Option value="other">⚙️ مصاريف تشغيلية أخرى ونثريات</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="recipient_name"
            label="اسم المستلم / الموظف أو الجهة"
            rules={[{ required: true, message: 'يرجى إدخال اسم المستلم' }]}
          >
            <Input placeholder="مثال: أحمد محمود (بائع)، شركة الكهرباء، شركة الإعلانات..." />
          </Form.Item>

          <Form.Item
            name="amount"
            label="المبلغ المنصرف (ج.م)"
            rules={[{ required: true, message: 'يرجى إدخال المبلغ' }]}
          >
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>

          <Form.Item
            name="expense_date"
            label="تاريخ الصرف"
            rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
          >
            <Input type="date" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="البيان والتفاصيل الإضافية"
          >
            <Input.TextArea rows={3} placeholder="اكتب تفاصيل المصروف أو سبب الصرف أو رقم الإيصال..." />
          </Form.Item>

          <Divider />

          <Button type="primary" htmlType="submit" loading={expenseSubmitting} block size="large" style={{ backgroundColor: '#ea580c' }}>
            تسجيل واعتماد المصروف فوراً
          </Button>
        </Form>
      </Drawer>

      {/* 6. Printable A4 Executive Report Modal */}
      <Modal
        title={
          <Space>
            <PrinterOutlined style={{ color: '#0f766e' }} />
            <span>معاينة تقرير اليومية الإدارية والمالية الشاملة للطباعة</span>
          </Space>
        }
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        width={950}
        footer={[
          <Button key="close" onClick={() => setPrintModalOpen(false)}>
            إلغاء
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleExecutePrint}
            style={{ backgroundColor: '#0f766e' }}
          >
            بدء الطباعة الورقية (A4)
          </Button>
        ]}
      >
        <div ref={printAreaRef} style={{ padding: '10px' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0f172a' }}>Yoka Store — تقرير اليومية الإدارية والمالية الشاملة</h2>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  النطاق: <strong>{selectedBranch === 'all' ? 'كافة الفروع والمستودعات' : branchesList.find(b => b.id === parseInt(selectedBranch, 10))?.branch_name}</strong>
                  {' | '}الفترة من: <strong>{dateRange[0]?.format('YYYY-MM-DD')}</strong> إلى: <strong>{dateRange[1]?.format('YYYY-MM-DD')}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'left', fontSize: 12, color: '#475569' }}>
                <div>تاريخ التقرير: <strong>{dayjs().format('YYYY-MM-DD hh:mm A')}</strong></div>
                <div>الإدارة المسؤولة: <strong>إدارة المستودع الرئيسي والإدارة المالية</strong></div>
              </div>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>إجمالي الإيرادات</div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1d4ed8' }}>{profitability.revenue?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>تكلفة البضاعة (COGS)</div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: '#dc2626' }}>{profitability.cogs?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>إجمالي الربح</div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: '#047857' }}>{profitability.grossProfit?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>مصاريف التشغيل</div>
              <div style={{ fontSize: 15, fontWeight: 'bold', color: '#c2410c' }}>{profitability.operatingExpenses?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ flex: 1, border: '2px solid #059669', padding: '8px', borderRadius: '4px', textAlign: 'center', background: '#ecfdf5' }}>
              <div style={{ fontSize: 11, color: '#065f46', fontWeight: 'bold' }}>المكسب الفعلي (صافي الربح)</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#047857' }}>{profitability.netProfit?.toLocaleString()} ج.م</div>
            </div>
          </div>

          {/* Printable Branches Net Inflow Table */}
          <h4 style={{ margin: '12px 0 6px 0', color: '#0f172a' }}>ملخص صافي الوارد من الفروع (بعد خصم المصاريف):</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #94a3b8', padding: '6px' }}>الفرع</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>مبيعات الوارد</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>مصروفات الفرع</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>صافي الوارد</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>صافي الكاش</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>فيزا</th>
                <th style={{ border: '1px solid #94a3b8', padding: '6px', textAlign: 'center' }}>تحويلات</th>
              </tr>
            </thead>
            <tbody>
              {operations.branchInflows?.map((b) => (
                <tr key={b.branch_id}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 'bold' }}>{b.branch_name}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{b.sales_revenue?.toLocaleString()}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#dc2626' }}>{b.branch_expenses?.toLocaleString()}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{b.net_inflow?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{b.net_cash?.toLocaleString()}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{b.card_sales?.toLocaleString()}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{b.transfer_sales?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Printable Signatures */}
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
              <div>المحاسب المالي</div>
              <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
              <div>مدير المستودع الرئيسي</div>
              <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
              <div>اعتماد الإدارة العليا</div>
              <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
