import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
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
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  BankOutlined,
  TeamOutlined,
  AppstoreOutlined,
  FundViewOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdminJournals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branchesList, setBranchesList] = useState([]);

  // Inspection / Review Modal State
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [inspectRecord, setInspectRecord] = useState(null);

  const handleInspectOperation = (record) => {
    setInspectRecord(record);
    setInspectModalVisible(true);
  };

  // Filters State
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs()
  ]);

  // Active Hub Section: null (Hub showing 4 cards) | 'expenses' | 'branch_inflows' | 'admin_operations' | 'profitability'
  const [activeSection, setActiveSection] = useState(null);

  // Expenses Tab: Category filter dropdown ('all' | 'payroll' | 'utility_bill' | 'other')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  // Operations Tab: Active sub-section ('all' | 'stock_adjustments' | 'cash_transfers' | 'supplier_payments' | 'transfers' | 'purchases')
  const [activeOpSection, setActiveOpSection] = useState('all');

  // Backend Data State
  const [data, setData] = useState({
    expenses: {
      items: [],
      summary: {},
      payrollByEmployee: []
    },
    operations: {
      allOperations: [],
      stockAdjustments: [],
      cashTransfers: [],
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
      printHtmlContent({
        title: 'تقرير اليومية الإدارية والمالية الشاملة - يوكا ستور',
        htmlContent: printAreaRef.current.innerHTML,
        pageType: 'a4-landscape'
      });
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
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة ومراجعة حركة المصروف">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'expense' })}
          />
        </Tooltip>
      )
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
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة ومراجعة إذن الصرف">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'stock_transfer' })}
          />
        </Tooltip>
      )
    }
  ];

  // Columns for All Administrative Operations Unified Timeline
  const allOperationsColumns = [
    {
      title: 'نوع العملية الإدارية',
      key: 'operation_title',
      width: 220,
      render: (_, r) => {
        let tagColor = 'blue';
        let icon = <SwapOutlined />;
        if (r.operation_type === 'stock_adjustment') {
          tagColor = 'purple';
          icon = <AuditOutlined />;
        } else if (r.operation_type === 'cash_transfer') {
          tagColor = 'gold';
          icon = <BankOutlined />;
        } else if (r.operation_type === 'supplier_payment') {
          tagColor = 'cyan';
          icon = <DollarOutlined />;
        } else if (r.operation_type === 'purchase_invoice') {
          tagColor = 'green';
          icon = <FileTextOutlined />;
        }
        return (
          <Tag color={tagColor} style={{ fontWeight: 700, padding: '3px 8px', fontSize: 13 }}>
            {icon} {r.operation_title}
          </Tag>
        );
      }
    },
    {
      title: 'رقم السند / الإذن',
      dataIndex: 'reference_no',
      key: 'reference_no',
      width: 170,
      render: (ref) => <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ref || '—'}</Tag>
    },
    {
      title: 'الفرع / الجهة المعنية',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (b) => <Text strong style={{ color: '#334155' }}>{b || 'المستودع الرئيسي'}</Text>
    },
    {
      title: 'الأثر المالي / الكمية',
      key: 'impact',
      align: 'right',
      width: 180,
      render: (_, r) => {
        if (r.operation_type === 'stock_adjustment') {
          const isSurplus = (r.quantity_impact || 0) >= 0;
          return (
            <div>
              <Text strong style={{ color: isSurplus ? '#16a34a' : '#dc2626' }}>
                {isSurplus ? `+${r.quantity_impact}` : r.quantity_impact} قطعة
              </Text>
              {r.amount !== 0 && (
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  قيمة: {parseFloat(r.amount || 0).toLocaleString()} ج.م
                </div>
              )}
            </div>
          );
        }
        if (r.operation_type === 'stock_transfer') {
          return (
            <Tag color="geekblue" style={{ fontWeight: 800 }}>
              {r.quantity_impact} صنف
            </Tag>
          );
        }
        const amt = parseFloat(r.amount || 0);
        return (
          <Text strong style={{ fontSize: 14, color: r.operation_type === 'cash_transfer' ? '#d97706' : '#059669' }}>
            {amt.toLocaleString()} ج.م
          </Text>
        );
      }
    },
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (st) => {
        if (['approved', 'completed', 'confirmed'].includes(st)) {
          return <Tag color="green"><CheckCircleOutlined /> معتمد ومكتمل</Tag>;
        }
        if (st === 'pending') {
          return <Tag color="gold">معلق بالانتظار</Tag>;
        }
        return <Tag color="default">{st}</Tag>;
      }
    },
    {
      title: 'البيان / المسؤول',
      key: 'details',
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 13 }}>{r.notes || '—'}</div>
          {r.user_name && <div style={{ fontSize: 11, color: '#64748b' }}>المسؤول: {r.user_name}</div>}
        </div>
      )
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق العملية الإدارية">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation(r)}
          />
        </Tooltip>
      )
    }
  ];

  // Columns for Stock Adjustments Table (سندات التسوية المخزنية)
  const stockAdjustmentColumns = [
    {
      title: 'رقم سند التسوية',
      dataIndex: 'adjustment_number',
      key: 'adjustment_number',
      render: (num) => <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{num}</Tag>
    },
    {
      title: 'الفرع / المخزن',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (b) => <Tag color="blue"><ShopOutlined /> {b || 'المستودع الرئيسي'}</Tag>
    },
    {
      title: 'تاريخ التسوية',
      dataIndex: 'adjustment_date',
      key: 'adjustment_date',
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'عدد الأصناف',
      dataIndex: 'total_items',
      key: 'total_items',
      align: 'center',
      render: (n) => <Tag color="default">{n} صنف</Tag>
    },
    {
      title: 'فروقات الكمية',
      key: 'qty_changes',
      render: (_, r) => {
        const surplus = parseInt(r.total_surplus_qty || 0, 10);
        const deficit = parseInt(r.total_deficit_qty || 0, 10);
        const net = parseInt(r.net_qty_change || 0, 10);
        return (
          <Space wrap size="small">
            {surplus > 0 && <Tag color="green">فائض (+{surplus})</Tag>}
            {deficit > 0 && <Tag color="red">عجز (-{deficit})</Tag>}
            <Tag color={net >= 0 ? 'success' : 'error'} style={{ fontWeight: 800 }}>
              صافي: {net >= 0 ? `+${net}` : net}
            </Tag>
          </Space>
        );
      }
    },
    {
      title: 'الفارق المالي (بالتكلفة)',
      dataIndex: 'total_variance_cost',
      key: 'total_variance_cost',
      align: 'right',
      render: (cost) => {
        const c = parseFloat(cost || 0);
        return (
          <Text strong style={{ color: c >= 0 ? '#16a34a' : '#dc2626', fontSize: 13 }}>
            {c >= 0 ? `+${c.toLocaleString()}` : c.toLocaleString()} ج.م
          </Text>
        );
      }
    },
    {
      title: 'البيان / المعتمد',
      key: 'reason',
      render: (_, r) => (
        <div>
          <div>{r.reason || r.notes || 'تسوية جرد'}</div>
          {(r.approved_by_name || r.created_by_name) && (
            <div style={{ fontSize: 11, color: '#64748b' }}>
              المعتمد: {r.approved_by_name || r.created_by_name}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (st) => st === 'approved' ? <Tag color="green"><CheckCircleOutlined /> معتمد</Tag> : <Tag color="orange">{st}</Tag>
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق سند التسوية">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'stock_adjustment' })}
          />
        </Tooltip>
      )
    }
  ];

  // Columns for Cash Transfers Table (تحويلات الفرع للخزنة الرئيسية)
  const cashTransferColumns = [
    {
      title: 'رقم الإذن',
      dataIndex: 'reference_no',
      key: 'reference_no',
      render: (ref) => <Tag color="gold" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ref}</Tag>
    },
    {
      title: 'الفرع المُسلِّم (المصدر)',
      dataIndex: 'from_branch_name',
      key: 'from_branch_name',
      render: (b) => <Tag color="blue"><ShopOutlined /> {b}</Tag>
    },
    {
      title: 'الخزينة المستلمة',
      dataIndex: 'to_branch_name',
      key: 'to_branch_name',
      render: (b) => <Tag color="purple"><BankOutlined /> {b || 'الخزينة الرئيسية'}</Tag>
    },
    {
      title: 'المبلغ المحول',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amt) => (
        <Text strong style={{ color: '#d97706', fontSize: 15 }}>
          {parseFloat(amt || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'طريقة التحويل',
      dataIndex: 'transfer_method',
      key: 'transfer_method',
      render: (m) => <Tag color="cyan">{m === 'manual_cash' ? 'تسليم نقدي (كاش)' : m}</Tag>
    },
    {
      title: 'تاريخ وتوقيت الطلب',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'مشرف الفرع / المعتمد',
      key: 'users',
      render: (_, r) => (
        <div>
          <div>بواسطة: {r.requested_by_name || 'مشرف الفرع'}</div>
          {r.confirmed_by_name && (
            <div style={{ fontSize: 11, color: '#059669' }}>
              مستلم الخزينة: {r.confirmed_by_name}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (st) => st === 'confirmed'
        ? <Tag color="green"><CheckCircleOutlined /> مؤكد بالخزينة</Tag>
        : st === 'pending'
          ? <Tag color="gold">معلق بالانتظار</Tag>
          : <Tag color="red">{st}</Tag>
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق تحويل النقدية">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'cash_transfer' })}
          />
        </Tooltip>
      )
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
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق دفعة سداد المورد">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'supplier_payment' })}
          />
        </Tooltip>
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
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق فاتورة الشراء والتوريد">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 15 }} />}
            onClick={() => handleInspectOperation({ ...r, operation_type: 'purchase_invoice' })}
          />
        </Tooltip>
      )
    }
  ];

  const { expenses, operations, profitability } = data;

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header Toolbar */}
      <div className="swm-page-header">
        <button
          type="button"
          className="swm-back-home-btn"
          onClick={() => navigate('/dashboard/home')}
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <HomeIcon size={15} />
          <span>الرئيسية</span>
        </button>

        <div className="swm-page-title-area">
          <h2>
            <AuditOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            اليوميات الإدارية (Administrative Journals & Financials)
          </h2>
          <p>لوحة القيادة الإدارية والمالية الشاملة: رقابة المصروفات، سداد الموردين، التحويلات، وصافي الأرباح</p>
        </div>

        <div className="swm-page-actions">
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchData} style={{ height: 44, borderRadius: 8 }}>
            تحديث البيانات
          </Button>
        </div>
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

      {/* ======================================================== */}
      {/* 3. Three Main Hub Navigation Cards (Default View)         */}
      {/* ======================================================== */}
      {activeSection === null ? (
        <div style={{ marginBottom: 32 }}>
          {/* Header Notice / Prompt */}
          <div
            style={{
              marginBottom: 18,
              padding: '12px 18px',
              backgroundColor: '#fff',
              borderRadius: 12,
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.05)'
            }}
          >
            <Space size="middle">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18
                }}
              >
                <AuditOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                  أقسام اليوميات الإدارية والرقابة العامة
                </Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  اختر أحد الأقسام التالية للاطلاع على التفاصيل الكاملة، الجداول، والعمليات الرقابية.
                </div>
              </div>
            </Space>

            <Tag color="error" style={{ borderRadius: 12, fontWeight: 700, padding: '3px 10px' }}>
              4 أقسام رئيسية
            </Tag>
          </div>

          <Row gutter={[16, 16]}>
            {/* Card A: أ. المصروفات وقبض الموظفين */}
            <Col xs={24} sm={12} lg={6}>
              <div
                onClick={() => setActiveSection('expenses')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 16,
                  padding: '20px 18px 16px 18px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 280,
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        <WalletOutlined />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                          أ. المصروفات وقبض الموظفين
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          سندات الصرف وفواتير الخدمات
                        </div>
                      </div>
                    </div>

                    <Tag color="volcano" style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                      {expenses.summary?.count || 0} سند
                    </Tag>
                  </div>

                  <Paragraph style={{ color: '#475569', fontSize: 12, minHeight: 36, lineHeight: 1.5, marginBottom: 12 }}>
                    سندات الصرف، كشف تفصيلي لقبض الموظفين ومسحوباتهم لكل فرع، مع إمكانية إضافة سند وطباعة الكشوفات.
                  </Paragraph>

                  {/* Simple KPI block */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      marginBottom: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: '#9a3412', fontWeight: 600 }}>إجمالي المصروف:</span>
                      <strong style={{ fontSize: 16, color: '#c2410c', fontWeight: 800 }}>
                        {(expenses.summary?.totalExpenses || 0).toLocaleString()} ج.م
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#7c2d12', display: 'flex', justifyContent: 'space-between' }}>
                      <span>منها رواتب:</span>
                      <strong>{(expenses.summary?.totalPayroll || 0).toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* Navigation CTA Bar */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 12.5
                  }}
                >
                  <span>عرض تفاصيل المصروفات والرواتب</span>
                  <ArrowLeftOutlined style={{ fontSize: 14 }} />
                </div>
              </div>
            </Col>

            {/* Card B: ب. صافي الوارد وتوريدات الفروع */}
            <Col xs={24} sm={12} lg={6}>
              <div
                onClick={() => setActiveSection('branch_inflows')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 16,
                  padding: '20px 18px 16px 18px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 280,
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        <BankOutlined />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                          ب. صافي الوارد وتوريدات الفروع
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          كاش، فيزا، ومحافظ الفروع
                        </div>
                      </div>
                    </div>

                    <Tag color="cyan" style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                      توريدات الفروع
                    </Tag>
                  </div>

                  <Paragraph style={{ color: '#475569', fontSize: 12, minHeight: 36, lineHeight: 1.5, marginBottom: 12 }}>
                    كشف صافي المبالغ الموردة من كل فرع بعد خصم مصاريفه، مع تفصيل كامل للنقدية والفيزا والتسويات اليومية.
                  </Paragraph>

                  {/* Simple KPI block */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      marginBottom: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: '#0369a1', fontWeight: 600 }}>صافي الوارد:</span>
                      <strong style={{ fontSize: 16, color: '#0284c7', fontWeight: 800 }}>
                        {(operations.summary?.netBranchInflow || 0).toLocaleString()} ج.م
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#075985', display: 'flex', justifyContent: 'space-between' }}>
                      <span>كاش: {(operations.summary?.netCash || 0).toLocaleString()}</span>
                      <span>فيزا: {(operations.summary?.totalCardSales || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation CTA Bar */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 12.5
                  }}
                >
                  <span>عرض كشف توريدات الفروع</span>
                  <ArrowLeftOutlined style={{ fontSize: 14 }} />
                </div>
              </div>
            </Col>

            {/* Card C: ج. العمليات الإدارية والرقابة الشاملة */}
            <Col xs={24} sm={12} lg={6}>
              <div
                onClick={() => setActiveSection('admin_operations')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 16,
                  padding: '20px 18px 16px 18px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 280,
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        <SwapOutlined />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                          ج. العمليات الإدارية والرقابة
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          تسويات، تحويلات، وسداد موردين
                        </div>
                      </div>
                    </div>

                    <Tag color="blue" style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                      {operations.summary?.totalAllOperationsCount || operations.allOperations?.length || 0} عملية
                    </Tag>
                  </div>

                  <Paragraph style={{ color: '#475569', fontSize: 12, minHeight: 36, lineHeight: 1.5, marginBottom: 12 }}>
                    متابعة تسويات المخزون (عجز/فائض)، تحويلات الخزينة، أذون نقل البضائع، ومشتريات وسداد الموردين مع الفحص.
                  </Paragraph>

                  {/* Simple KPI block */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      marginBottom: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: '#3730a3', fontWeight: 600 }}>إجمالي العمليات:</span>
                      <strong style={{ fontSize: 16, color: '#4338ca', fontWeight: 800 }}>
                        {operations.summary?.totalAllOperationsCount || operations.allOperations?.length || 0} حركة
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#312e81', display: 'flex', justifyContent: 'space-between' }}>
                      <span>تسويات: {operations.stockAdjustments?.length || 0}</span>
                      <span>تحويلات خزنة: {operations.cashTransfers?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation CTA Bar */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 12.5
                  }}
                >
                  <span>عرض سجل العمليات والرقابة</span>
                  <ArrowLeftOutlined style={{ fontSize: 14 }} />
                </div>
              </div>
            </Col>

            {/* Card D: د. تقرير الأرباح والمكسب الفعلي (P&L) */}
            <Col xs={24} sm={12} lg={6}>
              <div
                onClick={() => setActiveSection('profitability')}
                style={{
                  cursor: 'pointer',
                  borderRadius: 16,
                  padding: '20px 18px 16px 18px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #ef4444',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 280,
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: '#d1fae5',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        <FundViewOutlined />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                          د. تقرير الأرباح والمكسب الفعلي (P&L)
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          قائمة الدخل وتكلفة COGS
                        </div>
                      </div>
                    </div>

                    <Tag color="green" style={{ borderRadius: 12, fontWeight: 700, margin: 0 }}>
                      هامش {profitability.netMarginPct}%
                    </Tag>
                  </div>

                  <Paragraph style={{ color: '#475569', fontSize: 12, minHeight: 36, lineHeight: 1.5, marginBottom: 12 }}>
                    قائمة الدخل الشاملة، تحليل إجمالي المبيعات، تكلفة البضاعة المباعة COGS، وحساب صافي الربح الفعلي بعد المصاريف.
                  </Paragraph>

                  {/* Simple KPI block */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: profitability.netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${profitability.netProfit >= 0 ? '#a7f3d0' : '#fecaca'}`,
                      marginBottom: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: profitability.netProfit >= 0 ? '#065f46' : '#991b1b', fontWeight: 600 }}>
                        صافي الربح:
                      </span>
                      <strong style={{ fontSize: 16, color: profitability.netProfit >= 0 ? '#047857' : '#b91c1c', fontWeight: 800 }}>
                        {(profitability.netProfit || 0).toLocaleString()} ج.م
                      </strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#065f46', display: 'flex', justifyContent: 'space-between' }}>
                      <span>الإيراد: {(profitability.revenue || 0).toLocaleString()}</span>
                      <span>مجمل: {(profitability.grossProfit || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Navigation CTA Bar */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 12.5
                  }}
                >
                  <span>عرض تقرير الأرباح وقائمة الدخل</span>
                  <ArrowLeftOutlined style={{ fontSize: 14 }} />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {/* Header Back Bar */}
          <div
            style={{
              marginBottom: 16,
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
            }}
          >
            <Button
              icon={<ArrowRightOutlined style={{ color: '#DFCA95', fontSize: 15 }} />}
              onClick={() => setActiveSection(null)}
              style={{
                fontWeight: 800,
                borderRadius: 8,
                backgroundColor: '#0B0F17',
                borderColor: '#C8A45C',
                color: '#DFCA95',
                height: 40,
                padding: '0 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(11, 15, 23, 0.25)',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#161F30';
                e.currentTarget.style.borderColor = '#F3E5AB';
                e.currentTarget.style.color = '#F3E5AB';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0B0F17';
                e.currentTarget.style.borderColor = '#C8A45C';
                e.currentTarget.style.color = '#DFCA95';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span style={{ color: '#DFCA95', fontWeight: 800 }}>العودة للأقسام الرئيسية (اليوميات والرقابة)</span>
            </Button>
          </div>

          <Card
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '16px 20px 20px 20px' } }}
          >
            <Tabs
              activeKey={activeSection}
              onChange={(k) => setActiveSection(k)}
              renderTabBar={() => null}
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
                        style={{ minWidth: 200, maxWidth: '100%', flex: 1 }}
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
                      <Button
                        type="primary"
                        danger
                        icon={<PlusOutlined />}
                        onClick={() => setExpenseDrawerOpen(true)}
                        style={{ borderRadius: 8, fontWeight: 700 }}
                      >
                        + إضافة مصروف إداري
                      </Button>
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={() => setPrintModalOpen(true)}
                        className="btn-print"
                        style={{ borderRadius: 8, backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}
                      >
                        طباعة تقرير اليومية (A4)
                      </Button>
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
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
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
                      pagination={false}
                      size="middle"
                      scroll={{ x: 'max-content' }}
                    />
                  </Card>
                </div>
              )
            },
            {
              key: 'branch_inflows',
              label: (
                <Space>
                  <BankOutlined style={{ color: '#0284c7', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>ب. صافي الوارد وتوريدات الفروع</span>
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
                      scroll={{ x: 'max-content' }}
                    />
                  </Card>
                </div>
              )
            },
            {
              key: 'admin_operations',
              label: (
                <Space>
                  <SwapOutlined style={{ color: '#4f46e5', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>ج. العمليات الإدارية والرقابة الشاملة</span>
                </Space>
              ),
              children: (
                <div>
                  {/* Operations Quick Summary KPI Cards */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#475569' }}>📋 إجمالي العمليات</Text>}
                          value={operations.summary?.totalAllOperationsCount || operations.allOperations?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#7e22ce' }}>⚖️ سندات التسوية</Text>}
                          value={operations.stockAdjustments?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#6b21a8' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#b45309' }}>💰 تحويلات الخزنة</Text>}
                          value={operations.cashTransfers?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#ecfeff', border: '1px solid #a5f3fc' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#0e7490' }}>💳 سداد الموردين</Text>}
                          value={operations.supplierPayments?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#0891b2' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#1d4ed8' }}>🚚 أذون الصرف والنقل</Text>}
                          value={operations.transfers?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} lg={4}>
                      <Card size="small" className="stat-metric-card" style={{ borderRadius: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <Statistic
                          title={<Text style={{ fontSize: 12, color: '#15803d' }}>📥 فواتير الشراء</Text>}
                          value={operations.purchaseInvoices?.length || 0}
                          valueStyle={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Administrative Operations Sub-Tabs */}
                  <Card
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <Space>
                          <SwapOutlined style={{ color: '#4f46e5' }} />
                          <span>سجل العمليات الإدارية والرقابة الشاملة</span>
                        </Space>
                        <Radio.Group
                          value={activeOpSection}
                          onChange={(e) => setActiveOpSection(e.target.value)}
                          buttonStyle="solid"
                          style={{ flexWrap: 'wrap' }}
                        >
                          <Radio.Button value="all">
                            🌐 كافة العمليات ({operations.allOperations?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="stock_adjustments">
                            ⚖️ سندات التسوية ({operations.stockAdjustments?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="cash_transfers">
                            💰 تحويلات الخزنة ({operations.cashTransfers?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="supplier_payments">
                            💳 سداد موردين ({operations.supplierPayments?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="transfers">
                            🚚 أذون الصرف ({operations.transfers?.length || 0})
                          </Radio.Button>
                          <Radio.Button value="purchases">
                            📥 فواتير التوريد ({operations.purchaseInvoices?.length || 0})
                          </Radio.Button>
                        </Radio.Group>
                      </div>
                    }
                    styles={{ body: { padding: 0 } }}
                    style={{ borderRadius: 8 }}
                  >
                    {activeOpSection === 'all' && (
                      <Table
                        dataSource={operations.allOperations || []}
                        columns={allOperationsColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                      />
                    )}
                    {activeOpSection === 'stock_adjustments' && (
                      <Table
                        dataSource={operations.stockAdjustments || []}
                        columns={stockAdjustmentColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                      />
                    )}
                    {activeOpSection === 'cash_transfers' && (
                      <Table
                        dataSource={operations.cashTransfers || []}
                        columns={cashTransferColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                      />
                    )}
                    {activeOpSection === 'transfers' && (
                      <Table
                        dataSource={operations.transfers || []}
                        columns={transferColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                      />
                    )}
                    {activeOpSection === 'supplier_payments' && (
                      <Table
                        dataSource={operations.supplierPayments || []}
                        columns={supplierPaymentColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                      />
                    )}
                    {activeOpSection === 'purchases' && (
                      <Table
                        dataSource={operations.purchaseInvoices || []}
                        columns={purchaseColumns}
                        rowKey="id"
                        loading={loading}
                        pagination={false}
                        size="middle"
                        scroll={{ x: 'max-content' }}
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
                  <span style={{ fontWeight: 700 }}>د. تقرير الأرباح والمكسب الفعلي (P&L)</span>
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
    </div>
  )}

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
            icon={<PrinterOutlined style={{ color: '#DFCA95' }} />}
            onClick={handleExecutePrint}
            style={{
              backgroundColor: '#0B0F17',
              borderColor: '#C8A45C',
              color: '#DFCA95',
              fontWeight: 800,
              borderRadius: 8
            }}
          >
            بدء الطباعة الورقية (A4)
          </Button>
        ]}
      >
        <div ref={printAreaRef} style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
          {/* Branded Header */}
          <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
            <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>تقرير اليومية الإدارية والمالية الشاملة وتحليل أداء الفروع</div>
                <div style={{ fontSize: 10.5, color: '#64748b' }}>
                  النطاق: <strong>{selectedBranch === 'all' ? 'كافة الفروع والمستودعات' : branchesList.find(b => b.id === parseInt(selectedBranch, 10))?.branch_name}</strong>
                  {' • '}الفترة: من <strong>{dateRange[0]?.format('YYYY-MM-DD')}</strong> إلى <strong>{dateRange[1]?.format('YYYY-MM-DD')}</strong>
                </div>
              </div>
            </div>
            <div className="doc-badge-box" style={{ textAlign: 'left' }}>
              <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                اليومية الإدارية والمالية (A4)
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>
                تاريخ الاستخراج: {dayjs().format('YYYY-MM-DD HH:mm')}
              </div>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div className="swm-modal-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي الإيرادات</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1d4ed8', fontFamily: 'monospace', marginTop: 2 }}>{profitability.revenue?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>تكلفة البضاعة (COGS)</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: 2 }}>{profitability.cogs?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي الربح</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#059669', fontFamily: 'monospace', marginTop: 2 }}>{profitability.grossProfit?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>مصاريف التشغيل</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#c2410c', fontFamily: 'monospace', marginTop: 2 }}>{profitability.operatingExpenses?.toLocaleString()} ج.م</div>
            </div>
            <div style={{ border: '2px solid #059669', padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: '#ecfdf5' }}>
              <div style={{ fontSize: 10.5, color: '#065f46', fontWeight: 800 }}>صافي الربح الفعلي</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#059669', fontFamily: 'monospace', marginTop: 2 }}>{profitability.netProfit?.toLocaleString()} ج.م</div>
            </div>
          </div>

          {/* Printable Branches Net Inflow Table */}
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            ملخص صافي الوارد والتدفقات النقدية للفروع (بعد خصم المصاريف):
          </div>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px' }}>الفرع / المعرض</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>مبيعات الوارد</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>مصروفات الفرع</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>صافي الوارد</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>صافي الكاش</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>بطاقات / فيزا</th>
                <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>تحويلات بنكية / إنستاباي</th>
              </tr>
            </thead>
            <tbody>
              {operations.branchInflows?.map((b, idx) => (
                <tr key={b.branch_id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 700 }}>{b.branch_name}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>{b.sales_revenue?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', color: '#dc2626', fontFamily: 'monospace', fontWeight: 600 }}>{b.branch_expenses?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{b.net_inflow?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', color: '#16a34a', fontFamily: 'monospace', fontWeight: 700 }}>{b.net_cash?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{b.card_sales?.toLocaleString()} ج.م</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace' }}>{b.transfer_sales?.toLocaleString()} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Printable Signatures */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed #94a3b8', paddingTop: 14 }}>
            <div style={{ width: '28%', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 26 }}>المحاسب المالي</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ width: '28%', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 26 }}>مدير إدارة العمليات والمستودعات</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ width: '28%', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 26 }}>اعتماد الإدارة العليا والمراجعة العامة</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
          </div>

          {/* Verification Footer */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>تقرير إداري ومالي رسمي صادر عن منظومة Yoka SWM</span>
            <span>تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 👁️ OPERATION INSPECTION & REVIEW MODAL */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#ede9fe', color: '#7c3aed', padding: '6px 10px', borderRadius: 8, fontSize: 18 }}>
              <EyeOutlined />
            </div>
            <div>
              <span style={{ fontSize: 17, fontWeight: 'bold' }}>معاينة وتدقيق العملية الإدارية والرقابية</span>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {inspectRecord?.operation_title || inspectRecord?.reference_no || inspectRecord?.adjustment_number || inspectRecord?.transfer_number || inspectRecord?.payment_ref || inspectRecord?.invoice_number || 'تفاصيل المعاملة'}
              </div>
            </div>
          </div>
        }
        open={inspectModalVisible}
        onCancel={() => setInspectModalVisible(false)}
        footer={<Button type="primary" onClick={() => setInspectModalVisible(false)}>إغلاق [Esc]</Button>}
        width={720}
        destroyOnHidden
      >
        {inspectRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Summary Highlights */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>نوع الحركة / العملية:</Text>
                <div style={{ fontWeight: 'bold', fontSize: 15, color: '#0f172a', marginTop: 2 }}>
                  {inspectRecord.operation_title || (
                    inspectRecord.adjustment_number ? 'سند تسوية مخزنية' :
                    inspectRecord.reference_no ? 'تحويل نقدية للخزينة' :
                    inspectRecord.transfer_number ? 'إذن صرف ونقل بضائع' :
                    inspectRecord.payment_ref ? 'سداد دفعة لمورد' :
                    inspectRecord.invoice_number ? 'فاتورة شراء وتوريد' :
                    inspectRecord.category ? 'حركة مصروفات' : 'عملية إدارية'
                  )}
                </div>
              </div>

              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>الحالة الرسمية:</Text>
                <div style={{ marginTop: 2 }}>
                  {['approved', 'confirmed', 'completed'].includes(inspectRecord.status) ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>معتمد ومكتمل</Tag>
                  ) : inspectRecord.status === 'pending' ? (
                    <Tag color="gold">معلق بالانتظار</Tag>
                  ) : (
                    <Tag color="blue">{inspectRecord.status || 'معتمد'}</Tag>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Properties Grid */}
            <Card size="small" style={{ borderRadius: 8 }}>
              <Row gutter={[16, 14]}>
                {/* Reference No */}
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>رقم المرجع / الإذن:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 14, fontFamily: 'monospace', color: '#4f46e5', marginTop: 2 }}>
                    {inspectRecord.reference_no || inspectRecord.adjustment_number || inspectRecord.transfer_number || inspectRecord.payment_ref || inspectRecord.invoice_number || inspectRecord.id || '—'}
                  </div>
                </Col>

                {/* Date */}
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>التاريخ المسجل:</Text>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                    {dayjs(inspectRecord.date || inspectRecord.adjustment_date || inspectRecord.transfer_date || inspectRecord.payment_date || inspectRecord.invoice_date || inspectRecord.expense_date || inspectRecord.requested_at).format('YYYY-MM-DD HH:mm')}
                  </div>
                </Col>

                {/* Branch Info */}
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>الفرع أو المخزن المرتبط:</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    <ShopOutlined style={{ marginLeft: 4, color: '#2563eb' }} />
                    {inspectRecord.branch_name || inspectRecord.from_branch_name || inspectRecord.warehouse_name || 'المستودع الرئيسي'}
                  </div>
                </Col>

                {/* Destination if applicable */}
                {inspectRecord.to_branch_name && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>الجهة المستلمة:</Text>
                    <div style={{ fontWeight: 600, color: '#16a34a', marginTop: 2 }}>
                      <BankOutlined style={{ marginLeft: 4 }} />
                      {inspectRecord.to_branch_name}
                    </div>
                  </Col>
                )}

                {/* Amount if applicable */}
                {(inspectRecord.amount !== undefined || inspectRecord.total_variance_cost !== undefined || inspectRecord.final_amount !== undefined) && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>القيمة المالية:</Text>
                    <div style={{ fontWeight: 'bold', fontSize: 16, color: '#059669', marginTop: 2 }}>
                      {parseFloat(inspectRecord.amount || inspectRecord.total_variance_cost || inspectRecord.final_amount || 0).toLocaleString()} ج.م
                    </div>
                  </Col>
                )}

                {/* Quantity impact if applicable */}
                {(inspectRecord.quantity_impact !== undefined || inspectRecord.total_units !== undefined || inspectRecord.net_qty_change !== undefined) && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>الأثر الكمي بالمخزن:</Text>
                    <div style={{ fontWeight: 'bold', fontSize: 15, marginTop: 2 }}>
                      <Tag color="cyan" style={{ fontSize: 13, padding: '2px 8px' }}>
                        {inspectRecord.quantity_impact || inspectRecord.total_units || inspectRecord.net_qty_change} قطعة
                      </Tag>
                    </div>
                  </Col>
                )}

                {/* Surplus and deficit for stock adjustments */}
                {inspectRecord.surplus_qty !== undefined && inspectRecord.deficit_qty !== undefined && (
                  <Col span={24}>
                    <Space size="large" wrap>
                      <span>فائض: <strong style={{ color: '#16a34a' }}>+{inspectRecord.surplus_qty || 0}</strong></span>
                      <span>عجز: <strong style={{ color: '#dc2626' }}>-{inspectRecord.deficit_qty || 0}</strong></span>
                    </Space>
                  </Col>
                )}

                {/* User / Responsible */}
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>المسؤول / المعتمد:</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    <UserOutlined style={{ marginLeft: 4, color: '#64748b' }} />
                    {inspectRecord.user_name || inspectRecord.approved_by_name || inspectRecord.created_by_name || inspectRecord.requested_by_name || inspectRecord.recorded_by_name || 'الإدارة'}
                  </div>
                </Col>

                {/* Driver / Transport */}
                {inspectRecord.driver_name && (
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>مندوب النقل / السائق:</Text>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>
                      {inspectRecord.driver_name} {inspectRecord.vehicle_number ? `(${inspectRecord.vehicle_number})` : ''}
                    </div>
                  </Col>
                )}

                {/* Notes / Description */}
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>البيان والتفاصيل والملاحظات:</Text>
                  <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, marginTop: 4, fontSize: 13 }}>
                    {inspectRecord.notes || inspectRecord.reason || inspectRecord.description || 'لا توجد ملاحظات إضافية مسجلة.'}
                  </div>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
