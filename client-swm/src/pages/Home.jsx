import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Divider,
  Tooltip,
  DatePicker,
  Radio,
  Popconfirm,
  Alert,
  Spin,
  Badge
} from 'antd';
import dayjs from 'dayjs';
import {
  Home as HomeIcon,
  PackagePlus,
  Store,
  UserPlus,
  Truck,
  Receipt,
  ShoppingBag,
  ScanLine,
  ArrowLeftRight,
  ClipboardCheck,
  SlidersHorizontal,
  Layers,
  BarChart3,
  TrendingUp,
  BookOpenCheck,
  Landmark,
  CalendarCheck,
  Wallet,
  CheckCircle2,
  Sparkles,
  Clock,
  Activity,
  Plus,
  Boxes,
  Users,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Building2,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import api from '../api';
import BarcodeImage from '../components/BarcodeImage';
import { generateValidEAN13 } from '../utils/barcode';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Home({ currentUser, onNavigate }) {
  const isRetailBranch = currentUser?.branchType === 'retail_branch';

  // Stats
  const [stats, setStats] = useState({
    productsCount: 0,
    branchesCount: 0,
    usersCount: 0,
    totalStock: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);

  // Executive Financial & Orders Pulse for Owner
  const [executivePulse, setExecutivePulse] = useState({
    todayInflow: 0,
    invoicesCount: 0,
    netCashflow: 0,
    totalOutflow: 0,
    pendingOrders: 0,
    hasData: false
  });

  // Quick Action Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Dropdown options for modals
  const [categories, setCategories] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  // Forms
  const [productForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const [supplierForm] = Form.useForm();
  const [expenseForm] = Form.useForm();

  const watchedProductBarcode = Form.useWatch('barcode', productForm);

  const [submitting, setSubmitting] = useState(false);

  // Seller Payroll Disbursal State
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState(dayjs().format('YYYY-MM'));
  const [sellerSummary, setSellerSummary] = useState(null);
  const [loadingSellerSummary, setLoadingSellerSummary] = useState(false);
  const [deductionsAmount, setDeductionsAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [payrollChannel, setPayrollChannel] = useState('cash');
  const [payrollNotes, setPayrollNotes] = useState('');
  const [submittingPayroll, setSubmittingPayroll] = useState(false);
  const [advancesModalOpen, setAdvancesModalOpen] = useState(false);
  const [safeBalances, setSafeBalances] = useState({ cash: 0, visa: 0, transfer: 0, total: 0 });

  // Branch Expense Categories State
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/api/swm/users', { params: { limit: 200, status: 'active' } });
      if (res.data?.success) setEmployeesList(res.data.data || []);
    } catch (e) {
      console.error('Fetch employees error:', e);
    }
  };

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

  const fetchSellerSummary = async (sellerId, monthVal) => {
    if (!sellerId) {
      setSellerSummary(null);
      return;
    }
    setLoadingSellerSummary(true);
    try {
      const res = await api.get(`/api/swm/treasury/employee-payroll-summary/${sellerId}`, {
        params: { month: monthVal || payrollMonth }
      });
      if (res.data?.success) {
        setSellerSummary(res.data.data);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في تحميل بيانات مرتب البائع');
    } finally {
      setLoadingSellerSummary(false);
    }
  };

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

  const handleAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      message.warning('يرجى كتابة اسم تصنيف المصروف أولاً');
      return;
    }
    setAddingCategory(true);
    try {
      const res = await api.post('/api/swm/pos/expense-categories', { category: newCategoryInput.trim() });
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

  const handleDisburseSellerPayroll = async () => {
    if (!sellerSummary) {
      message.warning('يرجى اختيار بائع أولاً');
      return;
    }
    const baseSal = parseFloat(sellerSummary.base_salary || 0);
    const adv = parseFloat(sellerSummary.advances_total || 0);
    const ded = parseFloat(deductionsAmount || 0);
    const net = Math.round((baseSal - adv - ded) * 100) / 100;

    if (net <= 0) {
      message.error('صافي القبض يجب أن يكون أكبر من الصفر');
      return;
    }

    const avail = safeBalances[payrollChannel] || 0;
    if (net > avail + 0.01) {
      message.error(`رصيد الخزينة في قناة ${payrollChannel === 'cash' ? 'الكاش' : payrollChannel === 'visa' ? 'الفيزا' : 'التحويل'} (${avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض (${net.toLocaleString()} ج.م)`);
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
        bonus: 0,
        channel: payrollChannel,
        notes: payrollNotes
      };
      const res = await api.post('/api/swm/treasury/pay-salary', payload);
      if (res.data?.success) {
        message.success(res.data.message);
        setDeductionsAmount(0);
        setDeductionReason('');
        setPayrollNotes('');
        fetchSafeBalances();
        fetchSellerSummary(sellerSummary.employee.id, payrollMonth);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'تعذر إتمام صرف القبض');
    } finally {
      setSubmittingPayroll(false);
    }
  };

  // Fetch initial dashboard stats & lookup lists
  const fetchHomeData = async () => {
    setLoadingStats(true);
    try {
      const [prodRes, branchRes, userRes, healthRes, catRes, dailyRes, orderRes] = await Promise.allSettled([
        api.get('/api/swm/products?limit=1'),
        api.get('/api/swm/branches'),
        api.get('/api/swm/users?limit=1'),
        api.get('/health'),
        api.get('/api/swm/categories'),
        api.get('/api/swm/branches-daily?limit=1'),
        api.get('/api/swm/orders?limit=1&status=pending')
      ]);

      const productsCount = prodRes.status === 'fulfilled' ? prodRes.value.data?.meta?.total || prodRes.value.data?.data?.length || 0 : 0;
      const branches = branchRes.status === 'fulfilled' ? branchRes.value.data?.data || [] : [];
      const usersCount = userRes.status === 'fulfilled' ? userRes.value.data?.meta?.total || userRes.value.data?.data?.length || 0 : 0;
      const health = healthRes.status === 'fulfilled' ? healthRes.value.data : null;
      const cats = catRes.status === 'fulfilled' ? catRes.value.data?.data || [] : [];

      if (dailyRes.status === 'fulfilled' && dailyRes.value.data?.success) {
        const d = dailyRes.value.data.data;
        const oTotal = orderRes.status === 'fulfilled' ? orderRes.value.data?.meta?.total || 0 : 0;
        setExecutivePulse({
          todayInflow: d.kpi?.totalInflow || 0,
          invoicesCount: d.kpi?.invoicesCount || 0,
          netCashflow: d.kpi?.netCashflow || 0,
          totalOutflow: d.kpi?.totalOutflow || 0,
          pendingOrders: oTotal,
          hasData: true
        });
      }

      setStats({
        productsCount,
        branchesCount: branches.length,
        usersCount
      });
      setBranchesList(branches);
      setCategories(cats);
      setSystemHealth(health);
    } catch (e) {
      console.error('Home stats load error:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
    fetchEmployeesList();
    fetchSafeBalances();
    fetchExpenseCategories();
  }, []);

  // Quick helper to generate unique product code & valid EAN-13 barcode
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = generateValidEAN13('622');
    productForm.setFieldsValue({
      product_code: code,
      barcode: barcode
    });
  };

  // Handlers for Modals
  const handleCreateProduct = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        product_code: values.product_code?.trim(),
        product_name: values.product_name?.trim(),
        barcode: values.barcode?.trim() || null,
        category_id: values.category_id || null,
        cost_price: Number(values.cost_price) || 0,
        selling_price: Number(values.selling_price) || 0,
        track_inventory: true
      };

      const res = await api.post('/api/swm/products', payload);
      if (res.data?.success) {
        message.success(`تم إنشاء المنتج "${payload.product_name}" بنجاح`);
        setProductModalOpen(false);
        productForm.resetFields();
        fetchHomeData();
      } else {
        message.error(res.data?.message || 'فشل في حفظ المنتج');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ أثناء إنشاء المنتج');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBranch = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/swm/branches', values);
      if (res.data?.success) {
        message.success(`تم إنشاء الفرع "${values.branch_name}" وبيانات الدخول بنجاح`);
        setBranchModalOpen(false);
        branchForm.resetFields();
        fetchHomeData();
      } else {
        message.error(res.data?.message || 'فشل في إنشاء الفرع');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ أثناء إنشاء الفرع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/swm/users', values);
      if (res.data?.success) {
        message.success(`تم إنشاء حساب الموظف "${values.full_name}" بنجاح`);
        setUserModalOpen(false);
        userForm.resetFields();
        fetchHomeData();
      } else {
        message.error(res.data?.message || 'فشل في إنشاء حساب الموظف');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ أثناء إضافة المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        supplier_name: values.supplier_name?.trim(),
        contact_person: values.contact_person ? values.contact_person.trim() : null,
        phone: values.phone ? values.phone.trim() : null,
        address: values.address ? values.address.trim() : null,
        opening_balance: parseFloat(values.opening_balance) || 0
      };

      const res = await api.post('/api/swm/suppliers', payload);
      if (res.data?.success) {
        message.success(`تم إضافة المورد "${payload.supplier_name}" بنجاح`);
        setSupplierModalOpen(false);
        supplierForm.resetFields();
      } else {
        message.error(res.data?.message || 'فشل في حفظ بيانات المورد');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ أثناء إضافة المورد');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        category: values.category,
        amount: Number(values.amount),
        description: values.description || 'مصروف إداري / تشغيلي سريع',
        payment_method: values.payment_method || 'cash'
      };

      const res = await api.post('/api/swm/expenses', payload);
      if (res.data?.success) {
        message.success('تم تسجيل المصروف بنجاح وترحيله للخزينة');
        setExpenseModalOpen(false);
        expenseForm.resetFields();
      } else {
        message.error(res.data?.message || 'فشل في تسجيل المصروف');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ أثناء حفظ المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <div style={{ padding: '4px 0 24px' }}>
      {/* Top Welcome / Hero Banner - Responsive on Mobile */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          borderRadius: 16,
          padding: 'clamp(16px, 3vw, 24px) clamp(14px, 3.5vw, 28px)',
          color: '#ffffff',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -60,
            left: -60,
            width: 240,
            height: 240,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ zIndex: 1, minWidth: 260, flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.1)', padding: '4px 12px', borderRadius: 20, marginBottom: 8 }}>
              <Sparkles size={14} color="#a5b4fc" />
              <span style={{ fontSize: 12, color: '#e0e7ff', fontWeight: 600 }}>منصة العمليات الموحدة — يوكا ستور</span>
            </div>
            <Title level={2} style={{ color: '#ffffff', margin: '2px 0 6px', fontWeight: 700, fontSize: 'clamp(18px, 4.5vw, 26px)' }}>
              مرحباً بك، {currentUser?.fullName || currentUser?.username || 'المسؤول'}
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', lineHeight: 1.4 }}>
              الرئيسية • مركز التحكم والإجراءات السريعة لكافة العمليات الإدارية، المخازن، ونقاط البيع.
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 1, flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '8px 14px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 12, fontWeight: 600 }}>
                <Clock size={13} />
                <span>{todayFormatted}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span className="pulse-dot" />
                <span style={{ color: '#34d399', fontSize: 11, fontWeight: 500 }}>
                  {systemHealth ? 'الخادم وقاعدة البيانات متصلة' : 'متصل بالشبكة المركزية'}
                </span>
              </div>
            </div>

            <Button
              icon={<RefreshCw size={15} style={{ marginLeft: 4 }} />}
              onClick={fetchHomeData}
              loading={loadingStats}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                height: 40,
                borderRadius: 10
              }}
            >
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN DASHBOARD SCREEN (CARD-BASED NAVIGATION)             */}
      {/* ========================================================= */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 20, background: '#4f46e5', borderRadius: 2 }} />
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                بوابة العمليات الرئيسية (Card-Based Navigation)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                شاشات العمليات الأساسية لنقاط البيع وإدارة الخزينة والوردية اليومية
              </Text>
            </div>
          </div>
          <Tag color="geekblue" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>
            ⚡ لوحة التحكم والوصول السريع
          </Tag>
        </div>

        <div className="pos-nav-hero-grid">
          {/* Card 1: New Sales Invoice (فاتورة بيع جديدة) */}
          <div
            role="button"
            tabIndex={0}
            className="pos-nav-hero-card pos-nav-card-sale"
            onClick={() => onNavigate('pos')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('pos');
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <ScanLine size={32} strokeWidth={2.2} />
                </div>
                <Tag
                  color="green"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    margin: 0,
                    border: 'none',
                    background: '#dcfce7',
                    color: '#15803d'
                  }}
                >
                  نقطة البيع (POS) • F11
                </Tag>
              </div>

              <div style={{ marginBottom: 10 }}>
                <Title level={3} style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 22, color: '#065f46' }}>
                  فاتورة بيع جديدة
                </Title>
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  New Sales Invoice
                </Text>
              </div>

              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                فتح شاشة الكاشير السريعة، إدخال الباركود بالماسح أو يدوياً، محاسبة العملاء (كاش، فيزا، تحويل)، وإصدار فواتير البيع أو المرتجعات.
              </p>
            </div>

            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid #d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                بدء فاتورة بيع جديدة
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#dcfce7',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          </div>

          {/* Card 2: Expense Management (إدارة المصروفات) */}
          <div
            role="button"
            tabIndex={0}
            className="pos-nav-hero-card pos-nav-card-expense"
            onClick={() => onNavigate('expenses_selection')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('expenses_selection');
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(234, 88, 12, 0.3)'
                  }}
                >
                  <Wallet size={32} strokeWidth={2.2} />
                </div>
                <Tag
                  color="orange"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    margin: 0,
                    border: 'none',
                    background: '#ffedd5',
                    color: '#c2410c'
                  }}
                >
                  حركات الخزينة والدرج
                </Tag>
              </div>

              <div style={{ marginBottom: 10 }}>
                <Title level={3} style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 22, color: '#9a3412' }}>
                  إدارة المصروفات
                </Title>
                <Text style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>
                  Expense Management
                </Text>
              </div>

              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                تسجيل مصروفات التشغيل اليومية، فواتير ومرافق، سحب نقدية للبائعين مع الخصم من الدرج، أو تسجيل استرداد المصروف المرتد.
              </p>
            </div>

            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid #ffedd5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>
                اختيار نوع المصروف وتسجيل الحركة
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#ffedd5',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          </div>

          {/* Card 3: Seller's Daily Report (صفحة يومية البائع) */}
          <div
            role="button"
            tabIndex={0}
            className="pos-nav-hero-card pos-nav-card-shift"
            onClick={() => onNavigate('daily_shift')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onNavigate('daily_shift');
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 18px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <CalendarCheck size={32} strokeWidth={2.2} />
                </div>
                <Tag
                  color="purple"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    margin: 0,
                    border: 'none',
                    background: '#ede9fe',
                    color: '#6d28d9'
                  }}
                >
                  تقرير الوردية والتقفيل
                </Tag>
              </div>

              <div style={{ marginBottom: 10 }}>
                <Title level={3} style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 22, color: '#3730a3' }}>
                  صفحة يومية البائع
                </Title>
                <Text style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>
                  Seller's Daily Report
                </Text>
              </div>

              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                متابعة إجمالي مبيعات اليوم، مطابقة تفاصيل الدفع (كاش، فيزا، تحويل)، مراقبة رصيد الدرج الفعلي، وإنهاء وإغلاق وردية البائع.
              </p>
            </div>

            <div
              style={{
                paddingTop: 16,
                borderTop: '1px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>
                عرض اليومية وجرد النقدية
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#ede9fe',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2 NEW CARDS: 1. SELLER PAYOUT | 2. BRANCH EXPENSE CATEGORIES */}
      {/* ========================================================= */}
      <div style={{ marginBottom: 28 }}>
        <Row gutter={[16, 16]}>
          {/* Card 1: Seller Payroll & Disbursal */}
          <Col xs={24} lg={13}>
            <Card
              style={{
                borderRadius: 16,
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                height: '100%',
                background: '#ffffff'
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Space size={8}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} color="#2563eb" />
                    </div>
                    <div>
                      <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                        صرف وقبض رواتب البائعين
                      </Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>خصم من الخزينة وقيد مباشر باليومية الإدارية</Text>
                    </div>
                  </Space>
                  <Space size={6}>
                    <Text type="secondary" style={{ fontSize: 11 }}>شهر القبض:</Text>
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
                          if (selectedSellerId) fetchSellerSummary(selectedSellerId, m);
                        }
                      }}
                      style={{ width: 115 }}
                    />
                  </Space>
                </div>
              }
            >
              {/* Seller Selector */}
              <div style={{ marginBottom: 14 }}>
                <Select
                  showSearch
                  allowClear
                  placeholder="🔍 اختر أو ابحث عن اسم البائع..."
                  style={{ width: '100%' }}
                  size="large"
                  value={selectedSellerId}
                  onChange={(val) => {
                    setSelectedSellerId(val);
                    setDeductionsAmount(0);
                    setDeductionReason('');
                    if (val) fetchSellerSummary(val, payrollMonth);
                    else setSellerSummary(null);
                  }}
                  filterOption={(input, option) => {
                    const txt = option?.filterText || '';
                    return txt.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {employeesList.map(emp => (
                    <Option
                      key={emp.id}
                      value={emp.id}
                      filterText={`${emp.full_name} ${emp.phone || ''} ${emp.branch_name || ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={6}>
                          <Text strong>{emp.full_name}</Text>
                          {emp.phone && <Text type="secondary" style={{ fontSize: 11 }}>({emp.phone})</Text>}
                        </Space>
                        <Space size={4}>
                          <Tag color="cyan" style={{ fontSize: 10 }}>{emp.branch_name || 'الفرع الرئيسي'}</Tag>
                          <Tag color="geekblue" style={{ fontSize: 10 }}>مرتب: {parseFloat(emp.salary || 0).toLocaleString()} ج.م</Tag>
                        </Space>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              {loadingSellerSummary ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
              ) : !sellerSummary ? (
                <div style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed #cbd5e1'
                }}>
                  <Users size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                  <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                    اختر اسم البائع لعرض بيانات القبض، المصروفات والسلف المسحوبة، وحساب الصافي وخصمه من الخزينة.
                  </div>
                </div>
              ) : (
                <div>
                  {/* Seller Header Info */}
                  <div style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: 6
                  }}>
                    <Space size={6}>
                      <Text strong style={{ fontSize: 13, color: '#1e293b' }}>{sellerSummary.employee.full_name}</Text>
                      {sellerSummary.employee.phone && (
                        <Text type="secondary" style={{ fontSize: 11 }}>• {sellerSummary.employee.phone}</Text>
                      )}
                    </Space>
                    <Space size={4}>
                      <Tag color="blue">{sellerSummary.employee.branch_name || 'الفرع الرئيسي'}</Tag>
                      <Tag color="purple">{sellerSummary.employee.role === 'salesperson' ? 'بائع' : 'موظف'}</Tag>
                    </Space>
                  </div>

                  {sellerSummary.already_paid && (
                    <Alert
                      type="warning"
                      showIcon
                      message={`تنبيه: تم صرف راتب شهر (${payrollMonth}) لهذا البائع مسبقاً!`}
                      style={{ marginBottom: 12, borderRadius: 8, fontSize: 12 }}
                    />
                  )}

                  {/* Math Breakdown: Base Salary - Expenses - Deductions = Net Payout */}
                  <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                    {/* 1. Base Salary */}
                    <Col xs={24} sm={8}>
                      <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: 10, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>المرتب الأساسي</Text>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                          {parseFloat(sellerSummary.base_salary || 0).toLocaleString()} ج.م
                        </div>
                      </div>
                    </Col>

                    {/* 2. Expenses & Advances Taken */}
                    <Col xs={24} sm={8}>
                      <div style={{ padding: '10px', background: '#fef2f2', borderRadius: 10, textAlign: 'center', border: '1px solid #fecaca' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>مصروفات وسلف الفترة (-)</Text>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
                          - {parseFloat(sellerSummary.advances_total || 0).toLocaleString()} ج.م
                        </div>
                        {sellerSummary.advances_list?.length > 0 && (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, height: 'auto', fontSize: 10, color: '#b91c1c' }}
                            onClick={() => setAdvancesModalOpen(true)}
                          >
                            ({sellerSummary.advances_list.length} حركة - عرض)
                          </Button>
                        )}
                      </div>
                    </Col>

                    {/* 3. Deductions Field */}
                    <Col xs={24} sm={8}>
                      <div style={{ padding: '8px 10px', background: '#fff1f2', borderRadius: 10, border: '1px solid #ffe4e6' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>الخصومات (-)</Text>
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
                          style={{ marginTop: 4, fontSize: 10 }}
                        />
                      </div>
                    </Col>
                  </Row>

                  {/* Net Payout Banner & Disburse Action */}
                  {(() => {
                    const baseSal = parseFloat(sellerSummary.base_salary || 0);
                    const adv = parseFloat(sellerSummary.advances_total || 0);
                    const ded = parseFloat(deductionsAmount || 0);
                    const net = Math.round((baseSal - adv - ded) * 100) / 100;
                    const avail = safeBalances[payrollChannel] || 0;
                    const canAfford = net > 0 && net <= avail;

                    return (
                      <div style={{
                        padding: '12px 16px',
                        background: net > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
                        borderRadius: 12,
                        border: `1.5px solid ${net > 0 ? '#86efac' : '#e2e8f0'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                          <div>
                            <Text strong style={{ fontSize: 13, color: '#166534' }}>صافي القبض المستحق:</Text>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>
                              {net > 0 ? net.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : 0} ج.م
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              [الأساسي {baseSal.toLocaleString()} - المصروفات {adv.toLocaleString()} - الخصومات {ded.toLocaleString()} = {net.toLocaleString()} ج.م]
                            </Text>
                          </div>

                          <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                              صرف من قناة الخزينة:
                            </Text>
                            <Radio.Group
                              size="small"
                              value={payrollChannel}
                              onChange={(e) => setPayrollChannel(e.target.value)}
                            >
                              <Radio.Button value="cash">💵 كاش</Radio.Button>
                              <Radio.Button value="visa">💳 فيزا</Radio.Button>
                              <Radio.Button value="transfer">📱 تحويل</Radio.Button>
                            </Radio.Group>
                            <div style={{ fontSize: 10, marginTop: 4, color: avail >= net ? '#16a34a' : '#dc2626' }}>
                              رصيد الخزينة المتاح: {avail.toLocaleString()} ج.م
                            </div>
                          </div>
                        </div>

                        <Row gutter={8} align="middle">
                          <Col xs={24} sm={14}>
                            <Input
                              placeholder="ملاحظات الصرف..."
                              value={payrollNotes}
                              onChange={(e) => setPayrollNotes(e.target.value)}
                              size="middle"
                            />
                          </Col>
                          <Col xs={24} sm={10}>
                            <Popconfirm
                              title={`تأكيد صرف قبض ${sellerSummary.employee.full_name} بمبلغ ${net.toLocaleString()} ج.م؟`}
                              description="سيتم خصم المبلغ من الخزينة وقيده كعملية باليومية الإدارية."
                              okText="تأكيد الصرف"
                              cancelText="إلغاء"
                              okType="primary"
                              onConfirm={handleDisburseSellerPayroll}
                              disabled={net <= 0 || !canAfford || submittingPayroll}
                            >
                              <Button
                                type="primary"
                                block
                                size="middle"
                                loading={submittingPayroll}
                                disabled={net <= 0 || !canAfford}
                                style={{
                                  backgroundColor: canAfford ? '#16a34a' : undefined,
                                  borderColor: canAfford ? '#16a34a' : undefined,
                                  fontWeight: 700
                                }}
                              >
                                صرف القبض وخصم من الخزينة
                              </Button>
                            </Popconfirm>
                          </Col>
                        </Row>

                        {!canAfford && net > 0 && (
                          <div style={{ marginTop: 6, textAlign: 'center', color: '#dc2626', fontSize: 11 }}>
                            ⚠️ رصيد الخزينة في هذه القناة ({avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض ({net.toLocaleString()} ج.م)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          </Col>

          {/* Card 2: Branch Expense Categories (تسمع في كل الفروع) */}
          <Col xs={24} lg={11}>
            <Card
              style={{
                borderRadius: 16,
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff'
              }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Space size={8}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={18} color="#d97706" />
                    </div>
                    <div>
                      <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                        تصنيفات وبنود المصروفات
                      </Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>تسمع فورياً في كافة الفروع ونقاط البيع</Text>
                    </div>
                  </Space>
                  <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6 }}>
                    {expenseCategories.length} تصنيف معتمد
                  </Tag>
                </div>
              }
            >
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  أي تصنيف يتم إضافته هنا يظهر تلقائياً لجميع الفروع والكاشيرات بالـ POS عند تسجيل أي سحب أو مصروف:
                </Text>
              </div>

              {/* Categories Tags Container */}
              <div style={{
                flex: 1,
                minHeight: 180,
                maxHeight: 250,
                overflowY: 'auto',
                padding: 12,
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                marginBottom: 14
              }}>
                {loadingCategories ? (
                  <div style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></div>
                ) : expenseCategories.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>لا توجد تصنيفات مسجلة</div>
                ) : (
                  <Space size={[8, 10]} wrap>
                    {expenseCategories.map(cat => (
                      <Tag
                        key={cat}
                        closable
                        onClose={(e) => {
                          e.preventDefault();
                          handleDeleteCategory(cat);
                        }}
                        style={{
                          fontSize: 12,
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

              {/* Add New Category Input & Button */}
              <div style={{
                background: '#fffbeb',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #fde68a'
              }}>
                <div style={{ marginBottom: 6, fontWeight: 700, color: '#92400e', fontSize: 12 }}>
                  ➕ إضافة تصنيف مصروف جديد وتعميمه:
                </div>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="مثال: أدوات ومهمات مكتبية، نقل بضاعة، إنترنت..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onPressEnter={handleAddCategory}
                    size="middle"
                  />
                  <Button
                    type="primary"
                    onClick={handleAddCategory}
                    loading={addingCategory}
                    style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 700 }}
                  >
                    إضافة لكافة الفروع
                  </Button>
                </Space.Compact>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Executive Financial Pulse Strip - Mobile 2x2 Grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 18, background: '#10b981', borderRadius: 2 }} />
            <Title level={4} style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
              مؤشرات اليوم المالية والتشغيلية (نبض الأعمال اللحظي)
            </Title>
          </div>
          <Button
            type="link"
            size="small"
            onClick={() => onNavigate('branches_daily')}
            style={{ fontWeight: 600, color: '#4f46e5', padding: 0 }}
          >
            تقرير يومية الفروع المجمعة ⬅
          </Button>
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={12} sm={12} lg={6}>
            <div
              className="executive-pulse-card"
              onClick={() => onNavigate('branches_daily')}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)',
                border: '1px solid #a7f3d0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>📥 مبيعات اليوم</span>
                <ArrowUpRight size={15} color="#059669" />
              </div>
              <div style={{ color: '#065f46', fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: 800 }}>
                {executivePulse.todayInflow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>ج.م</span>
              </div>
              <span style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>مبيعات الصالات المعتمدة</span>
            </div>
          </Col>

          <Col xs={12} sm={12} lg={6}>
            <div
              className="executive-pulse-card"
              onClick={() => onNavigate('branches_daily')}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                border: '1px solid #bfdbfe'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>🧾 فواتير اليوم</span>
                <CalendarCheck size={15} color="#2563eb" />
              </div>
              <div style={{ color: '#1e40af', fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: 800 }}>
                {executivePulse.invoicesCount.toLocaleString('ar-EG')}
                <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>فاتورة</span>
              </div>
              <span style={{ fontSize: 11, color: '#2563eb', marginTop: 4 }}>عمليات تمت بالفروع اليوم</span>
            </div>
          </Col>

          <Col xs={12} sm={12} lg={6}>
            <div
              className="executive-pulse-card"
              style={{
                background: executivePulse.netCashflow >= 0 ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' : 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
                border: `1px solid ${executivePulse.netCashflow >= 0 ? '#bbf7d0' : '#fecdd3'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: executivePulse.netCashflow >= 0 ? '#15803d' : '#be123c' }}>💎 صافي اليومية</span>
                <Wallet size={15} color={executivePulse.netCashflow >= 0 ? '#16a34a' : '#e11d48'} />
              </div>
              <div style={{ color: executivePulse.netCashflow >= 0 ? '#14532d' : '#9f1239', fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: 800 }}>
                {executivePulse.netCashflow.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>ج.م</span>
              </div>
              <span style={{ fontSize: 11, color: executivePulse.netCashflow >= 0 ? '#15803d' : '#be123c', marginTop: 4 }}>الوارد ناقص المنصرف</span>
            </div>
          </Col>

          <Col xs={12} sm={12} lg={6}>
            <div
              className="executive-pulse-card"
              onClick={() => onNavigate('orders')}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                border: '1px solid #e9d5ff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#7e22ce' }}>🛒 طلبات أونلاين</span>
                <ShoppingBag size={15} color="#9333ea" />
              </div>
              <div style={{ color: '#6b21a8', fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: 800 }}>
                {executivePulse.pendingOrders.toLocaleString('ar-EG')}
                <span style={{ fontSize: 11, fontWeight: 500, marginRight: 4 }}>طلب</span>
              </div>
              <span style={{ fontSize: 11, color: '#7e22ce', marginTop: 4 }}>معلقة قيد المراجعة والشحن</span>
            </div>
          </Col>
        </Row>
      </div>

      {/* KPI Stats Strip */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={12} lg={6}>
          <div className="stat-metric-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
            <div className="quick-action-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              <Boxes size={24} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>إجمالي كتالوج المنتجات</Text>
              <Title level={3} style={{ margin: '2px 0 0', fontWeight: 700, color: '#1e1b4b' }}>
                {stats.productsCount.toLocaleString('ar-EG')} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>صنف</span>
              </Title>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div className="stat-metric-card" onClick={() => onNavigate('branches')} style={{ cursor: 'pointer' }}>
            <div className="quick-action-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
              <Store size={24} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>الفروع والمستودعات العاملة</Text>
              <Title level={3} style={{ margin: '2px 0 0', fontWeight: 700, color: '#064e3b' }}>
                {stats.branchesCount.toLocaleString('ar-EG')} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>فرع/مخزن</span>
              </Title>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div className="stat-metric-card" onClick={() => onNavigate('users')} style={{ cursor: 'pointer' }}>
            <div className="quick-action-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Users size={24} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>طاقم العمل والموظفين</Text>
              <Title level={3} style={{ margin: '2px 0 0', fontWeight: 700, color: '#78350f' }}>
                {stats.usersCount.toLocaleString('ar-EG')} <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>مستخدم</span>
              </Title>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <div
            className="stat-metric-card"
            onClick={() => onNavigate('dashboard')}
            style={{ cursor: 'pointer' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Activity size={24} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>استجابة الخادم المركزي</Text>
              <Title level={4} style={{ margin: '4px 0 0', fontWeight: 700, color: '#075985' }}>
                {systemHealth?.uptime ? `${Math.round(systemHealth.uptime)} ثانية` : 'مستقر 100%'}
              </Title>
            </div>
          </div>
        </Col>
      </Row>

      {/* Group 1: High-Priority Direct Form Modals */}
      <div style={{ marginBottom: 28 }}>
        {/* Section 1 Header Widget */}
        <div className="section-widget-header">
          <div className="widget-main">
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff' }}>
              <Zap size={20} />
            </div>
            <div className="widget-title-area">
              <div className="widget-title-row">
                <span className="widget-title">الإجراءات والنماذج السريعة المباشرة</span>
                <Tag color="purple" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                  ⚡ فتح فوري مباشر
                </Tag>
              </div>
              <div className="widget-subtitle">
                تفتح شاشة النظام ونموذج الإضافة مباشرة بنقرة واحدة دون مغادرة الصفحة
              </div>
            </div>
          </div>
          <div className="widget-extra">
            <Sparkles size={14} color="#8b5cf6" />
            <span>إدخال فوري بنقرة واحدة</span>
          </div>
        </div>

        <div className="quick-cards-grid-5">
          {/* Action 1: New Product */}
          <Card
            className="quick-action-card"
            variant="borderless"
            onClick={() => setProductModalOpen(true)}
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)',
              border: '1px solid #ddd6fe'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#4f46e5', color: '#ffffff' }}>
                <PackagePlus size={22} />
              </div>
              <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>منتج جديد</Tag>
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إضافة منتج جديد</Title>
              <p className="quick-card-desc">تسجيل صنف وباركود وأسعار الشراء والبيع</p>
            </div>
          </Card>

          {/* Action 2: New Branch */}
          <Card
            className="quick-action-card"
            variant="borderless"
            onClick={() => setBranchModalOpen(true)}
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%)',
              border: '1px solid #a7f3d0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#059669', color: '#ffffff' }}>
                <Store size={22} />
              </div>
              <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>فرع / مستودع</Tag>
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إنشاء فرع جديد</Title>
              <p className="quick-card-desc">تأسيس نقطة بيع أو مستودع مع بيانات الدخول</p>
            </div>
          </Card>

          {/* Action 3: New Staff User */}
          <Card
            className="quick-action-card"
            variant="borderless"
            onClick={() => setUserModalOpen(true)}
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
              border: '1px solid #bfdbfe'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#2563eb', color: '#ffffff' }}>
                <UserPlus size={22} />
              </div>
              <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>موظف / كاشير</Tag>
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إضافة موظف جديد</Title>
              <p className="quick-card-desc">صلاحيات مدير، مشرف فرع، أو بائع كاشير</p>
            </div>
          </Card>

          {/* Action 4: New Supplier */}
          <Card
            className="quick-action-card"
            variant="borderless"
            onClick={() => setSupplierModalOpen(true)}
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)',
              border: '1px solid #fde68a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#d97706', color: '#ffffff' }}>
                <Truck size={22} />
              </div>
              <Tag color="gold" style={{ margin: 0, fontWeight: 600 }}>مورد جديد</Tag>
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>تسجيل مورد جديد</Title>
              <p className="quick-card-desc">إضافة مورد وتثبيت الرصيد الافتتاحي</p>
            </div>
          </Card>

          {/* Action 5: Quick Expense */}
          <Card
            className="quick-action-card"
            variant="borderless"
            onClick={() => setExpenseModalOpen(true)}
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fdf2f8 100%)',
              border: '1px solid #fbcfe8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#db2777', color: '#ffffff' }}>
                <Wallet size={22} />
              </div>
              <Tag color="magenta" style={{ margin: 0, fontWeight: 600 }}>سند صرف</Tag>
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>تسجيل مصروف / خزينة</Title>
              <p className="quick-card-desc">صرف نثريات أو مصروفات تشغيلية سريعة</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Group 2: Operational Workflows & Daily Routine */}
      <div style={{ marginBottom: 28 }}>
        {/* Section 2 Header Widget */}
        <div className="section-widget-header">
          <div className="widget-main">
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}>
              <ShoppingBag size={20} />
            </div>
            <div className="widget-title-area">
              <div className="widget-title-row">
                <span className="widget-title">شاشات البيع والعمليات اليومية</span>
                <Tag color="green" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                  نقاط البيع والفواتير
                </Tag>
              </div>
              <div className="widget-subtitle">
                إصدار الفواتير السريعة، متابعة طلبات الأونلاين، وتقفيل الوردية اليومية
              </div>
            </div>
          </div>
          <div className="widget-extra">
            <ScanLine size={14} color="#059669" />
            <span>عمليات الكاشير والبيع</span>
          </div>
        </div>

        <div className="quick-cards-grid-4">
          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('pos')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                <ScanLine size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>فاتورة بيع جديدة</Title>
              <p className="quick-card-desc">بيع سريع بالباركود، خصومات، وطباعة الفاتورة</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('orders')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <ShoppingBag size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>طلبات المتجر الإلكتروني</Title>
              <p className="quick-card-desc">مراجعة وتجهيز وشحن طلبات العملاء أونلاين</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('branches_daily')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <CalendarCheck size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>يومية الفروع المجمعة</Title>
              <p className="quick-card-desc">متابعة إغلاق الوردية والمبيعات والنقدية لكل فرع</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('daily_shift')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
                <Clock size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>صفحة يومية البائع</Title>
              <p className="quick-card-desc">حركات الكاشير النقدية، المصاريف، وتسليم العهدة</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Group 3: Stock Movement, Transfers, Audits & Purchasing */}
      <div style={{ marginBottom: 28 }}>
        {/* Section 3 Header Widget */}
        <div className="section-widget-header">
          <div className="widget-main">
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff' }}>
              <Boxes size={20} />
            </div>
            <div className="widget-title-area">
              <div className="widget-title-row">
                <span className="widget-title">إدارة المخزون والتوزيع والتوريدات</span>
                <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                  المستودعات والتحويلات
                </Tag>
              </div>
              <div className="widget-subtitle">
                التحويل بين الفروع، جرد الأصناف، متابعة أذون الصرف والتسوية
              </div>
            </div>
          </div>
          <div className="widget-extra">
            <ArrowLeftRight size={14} color="#2563eb" />
            <span>حركة الأرصدة والمخازن</span>
          </div>
        </div>

        <div className="quick-cards-grid-4">
          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('transfers', { autoOpenCreate: true })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <ArrowLeftRight size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إذن صرف وتحويل مخزني</Title>
              <p className="quick-card-desc">تحويل بضائع بين المستودع الرئيسي والفروع</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('purchases', { autoOpenCreate: true })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <Receipt size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>فواتير المشتريات والتوريد</Title>
              <p className="quick-card-desc">تسجيل وارد بضاعة من الموردين وتحديث الأرصدة</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('stock_audit')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <ClipboardCheck size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>الجرد المجمع للمخزون</Title>
              <p className="quick-card-desc">بدء جلسة جرد ومقارنة الفعلي مع الدفتري</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('stock_audit')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                <SlidersHorizontal size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>جرد وتسوية المخزون</Title>
              <p className="quick-card-desc">مطابقة الفعلي والدفتري واعتماد التسويات فورياً</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Group 4: Finance, Analytics & Catalogs */}
      <div style={{ marginBottom: 28 }}>
        {/* Section 4 Header Widget */}
        <div className="section-widget-header">
          <div className="widget-main">
            <div className="widget-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff' }}>
              <Landmark size={20} />
            </div>
            <div className="widget-title-area">
              <div className="widget-title-row">
                <span className="widget-title">الماليات، التحليلات، ودليل الأصناف</span>
                <Tag color="orange" style={{ margin: 0, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                  الرقابة والسيولة
                </Tag>
              </div>
              <div className="widget-subtitle">
                متابعة الخزائن، قيود اليومية، دليل المجموعات والكتالوج المركزي
              </div>
            </div>
          </div>
          <div className="widget-extra">
            <BarChart3 size={14} color="#d97706" />
            <span>التقارير والمؤشرات</span>
          </div>
        </div>

        <div className="quick-cards-grid-4">
          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('treasury_admin', { autoOpenCreate: true })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                <Landmark size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إدارة الخزائن والسيولة</Title>
              <p className="quick-card-desc">متابعة أرصدة خزائن الفروع والتحويلات البنكية</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('admin_journals')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <BookOpenCheck size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>اليوميات الإدارية والقيود</Title>
              <p className="quick-card-desc">تدقيق كافة العمليات والقيود المحاسبية المركزية</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('retail_analytics')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <BarChart3 size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>إحصائيات فروع التجزئة</Title>
              <p className="quick-card-desc">مؤشرات أداء المبيعات، الربحية، والأكثر طلباً</p>
            </div>
          </Card>

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('groups_items', { autoOpenCreate: true })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#fdf4ff', color: '#c026d3' }}>
                <Layers size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>المجموعات والأصناف</Title>
              <p className="quick-card-desc">تنظيم التصنيفات، المقاسات، الألوان، والمواصفات</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ========================================================
          MODALS FOR RAPID CREATION
         ======================================================== */}

      {/* 1. Modal: Create Product */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PackagePlus size={20} color="#4f46e5" />
              <span>إضافة منتج جديد إلى الكتالوج</span>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => { setProductModalOpen(false); onNavigate('products'); }}
              style={{ color: '#4f46e5', fontWeight: 600, padding: 0 }}
            >
              فتح الكتالوج الكامل ⬅
            </Button>
          </div>
        }
        open={productModalOpen}
        onCancel={() => setProductModalOpen(false)}
        footer={null}
        width={680}
        destroyOnHidden
      >
        <Form form={productForm} layout="vertical" onFinish={handleCreateProduct} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="كود المنتج (Product Code)"
                name="product_code"
                rules={[{ required: true, message: 'يرجى إدخال أو توليد كود المنتج' }]}
              >
                <Input
                  placeholder="PRD-XXXXXX"
                  addonAfter={
                    <Tooltip title="توليد كود تلقائي">
                      <Button type="link" size="small" onClick={generateCodes} style={{ padding: 0, height: 'auto' }}>
                        توليد
                      </Button>
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="الباركود الدولي (Barcode EAN-13)"
                name="barcode"
              >
                <Input
                  placeholder="622XXXXXXXXXX"
                  addonAfter={
                    <Tooltip title="توليد باركود EAN-13 حقيقي متوافق دولياً">
                      <Button
                        type="link"
                        size="small"
                        onClick={() => productForm.setFieldsValue({ barcode: generateValidEAN13('622') })}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, color: '#4f46e5' }}
                      >
                        توليد EAN
                      </Button>
                    </Tooltip>
                  }
                />
              </Form.Item>
              {watchedProductBarcode && (
                <div style={{ marginTop: -6, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <BarcodeImage value={watchedProductBarcode} height={38} width={1.4} />
                </div>
              )}
            </Col>

            <Col xs={24}>
              <Form.Item
                label="اسم المنتج (عربي / تجاري)"
                name="product_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم المنتج' }]}
              >
                <Input placeholder="مثال: قميص كتان تركي مقاس L أبيض" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label="التصنيف / المجموعة"
                name="category_id"
              >
                <Select placeholder="اختر التصنيف" allowClear>
                  {categories.map((c) => (
                    <Option key={c.id} value={c.id}>{c.category_name || c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label="سعر الشراء / التكلفة (ج.م)"
                name="cost_price"
                rules={[{ required: true, message: 'مطلوب سعر التكلفة' }]}
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                label="سعر البيع للجمهور (ج.م)"
                name="selling_price"
                rules={[{ required: true, message: 'مطلوب سعر البيع' }]}
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setProductModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#4f46e5' }}>
              حفظ المنتج وتثبيته
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 2. Modal: Create Branch */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={20} color="#059669" />
              <span>إنشاء فرع أو مستودع جديد</span>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => { setBranchModalOpen(false); onNavigate('branches'); }}
              style={{ color: '#059669', fontWeight: 600, padding: 0 }}
            >
              عرض كافة الفروع ⬅
            </Button>
          </div>
        }
        open={branchModalOpen}
        onCancel={() => setBranchModalOpen(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form form={branchForm} layout="vertical" onFinish={handleCreateBranch} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                label="اسم الفرع أو المستودع"
                name="branch_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
              >
                <Input placeholder="مثال: فرع المهندسين الرئيسي" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={10}>
              <Form.Item
                label="نوع الفرع"
                name="branch_type"
                rules={[{ required: true, message: 'يرجى اختيار نوع الفرع' }]}
                initialValue="retail_branch"
              >
                <Select>
                  <Option value="retail_branch">🏪 فرع تجزئة (POS & نقدية)</Option>
                  <Option value="main_warehouse">🏢 مستودع رئيسي (تخزين وتوزيع)</Option>
                  <Option value="ecom_warehouse">🛒 مستودع المتجر الإلكتروني (ECP)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="اسم مستخدم الدخول (Username)"
                name="login_username"
                rules={[{ required: true, message: 'اسم المستخدم للدخول للفرع مطلوب' }]}
              >
                <Input placeholder="branch_username" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="كلمة المرور (Password)"
                name="password"
                rules={[{ required: true, message: 'كلمة المرور مطلوبة' }]}
              >
                <Input.Password placeholder="كلمة المرور المشفرة" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="رقم الهاتف" name="phone">
                <Input placeholder="01XXXXXXXXX" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="العنوان الجغرافي" name="address">
                <Input placeholder="المدينة، الشارع" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setBranchModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#059669' }}>
              إنشاء الفرع وحساب الدخول
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 3. Modal: Create User */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={20} color="#2563eb" />
              <span>إضافة موظف / كاشير جديد</span>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => { setUserModalOpen(false); onNavigate('users'); }}
              style={{ color: '#2563eb', fontWeight: 600, padding: 0 }}
            >
              دليل الموظفين ⬅
            </Button>
          </div>
        }
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        footer={null}
        width={580}
        destroyOnHidden
      >
        <Form form={userForm} layout="vertical" onFinish={handleCreateUser} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="الاسم بالكامل"
                name="full_name"
                rules={[{ required: true, message: 'الاسم بالكامل مطلوب' }]}
              >
                <Input placeholder="أحمد محمود" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="اسم المستخدم (Username)"
                name="username"
                rules={[{ required: true, message: 'اسم المستخدم مطلوب' }]}
              >
                <Input placeholder="ahmed.pos" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="الدور الوظيفي والصلاحيات"
                name="role"
                rules={[{ required: true, message: 'يرجى تحديد الدور' }]}
                initialValue="salesperson"
              >
                <Select>
                  <Option value="salesperson">بائع / كاشير (Salesperson)</Option>
                  <Option value="supervisor">مشرف فرع (Supervisor)</Option>
                  <Option value="admin">مدير إداري (Admin)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="الفرع أو المستودع المعين له"
                name="branch_id"
                rules={[{ required: true, message: 'يرجى تحديد الفرع' }]}
              >
                <Select placeholder="اختر الفرع">
                  {branchesList.map((b) => (
                    <Option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="كلمة المرور"
                name="password"
                rules={[{ required: true, message: 'يرجى كتابة كلمة مرور للموظف' }]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setUserModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#2563eb' }}>
              تسجيل حساب الموظف
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 4. Modal: Create Supplier */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={20} color="#d97706" />
              <span>تسجيل مورد جديد</span>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => { setSupplierModalOpen(false); onNavigate('suppliers'); }}
              style={{ color: '#d97706', fontWeight: 600, padding: 0 }}
            >
              قائمة الموردين ⬅
            </Button>
          </div>
        }
        open={supplierModalOpen}
        onCancel={() => setSupplierModalOpen(false)}
        footer={null}
        width={580}
        destroyOnHidden
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleCreateSupplier} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="اسم المورد أو الشركة"
                name="supplier_name"
                rules={[{ required: true, message: 'اسم المورد مطلوب' }]}
              >
                <Input placeholder="شركة الأهرام للأقمشة والتوريدات" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="الشخص المسؤول (Contact Person)" name="contact_person">
                <Input placeholder="محمد سامي" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="رقم الهاتف" name="phone">
                <Input placeholder="01XXXXXXXXX" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="العنوان الجغرافي" name="address">
                <Input placeholder="القاهرة، العاشر من رمضان" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label="الرصيد الافتتاحي (ج.م - مستحق له)" name="opening_balance" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setSupplierModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#d97706' }}>
              حفظ المورد
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 5. Modal: Quick Expense */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingLeft: 24, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={20} color="#db2777" />
              <span>تسجيل مصروف أو سند صرف نقدية</span>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => { setExpenseModalOpen(false); onNavigate('treasury_admin'); }}
              style={{ color: '#db2777', fontWeight: 600, padding: 0 }}
            >
              إدارة الخزائن ⬅
            </Button>
          </div>
        }
        open={expenseModalOpen}
        onCancel={() => setExpenseModalOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Form form={expenseForm} layout="vertical" onFinish={handleCreateExpense} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="بند المصروف"
                name="category"
                rules={[{ required: true, message: 'يرجى تحديد البند' }]}
                initialValue="نثريات وضيافة"
              >
                <Select>
                  <Option value="نثريات وضيافة">☕ نثريات وضيافة</Option>
                  <Option value="مستلزمات تغليف وفواتير">📦 مستلزمات تغليف وفواتير</Option>
                  <Option value="صيانة وتشغيل">🔧 صيانة وتشغيل</Option>
                  <Option value="نقل وشحن">🚚 نقل وشحن</Option>
                  <Option value="كهرباء ومرافق">⚡ كهرباء ومرافق</Option>
                  <Option value="مصروفات إدارية عامة">📑 مصروفات إدارية عامة</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="المبلغ (ج.م)"
                name="amount"
                rules={[{ required: true, message: 'يرجى كتابة المبلغ' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="طريقة الدفع"
                name="payment_method"
                initialValue="cash"
              >
                <Select>
                  <Option value="cash">💵 نقدياً من الخزينة</Option>
                  <Option value="bank_transfer">🏦 تحويل بنكي / فودافون كاش</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="البيان / ملاحظات الصرف" name="description">
                <TextArea rows={2} placeholder="تفاصيل سبب الصرف" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setExpenseModalOpen(false)}>إلغاء</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#db2777' }}>
              ترحيل المصروف للخزينة
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Seller Advances Modal */}
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
          {(!sellerSummary?.advances_list || sellerSummary.advances_list.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>لا توجد سلف أو مصروفات مسجلة هذا الشهر</div>
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
                  {item.description && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.description}</Text>}
                  <Text type="secondary" style={{ fontSize: 10 }}>{item.expense_date ? new Date(item.expense_date).toLocaleDateString('ar-EG') : ''}</Text>
                </div>
                <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
                  - {parseFloat(item.amount || 0).toLocaleString()} ج.م
                </Text>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
