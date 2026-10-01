import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  InputNumber,
  Select,
  message,
  Divider,
  DatePicker,
  Radio,
  Popconfirm,
  Alert,
  Spin,
  Modal,
  Tabs,
  Table,
  Statistic,
  Tooltip,
  Badge
} from 'antd';
import dayjs from 'dayjs';
import {
  Users,
  Layers,
  Clock,
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ReloadOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
  ShopOutlined,
  WalletOutlined,
  EyeOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const PRESET_EXPENSE_CATEGORIES = [
  'ضيافة وبوفيه',
  'أدوات ومهمات مكتبية',
  'نظافة ومستلزمات',
  'صيانة مرافق وكهرباء',
  'إنترنت واتصالات',
  'نقل ومصاريف شحن',
  'إكراميات وعمالة مؤقتة',
  'فواتير مياه وكهرباء'
];

// Arabic search normalization helper (removes alef variants, teh marbuta, yeh variants, diacritics)
const normalizeArabic = (str) => {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
};

export default function SellerPayrollAndExpenseCategoriesCards({ currentUser }) {
  // Navigation tabs
  const [activeTabKey, setActiveTabKey] = useState('payroll');

  // Month & Global States
  const [payrollMonth, setPayrollMonth] = useState(dayjs().format('YYYY-MM'));
  const [safeBalances, setSafeBalances] = useState({ cash: 0, visa: 0, transfer: 0, total: 0 });

  // Seller Payroll Disbursal State
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [sellerSummary, setSellerSummary] = useState(null);
  const [loadingSellerSummary, setLoadingSellerSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Quick lookup map for employees
  const employeeMap = useMemo(() => {
    const map = new Map();
    employeesList.forEach((e) => map.set(String(e.id), e));
    return map;
  }, [employeesList]);

  // Financial adjustments
  const [deductionsAmount, setDeductionsAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusReason, setBonusReason] = useState('');
  const [payrollChannel, setPayrollChannel] = useState('cash');
  const [deductSource, setDeductSource] = useState('main_treasury');
  const [branchSafeBalances, setBranchSafeBalances] = useState({ cash: 0, visa: 0, transfer: 0, total: 0 });
  const [loadingBranchSafe, setLoadingBranchSafe] = useState(false);
  const [payrollNotes, setPayrollNotes] = useState('');
  const [submittingPayroll, setSubmittingPayroll] = useState(false);

  // Modals & History
  const [advancesModalOpen, setAdvancesModalOpen] = useState(false);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPayoutForReceipt, setSelectedPayoutForReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Branch Expense Categories State
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // 1. Fetch active employees
  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/api/swm/users', { params: { limit: 200, status: 'active' } });
      if (res.data?.success) setEmployeesList(res.data.data || []);
    } catch (e) {
      console.error('Fetch employees error:', e);
    }
  };

  // 2. Fetch main treasury balances
  const fetchSafeBalances = async () => {
    try {
      const res = await api.get('/api/swm/treasury/kpis');
      if (res.data?.success && res.data.data?.main_safe) {
        const ms = res.data.data.main_safe;
        setSafeBalances({
          cash: parseFloat(ms.cash_balance || 0),
          visa: parseFloat(ms.visa_balance || 0),
          transfer: parseFloat(ms.transfer_balance || 0),
          total: parseFloat(ms.total_balance || 0)
        });
      }
    } catch (e) {
      console.error('Fetch safe balances error:', e);
    }
  };

  // 3. Fetch payroll history for current month
  const fetchPayrollHistory = async (monthVal) => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/api/swm/treasury/payroll-history', {
        params: { month: monthVal || payrollMonth, limit: 100 }
      });
      if (res.data?.success) {
        setPayrollHistory(res.data.data || []);
      }
    } catch (e) {
      console.error('Fetch payroll history error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 4. Fetch specific employee's monthly summary and branch safe balances
  const fetchBranchSafe = async (branchId) => {
    if (!branchId) {
      setBranchSafeBalances({ cash: 0, visa: 0, transfer: 0, total: 0 });
      return;
    }
    setLoadingBranchSafe(true);
    try {
      const res = await api.get('/api/swm/treasury/branch-safe', { params: { branch_id: branchId } });
      if (res.data?.success && res.data.data?.safe) {
        const s = res.data.data.safe;
        setBranchSafeBalances({
          cash: parseFloat(s.cash_balance || 0),
          visa: parseFloat(s.visa_balance || 0),
          transfer: parseFloat(s.transfer_balance || 0),
          total: parseFloat(s.total_balance || 0)
        });
      }
    } catch (e) {
      console.error('Fetch branch safe error:', e);
    } finally {
      setLoadingBranchSafe(false);
    }
  };

  const fetchSellerSummary = async (sellerId, monthVal) => {
    if (!sellerId) {
      setSellerSummary(null);
      setSummaryError(null);
      setBranchSafeBalances({ cash: 0, visa: 0, transfer: 0, total: 0 });
      return;
    }
    setLoadingSellerSummary(true);
    setSummaryError(null);
    try {
      const res = await api.get(`/api/swm/treasury/employee-payroll-summary/${sellerId}`, {
        params: { month: monthVal || payrollMonth }
      });
      if (res.data?.success) {
        setSellerSummary(res.data.data);
        setSummaryError(null);
        const emp = res.data.data.employee;
        if (emp?.branch_id) {
          fetchBranchSafe(emp.branch_id);
        } else {
          setDeductSource('main_treasury');
          setBranchSafeBalances({ cash: 0, visa: 0, transfer: 0, total: 0 });
        }
      } else {
        const msg = res.data?.message || 'فشل في تحميل بيانات مرتب الموظف';
        setSummaryError(msg);
        message.error(msg);
      }
    } catch (e) {
      console.error('Fetch seller summary error:', e);
      const msg = e.response?.data?.message || e.message || 'فشل في تحميل بيانات مرتب الموظف';
      setSummaryError(msg);
      message.error(msg);
    } finally {
      setLoadingSellerSummary(false);
    }
  };

  // Auto-fetch summary whenever selectedSellerId or payrollMonth changes
  useEffect(() => {
    if (selectedSellerId) {
      fetchSellerSummary(selectedSellerId, payrollMonth);
    } else {
      setSellerSummary(null);
      setSummaryError(null);
    }
  }, [selectedSellerId, payrollMonth]);

  // 5. Fetch expense categories
  const fetchExpenseCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get('/api/swm/pos/expense-categories');
      if (res.data?.success) {
        setExpenseCategories(res.data.data || []);
      }
    } catch (e) {
      console.error('Fetch categories error:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Refresh all data
  const refreshAll = () => {
    fetchEmployeesList();
    fetchSafeBalances();
    fetchPayrollHistory(payrollMonth);
    fetchExpenseCategories();
    if (selectedSellerId) {
      fetchSellerSummary(selectedSellerId, payrollMonth);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [payrollMonth]);

  // Handle month picker change
  const handleMonthChange = (d) => {
    if (d) {
      const m = d.format('YYYY-MM');
      setPayrollMonth(m);
      if (selectedSellerId) fetchSellerSummary(selectedSellerId, m);
      fetchPayrollHistory(m);
    }
  };

  // 6. Disburse salary action
  const handleDisburseSellerPayroll = async () => {
    if (!sellerSummary) {
      message.warning('يرجى اختيار موظف أولاً');
      return;
    }
    const baseSal = parseFloat(sellerSummary.base_salary || 0);
    const adv = parseFloat(sellerSummary.advances_total || 0);
    const ded = parseFloat(deductionsAmount || 0);
    const bns = parseFloat(bonusAmount || 0);
    const net = Math.round((baseSal - adv - ded + bns) * 100) / 100;

    if (net <= 0) {
      message.error('صافي القبض يجب أن يكون أكبر من الصفر لإتمام الصرف');
      return;
    }

    const activeSafeBalances = deductSource === 'branch_safe' ? branchSafeBalances : safeBalances;
    const avail = activeSafeBalances[payrollChannel] || 0;
    if (net > avail + 0.01) {
      const sourceName = deductSource === 'branch_safe' ? `خزينة فرع (${sellerSummary.employee.branch_name || 'الفرع'})` : 'الخزينة الرئيسية';
      message.error(
        `رصيد ${payrollChannel === 'cash' ? 'الكاش' : payrollChannel === 'visa' ? 'الفيزا' : 'التحويل'} بـ [${sourceName}] (${avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض (${net.toLocaleString()} ج.م)`
      );
      return;
    }

    setSubmittingPayroll(true);
    try {
      const payload = {
        employee_id: sellerSummary.employee.id,
        payout_month: payrollMonth,
        base_salary: baseSal,
        advances_deducted: adv,
        deductions: ded,
        deduction_reason: deductionReason,
        bonus: bns,
        bonus_reason: bonusReason,
        channel: payrollChannel,
        deduct_source: deductSource,
        notes: payrollNotes
      };
      const res = await api.post('/api/swm/treasury/pay-salary', payload);
      if (res.data?.success) {
        message.success(res.data.message || 'تم صرف الراتب وخصمه من الخزينة بنجاح');
        setDeductionsAmount(0);
        setDeductionReason('');
        setBonusAmount(0);
        setBonusReason('');
        setPayrollNotes('');
        fetchSafeBalances();
        fetchSellerSummary(sellerSummary.employee.id, payrollMonth);
        fetchPayrollHistory(payrollMonth);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'تعذر إتمام صرف القبض');
    } finally {
      setSubmittingPayroll(false);
    }
  };

  // Add Category Handler
  const handleAddCategory = async (catName) => {
    const target = (catName || newCategoryInput).trim();
    if (!target) {
      message.warning('يرجى إدخال اسم تصنيف المصروف');
      return;
    }
    setAddingCategory(true);
    try {
      const res = await api.post('/api/swm/pos/expense-categories', { category: target });
      if (res.data?.success) {
        message.success(res.data.message);
        setExpenseCategories(res.data.data || []);
        setNewCategoryInput('');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في إضافة التصنيف');
    } finally {
      setAddingCategory(false);
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (cat) => {
    try {
      const res = await api.delete('/api/swm/pos/expense-categories', { data: { category: cat } });
      if (res.data?.success) {
        message.success(res.data.message);
        setExpenseCategories(res.data.data || []);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في حذف التصنيف');
    }
  };

  // Open Payslip Printable Modal
  const handleOpenReceipt = (payoutRecord) => {
    setSelectedPayoutForReceipt(payoutRecord);
    setReceiptModalOpen(true);
  };

  // Print Payslip
  const handlePrintReceipt = () => {
    const printContent = document.getElementById('payslip-printable-area');
    if (!printContent) {
      window.print();
      return;
    }
    const win = window.open('', '', 'width=800,height=750');
    win.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>سند صرف واستلام راتب - ${selectedPayoutForReceipt?.employee_name || ''}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; direction: rtl; color: #1e293b; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
            .title { font-size: 22px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .meta-table, .calc-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            .meta-table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
            .calc-table th { background: #f8fafc; padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; }
            .calc-table td { padding: 10px 12px; border: 1px solid #cbd5e1; }
            .net-box { background: #f0fdf4; border: 2px solid #16a34a; padding: 14px; border-radius: 8px; text-align: center; margin: 18px 0; }
            .net-val { font-size: 24px; font-weight: bold; color: #15803d; }
            .declaration { font-size: 12px; color: #475569; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px dashed #cbd5e1; margin-top: 14px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 48px; padding: 0 30px; }
            .sig-block { text-align: center; width: 220px; border-top: 1px dashed #64748b; padding-top: 8px; font-size: 13px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Export Payroll to Excel (CSV with UTF-8 BOM)
  const handleExportPayrollExcel = () => {
    if (!payrollHistory || payrollHistory.length === 0) {
      message.warning('لا توجد عمليات صرف مسجلة لهذا الشهر لتصديرها');
      return;
    }

    const headers = [
      'كود السند',
      'اسم الموظف',
      'الفرع',
      'شهر الراتب',
      'الراتب الأساسي',
      'السلف المستقطعة',
      'الخصومات',
      'سبب الخصم',
      'المكافآت والعمولات',
      'سبب المكافأة',
      'صافي المبلغ المنصرف',
      'جهة الخصم',
      'قناة الصرف',
      'معتمد الصرف',
      'ملاحظات',
      'تاريخ ووقت الصرف'
    ];

    const getChannelLabel = (ch) => {
      if (ch === 'cash') return 'كاش نقدية';
      if (ch === 'visa') return 'فيزا / بطاقة';
      if (ch === 'transfer') return 'تحويل بنكي / محفظة';
      return ch || 'كاش';
    };

    const rows = payrollHistory.map((p) => [
      p.id,
      `"${(p.employee_name || '').replace(/"/g, '""')}"`,
      `"${(p.branch_name || 'الفرع الرئيسي').replace(/"/g, '""')}"`,
      `"${p.payout_month}"`,
      parseFloat(p.base_salary || 0).toFixed(2),
      parseFloat(p.advances_deducted || 0).toFixed(2),
      parseFloat(p.deductions || 0).toFixed(2),
      `"${(p.deduction_reason || '').replace(/"/g, '""')}"`,
      parseFloat(p.bonus || 0).toFixed(2),
      `"${(p.bonus_reason || '').replace(/"/g, '""')}"`,
      parseFloat(p.net_salary || 0).toFixed(2),
      `"${p.deduct_source === 'branch_safe' ? 'خزينة الفرع' : 'الخزينة الرئيسية'}"`,
      `"${getChannelLabel(p.channel)}"`,
      `"${(p.paid_by_name || 'الإدارة').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      p.paid_at ? new Date(p.paid_at).toLocaleString('ar-EG') : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_مسير_الرواتب_${payrollMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`تم تصدير مسير الرواتب لعدد ${payrollHistory.length} موظف بنجاح`);
  };

  // KPIs Calculations
  const kpis = useMemo(() => {
    const totalBaseSalary = employeesList.reduce((acc, u) => acc + parseFloat(u.salary || 0), 0);
    const totalDisbursed = payrollHistory.reduce((acc, p) => acc + parseFloat(p.net_salary || 0), 0);
    const totalDeductions = payrollHistory.reduce(
      (acc, p) => acc + parseFloat(p.deductions || 0) + parseFloat(p.advances_deducted || 0),
      0
    );
    const totalBonuses = payrollHistory.reduce((acc, p) => acc + parseFloat(p.bonus || 0), 0);
    const paidEmployeeIds = new Set(payrollHistory.map((p) => p.employee_id));
    const paidCount = paidEmployeeIds.size;
    const totalEmployees = employeesList.length;
    const pendingCount = Math.max(0, totalEmployees - paidCount);

    return {
      totalBaseSalary,
      totalDisbursed,
      totalDeductions,
      totalBonuses,
      paidCount,
      totalEmployees,
      pendingCount
    };
  }, [employeesList, payrollHistory]);

  // Set of paid employee IDs for the selected month
  const paidEmployeeIdsSet = useMemo(() => {
    return new Set(payrollHistory.map((p) => p.employee_id));
  }, [payrollHistory]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return expenseCategories;
    const q = categorySearchQuery.trim().toLowerCase();
    return expenseCategories.filter((c) => c.toLowerCase().includes(q));
  }, [expenseCategories, categorySearchQuery]);

  // History Table Columns
  const historyColumns = [
    {
      title: 'كود السند',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id) => <Text code strong>#PAY-{id}</Text>
    },
    {
      title: 'الموظف والفرع',
      key: 'employee',
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
            {record.employee_name}
          </Text>
          <Space size={4} style={{ fontSize: 11, color: '#64748b' }}>
            <ShopOutlined />
            <span>{record.branch_name || 'الفرع الرئيسي'}</span>
          </Space>
        </div>
      )
    },
    {
      title: 'الأساسي',
      dataIndex: 'base_salary',
      key: 'base_salary',
      render: (val) => `${parseFloat(val || 0).toLocaleString()} ج.م`
    },
    {
      title: 'السلف والخصم',
      key: 'deductions_total',
      render: (_, record) => {
        const adv = parseFloat(record.advances_deducted || 0);
        const ded = parseFloat(record.deductions || 0);
        const total = adv + ded;
        return total > 0 ? (
          <Tooltip title={`سلف: ${adv.toLocaleString()} ج.م | خصم: ${ded.toLocaleString()} ج.م`}>
            <Text type="danger" strong>
              - {total.toLocaleString()} ج.م
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        );
      }
    },
    {
      title: 'المكافأة / البونص',
      dataIndex: 'bonus',
      key: 'bonus',
      render: (val, record) => {
        const b = parseFloat(val || 0);
        return b > 0 ? (
          <Tooltip title={record.bonus_reason || 'حافز'}>
            <Text strong style={{ color: '#0284c7' }}>
              + {b.toLocaleString()} ج.م
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        );
      }
    },
    {
      title: 'صافي المنصرف',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (val) => (
        <Text strong style={{ color: '#15803d', fontSize: 14 }}>
          {parseFloat(val || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
        </Text>
      )
    },
    {
      title: 'القناة',
      dataIndex: 'channel',
      key: 'channel',
      width: 90,
      render: (ch) => {
        if (ch === 'visa') return <Tag color="blue">💳 فيزا</Tag>;
        if (ch === 'transfer') return <Tag color="purple">📱 تحويل</Tag>;
        return <Tag color="green">💵 كاش</Tag>;
      }
    },
    {
      title: 'جهة الخصم',
      dataIndex: 'deduct_source',
      key: 'deduct_source',
      width: 120,
      render: (src) => {
        if (src === 'branch_safe') {
          return <Tag color="volcano" style={{ fontSize: 11 }}>🏬 خزينة الفرع</Tag>;
        }
        return <Tag color="geekblue" style={{ fontSize: 11 }}>🏢 الخزينة الرئيسية</Tag>;
      }
    },
    {
      title: 'معتمد الصرف',
      dataIndex: 'paid_by_name',
      key: 'paid_by_name',
      render: (name) => <Text style={{ fontSize: 12 }}>{name || 'الإدارة'}</Text>
    },
    {
      title: 'وقت الصرف',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {date ? new Date(date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </Text>
      )
    },
    {
      title: 'السند',
      key: 'actions',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => handleOpenReceipt(record)}
          style={{ color: '#4f46e5', borderColor: '#c7d2fe' }}
        >
          سند الصرف
        </Button>
      )
    }
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top Header Card with Month Picker, Refresh, and Treasury Balance preview */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0'
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 3px 8px rgba(79, 70, 229, 0.3)'
                }}
              >
                <DollarSign size={22} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                  مسير الرواتب وبنود المصروفات (Payroll & Expense Hub)
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  صرف وقبض مستحقات وبونص البائعين، الخصم من الخزينة، وتعميم بنود مصروفات الفروع
                </Text>
              </div>
            </div>
          </div>

          <Space size={12} wrap>
            <div
              style={{
                background: '#f8fafc',
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Text strong style={{ fontSize: 12, color: '#475569' }}>شهر المسير:</Text>
              <DatePicker
                picker="month"
                size="middle"
                value={dayjs(payrollMonth, 'YYYY-MM')}
                format="YYYY-MM"
                allowClear={false}
                onChange={handleMonthChange}
                style={{ width: 120 }}
              />
            </div>

            <div
              style={{
                background: '#f0fdf4',
                padding: '6px 14px',
                borderRadius: 10,
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <WalletOutlined style={{ color: '#15803d' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>رصيد الخزينة المتاح (كاش):</Text>
                <Text strong style={{ fontSize: 13, color: '#166534' }}>
                  {(safeBalances.cash || 0).toLocaleString()} ج.م
                </Text>
              </div>
            </div>

            <Button icon={<ReloadOutlined />} onClick={refreshAll}>
              تحديث
            </Button>
          </Space>
        </div>
      </Card>

      {/* Main Tabs Container */}
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        type="card"
        size="large"
        items={[
          {
            key: 'payroll',
            label: (
              <span style={{ fontWeight: 700, padding: '0 8px' }}>
                💵 مسير وصرف رواتب البائعين
              </span>
            ),
            children: (
              <div>
                {/* 1. Monthly KPIs */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #4f46e5' }}>
                      <Statistic
                        title="إجمالي الرواتب الأساسية"
                        value={kpis.totalBaseSalary}
                        precision={2}
                        suffix="ج.م"
                        valueStyle={{ color: '#1e293b', fontSize: 18, fontWeight: 800 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        مجموع رواتب {kpis.totalEmployees} موظف مسجل
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #16a34a' }}>
                      <Statistic
                        title="المنصرف فعلياً هذا الشهر"
                        value={kpis.totalDisbursed}
                        precision={2}
                        suffix="ج.م"
                        valueStyle={{ color: '#16a34a', fontSize: 18, fontWeight: 800 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        تم صرفه وخصمه من الخزينة
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #dc2626' }}>
                      <Statistic
                        title="سلف وخصومات مستقطعة"
                        value={kpis.totalDeductions}
                        precision={2}
                        suffix="ج.م"
                        valueStyle={{ color: '#dc2626', fontSize: 18, fontWeight: 800 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        تم توفيرها واستردادها للخزينة
                      </Text>
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small" style={{ borderRadius: 12, borderLeft: '4px solid #d97706' }}>
                      <Statistic
                        title="حالة المسير للشهر"
                        value={kpis.paidCount}
                        suffix={`/ ${kpis.totalEmployees}`}
                        valueStyle={{ color: '#d97706', fontSize: 18, fontWeight: 800 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {kpis.pendingCount === 0 ? '✨ تم صرف الجميع' : `متبقي صرف: ${kpis.pendingCount} موظف`}
                      </Text>
                    </Card>
                  </Col>
                </Row>

                {/* 2. Disbursal Form Card */}
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    background: '#ffffff',
                    marginBottom: 20
                  }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <Space size={8}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Users size={18} color="#2563eb" />
                        </div>
                        <div>
                          <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                            نموذج تسوية وصرف راتب موظف
                          </Title>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            تحديد الموظف، احتساب السلف والخصم والمكافأة، والصرف المباشر من الخزينة
                          </Text>
                        </div>
                      </Space>
                    </div>
                  }
                >
                  {/* Seller Selector with Visual Badges & Quick Action Chips */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 13, marginBottom: 6, display: 'block', color: '#334155' }}>
                      اختر الموظف المراد صرف راتبه لشهر ({payrollMonth}):
                    </Text>
                    <Select
                      showSearch
                      allowClear
                      optionLabelProp="label"
                      placeholder="🔍 ابحث بالاسم الكامل أو رقم الهاتف أو الفرع..."
                      style={{ width: '100%' }}
                      size="large"
                      value={selectedSellerId}
                      onChange={(val) => {
                        setSelectedSellerId(val || null);
                        setDeductionsAmount(0);
                        setDeductionReason('');
                        setBonusAmount(0);
                        setBonusReason('');
                      }}
                      filterOption={(input, option) => {
                        const emp = employeeMap.get(String(option?.value));
                        if (!emp) return false;
                        const q = normalizeArabic(input);
                        if (!q) return true;
                        const fullName = normalizeArabic(emp.full_name);
                        const branch = normalizeArabic(emp.branch_name);
                        const phone = (emp.phone || '').toLowerCase();
                        const username = normalizeArabic(emp.username);
                        return fullName.includes(q) || branch.includes(q) || phone.includes(q) || username.includes(q);
                      }}
                    >
                      {employeesList.map((emp) => {
                        const isPaid = paidEmployeeIdsSet.has(emp.id);
                        return (
                          <Option
                            key={emp.id}
                            value={emp.id}
                            label={`${emp.full_name} (${emp.branch_name || 'الفرع الرئيسي'})`}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space size={8}>
                                <Text strong>{emp.full_name}</Text>
                                {emp.phone && (
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    ({emp.phone})
                                  </Text>
                                )}
                              </Space>
                              <Space size={6}>
                                <Tag color="cyan" style={{ fontSize: 10 }}>
                                  {emp.branch_name || 'الفرع الرئيسي'}
                                </Tag>
                                <Tag color="geekblue" style={{ fontSize: 10 }}>
                                  مرتب: {parseFloat(emp.salary || 0).toLocaleString()} ج.م
                                </Tag>
                                {isPaid ? (
                                  <Tag color="success" style={{ fontWeight: 'bold' }}>
                                    تم الصرف ✅
                                  </Tag>
                                ) : (
                                  <Tag color="warning">في الانتظار ⏳</Tag>
                                )}
                              </Space>
                            </div>
                          </Option>
                        );
                      })}
                    </Select>

                    {/* Quick Selection Chips for Pending Employees */}
                    {(() => {
                      const pendingEmployees = employeesList.filter((e) => !paidEmployeeIdsSet.has(e.id));
                      if (pendingEmployees.length === 0) return null;
                      return (
                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                            ⚡ موظفون بانتظار الصرف ({pendingEmployees.length}):
                          </Text>
                          {pendingEmployees.slice(0, 6).map((emp) => {
                            const isSelected = selectedSellerId === emp.id;
                            return (
                              <Tag
                                key={emp.id}
                                color={isSelected ? 'success' : 'geekblue'}
                                style={{
                                  cursor: 'pointer',
                                  borderRadius: 8,
                                  padding: '2px 10px',
                                  fontSize: 11,
                                  fontWeight: isSelected ? 800 : 500,
                                  border: isSelected ? '1.5px solid #16a34a' : undefined,
                                  boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.2)' : 'none'
                                }}
                                onClick={() => {
                                  setSelectedSellerId(emp.id);
                                  setDeductionsAmount(0);
                                  setDeductionReason('');
                                  setBonusAmount(0);
                                  setBonusReason('');
                                }}
                              >
                                ⏳ {emp.full_name} ({emp.branch_name || 'الفرع'})
                              </Tag>
                            );
                          })}
                          {pendingEmployees.length > 6 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              +{pendingEmployees.length - 6} آخرين بالقائمة أعلاه
                            </Text>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {summaryError && (
                    <Alert
                      type="error"
                      showIcon
                      message="تنبيه: تعذر تحميل بيانات ومفردات مرتب الموظف"
                      description={summaryError}
                      action={
                        <Button
                          size="small"
                          type="primary"
                          danger
                          onClick={() => fetchSellerSummary(selectedSellerId, payrollMonth)}
                        >
                          إعادة المحاولة 🔄
                        </Button>
                      }
                      style={{ marginBottom: 14, borderRadius: 10 }}
                    />
                  )}

                  {loadingSellerSummary ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Spin size="large" />
                    </div>
                  ) : !sellerSummary ? (
                    <div
                      style={{
                        padding: '36px 16px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        borderRadius: 12,
                        border: '1px dashed #cbd5e1'
                      }}
                    >
                      <Users size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                      <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                        اختر اسم الموظف من القائمة أعلاه لعرض مفردات مرتبه، السلف المسحوبة، احتساب الحوافز والخصومات، والصرف الفوري.
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Seller Header Info */}
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: 10,
                          marginBottom: 14,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: 6
                        }}
                      >
                        <Space size={8}>
                          <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                            {sellerSummary.employee.full_name}
                          </Text>
                          {sellerSummary.employee.phone && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              • هاتف: <span dir="ltr">{sellerSummary.employee.phone}</span>
                            </Text>
                          )}
                        </Space>
                        <Space size={6}>
                          <Tag color="blue">{sellerSummary.employee.branch_name || 'الفرع الرئيسي'}</Tag>
                          <Tag color="purple">
                            {sellerSummary.employee.role === 'salesperson' ? 'بائع / كاشير' : 'موظف / إشراف'}
                          </Tag>
                        </Space>
                      </div>

                      {sellerSummary.already_paid && (
                        <Alert
                          type="warning"
                          showIcon
                          message={`تنبيه: تم صرف راتب شهر (${payrollMonth}) لهذا الموظف مسبقاً!`}
                          description="يمكنك مراجعة السند في جدول سجل الرواتب أدناه، أو الصرف مجدداً في حال وجود مستحقات إضافية."
                          style={{ marginBottom: 14, borderRadius: 8, fontSize: 12 }}
                        />
                      )}

                      {/* Math Breakdown: 4 interactive cards */}
                      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
                        {/* 1. Base Salary */}
                        <Col xs={24} sm={6}>
                          <div
                            style={{
                              padding: '12px 10px',
                              background: '#f1f5f9',
                              borderRadius: 10,
                              textAlign: 'center',
                              border: '1px solid #e2e8f0',
                              height: '100%'
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>المرتب الأساسي</Text>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                              {parseFloat(sellerSummary.base_salary || 0).toLocaleString()} ج.م
                            </div>
                            <Text type="secondary" style={{ fontSize: 10 }}>المسجل بملف الموظف</Text>
                          </div>
                        </Col>

                        {/* 2. Advances Taken */}
                        <Col xs={24} sm={6}>
                          <div
                            style={{
                              padding: '12px 10px',
                              background: '#fef2f2',
                              borderRadius: 10,
                              textAlign: 'center',
                              border: '1px solid #fecaca',
                              height: '100%'
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>مصروفات وسلف الفترة (-)</Text>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                              - {parseFloat(sellerSummary.advances_total || 0).toLocaleString()} ج.م
                            </div>
                            {sellerSummary.advances_list?.length > 0 ? (
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, height: 'auto', fontSize: 11, color: '#b91c1c' }}
                                onClick={() => setAdvancesModalOpen(true)}
                              >
                                ({sellerSummary.advances_list.length} حركة - عرض التفاصيل)
                              </Button>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 10 }}>لا توجد سلف هذا الشهر</Text>
                            )}
                          </div>
                        </Col>

                        {/* 3. Deductions */}
                        <Col xs={24} sm={6}>
                          <div
                            style={{
                              padding: '10px 10px',
                              background: '#fff1f2',
                              borderRadius: 10,
                              border: '1px solid #ffe4e6',
                              height: '100%'
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>الخصومات والجزاءات (-)</Text>
                            <InputNumber
                              min={0}
                              size="small"
                              style={{ width: '100%', marginTop: 2 }}
                              placeholder="0.00"
                              value={deductionsAmount}
                              onChange={(v) => setDeductionsAmount(v || 0)}
                              precision={2}
                            />
                            <Input
                              size="small"
                              placeholder="سبب الخصم..."
                              value={deductionReason}
                              onChange={(e) => setDeductionReason(e.target.value)}
                              style={{ marginTop: 4, fontSize: 11 }}
                            />
                          </div>
                        </Col>

                        {/* 4. Bonuses & Commissions (NEW) */}
                        <Col xs={24} sm={6}>
                          <div
                            style={{
                              padding: '10px 10px',
                              background: '#f0f9ff',
                              borderRadius: 10,
                              border: '1px solid #bae6fd',
                              height: '100%'
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11, color: '#0369a1' }}>
                              المكافآت والحوافز (+)
                            </Text>
                            <InputNumber
                              min={0}
                              size="small"
                              style={{ width: '100%', marginTop: 2 }}
                              placeholder="0.00"
                              value={bonusAmount}
                              onChange={(v) => setBonusAmount(v || 0)}
                              precision={2}
                            />
                            <Input
                              size="small"
                              placeholder="سبب المكافأة (تارجت/تميز)..."
                              value={bonusReason}
                              onChange={(e) => setBonusReason(e.target.value)}
                              style={{ marginTop: 4, fontSize: 11 }}
                            />
                          </div>
                        </Col>
                      </Row>

                      {/* Net Payout Banner & Disburse Action */}
                      {(() => {
                        const baseSal = parseFloat(sellerSummary.base_salary || 0);
                        const adv = parseFloat(sellerSummary.advances_total || 0);
                        const ded = parseFloat(deductionsAmount || 0);
                        const bns = parseFloat(bonusAmount || 0);
                        const net = Math.round((baseSal - adv - ded + bns) * 100) / 100;
                        const activeSafeBalances = deductSource === 'branch_safe' ? branchSafeBalances : safeBalances;
                        const avail = activeSafeBalances[payrollChannel] || 0;
                        const canAfford = net > 0 && net <= avail;
                        const sourceLabel = deductSource === 'branch_safe'
                          ? `خزينة فرع (${sellerSummary.employee.branch_name || 'الفرع'})`
                          : 'الخزينة الرئيسية';

                        return (
                          <div
                            style={{
                              padding: '16px 20px',
                              background: net > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
                              borderRadius: 14,
                              border: `1.5px solid ${net > 0 ? '#86efac' : '#e2e8f0'}`
                            }}
                          >
                            {/* Deduct Source Selection */}
                            <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px dashed #bbf7d0' }}>
                              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6, color: '#166534' }}>
                                🏛️ من أين سيتم خصم وصرف الراتب نقدياً؟
                              </Text>
                              <Radio.Group
                                value={deductSource}
                                onChange={(e) => setDeductSource(e.target.value)}
                                size="middle"
                                buttonStyle="solid"
                              >
                                <Radio.Button value="main_treasury">
                                  🏢 الخزينة الرئيسية (كاش متاح: {(safeBalances.cash || 0).toLocaleString()} ج.م)
                                </Radio.Button>
                                <Radio.Button
                                  value="branch_safe"
                                  disabled={!sellerSummary.employee.branch_id}
                                >
                                  🏬 خزينة فرع {sellerSummary.employee.branch_name || 'الفرع'} (كاش متاح: {(branchSafeBalances.cash || 0).toLocaleString()} ج.م)
                                </Radio.Button>
                              </Radio.Group>
                              {!sellerSummary.employee.branch_id && (
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                  ℹ️ هذا الموظف غير مقيد بفرع تجزئة مستقل، لذلك يتم الصرف من الخزينة الرئيسية.
                                </Text>
                              )}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginBottom: 14
                              }}
                            >
                              <div>
                                <Text strong style={{ fontSize: 14, color: '#166534' }}>
                                  صافي المبلغ المستحق للصرف:
                                </Text>
                                <div style={{ fontSize: 28, fontWeight: 900, color: '#15803d' }}>
                                  {net > 0 ? net.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : 0} ج.م
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  [الأساسي {baseSal.toLocaleString()} + المكافأة {bns.toLocaleString()} - السلف {adv.toLocaleString()} - الخصم {ded.toLocaleString()} = {net.toLocaleString()} ج.م]
                                </Text>
                              </div>

                              <div>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                  طريقة وقناة الدفع من {sourceLabel}:
                                </Text>
                                <Radio.Group
                                  size="middle"
                                  value={payrollChannel}
                                  onChange={(e) => setPayrollChannel(e.target.value)}
                                >
                                  <Radio.Button value="cash">💵 كاش (نقدية)</Radio.Button>
                                  <Radio.Button value="visa">💳 فيزا (بطاقة)</Radio.Button>
                                  <Radio.Button value="transfer">📱 تحويل بنكي</Radio.Button>
                                </Radio.Group>
                                <div
                                  style={{
                                    fontSize: 11,
                                    marginTop: 4,
                                    color: avail >= net ? '#16a34a' : '#dc2626',
                                    fontWeight: 600
                                  }}
                                >
                                  الرصيد المتاح بـ [{sourceLabel}]: {avail.toLocaleString()} ج.م
                                </div>
                              </div>
                            </div>

                            <Row gutter={10} align="middle">
                              <Col xs={24} sm={15}>
                                <Input
                                  placeholder="ملاحظات الصرف والاعتماد (اختياري)..."
                                  value={payrollNotes}
                                  onChange={(e) => setPayrollNotes(e.target.value)}
                                  size="large"
                                />
                              </Col>
                              <Col xs={24} sm={9}>
                                <Popconfirm
                                  title={`تأكيد صرف راتب ${sellerSummary.employee.full_name} بمبلغ ${net.toLocaleString()} ج.م؟`}
                                  description={`سيتم خصم المبلغ فوراً من [${sourceLabel}] وإدراجه باليومية الإدارية وتوليد سند الصرف.`}
                                  okText="تأكيد الصرف الآن"
                                  cancelText="إلغاء"
                                  okType="primary"
                                  onConfirm={handleDisburseSellerPayroll}
                                  disabled={net <= 0 || !canAfford || submittingPayroll}
                                >
                                  <Button
                                    type="primary"
                                    block
                                    size="large"
                                    loading={submittingPayroll}
                                    disabled={net <= 0 || !canAfford}
                                    style={{
                                      backgroundColor: canAfford ? '#16a34a' : undefined,
                                      borderColor: canAfford ? '#16a34a' : undefined,
                                      fontWeight: 800,
                                      height: 40
                                    }}
                                  >
                                    صرف الراتب وخصم من الخزينة
                                  </Button>
                                </Popconfirm>
                              </Col>
                            </Row>

                            {!canAfford && net > 0 && (
                              <div style={{ marginTop: 8, textAlign: 'center', color: '#dc2626', fontSize: 12 }}>
                                ⚠️ رصيد [{sourceLabel}] في هذه القناة ({avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض ({net.toLocaleString()} ج.م). يرجى اختيار الخزينة الأخرى أو تغذية الرصيد.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </Card>

                {/* 3. Payroll History Register Table */}
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Space size={8}>
                        <Receipt size={18} color="#4f46e5" />
                        <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                          سجل الرواتب المنصرفة لشهر ({payrollMonth})
                        </Title>
                        <Tag color="blue">{payrollHistory.length} سند صرف</Tag>
                      </Space>
                      <Space>
                        <Button
                          icon={<FileExcelOutlined style={{ color: '#16a34a' }} />}
                          onClick={handleExportPayrollExcel}
                        >
                          تصدير كشف المسير (Excel)
                        </Button>
                      </Space>
                    </div>
                  }
                >
                  <Table
                    columns={historyColumns}
                    dataSource={payrollHistory}
                    rowKey="id"
                    loading={loadingHistory}
                    bordered
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    locale={{ emptyText: `لا توجد رواتب منصرفة مسجلة لشهر ${payrollMonth}` }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: 'categories',
            label: (
              <span style={{ fontWeight: 700, padding: '0 8px' }}>
                🏷️ تصنيفات وبنود المصروفات
              </span>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  {/* Left: Add & Presets */}
                  <Col xs={24} md={10}>
                    <Card
                      style={{
                        borderRadius: 16,
                        border: '1px solid #fde68a',
                        background: '#fffbeb',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                      }}
                      title={
                        <Space size={8}>
                          <Plus size={18} color="#d97706" />
                          <Title level={5} style={{ margin: 0, color: '#92400e', fontWeight: 700 }}>
                            إضافة بند مصروف جديد
                          </Title>
                        </Space>
                      }
                    >
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12, color: '#78350f' }}>
                          اكتب اسم البند لتعميمه فورياً على جميع كاشيرات الفروع ونقاط البيع:
                        </Text>
                      </div>

                      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                        <Input
                          placeholder="مثال: أدوات ومهمات مكتبية..."
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onPressEnter={() => handleAddCategory()}
                          size="large"
                        />
                        <Button
                          type="primary"
                          onClick={() => handleAddCategory()}
                          loading={addingCategory}
                          size="large"
                          style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 700 }}
                        >
                          إضافة البند
                        </Button>
                      </Space.Compact>

                      <Divider style={{ margin: '14px 0', borderColor: '#fde68a' }} />

                      <div style={{ marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 12, color: '#92400e' }}>
                          ⚡ بنود شائعة مقترحة (انقر للإضافة السريعة):
                        </Text>
                      </div>

                      <Space size={[6, 8]} wrap>
                        {PRESET_EXPENSE_CATEGORIES.map((preset) => {
                          const exists = expenseCategories.includes(preset);
                          return (
                            <Tag
                              key={preset}
                              color={exists ? 'default' : 'orange'}
                              style={{
                                cursor: exists ? 'not-allowed' : 'pointer',
                                padding: '4px 8px',
                                fontSize: 11,
                                opacity: exists ? 0.6 : 1
                              }}
                              onClick={() => {
                                if (!exists) handleAddCategory(preset);
                              }}
                            >
                              {preset} {exists ? '✓' : '+'}
                            </Tag>
                          );
                        })}
                      </Space>
                    </Card>
                  </Col>

                  {/* Right: Active Categories List */}
                  <Col xs={24} md={14}>
                    <Card
                      style={{
                        borderRadius: 16,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                      }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={8}>
                            <Layers size={18} color="#4f46e5" />
                            <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                              التصنيفات المعتمدة حالياً
                            </Title>
                          </Space>
                          <Tag color="purple" style={{ fontWeight: 700 }}>
                            {expenseCategories.length} تصنيف معتمد
                          </Tag>
                        </div>
                      }
                    >
                      <div style={{ marginBottom: 14 }}>
                        <Input
                          placeholder="ابحث بين التصنيفات..."
                          prefix={<Search size={14} color="#94a3b8" />}
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          allowClear
                        />
                      </div>

                      <div
                        style={{
                          minHeight: 220,
                          maxHeight: 400,
                          overflowY: 'auto',
                          padding: 12,
                          background: '#f8fafc',
                          borderRadius: 12,
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {loadingCategories ? (
                          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                        ) : filteredCategories.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>
                            لا توجد تصنيفات تطابق البحث
                          </div>
                        ) : (
                          <Space size={[8, 10]} wrap>
                            {filteredCategories.map((cat) => (
                              <Tag
                                key={cat}
                                closable
                                onClose={(e) => {
                                  e.preventDefault();
                                  handleDeleteCategory(cat);
                                }}
                                style={{
                                  fontSize: 13,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                🏷️ {cat}
                              </Tag>
                            ))}
                          </Space>
                        )}
                      </div>

                      <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
                        💡 أي تصنيف يتم اعتماده هنا يظهر فوراً في قوائم الاختيار لدى كافة الكاشيرات بالـ POS عند تسجيل أي مصروف نثري أو سحب تشغيلي.
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          }
        ]}
      />

      {/* Seller Advances Breakdown Modal */}
      <Modal
        title={
          <Space>
            <Clock size={18} color="#dc2626" />
            <span>تفاصيل مصروفات وسلف الفترة — {sellerSummary?.employee?.full_name}</span>
          </Space>
        }
        open={advancesModalOpen}
        onCancel={() => setAdvancesModalOpen(false)}
        footer={<Button onClick={() => setAdvancesModalOpen(false)}>إغلاق</Button>}
        width={600}
      >
        <div style={{ marginBottom: 12 }}>
          <Alert
            type="info"
            message={`إجمالي المصروفات والسلف المستقطعة لشهر ${payrollMonth}: ${parseFloat(sellerSummary?.advances_total || 0).toLocaleString()} ج.م`}
          />
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {!sellerSummary?.advances_list || sellerSummary.advances_list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
              لا توجد سلف أو مصروفات مسجلة هذا الشهر
            </div>
          ) : (
            sellerSummary.advances_list.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <Text strong>{item.subcategory || 'سلفة / مصروف'}</Text>
                  {item.description && (
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {item.description}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {item.expense_date ? new Date(item.expense_date).toLocaleDateString('ar-EG') : ''}
                  </Text>
                </div>
                <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
                  - {parseFloat(item.amount || 0).toLocaleString()} ج.م
                </Text>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Printable Payslip Receipt Modal */}
      <Modal
        title={
          <Space>
            <Printer size={18} color="#4f46e5" />
            <span>سند صرف واستلام راتب رسمي</span>
          </Space>
        }
        open={receiptModalOpen}
        onCancel={() => {
          setReceiptModalOpen(false);
          setSelectedPayoutForReceipt(null);
        }}
        width={650}
        footer={
          <Space>
            <Button onClick={() => setReceiptModalOpen(false)}>إغلاق</Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrintReceipt}
              style={{ backgroundColor: '#4f46e5' }}
            >
              طباعة السند
            </Button>
          </Space>
        }
      >
        {selectedPayoutForReceipt && (
          <div id="payslip-printable-area">
            <div className="header">
              <h2 className="title">سند صرف واستلام راتب شهر ({selectedPayoutForReceipt.payout_month})</h2>
              <div className="subtitle">
                رقم السند: #PAY-{selectedPayoutForReceipt.id} | تاريخ الاعتماد:{' '}
                {new Date(selectedPayoutForReceipt.paid_at).toLocaleString('ar-EG')}
              </div>
            </div>

            <table className="meta-table">
              <tbody>
                <tr>
                  <td><strong>اسم الموظف:</strong> {selectedPayoutForReceipt.employee_name}</td>
                  <td><strong>الفرع التابع له:</strong> {selectedPayoutForReceipt.branch_name || 'الفرع الرئيسي'}</td>
                </tr>
                <tr>
                  <td><strong>قناة وطريقة الصرف:</strong> {selectedPayoutForReceipt.channel === 'cash' ? '💵 كاش نقدية' : selectedPayoutForReceipt.channel === 'visa' ? '💳 فيزا / بطاقة' : '📱 تحويل بنكي'}</td>
                  <td><strong>جهة الخصم والصرف:</strong> {selectedPayoutForReceipt.deduct_source === 'branch_safe' ? `🏬 خزينة فرع (${selectedPayoutForReceipt.branch_name || 'الفرع'})` : '🏢 الخزينة الرئيسية'}</td>
                </tr>
                <tr>
                  <td><strong>معتمد الصرف:</strong> {selectedPayoutForReceipt.paid_by_name || 'الإدارة المالية'}</td>
                  <td><strong>تاريخ ووقت الصرف:</strong> {new Date(selectedPayoutForReceipt.paid_at).toLocaleString('ar-EG')}</td>
                </tr>
              </tbody>
            </table>

            <table className="calc-table">
              <thead>
                <tr>
                  <th>البند</th>
                  <th>البيان والتفاصيل</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>الراتب الأساسي</strong></td>
                  <td>المستحق الشهري المعتمد</td>
                  <td><strong>{parseFloat(selectedPayoutForReceipt.base_salary || 0).toLocaleString()} ج.م</strong></td>
                </tr>
                {parseFloat(selectedPayoutForReceipt.bonus || 0) > 0 && (
                  <tr style={{ background: '#f0f9ff' }}>
                    <td><strong style={{ color: '#0369a1' }}>(+) المكافآت والحوافز</strong></td>
                    <td>{selectedPayoutForReceipt.bonus_reason || 'حافز مبيعات وتميز'}</td>
                    <td><strong style={{ color: '#0369a1' }}>+ {parseFloat(selectedPayoutForReceipt.bonus).toLocaleString()} ج.م</strong></td>
                  </tr>
                )}
                {parseFloat(selectedPayoutForReceipt.advances_deducted || 0) > 0 && (
                  <tr style={{ background: '#fef2f2' }}>
                    <td><strong style={{ color: '#dc2626' }}>(-) مسحوبات وسلف الفترة</strong></td>
                    <td>تسوية مسحوبات النقدية خلال الشهر</td>
                    <td><strong style={{ color: '#dc2626' }}>- {parseFloat(selectedPayoutForReceipt.advances_deducted).toLocaleString()} ج.م</strong></td>
                  </tr>
                )}
                {parseFloat(selectedPayoutForReceipt.deductions || 0) > 0 && (
                  <tr style={{ background: '#fff1f2' }}>
                    <td><strong style={{ color: '#dc2626' }}>(-) الخصومات والجزاءات</strong></td>
                    <td>{selectedPayoutForReceipt.deduction_reason || 'خصم إداري'}</td>
                    <td><strong style={{ color: '#dc2626' }}>- {parseFloat(selectedPayoutForReceipt.deductions).toLocaleString()} ج.م</strong></td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="net-box">
              <div style={{ fontSize: 13, color: '#166534', marginBottom: 2 }}>صافي المبلغ المنصرف والمستلم:</div>
              <div className="net-val">
                {parseFloat(selectedPayoutForReceipt.net_salary || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} جنيه مصري
              </div>
            </div>

            <div className="declaration">
              ✍️ <strong>إقرار الاستلام:</strong> أقر أنا الموظف الموضح اسمي أعلاه باستلامي كامل صافي الراتب المستحق لي عن شهر ({selectedPayoutForReceipt.payout_month}) دون أي تأخير، وتسوية كافة السلف والمستحقات المذكورة.
            </div>

            <div className="signatures">
              <div className="sig-block">
                توقيع الموظف المستلم
              </div>
              <div className="sig-block">
                توقيع وختم الإدارة المالية
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
