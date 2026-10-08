import React, { useState, useEffect } from 'react';
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
  DatePicker
} from 'antd';
import {
  BankOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, ReloadOutlined, ShopOutlined,
  DollarCircleOutlined, ArrowDownOutlined, ArrowUpOutlined,
  TeamOutlined, EyeOutlined, WalletOutlined, CreditCardOutlined,
  MobileOutlined, CrownOutlined, PlusCircleOutlined, MinusCircleOutlined,
  HistoryOutlined, SwapOutlined, SearchOutlined, UserOutlined,
  PayCircleOutlined, FileTextOutlined, InfoCircleOutlined, PlusOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

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

export default function TreasuryAdmin() {
  const navigate = useNavigate();
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [kpiRes, trfRes, ownerRes, ledgerRes] = await Promise.all([
        api.get('/api/swm/treasury/kpis'),
        api.get('/api/swm/treasury/transfers', { params: { status: statusFilter, limit: 100 } }),
        api.get('/api/swm/treasury/owner-account'),
        api.get('/api/swm/treasury/main-safe-ledger')
      ]);

      if (kpiRes.data.success) setKpis(kpiRes.data.data);
      if (trfRes.data.success) setTransfers(trfRes.data.data || []);
      if (ownerRes.data.success) setOwnerData(ownerRes.data.data);
      if (ledgerRes.data.success) setHqLedger(ledgerRes.data.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
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

  // Available balance for currently selected channel in modal
  const getChannelAvailable = (ch) => {
    if (!kpis?.main_safe) return 0;
    if (ch === 'cash') return parseFloat(kpis.main_safe.cash_balance || 0);
    if (ch === 'visa') return parseFloat(kpis.main_safe.visa_balance || 0);
    if (ch === 'transfer') return parseFloat(kpis.main_safe.transfer_balance || 0);
    return 0;
  };

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
      render: v => `${parseFloat(v).toLocaleString()} ج.م`
    },
    {
      title: 'سلف مستقطعة',
      dataIndex: 'advances_deducted',
      key: 'advances_deducted',
      render: v => parseFloat(v) > 0 ? <Text type="danger">-{parseFloat(v).toLocaleString()} ج.م</Text> : '—'
    },
    {
      title: 'الخصومات',
      key: 'deductions',
      render: (_, rec) => parseFloat(rec.deductions) > 0 ? (
        <Tooltip title={rec.deduction_reason || 'بدون سبب مدخل'}>
          <Text type="danger">-{parseFloat(rec.deductions).toLocaleString()} ج.م</Text>
        </Tooltip>
      ) : '—'
    },
    {
      title: 'الحوافز والإضافي',
      key: 'bonus',
      render: (_, rec) => parseFloat(rec.bonus) > 0 ? (
        <Tooltip title={rec.bonus_reason || 'حافز إضافي'}>
          <Text style={{ color: '#16a34a' }}>+{parseFloat(rec.bonus).toLocaleString()} ج.م</Text>
        </Tooltip>
      ) : '—'
    },
    {
      title: 'الصافي المصروف',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: v => (
        <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
          {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
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
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
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
        <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
          {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
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
              {b.cash > 0 && <Tag color="green" icon={<Banknote size={11} />}>كاش: {parseFloat(b.cash).toLocaleString()}</Tag>}
              {b.visa > 0 && <Tag color="blue" icon={<CreditCard size={11} />}>فيزا: {parseFloat(b.visa).toLocaleString()}</Tag>}
              {(b.transfers > 0 || b.transfer > 0) && (
                <Tag color="purple" icon={<Smartphone size={11} />}>تحويل: {parseFloat(b.transfers || b.transfer).toLocaleString()}</Tag>
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
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
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
                title={`تأكيد استلام ${parseFloat(record.amount).toFixed(2)} ج.م من ${record.from_branch_name}؟`}
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
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
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
        <Text strong style={{ color: rec.transaction_type === 'deposit' ? '#16a34a' : '#dc2626', fontSize: 14 }}>
          {rec.transaction_type === 'deposit' ? '+' : '-'} {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
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
      title: 'التاريخ',
      dataIndex: 'created_at',
      key: 'created_at',
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
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
        const isOutflow = rec.destination_account && rec.destination_account !== 'main_warehouse_safe';
        return (
          <Text strong style={{ color: isOutflow ? '#dc2626' : '#16a34a', fontSize: 14 }}>
            {isOutflow ? '-' : '+'} {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </Text>
        );
      }
    },
    {
      title: 'الرصيد السابق',
      dataIndex: 'previous_safe_balance',
      key: 'previous_safe_balance',
      render: v => v !== null && v !== undefined ? `${parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م` : '—'
    },
    {
      title: 'الرصيد بعد الحركة',
      dataIndex: 'new_safe_balance',
      key: 'new_safe_balance',
      render: v => v !== null && v !== undefined ? (
        <Text strong style={{ color: '#4f46e5' }}>
          {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
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
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0F766E', marginTop: 6, fontFamily: 'monospace' }}>
                      {(kpis?.main_safe?.total_balance ?? (kpis?.main_register_balance || 0)).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
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
                    <div style={{ color: '#16A34A', fontSize: 22, fontWeight: 900, marginTop: 6, fontFamily: 'monospace' }}>
                      {(kpis?.main_safe?.cash_balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
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
                    <div style={{ color: '#0284C7', fontSize: 22, fontWeight: 900, marginTop: 6, fontFamily: 'monospace' }}>
                      {(kpis?.main_safe?.visa_balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
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
                    <div style={{ color: '#8B5CF6', fontSize: 22, fontWeight: 900, marginTop: 6, fontFamily: 'monospace' }}>
                      {(kpis?.main_safe?.transfer_balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
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
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#D97706', marginTop: 2, fontFamily: 'monospace' }}>
                      {(ownerData?.summary?.current_balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} <span style={{ fontSize: 14, fontWeight: 600 }}>ج.م</span>
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
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
                    + {(ownerData?.summary?.total_deposited || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B' }}>{ownerData?.summary?.deposit_count || 0} حركة إيداع</span>
                </div>
              </Col>

              <Col xs={12} md={4}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 11, color: '#991B1B', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}><ArrowUpRight size={13} /> إجمالي المسحوبات الشخصية</span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#DC2626', marginTop: 2 }}>
                    - {(ownerData?.summary?.total_withdrawn || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B' }}>{ownerData?.summary?.withdrawal_count || 0} حركة سحب</span>
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
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
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
                    <Space size={6}>
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
                        description={`آخر صرفية كانت بتاريخ: ${new Date(employeeSummary.previous_payouts[0]?.paid_at).toLocaleString('ar-EG')}`}
                        style={{ marginBottom: 12, borderRadius: 8 }}
                      />
                    )}

                    {/* Calculation Metrics Grid */}
                    <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                      {/* Base Salary */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>المرتب الأساسي</Text>
                          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginTop: 2 }}>
                            {parseFloat(employeeSummary.base_salary || 0).toLocaleString()} ج.م
                          </div>
                        </div>
                      </Col>

                      {/* Advances Taken */}
                      <Col xs={12} sm={6}>
                        <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>سلف ومصاريف الشهر</Text>
                          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#dc2626', marginTop: 2 }}>
                            - {parseFloat(employeeSummary.advances_total || 0).toLocaleString()} ج.م
                          </div>
                          {employeeSummary.advances_list?.length > 0 && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontSize: 10, color: '#dc2626' }}
                              onClick={() => setAdvancesModalVisible(true)}
                            >
                              ({employeeSummary.advances_list.length} حركة - عرض)
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
                              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#15803d' }}>
                                {net > 0 ? net.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : 0} ج.م
                              </div>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                [أساسي {baseSal.toLocaleString()} - سلف {adv.toLocaleString()} - خصم {ded.toLocaleString()} + حوافز {bns.toLocaleString()}]
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
                              <div style={{ fontSize: 11, marginTop: 4, color: avail >= net ? '#16a34a' : '#dc2626' }}>
                                المتاح بالخزينة: {avail.toLocaleString()} ج.م
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
                                title={`تأكيد صرف راتب ${employeeSummary.employee.full_name} لشهر ${payrollMonth} بمبلغ ${net.toLocaleString()} ج.م؟`}
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
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary">
                        سجل رقابي لكافة التدفقات النقدية الداخلة (تحويلات الفروع، مرتجعات المشتريات، إيداعات المالك) والخارجة (سداد الموردين، فواتير المشتريات، مسحوبات المالك)
                      </Text>
                    </div>
                    {hqLedger.length === 0 ? (
                      <Empty description="لا توجد قيود مسجلة بالخزينة المركزية" />
                    ) : (
                      <Table
                        className="swm-separated-table"
                        dataSource={hqLedger}
                        columns={hqLedgerColumns}
                        rowKey="id"
                        size="middle"
                        scroll={{ x: 900 }}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text type="secondary">
                        سجل معتمد لكافة أذونات صرف الرواتب المصروفة من الخزينة المركزية والمقيدة باليومية الإدارية
                      </Text>
                      <Button size="small" icon={<ReloadOutlined />} onClick={fetchPayrollHistory} loading={loadingPayrollHistory}>
                        تحديث
                      </Button>
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
                                <Text strong style={{ color: '#4f46e5', fontSize: 14 }}>
                                  {parseFloat(branch.current_balance || 0).toLocaleString()} ج.م
                                </Text>
                              </div>
                            </Col>
                            <Col span={12}>
                              <Text type="secondary" style={{ fontSize: 11 }}>إجمالي ما أرسله</Text>
                              <div>
                                <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
                                  {parseFloat(branch.total_sent || 0).toLocaleString()} ج.م
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
                              <Tag color="orange" style={{ fontSize: 11 }}>{branch.pending_count} طلب معلق</Tag>
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
        destroyOnClose
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
              <div style={{ fontSize: 16, fontWeight: 'bold', color: getChannelAvailable(selectedChannel) > 0 ? '#16a34a' : '#dc2626' }}>
                {getChannelAvailable(selectedChannel).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
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
                      return Promise.reject(`المبلغ يتجاوز الرصيد المتاح في هذه القناة (${avail.toLocaleString()} ج.م)`);
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
                title={`تأكيد استلام ${parseFloat(detailRecord?.amount || 0).toFixed(2)} ج.م؟`}
                okText="تأكيد" cancelText="إلغاء"
                onConfirm={() => { handleConfirm(detailRecord.id); setDetailVisible(false); }}
              >
                <Button type="primary" icon={<CheckCircleOutlined />} className="swm-btn-emerald">
                  تأكيد الاستلام
                </Button>
              </Popconfirm>
              <Popconfirm
                title="رفض وإرجاع المبلغ للفرع؟"
                okText="رفض" cancelText="إلغاء" okType="danger"
                onConfirm={() => { handleCancel(detailRecord.id); setDetailVisible(false); }}
              >
                <Button danger icon={<CloseCircleOutlined />}>رفض الطلب</Button>
              </Popconfirm>
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
              <Col span={12}><Text type="secondary">المبلغ الإجمالي:</Text><br /><Text strong style={{ color: '#16a34a', fontSize: 16 }}>{parseFloat(detailRecord.amount).toFixed(2)} ج.م</Text></Col>
              <Col span={12}><Text type="secondary">طريقة التحويل:</Text><br /><Tag color="blue">{detailRecord.transfer_method === 'bank_transfer' ? <Space size={4}><Building2 size={12} /><span>بنكي</span></Space> : <Space size={4}><Banknote size={12} /><span>نقدي</span></Space>}</Tag></Col>
              <Col span={12}><Text type="secondary">الحالة:</Text><br /><Tag color={STATUS_MAP[detailRecord.status]?.color}>{STATUS_MAP[detailRecord.status]?.label}</Tag></Col>
              {detailRecord.reference_no && (
                <Col span={24}><Text type="secondary">رقم المرجع:</Text><br /><Text code>{detailRecord.reference_no}</Text></Col>
              )}
              <Col span={12}><Text type="secondary">طُلب بواسطة:</Text><br /><Text>{detailRecord.requested_by_name || detailRecord.requested_by_username}</Text></Col>
              <Col span={12}><Text type="secondary">تاريخ الطلب:</Text><br /><Text>{new Date(detailRecord.requested_at).toLocaleString('ar-EG')}</Text></Col>
              {detailRecord.confirmed_by_name && (
                <Col span={12}><Text type="secondary">أُكد بواسطة:</Text><br /><Text>{detailRecord.confirmed_by_name}</Text></Col>
              )}
              {detailRecord.confirmed_at && (
                <Col span={12}><Text type="secondary">تاريخ التأكيد:</Text><br /><Text>{new Date(detailRecord.confirmed_at).toLocaleString('ar-EG')}</Text></Col>
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
        destroyOnClose
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
                    <Space size={4}><Banknote size={13} /><span>كاش ({getChannelAvailable('cash').toLocaleString()})</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="visa" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><CreditCard size={13} /><span>فيزا ({getChannelAvailable('visa').toLocaleString()})</span></Space>
                  </Radio.Button>
                </Col>
                <Col span={8}>
                  <Radio.Button value="transfer" style={{ width: '100%', textAlign: 'center' }}>
                    <Space size={4}><Smartphone size={13} /><span>تحويل ({getChannelAvailable('transfer').toLocaleString()})</span></Space>
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
                    return Promise.reject(`المبلغ يتجاوز الرصيد المتاح بالقناة (${avail.toLocaleString()} ج.م)`);
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
            message={`إجمالي السلف والمصاريف المستقطعة لشهر ${payrollMonth}: ${parseFloat(employeeSummary?.advances_total || 0).toLocaleString()} ج.م`}
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
              render: d => d ? new Date(d).toLocaleDateString('ar-EG') : '—'
            },
            {
              title: 'المبلغ',
              dataIndex: 'amount',
              key: 'amount',
              render: v => <Text strong style={{ color: '#dc2626' }}>{parseFloat(v).toLocaleString()} ج.م</Text>
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
