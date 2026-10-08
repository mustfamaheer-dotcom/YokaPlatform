import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Breadcrumb,
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Alert,
  Spin
} from 'antd';
import { antMessage as message } from '../utils/antAppBridge';
import {
  ArrowRight,
  Receipt,
  Home,
  ReceiptText,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  History,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  Calendar,
  User,
  Sparkles,
  RefreshCw,
  Wallet,
  Folder
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ExpensesSelection({ onNavigate, currentUser }) {
  // Navigation State: 'hub' (3 Cards) | 'log' (Read-Only) | 'withdrawal' (Expense Form) | 'deposit' (Returned Expense Form)
  const [currentView, setCurrentView] = useState('hub');

  // Transactions Log State (Read-Only)
  const [transactions, setTransactions] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filterDate, setFilterDate] = useState(dayjs());

  // Staff and Categories for Forms
  const [staff, setStaff] = useState([]);
  const [adminCategories, setAdminCategories] = useState([
    { value: 'سلفة موظف / بائع (Employee Advance)', label: 'سلفة موظف / بائع (Employee Advance)', isEmployee: true },
    { value: 'مصروف عام (General Expense)', label: 'مصروف عام (General Expense)', isEmployee: false },
    { value: 'صيانة وتجهيزات (Maintenance)', label: 'صيانة وتجهيزات (Maintenance)', isEmployee: false },
    { value: 'فواتير ومرافق (كهرباء / مياه / إنترنت)', label: 'فواتير ومرافق (كهرباء / مياه / إنترنت)', isEmployee: false },
    { value: 'ضيافة ونثريات وبوفيه (Hospitality)', label: 'ضيافة ونثريات وبوفيه (Hospitality)', isEmployee: false },
    { value: 'شحن ونقل بضاعة عاجلة (Shipping)', label: 'شحن ونقل بضاعة عاجلة (Shipping)', isEmployee: false },
    { value: 'مصروفات تشغيلية أخرى (Other)', label: 'مصروفات تشغيلية أخرى (Other)', isEmployee: false }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [withdrawalForm] = Form.useForm();
  const [depositForm] = Form.useForm();

  // Watch selected withdrawal category for dynamic conditional field logic
  const selectedWithdrawalCategory = Form.useWatch('category', withdrawalForm);

  // Helper to determine if category is an employee-related expense
  const isEmployeeCategory = (cat) => {
    if (!cat) return false;
    const s = String(cat).toLowerCase();
    return (
      s.includes('سلفة') ||
      s.includes('سلف') ||
      s.includes('بائع') ||
      s.includes('موظف') ||
      s.includes('advance') ||
      s.includes('employee') ||
      s.includes('staff') ||
      s.includes('sales_withdrawal')
    );
  };

  const isEmployeeSelected = isEmployeeCategory(selectedWithdrawalCategory);

  // Clear employee selection if cashier changes category to a non-employee type
  const handleWithdrawalValuesChange = (changedValues) => {
    if ('category' in changedValues && !isEmployeeCategory(changedValues.category)) {
      withdrawalForm.setFieldsValue({ salesperson_id: undefined });
    }
  };

  // Watch selected deposit category for dynamic conditional field logic
  const selectedDepositCategory = Form.useWatch('category', depositForm);
  const isDepositEmployeeSelected = isEmployeeCategory(selectedDepositCategory);

  // Clear employee selection if cashier changes category to a non-employee type in deposit form
  const handleDepositValuesChange = (changedValues) => {
    if ('category' in changedValues && !isEmployeeCategory(changedValues.category)) {
      depositForm.setFieldsValue({ salesperson_id: undefined });
    }
  };

  // Fetch admin configured categories from settings
  const fetchAdminCategories = async () => {
    try {
      const res = await api.get('/api/swm/pos/settings');
      if (res.data?.success && Array.isArray(res.data.data?.allowed_expense_recipients) && res.data.data.allowed_expense_recipients.length > 0) {
        const rawList = res.data.data.allowed_expense_recipients;
        const mapped = rawList.map((cat) => ({
          value: cat,
          label: cat,
          isEmployee: isEmployeeCategory(cat)
        }));
        if (!mapped.some((c) => c.isEmployee)) {
          mapped.unshift({
            value: 'سلفة موظف / بائع (Employee Advance)',
            label: 'سلفة موظف / بائع (Employee Advance)',
            isEmployee: true
          });
        }
        setAdminCategories(mapped);
      }
    } catch (e) {
      // Fallback already preset in initial state
    }
  };

  // Fetch branch staff for dynamic dropdown - strictly restricted to current branch
  const fetchStaff = async () => {
    try {
      let bId = currentUser?.branch_id || currentUser?.branchId;
      if (!bId) {
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            bId = u?.branch_id || u?.branchId;
          }
        } catch (e) {}
      }
      const params = { status: 'active' };
      if (bId) params.branch_id = bId;
      const res = await api.get('/api/swm/users', { params });
      if (res.data?.success) {
        const allUsers = res.data.data || [];
        // Strictly filter to users belonging to this branch
        const branchUsers = bId
          ? allUsers.filter((u) => Number(u.branch_id) === Number(bId))
          : allUsers;
        setStaff(branchUsers);
      }
    } catch (e) {
      console.error('Fetch staff error:', e);
    }
  };

  // Fetch transactions for the 100% Read-Only log
  const fetchTransactions = async (dateVal = filterDate) => {
    setLoadingLog(true);
    try {
      const params = { limit: 100 };
      if (dateVal) {
        params.date = dayjs(dateVal).format('YYYY-MM-DD');
      }
      const res = await api.get('/api/swm/expenses', { params });
      if (res.data?.success) {
        setTransactions(res.data.data || []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      console.error('Fetch transactions error:', e);
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchAdminCategories();
  }, []);

  useEffect(() => {
    if (currentView === 'log') {
      fetchTransactions(filterDate);
    }
  }, [currentView, filterDate]);

  // Handle Withdrawal (Outbound Money) Submit
  const handleWithdrawalSubmit = async (values) => {
    setSubmitting(true);
    try {
      const isEmployee = isEmployeeCategory(values.category);
      let selectedEmployee = null;
      if (isEmployee && values.salesperson_id) {
        selectedEmployee = staff.find((u) => u.id === values.salesperson_id);
      }

      const payload = {
        operational_type: 'expense',
        category: isEmployee ? 'sales_withdrawal' : (values.category || 'general_expense'),
        subcategory: values.category,
        amount: values.amount,
        description: values.description?.trim(),
        recipient_name: isEmployee && selectedEmployee
          ? (selectedEmployee.full_name || selectedEmployee.username)
          : (values.recipient_name || values.category || 'مصروف تشغيلي'),
        salesperson_id: isEmployee ? values.salesperson_id : undefined
      };

      const res = await api.post('/api/swm/expenses', payload);
      if (res.data?.success) {
        message.success('تم تسجيل سند الصرف وخصم المبلغ من رصيد الدرج بنجاح');
        withdrawalForm.resetFields();
        setCurrentView('hub');
      } else {
        message.error(res.data?.message || 'فشل في تسجيل المصروف');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Deposit (Inbound Money) Submit
  const handleDepositSubmit = async (values) => {
    setSubmitting(true);
    try {
      const isEmployee = isEmployeeCategory(values.category);
      let selectedEmployee = null;
      if (isEmployee && values.salesperson_id) {
        selectedEmployee = staff.find((u) => u.id === values.salesperson_id);
      }

      const payload = {
        operational_type: 'returned_expense',
        category: 'refunded_expense',
        subcategory: values.category || 'استرداد متبقي مصروف',
        amount: values.amount,
        description: values.description?.trim(),
        recipient_name: isEmployee && selectedEmployee
          ? (selectedEmployee.full_name || selectedEmployee.username)
          : (values.recipient_name || values.category || 'استرداد نقدي للدرج'),
        salesperson_id: isEmployee ? values.salesperson_id : undefined
      };

      const res = await api.post('/api/swm/expenses', payload);
      if (res.data?.success) {
        message.success('تم تسجيل سند الاسترداد وإضافة المبلغ لرصيد الدرج بنجاح');
        depositForm.resetFields();
        setCurrentView('hub');
      } else {
        message.error(res.data?.message || 'فشل في تسجيل الاسترداد');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الاسترداد');
    } finally {
      setSubmitting(false);
    }
  };

  // Columns for 100% Read-Only Transactions Log
  const logColumns = [
    {
      title: 'الوقت والتاريخ',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (dt) => (
        <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
          {dayjs(dt).format('YYYY/MM/DD • HH:mm')}
        </span>
      )
    },
    {
      title: 'نوع الحركة',
      dataIndex: 'category',
      key: 'type',
      width: 150,
      render: (cat) => {
        const isDeposit = cat === 'refunded_expense';
        return (
          <Tag
            color={isDeposit ? 'green' : 'orange'}
            icon={isDeposit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
            style={{ fontWeight: 700, padding: '4px 10px', borderRadius: 8, fontSize: 12 }}
          >
            {isDeposit ? 'إيداع (مرتجع للدرج)' : 'سحب (سند مصروف)'}
          </Tag>
        );
      }
    },
    {
      title: 'بند المصروف',
      key: 'category_label',
      width: 180,
      render: (_, row) => {
        const label = row.subcategory || (row.category === 'refunded_expense' ? 'استرداد متبقي مصروف' : (row.category === 'sales_withdrawal' ? 'سلفة / سحب بائع' : 'مصروف عام'));
        return <span style={{ fontWeight: 600, color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Folder size={13} style={{ color: '#64748b' }} /> {label}</span>;
      }
    },
    {
      title: 'اسم الموظف المعني',
      key: 'employee_name',
      width: 170,
      render: (_, row) => {
        const isEmpRelated = row.salesperson_id || (row.category === 'sales_withdrawal') || (row.recipient_name && !row.recipient_name.includes('مصروف'));
        if (isEmpRelated && row.recipient_name) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} color="#ea580c" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {row.recipient_name}
              </span>
            </div>
          );
        }
        return <span style={{ fontSize: 12, color: '#94a3b8' }}>— (مصروف عام)</span>;
      }
    },
    {
      title: 'القيمة',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amt, row) => {
        const isDeposit = row.category === 'refunded_expense';
        return (
          <span style={{ fontWeight: 800, fontSize: 15, color: isDeposit ? '#059669' : '#ea580c' }}>
            {isDeposit ? '+' : '-'} {Number(amt).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </span>
        );
      }
    },
    {
      title: 'البيان / سبب الصرف أو الرد',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => (
        <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>
          {desc || '—'}
        </span>
      )
    },
    {
      title: 'سجل بواسطة',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by',
      width: 120,
      render: (name) => <span style={{ fontSize: 12, color: '#64748b' }}>{name || 'الكاشير'}</span>
    }
  ];

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 20px 48px', direction: 'rtl' }}>
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION / BREADCRUMB                                           */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 28,
          padding: '12px 20px',
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <Space size="middle" align="middle">
          <Button
            type="text"
            icon={<ArrowRight size={18} style={{ marginLeft: 6 }} />}
            onClick={() => {
              if (currentView === 'hub') {
                if (onNavigate) onNavigate('dashboard');
              } else {
                setCurrentView('hub');
              }
            }}
            style={{
              fontWeight: 700,
              color: '#1e293b',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 8
            }}
          >
            {currentView === 'hub' ? 'العودة للوحة الرئيسية' : 'العودة لإدارة المصروفات'}
          </Button>

          <span style={{ color: '#cbd5e1' }}>|</span>

          <Breadcrumb
            items={[
              {
                title: (
                  <span
                    onClick={() => onNavigate && onNavigate('dashboard')}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Home size={14} /> الرئيسية
                  </span>
                )
              },
              {
                title: (
                  <span
                    onClick={() => setCurrentView('hub')}
                    style={{ cursor: currentView !== 'hub' ? 'pointer' : 'default', fontWeight: 600, color: '#0f172a' }}
                  >
                    إدارة المصروفات
                  </span>
                )
              },
              ...(currentView !== 'hub'
                ? [
                    {
                      title: (
                        <span style={{ color: currentView === 'log' ? '#4f46e5' : currentView === 'withdrawal' ? '#ea580c' : '#10b981', fontWeight: 700 }}>
                          {currentView === 'log' && 'سجل الحركات (عرض فقط)'}
                          {currentView === 'withdrawal' && 'تسجيل مصروف (سحب نقدي)'}
                          {currentView === 'deposit' && 'مصروف مرتد (إيداع نقدي)'}
                        </span>
                      )
                    }
                  ]
                : [])
            ]}
          />
        </Space>

        {currentView !== 'hub' && (
          <Button
            icon={<ArrowRight size={16} color="#DFCA95" style={{ marginLeft: 6 }} />}
            onClick={() => setCurrentView('hub')}
            style={{
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              height: 38,
              padding: '0 18px',
              backgroundColor: '#0B0F17',
              borderColor: '#C8A45C',
              color: '#DFCA95',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 3px 10px rgba(11, 15, 23, 0.25)',
              transition: 'all 0.2s ease'
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
            <span style={{ color: '#DFCA95', fontWeight: 800 }}>عرض الكروت الرئيسية</span>
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. VIEW A: THE 3 DISTINCT NAVIGATION CARDS (THE HUB)                      */}
      {/* ========================================================================= */}
      {currentView === 'hub' && (
        <div>
          {/* Header Title & Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10
              }}
            >
              <Coins size={15} />
              <span>إدارة النقدية والدرج — Expense Management Hub</span>
            </div>
            <Title level={2} style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a', fontSize: 'clamp(22px, 3.5vw, 30px)' }}>
              إدارة المصروفات وحركات الدرج
            </Title>
            <Paragraph style={{ color: '#64748b', fontSize: 15, maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
              اختر نوع الإجراء المطلوب: تتبع السجل التاريخي كقراءة فقط، تسجيل سحب مصروفات بخصم فوري، أو إيداع مبالغ مصروفات مرتجعة.
            </Paragraph>
          </div>

          {/* Centered Grid with EXACTLY 3 Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 24,
              alignItems: 'stretch'
            }}
          >
            {/* CARD 1: View Transactions Card (سجل الحركات - Read-Only) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCurrentView('log')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCurrentView('log');
                }
              }}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                border: '2px solid #c7d2fe',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.boxShadow = '0 16px 28px -6px rgba(99, 102, 241, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.08)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    <ReceiptText size={34} strokeWidth={2.2} />
                  </div>

                  <Tag
                    color="purple"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 10,
                      margin: 0,
                      background: '#eef2ff',
                      color: '#4338ca',
                      border: '1px solid #c7d2fe'
                    }}
                  >
                    عرض فقط (Read-Only)
                  </Tag>
                </div>

                <Title level={3} style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 22, color: '#312e81' }}>
                  سجل الحركات
                </Title>
                <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                  Transactions Log
                </Text>

                <Paragraph style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  استعراض ومراجعة كافة حركات السحب والإيداع السابقة للنقدية بالفرع في جدول تدقيق شامل ومقيد للعرض فقط بدون تعديل.
                </Paragraph>
              </div>

              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  background: '#6366f1',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <span>عرض سجل الحركات</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* CARD 2: Expense / Withdrawal Card (تسجيل مصروف - Outbound Money) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCurrentView('withdrawal')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCurrentView('withdrawal');
                }
              }}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                border: '2px solid #fed7aa',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = '#ea580c';
                e.currentTarget.style.boxShadow = '0 16px 28px -6px rgba(234, 88, 12, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#fed7aa';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 88, 12, 0.08)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(234, 88, 12, 0.3)'
                    }}
                  >
                    <ArrowUpRight size={34} strokeWidth={2.4} />
                  </div>

                  <Tag
                    color="orange"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 10,
                      margin: 0,
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa'
                    }}
                  >
                    خصم من الدرج (-)
                  </Tag>
                </div>

                <Title level={3} style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 22, color: '#9a3412' }}>
                  تسجيل مصروف
                </Title>
                <Text style={{ fontSize: 13, color: '#ea580c', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                  Record Expense (Withdrawal)
                </Text>

                <Paragraph style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  تسجيل سحب نقدية تشغيلية، فواتير مرافق، ضيافة، أو سلف بائعي الفرع مع الخصم الفوري والمباشر من رصيد الدرج.
                </Paragraph>
              </div>

              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  background: '#ea580c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <span>تسجيل سند صرف</span>
                <ArrowRight size={16} />
              </div>
            </div>

            {/* CARD 3: Returned Expense / Deposit Card (مصروف مرتد - Inbound Money) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCurrentView('deposit')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCurrentView('deposit');
                }
              }}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                border: '2px solid #a7f3d0',
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.boxShadow = '0 16px 28px -6px rgba(16, 185, 129, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#a7f3d0';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.08)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <ArrowDownLeft size={34} strokeWidth={2.4} />
                  </div>

                  <Tag
                    color="green"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 10,
                      margin: 0,
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    إضافة للدرج (+)
                  </Tag>
                </div>

                <Title level={3} style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 22, color: '#065f46' }}>
                  مصروف مرتد
                </Title>
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                  Returned Expense (Deposit)
                </Text>

                <Paragraph style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                  إيداع وتوريد مبالغ متبقية من مصاريف تشغيلية أو سلف سابقة إلى درج الكاشير لزيادة النقدية الفعلية بدقة وتوثيق الاسترداد.
                </Paragraph>
              </div>

              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <span>تسجيل سند استرداد</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW B: TRANSACTIONS LOG (100% READ-ONLY DATA TABLE)                   */}
      {/* ========================================================================= */}
      {currentView === 'log' && (
        <Card
          style={{
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          {/* Read-Only Banner Notice */}
          <Alert
            type="info"
            showIcon
            message="سجل الحركات — وضع القراءة والتدقيق فقط (Strictly Read-Only)"
            description="هذه الشاشة مخصصة فقط لاستعراض ومراجعة حركات السحب والإيداع السابقة. تم تعطيل وإلغاء أي أدوات للإضافة أو التعديل للحفاظ على نزاهة السجلات المالية."
            style={{ marginBottom: 20, borderRadius: 12 }}
          />

          {/* Filter Bar & Summary Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 20,
              padding: '14px 18px',
              background: '#f8fafc',
              borderRadius: 14,
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>تصفية حسب التاريخ:</span>
              <DatePicker
                value={filterDate}
                onChange={(d) => setFilterDate(d)}
                style={{ borderRadius: 8 }}
                allowClear
                placeholder="كل التواريخ"
              />
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => fetchTransactions(filterDate)}
                loading={loadingLog}
                style={{ borderRadius: 8 }}
              >
                تحديث
              </Button>
              <Button
                icon={<ArrowRight size={14} color="#DFCA95" style={{ marginLeft: 6 }} />}
                onClick={() => setCurrentView('hub')}
                style={{
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 12.5,
                  backgroundColor: '#0B0F17',
                  borderColor: '#C8A45C',
                  color: '#DFCA95',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(11, 15, 23, 0.2)'
                }}
              >
                <span style={{ color: '#DFCA95', fontWeight: 800 }}>عرض الكروت الرئيسية</span>
              </Button>
            </div>

            {/* Quick Summary Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '6px 14px', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>إجمالي السحب: </span>
                <strong style={{ color: '#ea580c', fontSize: 13 }}>
                  {(summary?.total_out || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                </strong>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>إجمالي الإيداع: </span>
                <strong style={{ color: '#059669', fontSize: 13 }}>
                  {(summary?.total_refunded || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                </strong>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: 10 }}>
                <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>صافي الحركة: </span>
                <strong style={{ color: '#2563eb', fontSize: 13 }}>
                  {(summary?.net_expense || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                </strong>
              </div>
            </div>
          </div>

          {/* 100% Read-Only Table (No action column, no add button) */}
          <Table
            columns={logColumns}
            dataSource={transactions}
            rowKey="id"
            loading={loadingLog}
            pagination={{ pageSize: 15, showTotal: (t) => `إجمالي الحركات: ${t}` }}
            style={{ borderRadius: 12, overflow: 'hidden' }}
          />
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW C: EXPENSE / WITHDRAWAL FORM (OUTBOUND ONLY - ORANGE/RED ACCENTS)  */}
      {/* ========================================================================= */}
      {currentView === 'withdrawal' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Card
            style={{
              borderRadius: 24,
              border: '2px solid #fed7aa',
              boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Header with Visual Deduction Cue */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                paddingBottom: 20,
                borderBottom: '1px solid #ffedd5',
                marginBottom: 24
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)'
                }}
              >
                <ArrowUpRight size={30} strokeWidth={2.4} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#9a3412', fontSize: 22 }}>
                  سند صرف مصروفات (سحب نقدي)
                </Title>
                <Text style={{ color: '#ea580c', fontSize: 13, fontWeight: 600 }}>
                  Withdrawal Movement — خصم فوري ومباشر من رصيد درج الكاشير
                </Text>
              </div>
            </div>

            <Alert
              type="warning"
              showIcon
              message="حركة سحب نقدية فقط (Withdrawal Only)"
              description="هذا النموذج مقيد حصرياً لعمليات الصرف والسحب. المبلغ المسجل هنا سيتم خصمه تلقائياً وبشكل فوري من نقدية الدرج الحالية."
              style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #fed7aa' }}
            />

            <Form
              form={withdrawalForm}
              layout="vertical"
              onFinish={handleWithdrawalSubmit}
              onValuesChange={handleWithdrawalValuesChange}
              initialValues={{
                category: undefined,
                amount: undefined
              }}
            >
              {/* Field 1: Expense Category (بند وتصنيف المصروف) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>بند وتصنيف المصروف (Expense Category) *</span>}
                name="category"
                rules={[{ required: true, message: 'يرجى اختيار بند وتصنيف المصروف' }]}
              >
                <Select
                  size="large"
                  placeholder="-- اختر تصنيف وبند المصروف --"
                  style={{ borderRadius: 10 }}
                  allowClear
                >
                  {adminCategories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Folder size={13} style={{ color: '#64748b' }} /> {cat.label}</span>
                        {cat.isEmployee && (
                          <Tag color="orange" style={{ margin: 0, fontSize: 11, borderRadius: 6, fontWeight: 700 }}>
                            سلفة موظف
                          </Tag>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Field 2: Employee Selection (اختيار الموظف) - CONDITIONAL: Appears ONLY for employee-related expenses */}
              {isEmployeeSelected && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1.5px dashed #fdba74',
                    borderRadius: 14,
                    padding: '16px 18px',
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <User size={16} color="#c2410c" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
                      طاقم عمل الفرع الحالي المستلم للسلفة ({staff.length} موظف مسجل)
                    </span>
                  </div>

                  <Form.Item
                    label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>اختيار الموظف (Employee Selection) *</span>}
                    name="salesperson_id"
                    rules={[{ required: true, message: 'يرجى اختيار الموظف المستلم للسلفة من طاقم الفرع' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      size="large"
                      placeholder={staff.length > 0 ? "-- اختر الموظف المستلم من طاقم عمل الفرع --" : "لا يوجد موظفون مسجلون بهذا الفرع"}
                      style={{ borderRadius: 10 }}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    >
                      {staff.map((u) => {
                        const nameStr = `${u.full_name || u.username} ${u.role === 'salesperson' ? '— (بائع الفرع)' : `— (${u.role})`}`;
                        return (
                          <Option key={u.id} value={u.id} label={nameStr}>
                            <Space size={6}><User size={13} style={{ verticalAlign: 'middle' }} /><span>{nameStr}</span></Space>
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </div>
              )}

              {/* Field 3: Amount (قيمة المصروف) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>قيمة المصروف المسحوب (Amount) *</span>}
                name="amount"
                rules={[
                  { required: true, message: 'يرجى إدخال مبلغ المصروف المطلوب سحبه' },
                  { type: 'number', min: 0.5, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                ]}
              >
                <InputNumber
                  size="large"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#ea580c'
                  }}
                  prefix={<span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginLeft: 8 }}>ج.م</span>}
                />
              </Form.Item>

              {/* Field 4: Reason/Description (بيان سبب الصرف) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>بيان سبب الصرف والملاحظات (Reason/Description) *</span>}
                name="description"
                rules={[{ required: true, message: 'يرجى كتابة بيان سبب الصرف' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="اكتب بيان سبب الصرف والملاحظات بدقة لتوثيقها في سجلات الخزينة ويومية الوردية..."
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={submitting}
                  icon={<MinusCircle size={18} style={{ marginLeft: 6 }} />}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    backgroundColor: '#ea580c',
                    borderColor: '#ea580c',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)'
                  }}
                >
                  تأكيد سحب المصروف (Confirm Withdrawal)
                </Button>

                <Button
                  size="large"
                  icon={<ArrowRight size={16} color="#DFCA95" style={{ marginLeft: 6 }} />}
                  onClick={() => setCurrentView('hub')}
                  style={{
                    borderRadius: 12,
                    fontWeight: 800,
                    height: 50,
                    padding: '0 24px',
                    backgroundColor: '#0B0F17',
                    borderColor: '#C8A45C',
                    color: '#DFCA95',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 3px 10px rgba(11, 15, 23, 0.25)'
                  }}
                >
                  <span style={{ color: '#DFCA95', fontWeight: 800 }}>عرض الكروت الرئيسية</span>
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW D: RETURNED EXPENSE / DEPOSIT FORM (INBOUND ONLY - GREEN ACCENTS) */}
      {/* ========================================================================= */}
      {currentView === 'deposit' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Card
            style={{
              borderRadius: 24,
              border: '2px solid #a7f3d0',
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Header with Visual Addition Cue */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                paddingBottom: 20,
                borderBottom: '1px solid #dcfce7',
                marginBottom: 24
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                }}
              >
                <ArrowDownLeft size={30} strokeWidth={2.4} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#065f46', fontSize: 22 }}>
                  سند استرداد مصروفات (إيداع نقدي)
                </Title>
                <Text style={{ color: '#059669', fontSize: 13, fontWeight: 600 }}>
                  Deposit Movement — توريد وإضافة نقدية مباشرة لرصيد درج الكاشير
                </Text>
              </div>
            </div>

            <Alert
              type="success"
              showIcon
              message="حركة إيداع وتوريد فقط (Deposit Only)"
              description="هذا النموذج مقيد حصرياً لعمليات إرجاع المبالغ والمصروفات المرتدة. المبلغ المسجل هنا سيتم إضافته فورياً إلى نقدية الدرج الحالية."
              style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #a7f3d0' }}
            />

            <Form
              form={depositForm}
              layout="vertical"
              onFinish={handleDepositSubmit}
              onValuesChange={handleDepositValuesChange}
              initialValues={{
                category: undefined,
                amount: undefined
              }}
            >
              {/* Field 1: Expense Category (بند المصروف) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>بند المصروف المسترد (Expense Category) *</span>}
                name="category"
                rules={[{ required: true, message: 'يرجى اختيار بند وتصنيف المصروف المسترد' }]}
              >
                <Select
                  size="large"
                  placeholder="-- اختر بند وتصنيف المصروف المسترد --"
                  style={{ borderRadius: 10 }}
                  allowClear
                >
                  {adminCategories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Folder size={13} style={{ color: '#64748b' }} /> {cat.label}</span>
                        {cat.isEmployee && (
                          <Tag color="green" style={{ margin: 0, fontSize: 11, borderRadius: 6, fontWeight: 700 }}>
                            سلفة موظف
                          </Tag>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Field 2: Employee Selection (اختيار الموظف) - CONDITIONAL: Appears ONLY for employee-related expenses */}
              {isDepositEmployeeSelected && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px dashed #86efac',
                    borderRadius: 14,
                    padding: '16px 18px',
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <User size={16} color="#15803d" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      الموظف المورد لمتبقي السلفة (طاقم عمل الفرع الحالي فقط — {staff.length} موظف مسجل)
                    </span>
                  </div>

                  <Form.Item
                    label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>اختيار الموظف (Employee Selection) *</span>}
                    name="salesperson_id"
                    rules={[{ required: true, message: 'يرجى اختيار الموظف المورد للمبلغ من طاقم الفرع' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      size="large"
                      placeholder={staff.length > 0 ? "-- اختر الموظف من طاقم عمل الفرع --" : "لا يوجد موظفون مسجلون بهذا الفرع"}
                      style={{ borderRadius: 10 }}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                    >
                      {staff.map((u) => {
                        const nameStr = `${u.full_name || u.username} ${u.role === 'salesperson' ? '— (بائع الفرع)' : `— (${u.role})`}`;
                        return (
                          <Option key={u.id} value={u.id} label={nameStr}>
                            <Space size={6}><User size={13} style={{ verticalAlign: 'middle' }} /><span>{nameStr}</span></Space>
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </div>
              )}

              {/* Field 3: Amount (القيمة المودعة) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>قيمة المبلغ المودع في الدرج (Amount) *</span>}
                name="amount"
                rules={[
                  { required: true, message: 'يرجى إدخال المبلغ المودع' },
                  { type: 'number', min: 0.5, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                ]}
              >
                <InputNumber
                  size="large"
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#059669'
                  }}
                  prefix={<span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginLeft: 8 }}>ج.م</span>}
                />
              </Form.Item>

              {/* Field 4: Reason/Description (البيان / سبب الصرف أو الرد) */}
              <Form.Item
                label={<span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>البيان / سبب الرد وتفاصيل الإيداع (Reason/Description) *</span>}
                name="description"
                rules={[{ required: true, message: 'يرجى كتابة سبب الإيداع أو الاسترداد بالتفصيل للتدقيق' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="اكتب بيان سبب الرد بدقة (مثال: متبقي من سلفة شراء أدوات نظافة، إرجاع عهدة، إلخ)..."
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>

              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={submitting}
                  icon={<PlusCircle size={18} style={{ marginLeft: 6 }} />}
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  تأكيد إيداع المرتد (Confirm Deposit/Return)
                </Button>

                <Button
                  size="large"
                  icon={<ArrowRight size={16} color="#DFCA95" style={{ marginLeft: 6 }} />}
                  onClick={() => setCurrentView('hub')}
                  style={{
                    borderRadius: 12,
                    fontWeight: 800,
                    height: 50,
                    padding: '0 24px',
                    backgroundColor: '#0B0F17',
                    borderColor: '#C8A45C',
                    color: '#DFCA95',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: '0 3px 10px rgba(11, 15, 23, 0.25)'
                  }}
                >
                  <span style={{ color: '#DFCA95', fontWeight: 800 }}>عرض الكروت الرئيسية</span>
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}
    </div>
  );
}
