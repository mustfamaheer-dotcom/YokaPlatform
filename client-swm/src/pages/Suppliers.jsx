import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  ArrowRight,
  Building2,
  Receipt,
  Wallet,
  Coins,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Phone,
  User,
  MapPin,
  DollarSign
} from 'lucide-react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  Typography,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  DatePicker,
  Tooltip,
  Empty,
  Spin,
  Badge,
  Alert
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  SearchOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  ArrowRightOutlined,
  EditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import SplitPayment from '../components/SplitPayment';
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

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
  return dayjs(d).format('YYYY-MM-DD');
};

export default function Suppliers({ autoOpenCreate, onResetAction }) {
  const navigate = useNavigate();

  // Active View: 'list' (Main Suppliers Table) | 'statement' (Full Page Statement of Account)
  const [activeView, setActiveView] = useState('list');

  // Suppliers Master state
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all'); // 'all' | 'due' | 'settled' | 'credit'
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form] = Form.useForm();

  // Full-Page Ledger / Statement State
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedSupplierLedger, setSelectedSupplierLedger] = useState(null);
  const [printStatementModal, setPrintStatementModal] = useState(false);

  // Statement Filters
  const [statementSearch, setStatementSearch] = useState('');
  const [statementTypeFilter, setStatementTypeFilter] = useState('all'); // 'all' | 'invoice' | 'payment' | 'return'
  const [statementDateRange, setStatementDateRange] = useState(null);

  // Payment Modal with Split Payment
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [payForm] = Form.useForm();
  const [splitBreakdown, setSplitBreakdown] = useState([]);
  const [splitTotal, setSplitTotal] = useState(0);
  const [submittingPay, setSubmittingPay] = useState(false);

  const printAreaRef = useRef(null);

  // Fetch Suppliers List
  const fetchSuppliers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/suppliers', {
        params: {
          page,
          limit: pagination.pageSize,
          search: search || undefined,
          status: statusFilter || undefined
        }
      });
      if (res.data.success) {
        setSuppliers(res.data.data);
        setPagination(prev => ({
          ...prev,
          current: res.data.meta.page,
          total: res.data.meta.total
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل الموردين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(1);
  }, [search, statusFilter]);

  // Load Supplier Ledger and Open Full-Page Statement View
  const handleOpenLedger = async (supplier) => {
    setActiveView('statement');
    setLedgerLoading(true);
    setSelectedSupplierLedger({ supplier, opening_balance: parseFloat(supplier.opening_balance) || 0, current_balance: parseFloat(supplier.current_balance) || 0, ledger: [] });
    // Reset statement filters
    setStatementSearch('');
    setStatementTypeFilter('all');
    setStatementDateRange(null);

    try {
      const res = await api.get(`/api/swm/suppliers/${supplier.id}/ledger`);
      if (res.data.success) {
        setSelectedSupplierLedger(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل كشف الحساب');
    } finally {
      setLedgerLoading(false);
    }
  };

  // Back from Statement to List View
  const handleBackToList = () => {
    setActiveView('list');
    fetchSuppliers(pagination.current);
  };

  // Open Create
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreate();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  // Open Edit
  const handleOpenEdit = (record) => {
    setEditingSupplier(record);
    setIsModalOpen(true);
  };

  // Sync Form values whenever Create / Edit modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (editingSupplier) {
        form.setFieldsValue({
          supplier_name: editingSupplier.supplier_name,
          contact_person: editingSupplier.contact_person,
          phone: editingSupplier.phone,
          address: editingSupplier.address,
          opening_balance: parseFloat(editingSupplier.opening_balance) || 0
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          opening_balance: 0
        });
      }
    }
  }, [isModalOpen, editingSupplier]);

  // Save Supplier
  const handleSaveSupplier = async (values) => {
    try {
      const payload = {
        supplier_name: values.supplier_name?.trim(),
        contact_person: values.contact_person ? values.contact_person.trim() : null,
        phone: values.phone ? values.phone.trim() : null,
        address: values.address ? values.address.trim() : null,
        opening_balance: parseFloat(values.opening_balance) || 0
      };

      if (editingSupplier) {
        await api.put(`/api/swm/suppliers/${editingSupplier.id}`, payload);
        message.success('تم تحديث بيانات المورد بنجاح');
      } else {
        await api.post('/api/swm/suppliers', payload);
        message.success('تم إضافة المورد بنجاح');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchSuppliers(pagination.current);
      if (activeView === 'statement' && selectedSupplierLedger?.supplier?.id === editingSupplier?.id) {
        handleOpenLedger({ ...selectedSupplierLedger.supplier, ...payload });
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات المورد');
    }
  };

  // Open Payment Modal
  const handleOpenPay = (supplier) => {
    setPayingSupplier(supplier);
    const currentDue = Math.max(0, parseFloat(supplier.current_balance) || 0);
    setSplitTotal(currentDue);
    setSplitBreakdown([
      { method: 'cash', method_name: 'نقداً (خزينة)', amount: currentDue }
    ]);
    setPayModalOpen(true);
  };

  useEffect(() => {
    if (payModalOpen) {
      payForm.resetFields();
    }
  }, [payModalOpen]);

  // Submit Payment
  const handleExecutePayment = async (values) => {
    if (splitTotal <= 0) {
      return message.error('يرجى تحديد مبلغ صحيح للسداد');
    }

    setSubmittingPay(true);
    try {
      const payload = {
        amount: splitTotal,
        payment_breakdown: splitBreakdown,
        payment_method: splitBreakdown.length > 1 ? 'split' : (splitBreakdown[0]?.method || 'cash'),
        notes: values.notes || null
      };

      await api.post(`/api/swm/suppliers/${payingSupplier.id}/pay`, payload);
      message.success('تم تسجيل الدفعة بنجاح وتحديث رصيد المورد وحركات الحساب');
      setPayModalOpen(false);
      payForm.resetFields();
      fetchSuppliers(pagination.current);

      // If inside statement view, refresh statement immediately
      if (activeView === 'statement' && selectedSupplierLedger?.supplier?.id === payingSupplier.id) {
        handleOpenLedger(payingSupplier);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل الدفعة');
    } finally {
      setSubmittingPay(false);
    }
  };

  // Print Statement
  const handlePrintStatement = () => {
    if (printAreaRef.current) {
      printHtmlContent({
        title: `كشف حساب مورد - ${selectedSupplierLedger?.supplier?.supplier_name || ''}`,
        htmlContent: printAreaRef.current.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  // Export Ledger to Excel (.csv with UTF-8 BOM)
  const exportLedgerToExcel = () => {
    if (!selectedSupplierLedger?.supplier || !filteredLedgerEntries || filteredLedgerEntries.length === 0) {
      message.warning('لا توجد حركات مطابقة للتصدير');
      return;
    }

    const supplier = selectedSupplierLedger.supplier;
    const headers = ['التاريخ', 'رقم السند/المرجع', 'نوع المعاملة', 'البيان وتفاصيل السداد', 'مدين (فاتورة)', 'دائن (سداد)', 'الرصيد بعد الحركة'];
    const rows = [
      ['—', 'OPENING', 'الرصيد الافتتاحي', 'الرصيد الافتتاحي السابق', '0.00', '0.00', fmtNum(selectedSupplierLedger.opening_balance || 0, 2)]
    ];

    filteredLedgerEntries.forEach(item => {
      let desc = item.notes || '';
      if (item.payment_breakdown && Array.isArray(item.payment_breakdown)) {
        const bd = item.payment_breakdown.map(p => `${p.method_name || p.method}: ${parseFloat(p.amount || 0).toFixed(2)}`).join(' + ');
        desc = (desc ? desc + ' | ' : '') + bd;
      }
      rows.push([
        item.date ? dayjs(item.date).format('YYYY-MM-DD') : '',
        `"${item.ref || ''}"`,
        `"${item.type === 'invoice' ? 'فاتورة مشتريات وتوريد' : item.type === 'payment' ? 'سند صرف وسداد مالي' : 'مرتجع مشتريات'}"`,
        `"${desc.replace(/"/g, '""')}"`,
        (parseFloat(item.debit) || 0).toFixed(2),
        (parseFloat(item.credit) || 0).toFixed(2),
        (parseFloat(item.balance_after) || 0).toFixed(2)
      ]);
    });

    // Summary row
    rows.push([
      'الإجمالي النهائي',
      '',
      '',
      '',
      statementTotals.totalDebit.toFixed(2),
      statementTotals.totalCredit.toFixed(2),
      statementTotals.currentBalance.toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_مورد_${(supplier.supplier_name || 'supplier').replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('تم تصدير كشف الحساب إلى Excel بنجاح');
  };

  // Filtered Suppliers for List View
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const bal = parseFloat(s.current_balance) || 0;
      if (balanceFilter === 'due' && bal <= 0) return false;
      if (balanceFilter === 'settled' && bal !== 0) return false;
      if (balanceFilter === 'credit' && bal >= 0) return false;
      return true;
    });
  }, [suppliers, balanceFilter]);

  // Top KPIs for Suppliers Master
  const masterKpis = useMemo(() => {
    const total = pagination.total || suppliers.length;
    let totalDue = 0;
    let dueCount = 0;
    let settledCount = 0;

    suppliers.forEach(s => {
      const bal = parseFloat(s.current_balance) || 0;
      if (bal > 0) {
        totalDue += bal;
        dueCount++;
      } else if (bal === 0) {
        settledCount++;
      }
    });

    return { total, totalDue, dueCount, settledCount };
  }, [suppliers, pagination.total]);

  // Filtered Ledger Entries for Statement View
  const filteredLedgerEntries = useMemo(() => {
    if (!selectedSupplierLedger?.ledger) return [];
    return selectedSupplierLedger.ledger.filter(entry => {
      // Type
      if (statementTypeFilter !== 'all' && entry.type !== statementTypeFilter) return false;

      // Date Range
      if (statementDateRange && statementDateRange[0] && statementDateRange[1]) {
        const entryDate = dayjs(entry.date);
        const start = statementDateRange[0].startOf('day');
        const end = statementDateRange[1].endOf('day');
        if (entryDate.isBefore(start) || entryDate.isAfter(end)) return false;
      }

      // Search Query
      if (statementSearch.trim()) {
        const q = statementSearch.toLowerCase().trim();
        const matchRef = (entry.ref || '').toLowerCase().includes(q);
        const matchNotes = (entry.notes || '').toLowerCase().includes(q);
        let matchMethods = false;
        if (entry.payment_breakdown && Array.isArray(entry.payment_breakdown)) {
          matchMethods = entry.payment_breakdown.some(p => (p.method_name || p.method || '').toLowerCase().includes(q));
        }
        if (!matchRef && !matchNotes && !matchMethods) return false;
      }

      return true;
    });
  }, [selectedSupplierLedger?.ledger, statementTypeFilter, statementDateRange, statementSearch]);

  // Statement Totals Calculation
  const statementTotals = useMemo(() => {
    const opening = parseFloat(selectedSupplierLedger?.opening_balance) || 0;
    let totalDebit = 0;
    let totalCredit = 0;

    filteredLedgerEntries.forEach(r => {
      totalDebit += parseFloat(r.debit) || 0;
      totalCredit += parseFloat(r.credit) || 0;
    });

    const currentBalance = parseFloat(selectedSupplierLedger?.current_balance) || (opening + totalDebit - totalCredit);

    return {
      opening,
      totalDebit,
      totalCredit,
      currentBalance
    };
  }, [selectedSupplierLedger, filteredLedgerEntries]);

  // Master Suppliers Table Columns
  const masterColumns = [
    {
      title: 'كود المورد',
      dataIndex: 'supplier_code',
      key: 'supplier_code',
      width: 130,
      align: 'center',
      render: (code) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          color: '#334155',
          fontWeight: 800,
          fontSize: 12.5,
          padding: '4px 10px',
          borderRadius: 6,
          fontFamily: 'monospace',
          letterSpacing: '0.5px',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap'
        }}>
          {code}
        </span>
      )
    },
    {
      title: 'اسم المورد / الشركة',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0f172a', lineHeight: 1.3 }}>
            {name}
          </span>
          {r.address ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
              <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#64748b' }}>{r.address}</span>
            </div>
          ) : (
            <span style={{ color: '#cbd5e1', fontSize: 11.5 }}>بدون عنوان مسجل</span>
          )}
        </div>
      )
    },
    {
      title: 'المسؤول والاتصال',
      key: 'contact',
      width: 190,
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {r.contact_person ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={12} style={{ color: '#ea580c' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                {r.contact_person}
              </span>
            </div>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
          )}
          {r.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={12} style={{ color: '#16a34a' }} />
              </div>
              <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>
                {r.phone}
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'الرصيد المستحق (EGP)',
      dataIndex: 'current_balance',
      key: 'current_balance',
      width: 210,
      align: 'center',
      render: (val) => {
        const num = parseFloat(val) || 0;
        if (num > 0) {
          return (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1.5px solid #f87171',
                padding: '5px 14px',
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                <span>{fmtNum(num, 2)} ج.م</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>مديونية مستحقة</span>
            </div>
          );
        }
        if (num < 0) {
          return (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1.5px solid #93c5fd',
                padding: '5px 14px',
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                <span>{fmtNum(Math.abs(num), 2)} ج.م</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>رصيد دائن للمورد</span>
            </div>
          );
        }
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f0fdf4',
              color: '#15803d',
              border: '1.5px solid #86efac',
              padding: '5px 14px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: 'nowrap'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              <span>0.00 ج.م</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>مسوى بالكامل</span>
          </div>
        );
      }
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (st) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: st === 'active' ? '#f0fdf4' : '#f8fafc',
          color: st === 'active' ? '#16a34a' : '#64748b',
          border: `1.5px solid ${st === 'active' ? '#86efac' : '#cbd5e1'}`,
          padding: '4px 12px',
          borderRadius: 20,
          fontWeight: 800,
          fontSize: 12,
          whiteSpace: 'nowrap'
        }}>
          {st === 'active' ? 'نشط' : (st === 'inactive' ? 'معطل' : 'محظور')}
        </span>
      )
    },
    {
      title: 'الإجراءات المالية',
      key: 'actions',
      width: 290,
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <button
            type="button"
            onClick={() => handleOpenLedger(record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              height: 36,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <FileTextOutlined style={{ fontSize: 14, color: '#ffffff' }} />
            <span style={{ color: '#ffffff', whiteSpace: 'nowrap' }}>كشف الحساب</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPay(record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              height: 36,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <DollarOutlined style={{ fontSize: 14, color: '#ffffff' }} />
            <span style={{ color: '#ffffff', whiteSpace: 'nowrap' }}>سداد</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenEdit(record)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              borderRadius: 8,
              height: 36,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <EditOutlined style={{ fontSize: 13, color: '#64748b' }} />
            <span style={{ color: '#334155', whiteSpace: 'nowrap' }}>تعديل</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ─────────────────────────────────────────────────────────────
          VIEW A: DEDICATED FULL-PAGE SUPPLIER STATEMENT (كشف الحساب)
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'statement' ? (
        <div>
          {/* Statement Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 20,
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                onClick={handleBackToList}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowRightOutlined style={{ fontSize: 15, color: '#0f172a' }} />
                <span style={{ color: '#0f172a' }}>العودة لقائمة الموردين</span>
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                    كشف حساب المورد: {selectedSupplierLedger?.supplier?.supplier_name || ''}
                  </Title>
                  <span style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #7dd3fc', fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>
                    {selectedSupplierLedger?.supplier?.supplier_code || ''}
                  </span>
                  <span style={{
                    background: selectedSupplierLedger?.supplier?.status === 'active' ? '#dcfce7' : '#f1f5f9',
                    color: selectedSupplierLedger?.supplier?.status === 'active' ? '#15803d' : '#64748b',
                    border: `1px solid ${selectedSupplierLedger?.supplier?.status === 'active' ? '#86efac' : '#cbd5e1'}`,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {selectedSupplierLedger?.supplier?.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                  {selectedSupplierLedger?.supplier?.contact_person ? `المسؤول: ${selectedSupplierLedger.supplier.contact_person} • ` : ''}
                  {selectedSupplierLedger?.supplier?.phone ? `الهاتف: ${selectedSupplierLedger.supplier.phone} • ` : ''}
                  {selectedSupplierLedger?.supplier?.address ? `العنوان: ${selectedSupplierLedger.supplier.address}` : ''}
                </div>
              </div>
            </div>

            {/* Statement Header Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => selectedSupplierLedger?.supplier && handleOpenLedger(selectedSupplierLedger.supplier)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '9px 15px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ReloadOutlined spin={ledgerLoading} style={{ fontSize: 14, color: '#334155' }} />
                <span style={{ color: '#334155' }}>تحديث</span>
              </button>

              <button
                type="button"
                onClick={() => selectedSupplierLedger?.supplier && handleOpenPay(selectedSupplierLedger.supplier)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)'
                }}
              >
                <DollarOutlined style={{ fontSize: 15, color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>تسجيل دفعة سداد</span>
              </button>

              <button
                type="button"
                onClick={exportLedgerToExcel}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#ffffff',
                  color: '#15803d',
                  border: '1.5px solid #86efac',
                  borderRadius: 8,
                  padding: '9px 16px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <FileExcelOutlined style={{ fontSize: 15, color: '#16a34a' }} />
                <span style={{ color: '#15803d' }}>تصدير إلى Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintStatementModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
                }}
              >
                <PrinterOutlined style={{ fontSize: 15, color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>طباعة كشف الحساب</span>
              </button>
            </div>
          </div>

          {/* 4 Financial Clear-Color Balance KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {/* 1. Opening Balance */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #7dd3fc',
                  borderTop: '4px solid #0284c7',
                  background: '#f0f9ff',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0369a1', display: 'block' }}>
                      الرصيد الافتتاحي السابق
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0c4a6e', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(statementTotals.opening)}
                    </div>
                  </div>
                  <div style={{ background: '#0284c7', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 10, borderTop: '1px solid #bae6fd', paddingTop: 6, fontWeight: 600 }}>
                  رصيد سابق مسجل عند فتح الحساب
                </div>
              </div>
            </Col>

            {/* 2. Total Invoices (Debit +) */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #fed7aa',
                  borderTop: '4px solid #ea580c',
                  background: '#fff7ed',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#c2410c', display: 'block' }}>
                      إجمالي فواتير التوريد (مدين +)
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#9a3412', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(statementTotals.totalDebit)}
                    </div>
                  </div>
                  <div style={{ background: '#ea580c', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#c2410c', marginTop: 10, borderTop: '1px solid #fed7aa', paddingTop: 6, fontWeight: 600 }}>
                  قيمة البضائع والتوريدات المستلمة
                </div>
              </div>
            </Col>

            {/* 3. Total Paid (Credit -) */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #86efac',
                  borderTop: '4px solid #16a34a',
                  background: '#f0fdf4',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#15803d', display: 'block' }}>
                      إجمالي المدفوعات والمسدد (دائن -)
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#14532d', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(statementTotals.totalCredit)}
                    </div>
                  </div>
                  <div style={{ background: '#16a34a', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 10, borderTop: '1px solid #bbf7d0', paddingTop: 6, fontWeight: 600 }}>
                  إجمالي الدفعات المسددة للمورد
                </div>
              </div>
            </Col>

            {/* 4. Net Outstanding Due Balance */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: `2px solid ${statementTotals.currentBalance > 0 ? '#f87171' : '#86efac'}`,
                  borderTop: `4px solid ${statementTotals.currentBalance > 0 ? '#dc2626' : '#16a34a'}`,
                  background: statementTotals.currentBalance > 0 ? '#fef2f2' : '#f0fdf4',
                  padding: '16px 18px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: statementTotals.currentBalance > 0 ? '#b91c1c' : '#15803d', display: 'block' }}>
                      {statementTotals.currentBalance > 0 ? 'صافي الرصيد المستحق الحالي للمورد' : 'حالة الحساب المالي'}
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: statementTotals.currentBalance > 0 ? '#991b1b' : '#14532d', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(statementTotals.currentBalance)}
                    </div>
                  </div>
                  <div style={{
                    background: statementTotals.currentBalance > 0 ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    padding: 10,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wallet size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{
                  fontSize: 11.5,
                  color: statementTotals.currentBalance > 0 ? '#b91c1c' : '#15803d',
                  marginTop: 10,
                  borderTop: `1px solid ${statementTotals.currentBalance > 0 ? '#fca5a5' : '#bbf7d0'}`,
                  paddingTop: 6,
                  fontWeight: 700
                }}>
                  {statementTotals.currentBalance > 0 ? 'مبلغ مستحق السداد للمورد' : 'الحساب خالص ومسوى بالكامل'}
                </div>
              </div>
            </Col>
          </Row>

          {/* Statement Search & Filter Toolbar */}
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col xs={24} md={8}>
                <Input
                  prefix={<Search size={15} style={{ color: '#94a3b8' }} />}
                  placeholder="بحث برقم الفاتورة، السند، أو الملاحظات..."
                  value={statementSearch}
                  onChange={(e) => setStatementSearch(e.target.value)}
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Col>

              <Col xs={24} md={12}>
                <Space wrap size={8}>
                  <Select
                    value={statementTypeFilter}
                    onChange={setStatementTypeFilter}
                    style={{ width: 150 }}
                  >
                    <Option value="all">كافة الحركات</Option>
                    <Option value="invoice">فواتير توريد فقط</Option>
                    <Option value="payment">مدفوعات وسداد فقط</Option>
                    <Option value="return">مرتجعات مشتريات</Option>
                  </Select>

                  <RangePicker
                    placeholder={['من تاريخ', 'إلى تاريخ']}
                    value={statementDateRange}
                    onChange={setStatementDateRange}
                    style={{ borderRadius: 8 }}
                  />

                  <Tag color="blue" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(filteredLedgerEntries.length, 0)} حركة
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Statement Ledger Table */}
          <Card style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
            <Table
              size="middle"
              scroll={{ x: 'max-content' }}
              loading={ledgerLoading}
              dataSource={filteredLedgerEntries}
              rowKey={(r) => `${r.type}-${r.id}-${r.ref}`}
              pagination={false}
              columns={[
                {
                  title: 'التاريخ',
                  dataIndex: 'date',
                  key: 'date',
                  width: 120,
                  render: (d) => (
                    <Text strong style={{ fontSize: 12.5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDate(d)}
                    </Text>
                  )
                },
                {
                  title: 'رقم السند / المرجع',
                  dataIndex: 'ref',
                  key: 'ref',
                  width: 170,
                  render: (ref) => (
                    <Text code strong style={{ fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {ref}
                    </Text>
                  )
                },
                {
                  title: 'نوع الحركة وتفصيل السداد',
                  key: 'type_details',
                  render: (_, r) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.type === 'invoice' && (
                          <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontWeight: 800, borderRadius: 6, padding: '3px 10px', fontSize: 12 }}>
                            فاتورة مشتريات وتوريد
                          </span>
                        )}
                        {r.type === 'payment' && (
                          <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', fontWeight: 800, borderRadius: 6, padding: '3px 10px', fontSize: 12 }}>
                            سند صرف وسداد مالي
                          </span>
                        )}
                        {r.type === 'return' && (
                          <span style={{ background: '#fefce8', color: '#a16207', border: '1px solid #fef08a', fontWeight: 800, borderRadius: 6, padding: '3px 10px', fontSize: 12 }}>
                            مرتجع مشتريات
                          </span>
                        )}
                      </div>

                      {/* Split Payment Breakdown */}
                      {r.type === 'payment' && Array.isArray(r.payment_breakdown) && r.payment_breakdown.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {r.payment_breakdown.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                fontSize: 11.5,
                                fontWeight: 700,
                                borderRadius: 5,
                                padding: '2px 8px',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            >
                              {item.method_name || item.method}: {fmtMoney(item.amount)}
                            </span>
                          ))}
                        </div>
                      )}

                      {r.notes && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {r.notes}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  title: 'مدين (+ فاتورة)',
                  dataIndex: 'debit',
                  key: 'debit',
                  width: 150,
                  align: 'right',
                  render: (v) => {
                    const num = parseFloat(v) || 0;
                    return num > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 13.5,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        +{fmtNum(num, 2)} ج.م
                      </span>
                    ) : <span style={{ color: '#cbd5e1' }}>—</span>;
                  }
                },
                {
                  title: 'دائن (- مسدد)',
                  dataIndex: 'credit',
                  key: 'credit',
                  width: 150,
                  align: 'right',
                  render: (v) => {
                    const num = parseFloat(v) || 0;
                    return num > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        background: '#dcfce7',
                        color: '#16a34a',
                        border: '1px solid #86efac',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 13.5,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        -{fmtNum(num, 2)} ج.م
                      </span>
                    ) : <span style={{ color: '#cbd5e1' }}>—</span>;
                  }
                },
                {
                  title: 'الرصيد التراكمي',
                  dataIndex: 'balance_after',
                  key: 'balance_after',
                  width: 170,
                  align: 'right',
                  render: (v) => {
                    const num = parseFloat(v) || 0;
                    return (
                      <span style={{
                        display: 'inline-block',
                        background: num > 0 ? '#fef2f2' : num < 0 ? '#eff6ff' : '#f8fafc',
                        color: num > 0 ? '#b91c1c' : num < 0 ? '#1d4ed8' : '#0f172a',
                        border: `1px solid ${num > 0 ? '#fca5a5' : num < 0 ? '#bfdbfe' : '#cbd5e1'}`,
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: 13.5,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {fmtMoney(v)}
                      </span>
                    );
                  }
                }
              ]}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <span style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 800 }}>الإجمالي الختامي للحركات المعروضة:</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span style={{
                        display: 'inline-block',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 13.5,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        +{fmtMoney(statementTotals.totalDebit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <span style={{
                        display: 'inline-block',
                        background: '#dcfce7',
                        color: '#16a34a',
                        border: '1px solid #86efac',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 13.5,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        -{fmtMoney(statementTotals.totalCredit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <span style={{
                        display: 'inline-block',
                        background: statementTotals.currentBalance > 0 ? '#fee2e2' : '#dcfce7',
                        color: statementTotals.currentBalance > 0 ? '#b91c1c' : '#15803d',
                        border: `1px solid ${statementTotals.currentBalance > 0 ? '#fca5a5' : '#86efac'}`,
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {fmtMoney(statementTotals.currentBalance)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
           VIEW B: MAIN SUPPLIERS MASTER TABLE & TOP KPIS
           ───────────────────────────────────────────────────────────── */
        <div>
          {/* Main Page Header */}
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
              <h2>إدارة الموردين والحسابات (Suppliers & Accounts)</h2>
              <p>متابعة حسابات الموردين، استعراض كشوف الحسابات الجارية الكاملة، وسداد الدفعات بنظام الدفع المقسم</p>
            </div>

            <div className="swm-page-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fetchSuppliers(pagination.current)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  height: 42
                }}
              >
                <ReloadOutlined spin={loading} style={{ fontSize: 14, color: '#0f172a' }} />
                <span style={{ color: '#0f172a' }}>تحديث</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  height: 42,
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
                }}
              >
                <PlusOutlined style={{ fontSize: 15, color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>إضافة مورد جديد</span>
              </button>
            </div>
          </div>

          {/* Top Executive KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {/* 1. Total Suppliers */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #7dd3fc',
                  borderTop: '4px solid #0284c7',
                  background: '#f0f9ff',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0369a1', display: 'block' }}>
                      إجمالي الموردين المسجلين
                    </span>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#0c4a6e', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(masterKpis.total, 0)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 700, color: '#0284c7' }}>مورد</span>
                    </div>
                  </div>
                  <div style={{ background: '#0284c7', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 10, borderTop: '1px solid #bae6fd', paddingTop: 6, fontWeight: 600 }}>
                  سجل الموردين المعتمد بالمنظومة
                </div>
              </div>
            </Col>

            {/* 2. Total Payables */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #fca5a5',
                  borderTop: '4px solid #dc2626',
                  background: '#fef2f2',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#b91c1c', display: 'block' }}>
                      إجمالي الديون المستحقة للموردين
                    </span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#991b1b', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoney(masterKpis.totalDue)}
                    </div>
                  </div>
                  <div style={{ background: '#dc2626', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 10, borderTop: '1px solid #fca5a5', paddingTop: 6, fontWeight: 700 }}>
                  التزامات مالية واجبة السداد
                </div>
              </div>
            </Col>

            {/* 3. Suppliers with Due Balances */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #fed7aa',
                  borderTop: '4px solid #ea580c',
                  background: '#fff7ed',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#c2410c', display: 'block' }}>
                      موردون ينتظرون سداداً
                    </span>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#78350f', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(masterKpis.dueCount, 0)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 700, color: '#ea580c' }}>مورد</span>
                    </div>
                  </div>
                  <div style={{ background: '#ea580c', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#c2410c', marginTop: 10, borderTop: '1px solid #fed7aa', paddingTop: 6, fontWeight: 600 }}>
                  عليهم أرصدة مستحقة أكبر من الصفر
                </div>
              </div>
            </Col>

            {/* 4. Settled Suppliers */}
            <Col xs={24} sm={12} lg={6}>
              <div
                style={{
                  borderRadius: 12,
                  border: '1.5px solid #86efac',
                  borderTop: '4px solid #16a34a',
                  background: '#f0fdf4',
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#15803d', display: 'block' }}>
                      موردون بحسابات مسواة
                    </span>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#14532d', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(masterKpis.settledCount, 0)}
                      <span style={{ fontSize: 13, marginRight: 6, fontWeight: 700, color: '#16a34a' }}>مورد</span>
                    </div>
                  </div>
                  <div style={{ background: '#16a34a', color: '#ffffff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} style={{ color: '#ffffff' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 10, borderTop: '1px solid #bbf7d0', paddingTop: 6, fontWeight: 600 }}>
                  رصيدهم صفر وتمت تسوية كافة التوريدات
                </div>
              </div>
            </Col>
          </Row>

          {/* Search & Filter Toolbar */}
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col xs={24} md={10}>
                <Input
                  prefix={<Search size={15} style={{ color: '#94a3b8' }} />}
                  placeholder="البحث باسم المورد، كود المورد، أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  style={{ borderRadius: 8 }}
                />
              </Col>

              <Col xs={24} md={14} style={{ textAlign: 'left' }}>
                <Space wrap size={8}>
                  <Select
                    value={balanceFilter}
                    onChange={setBalanceFilter}
                    style={{ width: 170 }}
                  >
                    <Option value="all">كافة الأرصدة</Option>
                    <Option value="due">عليهم مديونية (مستحق &gt; 0)</Option>
                    <Option value="settled">مسوى بالكامل (= 0.00)</Option>
                    <Option value="credit">أرصدة دائنة (&lt; 0)</Option>
                  </Select>

                  <Select
                    style={{ width: 130 }}
                    placeholder="الحالة"
                    value={statusFilter || undefined}
                    onChange={(val) => setStatusFilter(val || '')}
                    allowClear
                  >
                    <Option value="active">نشط</Option>
                    <Option value="inactive">غير نشط</Option>
                    <Option value="blacklisted">محظور</Option>
                  </Select>

                  <Tag color="blue" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtNum(filteredSuppliers.length, 0)} مورد
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Master Table */}
          <Card style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
            <Table
              columns={masterColumns}
              scroll={{ x: 'max-content' }}
              dataSource={filteredSuppliers}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (p) => fetchSuppliers(p),
                showTotal: (total) => `إجمالي الموردين: ${fmtNum(total, 0)}`
              }}
              size="middle"
            />
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ADD / EDIT SUPPLIER MODAL (EXACT 5 FIELDS)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <Building2 size={20} style={{ color: '#4f46e5' }} />
            <span>{editingSupplier ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSupplier} style={{ marginTop: 12 }}>
          <Form.Item
            name="supplier_name"
            label="اسم المورد / الشركة (Supplier Name) *"
            rules={[{ required: true, message: 'يرجى إدخال اسم المورد' }]}
          >
            <Input placeholder="مثال: شركة النسيج العصرية" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_person"
                label="المسؤول المباشر (Contact Person)"
              >
                <Input placeholder="اسم مسؤول المبيعات" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="phone"
                label="رقم الهاتف (Phone Number)"
              >
                <Input placeholder="01xxxxxxxxx" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="العنوان الجغرافي (Address)"
          >
            <Input.TextArea rows={2} placeholder="العنوان، المدينة، المنطقة" />
          </Form.Item>

          <Form.Item
            name="opening_balance"
            label="الرصيد الافتتاحي (Opening Balance) - ج.م"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="0.00"
              prefix="ج.م"
            />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', color: '#ffffff', fontWeight: 800, padding: '0 20px' }}>
                <span style={{ color: '#ffffff' }}>{editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}</span>
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          4. SPLIT PAYMENT MODAL
          ───────────────────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <DollarSign size={20} style={{ color: '#16a34a' }} />
            <span>سداد دفعة للمورد: {payingSupplier?.supplier_name}</span>
          </Space>
        }
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={620}
      >
        <Form form={payForm} layout="vertical" onFinish={handleExecutePayment} style={{ marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>الرصيد المستحق الحالي للمورد:</span>
                <strong style={{ fontSize: 16, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(payingSupplier?.current_balance || 0)}
                </strong>
              </div>
            }
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              توزيع طرق السداد والدفع المقسم:
            </Text>
            <SplitPayment
              totalAmount={splitTotal}
              onTotalChange={(newTotal) => setSplitTotal(newTotal)}
              breakdown={splitBreakdown}
              onChange={(newBreakdown) => setSplitBreakdown(newBreakdown)}
            />
          </div>

          <Form.Item name="notes" label="ملاحظات وبيان السداد">
            <Input.TextArea rows={2} placeholder="مثال: دفعة تحت حساب فاتورة توريد رقم..." />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setPayModalOpen(false)}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingPay}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#ffffff', fontWeight: 800, padding: '0 24px' }}
              >
                <span style={{ color: '#ffffff' }}>تأكيد وتسجيل السداد</span>
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          5. PRINTABLE STATEMENT MODAL
          ───────────────────────────────────────────────────────────── */}
      <Modal
        title="معاينة وطباعة كشف حساب المورد"
        open={printStatementModal}
        onCancel={() => setPrintStatementModal(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setPrintStatementModal(false)}>إغلاق</Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined style={{ color: '#ffffff' }} />}
            onClick={handlePrintStatement}
            style={{ backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a', fontWeight: 800, padding: '0 20px' }}
          >
            <span style={{ color: '#ffffff' }}>طباعة المستند</span>
          </Button>
        ]}
      >
        {selectedSupplierLedger && (
          <div ref={printAreaRef} className="printable-statement" style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
            {/* Branded Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>الإدارة المالية والمحاسبية • قسم حسابات الموردين والدائنين</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>منظومة إدارة المخازن المركزية وسلاسل الإمداد (SWM)</div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  كشف حساب مورد تفصيلي
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  كود المورد: <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13.5 }}>{selectedSupplierLedger.supplier?.supplier_code}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>

            {/* Supplier Information Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <Row gutter={[16, 10]}>
                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>اسم المورد / الشركة:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                    {selectedSupplierLedger.supplier?.supplier_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    المسؤول: {selectedSupplierLedger.supplier?.contact_person || '—'}
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>بيانات الاتصال والعنوان:</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    هاتف: {selectedSupplierLedger.supplier?.phone || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    العنوان: {selectedSupplierLedger.supplier?.address || '—'}
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>الرصيد المستحق الحالي للمورد:</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#b91c1c', marginTop: 2, fontFamily: 'monospace' }}>
                    {fmtMoney(selectedSupplierLedger.current_balance || 0)}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                    رصيد المورد التراكمي حتى تاريخه
                  </div>
                </Col>
              </Row>
            </div>

            {/* Ledger Table */}
            <table
              className="print-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '11px',
                marginBottom: 14
              }}
            >
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'center' }}>التاريخ</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'center' }}>رقم السند / المرجع</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a' }}>البيان وتفصيل السداد</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'left' }}>مدين (فواتير)</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'left' }}>دائن (مدفوعات)</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '120px', textAlign: 'left' }}>الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace' }}>OPENING</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>الرصيد الافتتاحي السابق</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', fontWeight: 800 }}>
                    {fmtMoney(selectedSupplierLedger.opening_balance || 0)}
                  </td>
                </tr>
                {filteredLedgerEntries.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1'
                    }}
                  >
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace' }}>
                      {fmtDate(row.date)}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                      {row.ref}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                      <span style={{ fontWeight: 600 }}>{row.type === 'invoice' ? 'فاتورة مشتريات وتوريد' : 'سند صرف ودفع للمورد'}</span>
                      {row.payment_breakdown && Array.isArray(row.payment_breakdown) && row.payment_breakdown.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#2563eb', marginTop: 2 }}>
                          {row.payment_breakdown.map(b => `${b.method_name || b.method}: ${parseFloat(b.amount).toLocaleString()} ج.م`).join(' + ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: row.debit > 0 ? '#b91c1c' : '#94a3b8', fontWeight: row.debit > 0 ? 700 : 400 }}>
                      {row.debit > 0 ? `+${fmtMoney(row.debit)}` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: row.credit > 0 ? '#15803d' : '#94a3b8', fontWeight: row.credit > 0 ? 700 : 400 }}>
                      {row.credit > 0 ? `-${fmtMoney(row.credit)}` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, fontFamily: 'monospace' }}>
                      {fmtMoney(row.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    صافي الرصيد المستحق النهائي:
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#b91c1c' }}>
                    +{fmtMoney(statementTotals.totalDebit)}
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#15803d' }}>
                    -{fmtMoney(statementTotals.totalCredit)}
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>
                    {fmtMoney(statementTotals.currentBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
