import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Crown,
  Users,
  Package
} from 'lucide-react';
import {
  Card, Row, Col, Table, Button, Modal, Tag, Space, Typography,
  message, Statistic, Badge, Tooltip, Popconfirm, Alert, Empty,
  Spin, Divider, Select, Tabs, Form, InputNumber, Input, Radio,
  DatePicker, Checkbox, Progress
} from 'antd';
import {
  BankOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, ReloadOutlined, ShopOutlined,
  DollarCircleOutlined, ArrowDownOutlined, ArrowUpOutlined,
  TeamOutlined, EyeOutlined, WalletOutlined, CreditCardOutlined,
  MobileOutlined, CrownOutlined, PlusCircleOutlined, MinusCircleOutlined,
  HistoryOutlined, SwapOutlined, SearchOutlined, UserOutlined,
  PayCircleOutlined, FileTextOutlined, InfoCircleOutlined, PlusOutlined,
  CalendarOutlined, FileExcelOutlined, DownloadOutlined, PieChartOutlined,
  BarChartOutlined, FilterOutlined, CheckSquareOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import dayjs from 'dayjs';
import api from '../api';
import { canDelete } from '../utils/permissions';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Clean English / Western numerals and money formatting helpers
const fmtNum = (v, digits = 2) => {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const fmtMoney = (v) => `${fmtNum(v, 2)} ج.م`;

const fmtDate = (d) => {
  if (!d) return '—';
  return dayjs(d).format('YYYY-MM-DD HH:mm');
};

const STATUS_MAP = {
  pending:   { label: 'في الانتظار',  color: 'orange', icon: <ClockCircleOutlined /> },
  completed: { label: 'تم الاستلام',  color: 'green',  icon: <CheckCircleOutlined /> },
  cancelled: { label: 'ملغى',         color: 'red',    icon: <CloseCircleOutlined /> }
};

const REASON_CATEGORY_MAP = {
  operational: { label: 'تشغيلي وإداري', color: 'blue' },
  utility_bill: { label: 'فواتير ومرافق وإيجار', color: 'orange' },
  owner_drawing: { label: 'مسحوبات شخصية', color: 'gold' },
  sales_withdrawal: { label: 'سلف موظفين', color: 'purple' },
  other: { label: 'نثرية ومصروفات أخرى', color: 'default' }
};

// Translates raw database expense keys into clear, professional Arabic labels
const getExpenseArabicLabel = (subcat, cat) => {
  const s = String(subcat || cat || '').toLowerCase();
  if (s.includes('salary') || s.includes('payroll') || s.includes('راتب') || s.includes('رواتب')) return 'رواتب ومسيرات الموظفين';
  if (s.includes('sales_withdrawal') || s.includes('بائعين') || s.includes('سلف')) return 'سلف ومسحوبات بائعين الفرع';
  if (s.includes('marketing') || s.includes('تسويق') || s.includes('دعاية') || s.includes('إعلان')) return 'دعاية وتسويق وإعلانات';
  if (s.includes('electricity') || s.includes('كهرباء')) return 'فواتير كهرباء ومياه';
  if (s.includes('نظافة') || s.includes('مهمات') || s.includes('أدوات')) return 'أدوات ومهمات ونظافة';
  if (s.includes('utility') || s.includes('مرافق') || s.includes('إيجار')) return 'فواتير ومرافق وتشغيل';
  if (s.includes('إدارية') || s.includes('operational') || s.includes('تشغيل')) return 'مصاريف إدارية ونثرية';
  if (s.includes('owner') || s.includes('مالك') || s.includes('شخصية')) return 'مسحوبات جاري المالك';
  if (s.includes('refund') || s.includes('مسترد')) return 'تسويات ومصروفات مستردة';
  return subcat || cat || 'مصروفات تشغيلية أخرى';
};

export default function TreasuryAdmin({ currentUser: propUser }) {
  const navigate = useNavigate();
  const currentUser = propUser || (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
  })();
  const [kpis, setKpis]                         = useState(null);
  const [transfers, setTransfers]               = useState([]);
  const [ownerData, setOwnerData]               = useState(null);
  const [hqLedger, setHqLedger]                 = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [statusFilter, setStatusFilter]         = useState('pending');
  const [confirmingId, setConfirmingId]         = useState(null);
  const [cancellingId, setCancellingId]         = useState(null);
  const [detailRecord, setDetailRecord]         = useState(null);
  const [detailVisible, setDetailVisible]       = useState(false);

  // Internal Channel Transfer State
  const [channelTransferVisible, setChannelTransferVisible]         = useState(false);
  const [channelTransferForm]                                       = Form.useForm();
  const [submittingChannelTransfer, setSubmittingChannelTransfer]   = useState(false);
  const transferFromChannel = Form.useWatch('from_channel', channelTransferForm) || 'cash';

  // Ledger Filter & Excel Export State
  const [ledgerSearch, setLedgerSearch]             = useState('');
  const [ledgerType, setLedgerType]                 = useState('all');
  const [ledgerChannel, setLedgerChannel]           = useState('all');
  const [ledgerDateRange, setLedgerDateRange]       = useState(null);
  const [ledgerLoading, setLedgerLoading]           = useState(false);

  // Analytics & Visual Charts State
  const [analyticsData, setAnalyticsData]           = useState(null);
  const [loadingAnalytics, setLoadingAnalytics]     = useState(false);

  // Ranked Expense Breakdown with Clean Arabic Labels for Option 2 Horizontal Chart
  const rankedExpenses = useMemo(() => {
    if (!analyticsData?.expenseBreakdown || analyticsData.expenseBreakdown.length === 0) return [];
    const map = {};
    for (const item of analyticsData.expenseBreakdown) {
      const amt = parseFloat(item.total_amount || 0);
      const count = parseInt(item.tx_count || 1, 10);
      const label = getExpenseArabicLabel(item.subcategory, item.category);
      if (!map[label]) {
        map[label] = { name: label, amount: 0, count: 0 };
      }
      map[label].amount += amt;
      map[label].count += count;
    }
    const total = Object.values(map).reduce((s, x) => s + x.amount, 0);
    const palette = [
      { fill: '#ea580c', tagColor: 'volcano' },
      { fill: '#0284c7', tagColor: 'blue' },
      { fill: '#8b5cf6', tagColor: 'purple' },
      { fill: '#16a34a', tagColor: 'green' },
      { fill: '#d97706', tagColor: 'gold' },
      { fill: '#0d9488', tagColor: 'cyan' },
      { fill: '#64748b', tagColor: 'default' }
    ];

    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .map((item, idx) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0;
        const theme = palette[idx % palette.length];
        return {
          ...item,
          percent: pct,
          percentFormatted: pct >= 1 ? pct.toFixed(1) : '< 1',
          theme
        };
      });
  }, [analyticsData?.expenseBreakdown]);

  const totalExpenseBreakdown = useMemo(() => {
    return rankedExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [rankedExpenses]);

  // Bulk Payroll State
  const [bulkPayrollVisible, setBulkPayrollVisible] = useState(false);
  const [bulkMonth, setBulkMonth]                   = useState(dayjs().format('YYYY-MM'));
  const [bulkChannel, setBulkChannel]               = useState('cash');
  const [bulkEmployees, setBulkEmployees]           = useState([]);
  const [selectedEmpKeys, setSelectedEmpKeys]       = useState([]);
  const [loadingBulkPreview, setLoadingBulkPreview] = useState(false);
  const [submittingBulkPayroll, setSubmittingBulkPayroll] = useState(false);

  // Owner Transaction Modals
  const [ownerModalVisible, setOwnerModalVisible] = useState(false);
  const [ownerTxType, setOwnerTxType]             = useState('deposit'); // 'deposit' or 'withdrawal'
  const [ownerForm]                               = Form.useForm();
  const [submittingOwnerTx, setSubmittingOwnerTx] = useState(false);
  const selectedChannel                           = Form.useWatch('channel', ownerForm) || 'cash';

  // Withdrawal Reasons & Quick Disbursal State
  const [withdrawalReasons, setWithdrawalReasons]     = useState([]);
  const [loadingReasons, setLoadingReasons]           = useState(false);
  const [addReasonModalVisible, setAddReasonModalVisible] = useState(false);
  const [newReasonTitle, setNewReasonTitle]           = useState('');
  const [newReasonCategory, setNewReasonCategory]     = useState('operational');
  const [submittingNewReason, setSubmittingNewReason] = useState(false);

  const [quickWithdrawVisible, setQuickWithdrawVisible] = useState(false);
  const [quickWithdrawForm]                             = Form.useForm();
  const [submittingQuickWithdraw, setSubmittingQuickWithdraw] = useState(false);
  const selectedQuickChannel                            = Form.useWatch('channel', quickWithdrawForm) || 'cash';

  // Employee Payroll State
  const [employeesList, setEmployeesList]             = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId]   = useState(null);
  const [payrollMonth, setPayrollMonth]               = useState(dayjs().format('YYYY-MM'));
  const [employeeSummary, setEmployeeSummary]         = useState(null);
  const [loadingEmpSummary, setLoadingEmpSummary]     = useState(false);
  const [deductionsAmount, setDeductionsAmount]       = useState(0);
  const [deductionReason, setDeductionReason]         = useState('');
  const [bonusAmount, setBonusAmount]                 = useState(0);
  const [bonusReason, setBonusReason]                 = useState('');
  const [payrollChannel, setPayrollChannel]           = useState('cash');
  const [payrollNotes, setPayrollNotes]               = useState('');
  const [submittingPayroll, setSubmittingPayroll]     = useState(false);
  const [advancesModalVisible, setAdvancesModalVisible] = useState(false);

  // Payroll History
  const [payrollHistory, setPayrollHistory]           = useState([]);
  const [loadingPayrollHistory, setLoadingPayrollHistory] = useState(false);

  // Available balance for currently selected channel in modal
  const getChannelAvailable = (ch) => {
    if (!kpis?.main_safe) return 0;
    if (ch === 'cash') return parseFloat(kpis.main_safe.cash_balance || 0);
    if (ch === 'visa') return parseFloat(kpis.main_safe.visa_balance || 0);
    if (ch === 'transfer') return parseFloat(kpis.main_safe.transfer_balance || 0);
    return 0;
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [kpiRes, trfRes, ownerRes] = await Promise.all([
        api.get('/api/swm/treasury/kpis'),
        api.get('/api/swm/treasury/transfers', { params: { status: statusFilter, limit: 100 } }),
        api.get('/api/swm/treasury/owner-account')
      ]);

      if (kpiRes.data.success) setKpis(kpiRes.data.data);
      if (trfRes.data.success) setTransfers(trfRes.data.data || []);
      if (ownerRes.data.success) setOwnerData(ownerRes.data.data);
      fetchHqLedger();
      fetchAnalytics();
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
    }
  };

  const fetchHqLedger = async () => {
    setLedgerLoading(true);
    try {
      const params = { limit: 300 };
      if (ledgerSearch && ledgerSearch.trim()) params.search = ledgerSearch.trim();
      if (ledgerType && ledgerType !== 'all') params.type = ledgerType;
      if (ledgerChannel && ledgerChannel !== 'all') params.channel = ledgerChannel;
      if (ledgerDateRange && ledgerDateRange[0] && ledgerDateRange[1]) {
        params.start_date = ledgerDateRange[0].format('YYYY-MM-DD');
        params.end_date = ledgerDateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/api/swm/treasury/main-safe-ledger', { params });
      if (res.data.success) {
        setHqLedger(res.data.data || []);
      }
    } catch (err) {
      console.error('Ledger fetch error:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const exportLedgerToExcel = () => {
    if (!hqLedger || hqLedger.length === 0) {
      message.warning('لا توجد بيانات متاحة للتصدير');
      return;
    }
    const headers = ['رقم القيد', 'التاريخ والوقت', 'البيان والملاحظات', 'المبلغ (ج.م)', 'النوع', 'الرصيد السابق', 'الرصيد بعد الحركة', 'المنفذ'];
    const rows = hqLedger.map(rec => {
      const isTransfer = rec.payment_method === 'channel_transfer';
      const isOutflow = !isTransfer && rec.destination_account && rec.destination_account !== 'main_warehouse_safe';
      const typeLabel = isTransfer ? 'تحويل بين القنوات' : (isOutflow ? 'منصرف (-)' : 'وارد (+)');
      return [
        `"${rec.entry_number || ''}"`,
        `"${rec.created_at ? dayjs(rec.created_at).format('YYYY-MM-DD HH:mm') : ''}"`,
        `"${(rec.notes || '').replace(/"/g, '""')}"`,
        `"${parseFloat(rec.amount || 0).toFixed(2)}"`,
        `"${typeLabel}"`,
        `"${parseFloat(rec.previous_safe_balance || 0).toFixed(2)}"`,
        `"${parseFloat(rec.new_safe_balance || 0).toFixed(2)}"`,
        `"${rec.created_by_name || rec.created_by_username || 'المدير'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_الخزينة_المركزية_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('تم تصدير سجل الخزينة إلى Excel بنجاح');
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await api.get('/api/swm/treasury/analytics');
      if (res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleChannelTransferSubmit = async (values) => {
    setSubmittingChannelTransfer(true);
    try {
      const res = await api.post('/api/swm/treasury/channel-transfer', values);
      if (res.data.success) {
        message.success(res.data.message || 'تم التحويل الداخلي بنجاح');
        setChannelTransferVisible(false);
        channelTransferForm.resetFields();
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إتمام التحويل الداخلي');
    } finally {
      setSubmittingChannelTransfer(false);
    }
  };

  const fetchBulkPreview = async (monthVal) => {
    setLoadingBulkPreview(true);
    try {
      const target = monthVal || bulkMonth;
      const res = await api.get('/api/swm/treasury/bulk-payroll-preview', { params: { month: target } });
      if (res.data.success) {
        const emps = res.data.data.employees || [];
        const enriched = emps.map(e => ({
          ...e,
          key: e.employee_id,
          deductions: 0,
          deduction_reason: '',
          bonus: 0,
          bonus_reason: '',
          calcNet: e.net_salary
        }));
        setBulkEmployees(enriched);
        const unpaidKeys = enriched.filter(e => !e.already_paid && e.calcNet > 0).map(e => e.employee_id);
        setSelectedEmpKeys(unpaidKeys);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل مسير الرواتب المجمع');
    } finally {
      setLoadingBulkPreview(false);
    }
  };

  const handleBulkPaySubmit = async () => {
    const chosen = bulkEmployees.filter(e => selectedEmpKeys.includes(e.employee_id));
    if (chosen.length === 0) {
      message.warning('يرجى تحديد موظف واحد على الأقل للصرف');
      return;
    }
    const totalNet = Math.round(chosen.reduce((sum, e) => sum + (e.calcNet || 0), 0) * 100) / 100;
    const avail = getChannelAvailable(bulkChannel);
    if (totalNet > avail + 0.01) {
      message.error(`رصيد القناة المختارة (${fmtMoney(avail)}) لا يكفي لصرف إجمالي المسير (${fmtMoney(totalNet)})`);
      return;
    }

    setSubmittingBulkPayroll(true);
    try {
      const payload = {
        payout_month: bulkMonth,
        channel: bulkChannel,
        employees: chosen.map(e => ({
          employee_id: e.employee_id,
          base_salary: e.base_salary,
          advances_deducted: e.advances_total,
          deductions: e.deductions || 0,
          deduction_reason: e.deduction_reason || '',
          bonus: e.bonus || 0,
          bonus_reason: e.bonus_reason || '',
          net_salary: e.calcNet,
          employee_name: e.full_name,
          branch_id: e.branch_id
        }))
      };
      const res = await api.post('/api/swm/treasury/bulk-pay-salary', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم صرف مسير الرواتب المجمع بنجاح');
        setBulkPayrollVisible(false);
        fetchAll();
        fetchPayrollHistory();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في صرف مسير الرواتب المجمع');
    } finally {
      setSubmittingBulkPayroll(false);
    }
  };

  const fetchWithdrawalReasons = async () => {
    setLoadingReasons(true);
    try {
      const res = await api.get('/api/swm/treasury/withdrawal-reasons');
      if (res.data.success) setWithdrawalReasons(res.data.data || []);
    } catch (err) {
      console.error('Fetch reasons error:', err);
    } finally {
      setLoadingReasons(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/swm/users', { params: { limit: 200, status: 'active' } });
      if (res.data.success) setEmployeesList(res.data.data || []);
    } catch (err) {
      console.error('Fetch employees error:', err);
    }
  };

  const fetchPayrollHistory = async () => {
    setLoadingPayrollHistory(true);
    try {
      const res = await api.get('/api/swm/treasury/payroll-history');
      if (res.data.success) setPayrollHistory(res.data.data || []);
    } catch (err) {
      console.error('Fetch payroll history error:', err);
    } finally {
      setLoadingPayrollHistory(false);
    }
  };

  const fetchEmployeeSummary = async (empId, m) => {
    if (!empId) {
      setEmployeeSummary(null);
      return;
    }
    setLoadingEmpSummary(true);
    try {
      const res = await api.get(`/api/swm/treasury/employee-payroll-summary/${empId}`, {
        params: { month: m || payrollMonth }
      });
      if (res.data.success) {
        setEmployeeSummary(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في جلب تفاصيل مرتب الموظف');
    } finally {
      setLoadingEmpSummary(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchWithdrawalReasons();
    fetchEmployees();
    fetchPayrollHistory();
  }, [statusFilter]);

  const handleConfirm = async (id) => {
    setConfirmingId(id);
    try {
      const res = await api.put(`/api/swm/treasury/transfers/${id}/confirm`);
      if (res.data.success) {
        message.success(res.data.message);
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تأكيد التحويل');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const res = await api.put(`/api/swm/treasury/transfers/${id}/cancel`, { reason: 'رفض بواسطة المدير' });
      if (res.data.success) {
        message.success(res.data.message);
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إلغاء الطلب');
    } finally {
      setCancellingId(null);
    }
  };

  const openOwnerModal = (type) => {
    setOwnerTxType(type);
    ownerForm.resetFields();
    ownerForm.setFieldsValue({ channel: 'cash', amount: undefined, notes: '' });
    setOwnerModalVisible(true);
  };

  const handleOwnerSubmit = async (values) => {
    setSubmittingOwnerTx(true);
    try {
      const payload = {
        transaction_type: ownerTxType,
        amount: values.amount,
        channel: values.channel,
        notes: values.notes
      };
      const res = await api.post('/api/swm/treasury/owner-transaction', payload);
      if (res.data.success) {
        message.success(res.data.message);
        setOwnerModalVisible(false);
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر إتمام العملية لصاحب الحساب');
    } finally {
      setSubmittingOwnerTx(false);
    }
  };

  const pendingCount = transfers.filter(t => t.status === 'pending').length;

  const handleAddReason = async () => {
    if (!newReasonTitle.trim()) {
      message.warning('يرجى كتابة سبب أو بند الصرف');
      return;
    }
    setSubmittingNewReason(true);
    try {
      const res = await api.post('/api/swm/treasury/withdrawal-reasons', {
        title: newReasonTitle.trim(),
        category: newReasonCategory
      });
      if (res.data.success) {
        message.success(res.data.message);
        setNewReasonTitle('');
        setAddReasonModalVisible(false);
        fetchWithdrawalReasons();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر إضافة بند الصرف');
    } finally {
      setSubmittingNewReason(false);
    }
  };

  const handleQuickWithdrawSubmit = async (values) => {
    setSubmittingQuickWithdraw(true);
    try {
      const payload = {
        amount: values.amount,
        channel: values.channel,
        reason: values.reason,
        category: values.category || 'operational',
        recipient_name: values.recipient_name,
        notes: values.notes
      };
      const res = await api.post('/api/swm/treasury/quick-withdrawal', payload);
      if (res.data.success) {
        message.success(res.data.message);
        setQuickWithdrawVisible(false);
        quickWithdrawForm.resetFields();
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر إتمام عملية السحب');
    } finally {
      setSubmittingQuickWithdraw(false);
    }
  };

  const handlePaySalary = async () => {
    if (!employeeSummary) {
      message.warning('يرجى اختيار موظف أولاً');
      return;
    }

    const baseSal = parseFloat(employeeSummary.base_salary || 0);
    const adv = parseFloat(employeeSummary.advances_total || 0);
    const ded = parseFloat(deductionsAmount || 0);
    const bns = parseFloat(bonusAmount || 0);
    const net = Math.round((baseSal - adv - ded + bns) * 100) / 100;

    if (net <= 0) {
      message.error('صافي الراتب يجب أن يكون أكبر من الصفر');
      return;
    }

    const avail = getChannelAvailable(payrollChannel);
    if (net > avail + 0.01) {
      message.error(`رصيد قناة ${payrollChannel === 'cash' ? 'الكاش' : payrollChannel === 'visa' ? 'الفيزا' : 'التحويل'} بالخزينة (${avail.toLocaleString()} ج.م) لا يكفي لصرف صافي الراتب (${net.toLocaleString()} ج.م)`);
      return;
    }

    setSubmittingPayroll(true);
    try {
      const payload = {
        employee_id: employeeSummary.employee.id,
        payout_month: payrollMonth,
        base_salary: baseSal,
        advances_deducted: adv,
        deductions: ded,
        deduction_reason: deductionReason,
        bonus: bns,
        bonus_reason: bonusReason,
        channel: payrollChannel,
        notes: payrollNotes
      };
      const res = await api.post('/api/swm/treasury/pay-salary', payload);
      if (res.data.success) {
        message.success(res.data.message);
        setDeductionsAmount(0);
        setDeductionReason('');
        setBonusAmount(0);
        setBonusReason('');
        setPayrollNotes('');
        fetchAll();
        fetchPayrollHistory();
        fetchEmployeeSummary(employeeSummary.employee.id, payrollMonth);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في صرف الراتب');
    } finally {
      setSubmittingPayroll(false);
    }
  };

  const payrollColumns = [
    {
      title: 'رقم الإذن',
      dataIndex: 'id',
      key: 'id',
      render: v => <Text code style={{ fontSize: 12 }}>PAY-{String(v).padStart(5, '0')}</Text>
    },
    {
      title: 'الموظف والفرع',
      key: 'employee',
      render: (_, rec) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{rec.employee_name}</Text>
          {rec.branch_name && (
            <div>
              <Tag color="cyan" style={{ fontSize: 10 }}>{rec.branch_name}</Tag>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'شهر الراتب',
      dataIndex: 'payout_month',
      key: 'payout_month',
      render: v => <Tag color="geekblue">{v}</Tag>
    },
    {
      title: 'الراتب الأساسي',
      dataIndex: 'base_salary',
      key: 'base_salary',
      render: v => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(v)}</span>
    },
    {
      title: 'سلف مستقطعة',
      dataIndex: 'advances_deducted',
      key: 'advances_deducted',
      render: v => parseFloat(v) > 0 ? <Text type="danger" style={{ fontVariantNumeric: 'tabular-nums' }}>-{fmtMoney(v)}</Text> : '—'
    },
    {
      title: 'الخصومات',
      key: 'deductions',
      render: (_, rec) => parseFloat(rec.deductions) > 0 ? (
        <Tooltip title={rec.deduction_reason || 'بدون سبب مدخل'}>
          <Text type="danger" style={{ fontVariantNumeric: 'tabular-nums' }}>-{fmtMoney(rec.deductions)}</Text>
        </Tooltip>
      ) : '—'
    },
    {
      title: 'الحوافز والإضافي',
      key: 'bonus',
      render: (_, rec) => parseFloat(rec.bonus) > 0 ? (
        <Tooltip title={rec.bonus_reason || 'حافز إضافي'}>
          <Text style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>+{fmtMoney(rec.bonus)}</Text>
        </Tooltip>
      ) : '—'
    },
    {
      title: 'الصافي المصروف',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: v => (
        <Text strong style={{ color: '#16a34a', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          {fmtMoney(v)}
        </Text>
      )
    },
    {
      title: 'قناة الصرف',
      dataIndex: 'channel',
      key: 'channel',
      render: ch => {
        if (ch === 'visa') return <Tag color="blue" icon={<CreditCard size={11} />}>فيزا</Tag>;
        if (ch === 'transfer') return <Tag color="purple" icon={<Smartphone size={11} />}>تحويل</Tag>;
        return <Tag color="green" icon={<Banknote size={11} />}>كاش</Tag>;
      }
    },
    {
      title: 'المسؤول عن الصرف',
      dataIndex: 'paid_by_name',
      key: 'paid_by_name',
      render: v => v || 'المدير'
    },
    {
      title: 'تاريخ الصرف',
      dataIndex: 'paid_at',
      key: 'paid_at',
      render: d => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(d)}</span>
    }
  ];

  // Columns: Transfers from branches
  const transferColumns = [
    {
      title: 'رقم الطلب',
      dataIndex: 'transfer_ref',
      key: 'transfer_ref',
      render: v => <Text code style={{ fontSize: 12 }}>{v}</Text>
    },
    {
      title: 'الفرع المُرسِل',
      dataIndex: 'from_branch_name',
      key: 'from_branch_name',
      render: (v, rec) => (
        <Space size={4}>
          <ShopOutlined style={{ color: '#4f46e5' }} />
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>({rec.from_branch_code})</Text>
        </Space>
      )
    },
    {
      title: 'المبلغ الإجمالي',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      render: v => (
        <Text strong style={{ color: '#16a34a', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
          {fmtMoney(v)}
        </Text>
      )
    },
    {
      title: 'تقسيمة القنوات',
      key: 'breakdown',
      render: (_, rec) => {
        let b = null;
        try {
          if (rec.payment_breakdown) {
            b = typeof rec.payment_breakdown === 'string' ? JSON.parse(rec.payment_breakdown) : rec.payment_breakdown;
          }
        } catch (e) {
          b = null;
        }

        if (b && typeof b === 'object' && !Array.isArray(b)) {
          return (
            <Space size={2} wrap>
              {b.cash > 0 && <Tag color="green" icon={<Banknote size={11} />}>كاش: {fmtNum(b.cash, 0)}</Tag>}
              {b.visa > 0 && <Tag color="blue" icon={<CreditCard size={11} />}>فيزا: {fmtNum(b.visa, 0)}</Tag>}
              {(b.transfers > 0 || b.transfer > 0) && (
                <Tag color="purple" icon={<Smartphone size={11} />}>تحويل: {fmtNum(b.transfers || b.transfer, 0)}</Tag>
              )}
            </Space>
          );
        }

        return <Tag color={rec.transfer_method === 'bank_transfer' ? 'blue' : 'geekblue'}>
          {rec.transfer_method === 'bank_transfer' ? <Space size={4}><Building2 size={12} /><span>بنكي</span></Space> : <Space size={4}><Banknote size={12} /><span>نقدي</span></Space>}
        </Tag>;
      }
    },
    {
      title: 'رقم مرجعي',
      dataIndex: 'reference_no',
      key: 'reference_no',
      render: v => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'طلب بواسطة',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
      render: (v, rec) => v || rec.requested_by_username || '—'
    },
    {
      title: 'تاريخ الطلب',
      dataIndex: 'requested_at',
      key: 'requested_at',
      sorter: (a, b) => new Date(b.requested_at) - new Date(a.requested_at),
      defaultSortOrder: 'descend',
      render: d => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(d)}</span>
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: status => {
        const s = STATUS_MAP[status] || { label: status, color: 'default', icon: null };
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      fixed: 'left',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="تفاصيل الطلب">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { setDetailRecord(record); setDetailVisible(true); }}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title={`تأكيد استلام ${fmtMoney(record.amount)} من ${record.from_branch_name}؟`}
                okText="تأكيد الاستلام"
                cancelText="إلغاء"
                okType="primary"
                onConfirm={() => handleConfirm(record.id)}
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={confirmingId === record.id}
                  className="swm-btn-emerald"
                  style={{ borderRadius: 6 }}
                >
                  تأكيد
                </Button>
              </Popconfirm>

              {canDelete(currentUser) && (
                <Popconfirm
                  title="رفض وإرجاع المبلغ لخزنة الفرع؟"
                  okText="رفض"
                  cancelText="إلغاء"
                  okType="danger"
                  onConfirm={() => handleCancel(record.id)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={cancellingId === record.id}
                  >
                    رفض
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      )
    }
  ];

  // Columns: Owner account ledger
  const ownerLedgerColumns = [
    {
      title: 'التاريخ',
      dataIndex: 'created_at',
      key: 'created_at',
      render: d => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(d)}</span>
    },
    {
      title: 'نوع الحركة',
      dataIndex: 'transaction_type',
      key: 'transaction_type',
      render: v => v === 'deposit'
        ? <Tag color="success" icon={<ArrowDownOutlined />}>إيداع رأس مال / تمويل</Tag>
        : <Tag color="error" icon={<ArrowUpOutlined />}>مسحوبات شخصية / أرباح</Tag>
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (v, rec) => (
        <Text strong style={{ color: rec.transaction_type === 'deposit' ? '#16a34a' : '#dc2626', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          {rec.transaction_type === 'deposit' ? '+' : '-'} {fmtMoney(v)}
        </Text>
      )
    },
    {
      title: 'القناة المالية',
      dataIndex: 'channel',
      key: 'channel',
      render: ch => {
        if (ch === 'cash') return <Tag color="green" icon={<Banknote size={11} />}>كاش (نقدي)</Tag>;
        if (ch === 'visa') return <Tag color="blue" icon={<CreditCard size={11} />}>بنكي / فيزا</Tag>;
        if (ch === 'transfer') return <Tag color="purple" icon={<Smartphone size={11} />}>تحويل / محفظة</Tag>;
        return <Tag>{ch}</Tag>;
      }
    },
    {
      title: 'الملاحظات والبيان',
      dataIndex: 'notes',
      key: 'notes',
      render: v => v || <Text type="secondary">—</Text>
    },
    {
      title: 'المنفّذ',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      render: (v, rec) => v || rec.created_by_username || 'المدير'
    }
  ];

  // Columns: HQ Treasury Transactions Ledger
  const hqLedgerColumns = [
    {
      title: 'رقم القيد',
      dataIndex: 'entry_number',
      key: 'entry_number',
      render: v => <Text code style={{ fontSize: 11 }}>{v}</Text>
    },
    {
      title: 'التاريخ والوقت',
      dataIndex: 'created_at',
      key: 'created_at',
      render: d => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(d)}</span>
    },
    {
      title: 'نوع الحركة',
      key: 'tx_type',
      render: (_, rec) => {
        if (rec.payment_method === 'channel_transfer') {
          return <Tag color="purple" icon={<SwapOutlined />}>تحويل قنوات</Tag>;
        }
        const isOutflow = rec.destination_account && rec.destination_account !== 'main_warehouse_safe';
        return isOutflow 
          ? <Tag color="error" icon={<ArrowUpOutlined />}>منصرف (-)</Tag>
          : <Tag color="success" icon={<ArrowDownOutlined />}>وارد (+)</Tag>;
      }
    },
    {
      title: 'الحركة والبيان',
      dataIndex: 'notes',
      key: 'notes',
      render: v => <Text style={{ fontSize: 13 }}>{v}</Text>
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (v, rec) => {
        const isTransfer = rec.payment_method === 'channel_transfer';
        const isOutflow = !isTransfer && rec.destination_account && rec.destination_account !== 'main_warehouse_safe';
        const color = isTransfer ? '#7c3aed' : (isOutflow ? '#dc2626' : '#16a34a');
        const prefix = isTransfer ? '⇄ ' : (isOutflow ? '- ' : '+ ');
        return (
          <Text strong style={{ color, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
            {prefix}{fmtMoney(v)}
          </Text>
        );
      }
    },
    {
      title: 'الرصيد السابق',
      dataIndex: 'previous_safe_balance',
      key: 'previous_safe_balance',
      render: v => v !== null && v !== undefined ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(v)}</span> : '—'
    },
    {
      title: 'الرصيد بعد الحركة',
      dataIndex: 'new_safe_balance',
      key: 'new_safe_balance',
      render: v => v !== null && v !== undefined ? (
        <Text strong style={{ color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
          {fmtMoney(v)}
        </Text>
      ) : '—'
    },
    {
      title: 'بواسطة',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      render: (v, rec) => v || rec.created_by_username || 'المدير'
    }
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
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
            <BankOutlined style={{ color: '#4f46e5', marginLeft: 8 }} />
            الخزينة المركزية وإدارة السيولة النقدية والتحويلات
          </h2>
          <p>متابعة أرصدة الخزينة الرئيسية (كاش / فيزا / تحويلات)، ورقابة الصرف والسيولة، وحساب صاحب المنشأة</p>
        </div>

        <div className="swm-page-actions">
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            className="swm-btn-emerald"
            style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
            onClick={() => openOwnerModal('deposit')}
          >
            إيداع رأس مال / تمويل
          </Button>
          <Button
            danger
            icon={<MinusCircleOutlined />}
            onClick={() => openOwnerModal('withdrawal')}
            style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
          >
            مسحوبات صاحب الحساب
          </Button>
          <Button
            type="default"
            icon={<SwapOutlined style={{ color: '#4f46e5' }} />}
            style={{ height: 44, borderRadius: 8, fontWeight: 700, borderColor: '#818cf8', color: '#4338ca', backgroundColor: '#eef2ff' }}
            onClick={() => {
              channelTransferForm.resetFields();
              channelTransferForm.setFieldsValue({ from_channel: 'cash', to_channel: 'visa' });
              setChannelTransferVisible(true);
            }}
          >
            تحويل بين القنوات
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} style={{ height: 44, borderRadius: 8 }}>
            تحديث
          </Button>
        </div>
      </div>

      {loading && !kpis ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>جاري تحميل بيانات الخزينة المركزية...</div>
        </div>
      ) : (
        <>
          {/* Main Treasury Multi-Channel Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {/* Total Main Treasury */}
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  borderTop: '4px solid #0F766E',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12.5, fontWeight: 700, color: '#0F766E' }}>إجمالي رصيد الخزينة المركزية</Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0F766E', marginTop: 6, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                      {fmtNum(kpis?.main_safe?.total_balance ?? (kpis?.main_register_balance || 0), 2)}
                      <span style={{ fontSize: 14, marginRight: 6, fontWeight: 600 }}>ج.م</span>
                    </div>
                  </div>
                  <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 10, padding: '8px 10px' }}>
                    <BankOutlined style={{ fontSize: 22, color: '#0F766E' }} />
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'block' }}>
                  السيولة الحية المتاحة للصرف وسداد الموردين
                </Text>
              </Card>
            </Col>

            {/* Cash Channel */}
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  borderTop: '4px solid #16A34A',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12.5, fontWeight: 700, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Banknote size={15} /> الخزينة النقدية (الكاش)</Text>
                    <div style={{ color: '#16A34A', fontSize: 22, fontWeight: 900, marginTop: 6, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                      {fmtNum(kpis?.main_safe?.cash_balance || 0, 2)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600 }}>ج.م</span>
                    </div>
                  </div>
                  <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '8px 10px', border: '1px solid #BBF7D0' }}>
                    <WalletOutlined style={{ fontSize: 20, color: '#16A34A' }} />
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'block' }}>
                  السيولة النقدية المباشرة بالخزينة
                </Text>
              </Card>
            </Col>

            {/* Visa / Bank Channel */}
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  borderTop: '4px solid #0284C7',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12.5, fontWeight: 700, color: '#0369A1', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CreditCard size={15} /> الحساب البنكي (الفيزا / البطاقات)</Text>
                    <div style={{ color: '#0284C7', fontSize: 22, fontWeight: 900, marginTop: 6, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                      {fmtNum(kpis?.main_safe?.visa_balance || 0, 2)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600 }}>ج.م</span>
                    </div>
                  </div>
                  <div style={{ background: '#F0F9FF', borderRadius: 10, padding: '8px 10px', border: '1px solid #BAE6FD' }}>
                    <CreditCardOutlined style={{ fontSize: 20, color: '#0284C7' }} />
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'block' }}>
                  رصيد الحساب البنكي والمدفوعات الإلكترونية
                </Text>
              </Card>
            </Col>

            {/* Transfers & E-Wallets Channel */}
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                  borderTop: '4px solid #8B5CF6',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12.5, fontWeight: 700, color: '#6D28D9', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Smartphone size={15} /> التحويلات والمحافظ (إنستاباي / كاش)</Text>
                    <div style={{ color: '#8B5CF6', fontSize: 22, fontWeight: 900, marginTop: 6, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                      {fmtNum(kpis?.main_safe?.transfer_balance || 0, 2)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600 }}>ج.م</span>
                    </div>
                  </div>
                  <div style={{ background: '#FAF5FF', borderRadius: 10, padding: '8px 10px', border: '1px solid #E9D5FF' }}>
                    <MobileOutlined style={{ fontSize: 20, color: '#8B5CF6' }} />
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 11, marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 6, display: 'block' }}>
                  فودافون كاش، محافظ رقمية، إنستاباي
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Owner Account Card (جاري المالك / حساب صاحب المنشأة) */}
          <Card
            size="small"
            style={{
              marginBottom: 20,
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              borderTop: '4px solid #F59E0B',
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CrownOutlined style={{ fontSize: 26, color: '#D97706' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, color: '#0F172A', fontWeight: 800 }}>حساب فلوس صاحب المنشأة (جاري المالك)</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 2, fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                      {fmtNum(ownerData?.summary?.current_balance || 0, 2)} <span style={{ fontSize: 14, fontWeight: 600 }}>ج.م</span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      صافي المستحقات ورأس المال (الإيداعات - المسحوبات)
                    </Text>
                  </div>
                </div>
              </Col>

              <Col xs={12} md={4}>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 11, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}><ArrowDownLeft size={13} /> إجمالي رأس المال المودع</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#16A34A', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    + {fmtMoney(ownerData?.summary?.total_deposited || 0)}
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(ownerData?.summary?.deposit_count || 0, 0)} حركة إيداع</span>
                </div>
              </Col>

              <Col xs={12} md={4}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 11, color: '#991B1B', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}><ArrowUpRight size={13} /> إجمالي المسحوبات الشخصية</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#DC2626', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                    - {fmtMoney(ownerData?.summary?.total_withdrawn || 0)}
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(ownerData?.summary?.withdrawal_count || 0, 0)} حركة سحب</span>
                </div>
              </Col>

              <Col xs={24} md={8} style={{ textAlign: 'left' }}>
                <Space wrap>
                  <Button
                    type="primary"
                    size="middle"
                    icon={<PlusCircleOutlined />}
                    className="swm-btn-emerald"
                    style={{ fontWeight: 700, borderRadius: 8, height: 38 }}
                    onClick={() => openOwnerModal('deposit')}
                  >
                    إيداع تمويل جديد
                  </Button>
                  <Button
                    danger
                    size="middle"
                    icon={<MinusCircleOutlined />}
                    onClick={() => openOwnerModal('withdrawal')}
                    style={{ fontWeight: 700, borderRadius: 8, height: 38 }}
                  >
                    سحب مسحوبات
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Operations Row: 1. Withdrawal Reasons & Quick Disbursal | 2. Employee Salary Payout */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {/* Card 1: Withdrawal Reasons & Fast Safe Disbursal */}
            <Col xs={24} lg={11}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <FileTextOutlined style={{ color: '#d97706' }} />
                      <Text strong style={{ fontSize: 15 }}>أسباب وبنود المسحوبات والصرف</Text>
                      <Badge count={withdrawalReasons.length} style={{ backgroundColor: '#f59e0b' }} />
                    </Space>
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setAddReasonModalVisible(true)}
                    >
                      إضافة بند جديد
                    </Button>
                  </div>
                }
              >
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  أسباب الصرف المعتمدة لضبط النثريات والمصاريف التشغيلية وخصمها من الخزينة باليومية الإدارية:
                </Text>

                {/* Reasons tags cloud */}
                <div style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  padding: 8,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  marginBottom: 16
                }}>
                  {loadingReasons ? (
                    <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
                  ) : withdrawalReasons.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بنود صرف مسجلة" />
                  ) : (
                    <Space size={[6, 8]} wrap>
                      {withdrawalReasons.map(r => {
                        const catMeta = REASON_CATEGORY_MAP[r.category] || REASON_CATEGORY_MAP.other;
                        return (
                          <Tag
                            key={r.id}
                            color={catMeta.color}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              quickWithdrawForm.resetFields();
                              quickWithdrawForm.setFieldsValue({
                                reason: r.title,
                                category: r.category,
                                channel: 'cash'
                              });
                              setQuickWithdrawVisible(true);
                            }}
                          >
                            {r.title}
                          </Tag>
                        );
                      })}
                    </Space>
                  )}
                </div>

                <div style={{ marginTop: 'auto', background: '#fffbeb', padding: 12, borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <Text strong style={{ color: '#92400e', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lightbulb size={15} /> صرف نثريات أو مصروفات فورية</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        اختر بنداً من الأعلى أو اضغط للصرف المباشر من الخزينة الرئيسية
                      </Text>
                    </div>
                    <Button
                      type="primary"
                      icon={<MinusCircleOutlined />}
                      style={{ backgroundColor: '#EA580C', borderColor: '#EA580C', color: '#FFFFFF', fontWeight: 700 }}
                      onClick={() => {
                        quickWithdrawForm.resetFields();
                        quickWithdrawForm.setFieldsValue({ channel: 'cash' });
                        setQuickWithdrawVisible(true);
                      }}
                    >
                      صرف مسحوبات سريعة
                    </Button>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Card 2: Employee Salary Payout Card */}
            <Col xs={24} lg={13}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  height: '100%'
                }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <Space>
                      <UserOutlined style={{ color: '#2563eb' }} />
                      <Text strong style={{ fontSize: 15 }}>صرف وقبض رواتب الموظفين (مسير الرواتب)</Text>
                    </Space>
                    <Space size={8} wrap>
                      <Text type="secondary" style={{ fontSize: 11 }}>الشهر المستحق:</Text>
                      <DatePicker
                        picker="month"
                        size="small"
                        value={dayjs(payrollMonth, 'YYYY-MM')}
                        format="YYYY-MM"
                        allowClear={false}
                        onChange={(d) => {
                          if (d) {
                            const m = d.format('YYYY-MM');
                            setPayrollMonth(m);
                            if (selectedEmployeeId) {
                              fetchEmployeeSummary(selectedEmployeeId, m);
                            }
                          }
                        }}
                        style={{ width: 115 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<TeamOutlined />}
                        className="swm-btn-emerald"
                        style={{ borderRadius: 6, fontWeight: 700 }}
                        onClick={() => {
                          setBulkMonth(payrollMonth);
                          fetchBulkPreview(payrollMonth);
                          setBulkPayrollVisible(true);
                        }}
                      >
                        صرف مسير مجمع
                      </Button>
                    </Space>
                  </div>
                }
              >
                {/* Search Bar for Employee */}
                <div style={{ marginBottom: 14 }}>
                  <Select
                    showSearch
                    allowClear
                    placeholder="ابحث عن موظف بالاسم، رقم الهاتف، أو الفرع المعين له..."
                    style={{ width: '100%' }}
                    size="large"
                    value={selectedEmployeeId}
                    optionLabelProp="label"
                    onChange={(val) => {
                      setSelectedEmployeeId(val);
                      setDeductionsAmount(0);
                      setDeductionReason('');
                      setBonusAmount(0);
                      setBonusReason('');
                      if (val) fetchEmployeeSummary(val, payrollMonth);
                      else setEmployeeSummary(null);
                    }}
                    filterOption={(input, option) => {
                      const emp = employeesList.find(e => String(e.id) === String(option?.value));
                      if (!emp) return false;
                      const q = (input || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
                      if (!q) return true;
                      const name = (emp.full_name || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
                      const branch = (emp.branch_name || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
                      const phone = (emp.phone || '').toLowerCase();
                      const username = (emp.username || '').toLowerCase();
                      return name.includes(q) || branch.includes(q) || phone.includes(q) || username.includes(q);
                    }}
                  >
                    {employeesList.map(emp => (
                      <Option
                        key={emp.id}
                        value={emp.id}
                        label={`${emp.full_name} (${emp.branch_name || 'الفرع الرئيسي'})`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={6}>
                            <UserOutlined style={{ color: '#6366f1' }} />
                            <Text strong>{emp.full_name}</Text>
                            {emp.phone && <Text type="secondary" style={{ fontSize: 11 }}>({emp.phone})</Text>}
                          </Space>
                          <Space size={4}>
                            <Tag color="cyan" style={{ fontSize: 11 }}>{emp.branch_name || 'الفرع الرئيسي'}</Tag>
                            <Tag color="geekblue" style={{ fontSize: 11 }}>مرتب: {parseFloat(emp.salary || 0).toLocaleString()} ج.م</Tag>
                          </Space>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>

                {loadingEmpSummary ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                ) : !employeeSummary ? (
                  <div style={{
                    padding: '30px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1'
                  }}>
                    <UserOutlined style={{ fontSize: 36, color: '#94a3b8', marginBottom: 8 }} />
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                      قم بالبحث عن موظف لعرض بياناته وحساب صافي الراتب المستحق وخصم السلف والخصومات وصرفه من الخزينة.
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Employee Quick Info Badge */}
                    <div style={{
                      padding: '8px 12px',
                      background: '#eff6ff',
                      borderRadius: 8,
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      border: '1px solid #bfdbfe'
                    }}>
                      <Space size={8}>
                        <div style={{ background: '#2563eb', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UserOutlined />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 14 }}>{employeeSummary.employee.full_name}</Text>
                          <Text type="secondary" style={{ fontSize: 11, marginRight: 8 }}>
                            ({employeeSummary.employee.phone || 'بدون هاتف'})
                          </Text>
                        </div>
                      </Space>
                      <Space size={4}>
                        <Tag color="blue">{employeeSummary.employee.branch_name || 'الفرع الرئيسي'}</Tag>
                        <Tag color="purple">{employeeSummary.employee.role === 'salesperson' ? 'بائع' : employeeSummary.employee.role === 'supervisor' ? 'مشرف' : 'موظف'}</Tag>
                      </Space>
                    </div>

                    {/* Paid Notice If Already Paid */}
                    {employeeSummary.already_paid && (
                      <Alert
                        type="warning"
                        showIcon
                        message={`تنبيه: تم صرف راتب شهر (${payrollMonth}) لهذا الموظف مسبقاً!`}
                        description={`آخر صرفية كانت بتاريخ: ${fmtDate(employeeSummary.previous_payouts[0]?.paid_at)}`}
                        style={{ marginBottom: 12, borderRadius: 8 }}
                      />
                    )}

                    {/* Calculation Metrics Grid */}
                    <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                      {/* Base Salary */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>المرتب الأساسي</Text>
                          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtMoney(employeeSummary.base_salary || 0)}
                          </div>
                        </div>
                      </Col>

                      {/* Advances Taken */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>سلف ومصاريف الشهر</Text>
                          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#dc2626', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            - {fmtMoney(employeeSummary.advances_total || 0)}
                          </div>
                          {employeeSummary.advances_list?.length > 0 && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontSize: 10, color: '#dc2626' }}
                              onClick={() => setAdvancesModalVisible(true)}
                            >
                              ({fmtNum(employeeSummary.advances_list.length, 0)} حركة - عرض)
                            </Button>
                          )}
                        </div>
                      </Col>

                      {/* Monthly Deductions Input */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#fff1f2', borderRadius: 8, border: '1px solid #ffe4e6' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>خصومات الشهر (-)</Text>
                          <InputNumber
                            min={0}
                            size="small"
                            style={{ width: '100%', marginTop: 2 }}
                            placeholder="0"
                            value={deductionsAmount}
                            onChange={(val) => setDeductionsAmount(val || 0)}
                            precision={2}
                          />
                          <Input
                            size="small"
                            placeholder="سبب الخصم..."
                            value={deductionReason}
                            onChange={(e) => setDeductionReason(e.target.value)}
                            style={{ marginTop: 4, fontSize: 10 }}
                          />
                        </div>
                      </Col>

                      {/* Bonus / Additions Input */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #dcfce7' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>حوافز / إضافي (+)</Text>
                          <InputNumber
                            min={0}
                            size="small"
                            style={{ width: '100%', marginTop: 2 }}
                            placeholder="0"
                            value={bonusAmount}
                            onChange={(val) => setBonusAmount(val || 0)}
                            precision={2}
                          />
                          <Input
                            size="small"
                            placeholder="سبب الحافز..."
                            value={bonusReason}
                            onChange={(e) => setBonusReason(e.target.value)}
                            style={{ marginTop: 4, fontSize: 10 }}
                          />
                        </div>
                      </Col>
                    </Row>

                    {/* Calculated Net Salary Highlight Bar */}
                    {(() => {
                      const baseSal = parseFloat(employeeSummary.base_salary || 0);
                      const adv = parseFloat(employeeSummary.advances_total || 0);
                      const ded = parseFloat(deductionsAmount || 0);
                      const bns = parseFloat(bonusAmount || 0);
                      const net = Math.round((baseSal - adv - ded + bns) * 100) / 100;
                      const avail = getChannelAvailable(payrollChannel);
                      const canAfford = net > 0 && net <= avail;

                      return (
                        <div>
                          <div style={{
                            padding: '10px 14px',
                            background: net > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
                            borderRadius: 8,
                            border: `1px solid ${net > 0 ? '#86efac' : '#e2e8f0'}`,
                            marginBottom: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8
                          }}>
                            <div>
                              <Text strong style={{ fontSize: 13, color: '#166534' }}>الصافي المستحق للصرف:</Text>
                              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#15803d', fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, -apple-system, monospace' }}>
                                {net > 0 ? fmtMoney(net) : fmtMoney(0)}
                              </div>
                              <Text type="secondary" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                                [أساسي {fmtMoney(baseSal)} - سلف {fmtMoney(adv)} - خصم {fmtMoney(ded)} + حوافز {fmtMoney(bns)}]
                              </Text>
                            </div>

                            {/* Channel Selector */}
                            <div>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                                قناة الصرف من الخزينة:
                              </Text>
                              <Radio.Group
                                size="small"
                                value={payrollChannel}
                                onChange={(e) => setPayrollChannel(e.target.value)}
                              >
                                <Radio.Button value="cash"><Space size={4}><Banknote size={13} /><span>كاش</span></Space></Radio.Button>
                                <Radio.Button value="visa"><Space size={4}><CreditCard size={13} /><span>فيزا</span></Space></Radio.Button>
                                <Radio.Button value="transfer"><Space size={4}><Smartphone size={13} /><span>تحويل</span></Space></Radio.Button>
                              </Radio.Group>
                              <div style={{ fontSize: 11, marginTop: 4, color: avail >= net ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                                المتاح بالخزينة: {fmtMoney(avail)}
                              </div>
                            </div>
                          </div>

                          {/* Notes & Disburse Button */}
                          <Row gutter={8} align="middle">
                            <Col xs={24} sm={14}>
                              <Input
                                placeholder="ملاحظات الصرف (اختياري)..."
                                value={payrollNotes}
                                onChange={(e) => setPayrollNotes(e.target.value)}
                                size="middle"
                              />
                            </Col>
                            <Col xs={24} sm={10}>
                              <Popconfirm
                                title={`تأكيد صرف راتب ${employeeSummary.employee.full_name} لشهر ${payrollMonth} بمبلغ ${fmtMoney(net)}؟`}
                                description="سيتم خصم المبلغ من الخزينة المركزية وقيده باليومية الإدارية فوراً."
                                okText="تأكيد الصرف"
                                cancelText="إلغاء"
                                okType="primary"
                                onConfirm={handlePaySalary}
                                disabled={net <= 0 || !canAfford || submittingPayroll}
                              >
                                <Button
                                  type="primary"
                                  block
                                  size="middle"
                                  icon={<DollarCircleOutlined />}
                                  loading={submittingPayroll}
                                  disabled={net <= 0 || !canAfford}
                                  style={{
                                    backgroundColor: canAfford ? '#16a34a' : undefined,
                                    borderColor: canAfford ? '#16a34a' : undefined
                                  }}
                                >
                                  صرف الراتب وخصم من الخزينة
                                </Button>
                              </Popconfirm>
                            </Col>
                          </Row>

                          {!canAfford && net > 0 && (
                            <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4, textAlign: 'center' }}>
                              رصيد الخزينة في هذه القناة ({avail.toLocaleString()} ج.م) لا يكفي لصرف المبلغ المستحق ({net.toLocaleString()} ج.م)
                            </Text>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Pending Alerts */}
          {(kpis?.pending_count || 0) > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              message={`${kpis.pending_count} طلب تحويل نقدية من الفروع في انتظار تأكيدك`}
              description={`إجمالي المبالغ المعلقة: ${parseFloat(kpis.total_pending_amount || 0).toLocaleString()} ج.م`}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {/* Tabbed Views */}
          <Tabs
            defaultActiveKey="transfers"
            type="card"
            items={[
              {
                key: 'analytics',
                label: (
                  <Space>
                    <PieChartOutlined style={{ color: '#0284c7' }} />
                    <span>التحليلات والرسوم البيانية (Analytics)</span>
                  </Space>
                ),
                children: (
                  <Card style={{ borderRadius: 10 }}>
                    {loadingAnalytics ? (
                      <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
                    ) : (
                      <Row gutter={[16, 16]}>
                        {/* Option 2: Horizontal Ranked Bar Chart: Expenses by Category */}
                        <Col xs={24} lg={12}>
                          <Card
                            size="small"
                            title={
                              <Space>
                                <BarChartOutlined style={{ color: '#ea580c' }} />
                                <Text strong>توزيع المصروفات حسب البند (آخر 30 يوماً)</Text>
                              </Space>
                            }
                            extra={
                              totalExpenseBreakdown > 0 ? (
                                <Tag color="volcano" style={{ fontWeight: 800, fontSize: 12, padding: '2px 8px', borderRadius: 6, fontVariantNumeric: 'tabular-nums' }}>
                                  الإجمالي: {fmtMoney(totalExpenseBreakdown)}
                                </Tag>
                              ) : null
                            }
                            style={{ borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column' }}
                            styles={{ body: { flex: 1, padding: '14px 16px', overflowY: 'auto', maxHeight: 310 } }}
                          >
                            {(!rankedExpenses || rankedExpenses.length === 0) ? (
                              <Empty description="لا توجد مصروفات مسجلة خلال آخر 30 يوماً" />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {rankedExpenses.map((item, idx) => (
                                  <div
                                    key={`exp-${idx}`}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: 8,
                                      background: '#f8fafc',
                                      border: '1px solid #e2e8f0',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                      <Space size={6} wrap>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.theme.fill }} />
                                        <Text strong style={{ fontSize: 13, color: '#1e293b' }}>
                                          {item.name}
                                        </Text>
                                        <Tag style={{ fontSize: 11, padding: '0 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', border: 'none', fontVariantNumeric: 'tabular-nums' }}>
                                          {fmtNum(item.count, 0)} {item.count === 1 ? 'حركة' : 'حركات'}
                                        </Tag>
                                      </Space>
                                      <Space size={8}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                          {fmtMoney(item.amount)}
                                        </span>
                                        <Tag color={item.theme.tagColor} style={{ fontWeight: 700, fontSize: 11.5, minWidth: 46, textAlign: 'center', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                                          {item.percentFormatted}%
                                        </Tag>
                                      </Space>
                                    </div>
                                    <Progress
                                      percent={Math.max(item.percent, 0.8)}
                                      strokeColor={item.theme.fill}
                                      trailColor="#e2e8f0"
                                      showInfo={false}
                                      size="small"
                                      style={{ margin: 0 }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>
                        </Col>

                        {/* Bar Chart: Daily Inflow vs Outflow */}
                        <Col xs={24} lg={12}>
                          <Card
                            size="small"
                            title={<Space><BarChartOutlined style={{ color: '#16a34a' }} /><Text strong>حركة التدفق النقدي اليومي (الوارد والمنصرف)</Text></Space>}
                            style={{ borderRadius: 8, height: '100%' }}
                          >
                            {(!analyticsData?.dailyTrend || analyticsData.dailyTrend.length === 0) ? (
                              <Empty description="لا توجد حركات مسجلة خلال الفترة" />
                            ) : (
                              <div style={{ width: '100%', height: 280 }}>
                                <ResponsiveContainer>
                                  <BarChart data={analyticsData.dailyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <RechartsTooltip formatter={(val) => fmtMoney(val)} />
                                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                                    <Bar dataKey="inflows" name="الوارد (+)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="outflows" name="المنصرف (-)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </Card>
                        </Col>

                        {/* Channel Liquidity Progress Distribution */}
                        <Col xs={24}>
                          <Card size="small" title={<Text strong>توزيع السيولة الحية حسب القنوات</Text>} style={{ borderRadius: 8 }}>
                            {/* Visual Multi-Segment Distribution Bar */}
                            <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 14, background: '#e2e8f0' }}>
                              {analyticsData?.channelDistribution?.map(c => (
                                <div
                                  key={c.key}
                                  style={{
                                    width: `${c.percent}%`,
                                    background: c.color,
                                    transition: 'width 0.4s ease'
                                  }}
                                  title={`${c.name}: ${c.percent}% (${fmtMoney(c.value)})`}
                                />
                              ))}
                            </div>

                            <Row gutter={[16, 12]}>
                              {analyticsData?.channelDistribution?.map(c => (
                                <Col xs={24} sm={8} key={c.key}>
                                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text strong style={{ color: c.color }}>{c.name}</Text>
                                      <Tag color={c.key === 'cash' ? 'green' : c.key === 'visa' ? 'blue' : 'purple'}>{c.percent}%</Tag>
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 'bold', color: c.color, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                                      {fmtMoney(c.value)}
                                    </div>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </Card>
                        </Col>
                      </Row>
                    )}
                  </Card>
                )
              },
              {
                key: 'transfers',
                label: (
                  <Space>
                    <SwapOutlined />
                    <span>تحويلات الفروع للخزينة</span>
                    <Badge count={pendingCount} showZero style={{ backgroundColor: pendingCount > 0 ? '#f59e0b' : '#94a3b8' }} />
                  </Space>
                ),
                children: (
                  <Card
                    style={{ borderRadius: 10 }}
                    extra={
                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 170 }}
                        size="small"
                      >
                        <Option value="pending"><Space size={6}><Clock size={13} style={{ verticalAlign: 'middle' }} /><span>المعلقة فقط</span></Space></Option>
                        <Option value="completed"><Space size={6}><CheckCircle2 size={13} style={{ verticalAlign: 'middle' }} /><span>المؤكدة فقط</span></Space></Option>
                        <Option value="cancelled"><Space size={6}><XCircle size={13} style={{ verticalAlign: 'middle' }} /><span>الملغية فقط</span></Space></Option>
                        <Option value="all"><Space size={6}><ClipboardList size={13} style={{ verticalAlign: 'middle' }} /><span>الكل</span></Space></Option>
                      </Select>
                    }
                  >
                    {transfers.length === 0 ? (
                      <Empty description={
                        statusFilter === 'pending'
                          ? 'لا توجد طلبات معلقة حالياً'
                          : 'لا توجد طلبات بهذه الحالة'
                      } />
                    ) : (
                      <Table
                        className="swm-separated-table"
                        dataSource={transfers}
                        columns={transferColumns}
                        rowKey="id"
                        loading={loading}
                        size="middle"
                        scroll={{ x: 900 }}
                        pagination={{ pageSize: 15 }}
                        rowClassName={(record) => record.status === 'pending' ? 'ant-table-row-highlight' : ''}
                      />
                    )}
                  </Card>
                )
              },
              {
                key: 'ownerLedger',
                label: (
                  <Space>
                    <CrownOutlined style={{ color: '#d97706' }} />
                    <span>سجل حركات صاحب المنشأة</span>
                  </Space>
                ),
                children: (
                  <Card style={{ borderRadius: 10 }}>
                    {(!ownerData?.transactions || ownerData.transactions.length === 0) ? (
                      <Empty description="لا توجد حركات مسجلة لحساب صاحب المنشأة حتى الآن" />
                    ) : (
                      <Table
                        className="swm-separated-table"
                        dataSource={ownerData.transactions}
                        columns={ownerLedgerColumns}
                        rowKey="id"
                        size="middle"
                        scroll={{ x: 800 }}
                        pagination={{ pageSize: 15 }}
                      />
                    )}
                  </Card>
                )
              },
              {
                key: 'hqAudit',
                label: (
                  <Space>
                    <HistoryOutlined />
                    <span>سجل حركات الخزينة المركزية (Audit Log)</span>
                  </Space>
                ),
                children: (
                  <Card style={{ borderRadius: 10 }}>
                    {/* Search & Filter Bar with Excel Export */}
                    <div style={{
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      marginBottom: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <Space size={8} wrap>
                        <Input
                          placeholder="بحث برقم القيد أو البيان أو المسؤول..."
                          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          onPressEnter={fetchHqLedger}
                          style={{ width: 230 }}
                          allowClear
                        />
                        <Select
                          value={ledgerType}
                          onChange={(val) => { setLedgerType(val); }}
                          style={{ width: 150 }}
                        >
                          <Option value="all">كل الحركات</Option>
                          <Option value="inflow">واردات للخزينة (+)</Option>
                          <Option value="outflow">منصرفات وخارج (-)</Option>
                          <Option value="transfer">تحويل بين القنوات (⇄)</Option>
                        </Select>
                        <Select
                          value={ledgerChannel}
                          onChange={(val) => { setLedgerChannel(val); }}
                          style={{ width: 140 }}
                        >
                          <Option value="all">جميع القنوات</Option>
                          <Option value="cash">كاش (نقدي)</Option>
                          <Option value="visa">بنكي / فيزا</Option>
                          <Option value="transfer">تحويل / محفظة</Option>
                        </Select>
                        <RangePicker
                          value={ledgerDateRange}
                          onChange={(val) => setLedgerDateRange(val)}
                          format="YYYY-MM-DD"
                          placeholder={['من تاريخ', 'إلى تاريخ']}
                          style={{ width: 220 }}
                        />
                        <Button
                          type="primary"
                          icon={<FilterOutlined />}
                          onClick={fetchHqLedger}
                          loading={ledgerLoading}
                        >
                          تصفية
                        </Button>
                        {(ledgerSearch || ledgerType !== 'all' || ledgerChannel !== 'all' || ledgerDateRange) && (
                          <Button
                            onClick={() => {
                              setLedgerSearch('');
                              setLedgerType('all');
                              setLedgerChannel('all');
                              setLedgerDateRange(null);
                              api.get('/api/swm/treasury/main-safe-ledger', { params: { limit: 300 } }).then(res => {
                                if (res.data.success) setHqLedger(res.data.data || []);
                              });
                            }}
                          >
                            إلغاء الفلاتر
                          </Button>
                        )}
                      </Space>

                      <Space>
                        <Button
                          type="primary"
                          icon={<FileExcelOutlined />}
                          style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
                          onClick={exportLedgerToExcel}
                        >
                          تصدير إلى Excel
                        </Button>
                      </Space>
                    </div>

                    {hqLedger.length === 0 ? (
                      <Empty description="لا توجد قيود مسجلة مطابقة للفلاتر بالخزينة المركزية" />
                    ) : (
                      <Table
                        className="swm-separated-table"
                        dataSource={hqLedger}
                        columns={hqLedgerColumns}
                        rowKey="id"
                        loading={ledgerLoading}
                        size="middle"
                        scroll={{ x: 950 }}
                        pagination={{ pageSize: 20 }}
                      />
                    )}
                  </Card>
                )
              },
              {
                key: 'payrollLedger',
                label: (
                  <Space>
                    <PayCircleOutlined style={{ color: '#16a34a' }} />
                    <span>سجل صرف الرواتب</span>
                    <Badge count={payrollHistory.length} style={{ backgroundColor: '#10b981' }} />
                  </Space>
                ),
                children: (
                  <Card style={{ borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Text type="secondary">
                        سجل معتمد لكافة أذونات صرف الرواتب المصروفة من الخزينة المركزية والمقيدة باليومية الإدارية
                      </Text>
                      <Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<TeamOutlined />}
                          className="swm-btn-emerald"
                          style={{ fontWeight: 700 }}
                          onClick={() => {
                            setBulkMonth(payrollMonth);
                            fetchBulkPreview(payrollMonth);
                            setBulkPayrollVisible(true);
                          }}
                        >
                          صرف مسير الرواتب المجمع
                        </Button>
                        <Button size="small" icon={<ReloadOutlined />} onClick={fetchPayrollHistory} loading={loadingPayrollHistory}>
                          تحديث
                        </Button>
                      </Space>
                    </div>
                    {payrollHistory.length === 0 ? (
                      <Empty description="لا توجد أذونات صرف رواتب مسجلة حتى الآن" />
                    ) : (
                      <Table
                        className="swm-separated-table"
                        dataSource={payrollHistory}
                        columns={payrollColumns}
                        rowKey="id"
                        size="middle"
                        scroll={{ x: 1000 }}
                        pagination={{ pageSize: 15 }}
                      />
                    )}
                  </Card>
                )
              },
              {
                key: 'branches',
                label: (
                  <Space>
                    <ShopOutlined />
                    <span>خزائن الفروع الفرعية</span>
                  </Space>
                ),
                children: (
                  <Row gutter={[12, 12]}>
                    {kpis?.branch_summary?.map(branch => (
                      <Col xs={24} sm={12} md={8} key={branch.branch_id}>
                        <Card
                          size="small"
                          style={{ borderRadius: 10, border: branch.pending_count > 0 ? '1px solid #f59e0b' : undefined }}
                          title={
                            <Space>
                              <ShopOutlined style={{ color: '#4f46e5' }} />
                              <Text strong style={{ fontSize: 13 }}>{branch.branch_name}</Text>
                              {branch.pending_count > 0 && (
                                <Badge count={branch.pending_count} style={{ backgroundColor: '#f59e0b' }} />
                              )}
                            </Space>
                          }
                        >
                          <Row gutter={8}>
                            <Col span={12}>
                              <Text type="secondary" style={{ fontSize: 11 }}>رصيد الخزنة</Text>
                              <div>
                                <Text strong style={{ color: '#4f46e5', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtMoney(branch.current_balance || 0)}
                                </Text>
                              </div>
                            </Col>
                            <Col span={12}>
                              <Text type="secondary" style={{ fontSize: 11 }}>إجمالي ما أرسله</Text>
                              <div>
                                <Text strong style={{ color: '#16a34a', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtMoney(branch.total_sent || 0)}
                                </Text>
                              </div>
                            </Col>
                          </Row>
                          <Divider style={{ margin: '8px 0' }} />
                          <Space>
                            <Tag color={branch.register_status === 'open' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                              {branch.register_status === 'open' ? 'مفتوح' : 'مغلق'}
                            </Tag>
                            {branch.pending_count > 0 && (
                              <Tag color="orange" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(branch.pending_count, 0)} طلب معلق</Tag>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )
              }
            ]}
          />
        </>
      )}

      {/* Owner Transaction Modal (Deposit / Withdrawal) */}
      <Modal
        title={
          <Space>
            {ownerTxType === 'deposit' ? (
              <PlusCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
            ) : (
              <MinusCircleOutlined style={{ color: '#dc2626', fontSize: 18 }} />
            )}
            <span style={{ fontWeight: 'bold' }}>
              {ownerTxType === 'deposit'
                ? 'إيداع رأس مال / تمويل من صاحب الحساب (+)'
                : 'مسحوبات شخصية / توزيعات أرباح لصاحب الحساب (-)'}
            </span>
          </Space>
        }
        open={ownerModalVisible}
        onCancel={() => setOwnerModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            type={ownerTxType === 'deposit' ? 'info' : 'warning'}
            showIcon
            message={
              ownerTxType === 'deposit'
                ? 'سيتم زيادة رصيد الخزينة الرئيسية في القناة المختارة، وقيد المبلغ لصالح صاحب المنشأة.'
                : 'سيتم خصم المبلغ من رصيد الخزينة الرئيسية في القناة المختارة، ولا يمكن سحب أكثر من الرصيد المتوفر في القناة.'
            }
          />
        </div>

        <Form form={ownerForm} layout="vertical" onFinish={handleOwnerSubmit}>
          <Form.Item
            name="channel"
            label="القناة المالية"
            rules={[{ required: true, message: 'يرجى اختيار القناة المالية' }]}
            initialValue="cash"
          >
            <Radio.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <Radio.Button value="cash" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><Banknote size={13} /><span>كاش (نقدي)</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="visa" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><CreditCard size={13} /><span>فيزا / بنك</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="transfer" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><Smartphone size={13} /><span>تحويل / محفظة</span></Space>
                  </Radio.Button>
                </Col>
              </Row>
            </Radio.Group>
          </Form.Item>

          {/* Available balance indicator for withdrawal */}
          {ownerTxType === 'withdrawal' && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>الرصيد المتاح حالياً في هذه القناة:</Text>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: getChannelAvailable(selectedChannel) > 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                {fmtMoney(getChannelAvailable(selectedChannel))}
              </div>
            </div>
          )}

          <Form.Item
            name="amount"
            label="المبلغ المطلوب"
            rules={[
              { required: true, message: 'يرجى إدخال المبلغ' },
              {
                validator: (_, val) => {
                  if (!val || val <= 0) return Promise.reject('المبلغ يجب أن يكون أكبر من صفر');
                  if (ownerTxType === 'withdrawal') {
                    const avail = getChannelAvailable(selectedChannel);
                    if (val > avail + 0.01) {
                      return Promise.reject(`المبلغ يتجاوز الرصيد المتاح في هذه القناة (${fmtMoney(avail)})`);
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              placeholder="0.00"
              precision={2}
              addonAfter="ج.م"
            />
          </Form.Item>

          <Form.Item name="notes" label="البيان / الملاحظات">
            <Input.TextArea
              rows={2}
              placeholder={ownerTxType === 'deposit' ? 'مثال: تمويل سيولة من صاحب الحساب' : 'مثال: مسحوبات شخصية لصاحب الحساب'}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setOwnerModalVisible(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingOwnerTx}
              style={{
                backgroundColor: ownerTxType === 'deposit' ? '#16a34a' : '#dc2626',
                borderColor: ownerTxType === 'deposit' ? '#16a34a' : '#dc2626'
              }}
            >
              {ownerTxType === 'deposit' ? 'تأكيد الإيداع' : 'تأكيد السحب'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Internal Channel Transfer Modal (تحويل بين القنوات) */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
            <span style={{ fontWeight: 'bold' }}>تحويل أموال بين القنوات المالية للخزينة</span>
          </Space>
        }
        open={channelTransferVisible}
        onCancel={() => setChannelTransferVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          message="التحويل الداخلي يتيح نقل السيولة بين الكاش والبنك والمحافظ دون التأثير على إجمالي رصيد الخزينة."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form
          form={channelTransferForm}
          layout="vertical"
          onFinish={handleChannelTransferSubmit}
          initialValues={{ from_channel: 'cash', to_channel: 'visa' }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="from_channel"
                label="تحويل من قناة (المصدر):"
                rules={[{ required: true, message: 'اختر القناة المصدر' }]}
              >
                <Select size="middle">
                  <Option value="cash">كاش ({fmtMoney(getChannelAvailable('cash'))})</Option>
                  <Option value="visa">بنكي / فيزا ({fmtMoney(getChannelAvailable('visa'))})</Option>
                  <Option value="transfer">محفظة / تحويل ({fmtMoney(getChannelAvailable('transfer'))})</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="to_channel"
                label="تحويل إلى قناة (الهدف):"
                rules={[
                  { required: true, message: 'اختر القناة الهدف' },
                  ({ getFieldValue }) => ({
                    validator(_, val) {
                      if (val && val === getFieldValue('from_channel')) {
                        return Promise.reject('لا يمكن التحويل إلى نفس القناة');
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Select size="middle">
                  <Option value="cash">كاش (نقدي)</Option>
                  <Option value="visa">حساب بنكي / فيزا</Option>
                  <Option value="transfer">محفظة / إنستاباي</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>الرصيد المتاح بالقناة المحول منها:</Text>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: getChannelAvailable(transferFromChannel) > 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
              {fmtMoney(getChannelAvailable(transferFromChannel))}
            </div>
          </div>

          <Form.Item
            name="amount"
            label="المبلغ المراد تحويله"
            rules={[
              { required: true, message: 'يرجى إدخال المبلغ' },
              {
                validator: (_, val) => {
                  if (!val || val <= 0) return Promise.reject('المبلغ يجب أن يكون أكبر من صفر');
                  const avail = getChannelAvailable(transferFromChannel);
                  if (val > avail + 0.01) {
                    return Promise.reject(`المبلغ يتجاوز الرصيد المتاح (${fmtMoney(avail)})`);
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              placeholder="0.00"
              precision={2}
              addonAfter="ج.م"
            />
          </Form.Item>

          <Form.Item name="notes" label="البيان / سبب التحويل (اختياري)">
            <Input.TextArea
              rows={2}
              placeholder="مثال: توريد نقدية من الخزينة إلى الحساب البنكي..."
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setChannelTransferVisible(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingChannelTransfer}
              style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', fontWeight: 700 }}
            >
              تأكيد التحويل
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Bulk Payroll Payout Modal (صرف مسير الرواتب المجمع) */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <TeamOutlined style={{ color: '#16a34a', fontSize: 20 }} />
              <span style={{ fontWeight: 'bold' }}>صرف مسير الرواتب المجمع - شهر {bulkMonth}</span>
            </Space>
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>اختر الشهر:</Text>
              <DatePicker
                picker="month"
                size="small"
                value={dayjs(bulkMonth, 'YYYY-MM')}
                format="YYYY-MM"
                allowClear={false}
                onChange={(d) => {
                  if (d) {
                    const m = d.format('YYYY-MM');
                    setBulkMonth(m);
                    fetchBulkPreview(m);
                  }
                }}
                style={{ width: 110 }}
              />
            </Space>
          </div>
        }
        open={bulkPayrollVisible}
        onCancel={() => setBulkPayrollVisible(false)}
        width={960}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: 14 }}>
          {/* Channel selector & summary */}
          <div style={{
            background: '#f8fafc',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>قناة الصرف من الخزينة:</Text>
              <Radio.Group
                value={bulkChannel}
                onChange={(e) => setBulkChannel(e.target.value)}
              >
                <Radio.Button value="cash"><Space size={4}><Banknote size={13} /><span>كاش ({fmtMoney(getChannelAvailable('cash'))})</span></Space></Radio.Button>
                <Radio.Button value="visa"><Space size={4}><CreditCard size={13} /><span>فيزا ({fmtMoney(getChannelAvailable('visa'))})</span></Space></Radio.Button>
                <Radio.Button value="transfer"><Space size={4}><Smartphone size={13} /><span>تحويل ({fmtMoney(getChannelAvailable('transfer'))})</span></Space></Radio.Button>
              </Radio.Group>
            </div>

            {(() => {
              const selectedEmps = bulkEmployees.filter(e => selectedEmpKeys.includes(e.employee_id));
              const totalNet = selectedEmps.reduce((sum, e) => sum + (e.calcNet || 0), 0);
              const avail = getChannelAvailable(bulkChannel);
              const canAfford = totalNet > 0 && totalNet <= avail;
              return (
                <div style={{ textAlign: 'left' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>المحدد: {fmtNum(selectedEmps.length, 0)} موظف | إجمالي المطلوب:</Text>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: canAfford ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(totalNet)}
                  </div>
                  {!canAfford && totalNet > 0 && (
                    <Text type="danger" style={{ fontSize: 11 }}>الرصيد المتاح بالقناة ({fmtMoney(avail)}) لا يكفي!</Text>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <Table
          dataSource={bulkEmployees}
          rowKey="employee_id"
          size="small"
          loading={loadingBulkPreview}
          pagination={false}
          scroll={{ y: 320 }}
          rowSelection={{
            selectedRowKeys: selectedEmpKeys,
            onChange: (keys) => setSelectedEmpKeys(keys),
            getCheckboxProps: (record) => ({
              disabled: record.already_paid || record.calcNet <= 0
            })
          }}
          columns={[
            {
              title: 'الموظف والفرع',
              key: 'employee',
              render: (_, rec) => (
                <div>
                  <Text strong>{rec.full_name}</Text>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{rec.branch_name}</div>
                  {rec.already_paid && <Tag color="orange" style={{ fontSize: 10, marginTop: 2 }}>تم الصرف مسبقاً</Tag>}
                </div>
              )
            },
            {
              title: 'الأساسي',
              dataIndex: 'base_salary',
              key: 'base_salary',
              render: v => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(v)}</span>
            },
            {
              title: 'السلف المستقطعة',
              dataIndex: 'advances_total',
              key: 'advances_total',
              render: v => parseFloat(v) > 0 ? <Text type="danger" style={{ fontVariantNumeric: 'tabular-nums' }}>-{fmtMoney(v)}</Text> : '—'
            },
            {
              title: 'خصم إضافي',
              key: 'deductions',
              width: 100,
              render: (_, rec) => (
                <InputNumber
                  size="small"
                  min={0}
                  value={rec.deductions}
                  onChange={(val) => {
                    const ded = val || 0;
                    setBulkEmployees(prev => prev.map(e => {
                      if (e.employee_id === rec.employee_id) {
                        const newNet = Math.max(0, Math.round((e.base_salary - e.advances_total - ded + (e.bonus || 0)) * 100) / 100);
                        return { ...e, deductions: ded, calcNet: newNet };
                      }
                      return e;
                    }));
                  }}
                  style={{ width: '100%' }}
                  disabled={rec.already_paid}
                />
              )
            },
            {
              title: 'حافز إضافي',
              key: 'bonus',
              width: 100,
              render: (_, rec) => (
                <InputNumber
                  size="small"
                  min={0}
                  value={rec.bonus}
                  onChange={(val) => {
                    const bns = val || 0;
                    setBulkEmployees(prev => prev.map(e => {
                      if (e.employee_id === rec.employee_id) {
                        const newNet = Math.max(0, Math.round((e.base_salary - e.advances_total - (e.deductions || 0) + bns) * 100) / 100);
                        return { ...e, bonus: bns, calcNet: newNet };
                      }
                      return e;
                    }));
                  }}
                  style={{ width: '100%' }}
                  disabled={rec.already_paid}
                />
              )
            },
            {
              title: 'صافي الراتب المستحق',
              key: 'calcNet',
              render: (_, rec) => (
                <Text strong style={{ color: rec.calcNet > 0 ? '#16a34a' : '#94a3b8', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
                  {fmtMoney(rec.calcNet)}
                </Text>
              )
            }
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Space>
            <Button
              size="small"
              onClick={() => {
                const unpaid = bulkEmployees.filter(e => !e.already_paid && e.calcNet > 0).map(e => e.employee_id);
                setSelectedEmpKeys(unpaid);
              }}
            >
              تحديد غير المصروف ({fmtNum(bulkEmployees.filter(e => !e.already_paid && e.calcNet > 0).length, 0)})
            </Button>
            <Button size="small" onClick={() => setSelectedEmpKeys([])}>إلغاء التحديد</Button>
          </Space>

          <Space>
            <Button onClick={() => setBulkPayrollVisible(false)}>إلغاء</Button>
            {(() => {
              const selectedEmps = bulkEmployees.filter(e => selectedEmpKeys.includes(e.employee_id));
              const totalNet = selectedEmps.reduce((sum, e) => sum + (e.calcNet || 0), 0);
              const avail = getChannelAvailable(bulkChannel);
              const canAfford = totalNet > 0 && totalNet <= avail && selectedEmps.length > 0;
              return (
                <Popconfirm
                  title={`تأكيد صرف رواتب (${fmtNum(selectedEmps.length, 0)}) موظف بإجمالي مبلغ (${fmtMoney(totalNet)})؟`}
                  description="سيتم خصم المبلغ بالكامل من الخزينة وقيده باليومية الإدارية فوراً."
                  okText="تأكيد الصرف المجمع"
                  cancelText="تراجع"
                  okType="primary"
                  onConfirm={handleBulkPaySubmit}
                  disabled={!canAfford || submittingBulkPayroll}
                >
                  <Button
                    type="primary"
                    loading={submittingBulkPayroll}
                    disabled={!canAfford}
                    className="swm-btn-emerald"
                    style={{ fontWeight: 700 }}
                  >
                    تأكيد صرف الرواتب المحددة ({fmtMoney(totalNet)})
                  </Button>
                </Popconfirm>
              );
            })()}
          </Space>
        </div>
      </Modal>

      {/* Transfer Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#4f46e5' }} />
            <span>تفاصيل طلب التحويل</span>
            {detailRecord && <Text code style={{ fontSize: 12 }}>{detailRecord.transfer_ref}</Text>}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          detailRecord?.status === 'pending' ? (
            <Space>
              <Popconfirm
                title={`تأكيد استلام ${fmtMoney(detailRecord?.amount || 0)}؟`}
                okText="تأكيد" cancelText="إلغاء"
                onConfirm={() => { handleConfirm(detailRecord.id); setDetailVisible(false); }}
              >
                <Button type="primary" icon={<CheckCircleOutlined />} className="swm-btn-emerald">
                  تأكيد الاستلام
                </Button>
              </Popconfirm>
              {canDelete(currentUser) && (
                <Popconfirm
                  title="رفض وإرجاع المبلغ للفرع؟"
                  okText="رفض" cancelText="إلغاء" okType="danger"
                  onConfirm={() => { handleCancel(detailRecord.id); setDetailVisible(false); }}
                >
                  <Button danger icon={<CloseCircleOutlined />}>رفض الطلب</Button>
                </Popconfirm>
              )}
            </Space>
          ) : (
            <Button onClick={() => setDetailVisible(false)}>إغلاق</Button>
          )
        }
        width={540}
      >
        {detailRecord && (
          <div style={{ lineHeight: 2 }}>
            <Row gutter={[16, 12]}>
              <Col span={12}><Text type="secondary">الفرع المُرسِل:</Text><br /><Text strong>{detailRecord.from_branch_name}</Text></Col>
              <Col span={12}><Text type="secondary">المبلغ الإجمالي:</Text><br /><Text strong style={{ color: '#16a34a', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(detailRecord.amount)}</Text></Col>
              <Col span={12}><Text type="secondary">طريقة التحويل:</Text><br /><Tag color="blue">{detailRecord.transfer_method === 'bank_transfer' ? <Space size={4}><Building2 size={12} /><span>بنكي</span></Space> : <Space size={4}><Banknote size={12} /><span>نقدي</span></Space>}</Tag></Col>
              <Col span={12}><Text type="secondary">الحالة:</Text><br /><Tag color={STATUS_MAP[detailRecord.status]?.color}>{STATUS_MAP[detailRecord.status]?.label}</Tag></Col>
              {detailRecord.reference_no && (
                <Col span={24}><Text type="secondary">رقم المرجع:</Text><br /><Text code>{detailRecord.reference_no}</Text></Col>
              )}
              <Col span={12}><Text type="secondary">طُلب بواسطة:</Text><br /><Text>{detailRecord.requested_by_name || detailRecord.requested_by_username}</Text></Col>
              <Col span={12}><Text type="secondary">تاريخ الطلب:</Text><br /><Text style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(detailRecord.requested_at)}</Text></Col>
              {detailRecord.confirmed_by_name && (
                <Col span={12}><Text type="secondary">أُكد بواسطة:</Text><br /><Text>{detailRecord.confirmed_by_name}</Text></Col>
              )}
              {detailRecord.confirmed_at && (
                <Col span={12}><Text type="secondary">تاريخ التأكيد:</Text><br /><Text style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(detailRecord.confirmed_at)}</Text></Col>
              )}
              {detailRecord.notes && (
                <Col span={24}><Text type="secondary">الملاحظات وتفاصيل القنوات:</Text><br /><Text>{detailRecord.notes}</Text></Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      {/* Add Withdrawal Reason Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#d97706' }} />
            <span>إضافة بند / سبب مسحوبات جديد</span>
          </Space>
        }
        open={addReasonModalVisible}
        onCancel={() => setAddReasonModalVisible(false)}
        onOk={handleAddReason}
        confirmLoading={submittingNewReason}
        okText="إضافة البند"
        cancelText="إلغاء"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              قم بإدخال اسم السبب أو البند لتصنيف المسحوبات التشغيلية والمصروفات:
            </Text>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>اسم بند الصرف / السبب:</label>
            <Input
              placeholder="مثال: فواتير إنترنت وهاتف، بوفيه، نقل وتوصيل، صيانة..."
              value={newReasonTitle}
              onChange={(e) => setNewReasonTitle(e.target.value)}
              size="large"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>التصنيف المحاسبي:</label>
            <Select
              style={{ width: '100%' }}
              value={newReasonCategory}
              onChange={setNewReasonCategory}
              size="large"
            >
              <Option value="operational"><Space size={6}><Building2 size={13} style={{ verticalAlign: 'middle' }} /><span>تشغيلي وإداري عام</span></Space></Option>
              <Option value="utility_bill"><Space size={6}><Lightbulb size={13} style={{ verticalAlign: 'middle' }} /><span>فواتير ومرافق وإيجار</span></Space></Option>
              <Option value="owner_drawing"><Space size={6}><Crown size={13} style={{ verticalAlign: 'middle' }} /><span>مسحوبات شخصية / جاري المالك</span></Space></Option>
              <Option value="sales_withdrawal"><Space size={6}><Users size={13} style={{ verticalAlign: 'middle' }} /><span>سلف موظفين وبائعين</span></Space></Option>
              <Option value="other"><Space size={6}><Package size={13} style={{ verticalAlign: 'middle' }} /><span>نثرية ومصروفات أخرى</span></Space></Option>
            </Select>
          </div>
        </div>
      </Modal>

      {/* Quick Treasury Withdrawal Modal */}
      <Modal
        title={
          <Space>
            <MinusCircleOutlined style={{ color: '#d97706', fontSize: 18 }} />
            <span style={{ fontWeight: 'bold' }}>صرف مسحوبات من الخزينة الرئيسية</span>
          </Space>
        }
        open={quickWithdrawVisible}
        onCancel={() => setQuickWithdrawVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          message="سيتم خصم المبلغ مباشرة من الخزينة المركزية وقيد المصروف باليومية الإدارية."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form
          form={quickWithdrawForm}
          layout="vertical"
          onFinish={handleQuickWithdrawSubmit}
          initialValues={{ channel: 'cash', category: 'operational' }}
        >
          <Form.Item
            name="reason"
            label="سبب / بند الصرف"
            rules={[{ required: true, message: 'يرجى اختيار أو كتابة سبب الصرف' }]}
          >
            <Select
              showSearch
              placeholder="اختر أو ابحث عن سبب الصرف..."
              optionFilterProp="children"
            >
              {withdrawalReasons.map(r => (
                <Option key={r.id} value={r.title}>
                  <Space>
                    <Tag color={REASON_CATEGORY_MAP[r.category]?.color || 'default'} style={{ fontSize: 10 }}>
                      {REASON_CATEGORY_MAP[r.category]?.label || r.category}
                    </Tag>
                    <span>{r.title}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="channel"
            label="القناة المالية للخزينة"
            rules={[{ required: true, message: 'يرجى اختيار القناة' }]}
          >
            <Radio.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <Radio.Button value="cash" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><Banknote size={13} /><span>كاش ({fmtMoney(getChannelAvailable('cash'))})</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="visa" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><CreditCard size={13} /><span>فيزا ({fmtMoney(getChannelAvailable('visa'))})</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="transfer" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><Smartphone size={13} /><span>تحويل ({fmtMoney(getChannelAvailable('transfer'))})</span></Space>
                  </Radio.Button>
                </Col>
              </Row>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="amount"
            label="المبلغ المطلوب صرفه"
            rules={[
              { required: true, message: 'يرجى إدخال المبلغ' },
              {
                validator: (_, val) => {
                  if (!val || val <= 0) return Promise.reject('المبلغ يجب أن يكون أكبر من صفر');
                  const avail = getChannelAvailable(selectedQuickChannel);
                  if (val > avail + 0.01) {
                    return Promise.reject(`المبلغ يتجاوز الرصيد المتاح بالقناة (${fmtMoney(avail)})`);
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              placeholder="0.00"
              precision={2}
              addonAfter="ج.م"
            />
          </Form.Item>

          <Form.Item name="recipient_name" label="اسم المستلم (اختياري)">
            <Input placeholder="اسم الشخص أو الجهة المستلمة للمبلغ..." />
          </Form.Item>

          <Form.Item name="notes" label="بيان وملاحظات إضافية">
            <Input.TextArea rows={2} placeholder="تفاصيل إضافية عن سبب الصرف..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setQuickWithdrawVisible(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingQuickWithdraw}
              style={{ backgroundColor: '#EA580C', borderColor: '#EA580C', color: '#FFFFFF', fontWeight: 700 }}
            >
              تأكيد الصرف والخصم
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Employee Advances Breakdown Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: '#dc2626' }} />
            <span>تفاصيل السلف والمصاريف المسحوبة - {employeeSummary?.employee?.full_name}</span>
          </Space>
        }
        open={advancesModalVisible}
        onCancel={() => setAdvancesModalVisible(false)}
        footer={<Button onClick={() => setAdvancesModalVisible(false)}>إغلاق</Button>}
        width={650}
      >
        <div style={{ marginBottom: 12 }}>
          <Alert
            type="info"
            message={`إجمالي السلف والمصاريف المستقطعة لشهر ${payrollMonth}: ${fmtMoney(employeeSummary?.advances_total || 0)}`}
          />
        </div>
        <Table
          dataSource={employeeSummary?.advances_list || []}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'التاريخ',
              dataIndex: 'expense_date',
              key: 'expense_date',
              render: d => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDate(d)}</span>
            },
            {
              title: 'المبلغ',
              dataIndex: 'amount',
              key: 'amount',
              render: v => <Text strong style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(v)}</Text>
            },
            {
              title: 'البند',
              dataIndex: 'subcategory',
              key: 'subcategory',
              render: v => v || 'سلفة موظف'
            },
            {
              title: 'البيان',
              dataIndex: 'description',
              key: 'description',
              render: v => v || '—'
            }
          ]}
        />
      </Modal>
    </div>
  );
}
