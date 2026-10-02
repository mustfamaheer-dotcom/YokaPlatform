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
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);


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

  const fetchPendingOrdersCount = async () => {
    try {
      const res = await api.get('/api/swm/orders/pending-count');
      if (res.data?.success) {
        setPendingOrdersCount(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch pending orders count:', e);
    }
  };

  useEffect(() => {
    fetchHomeData();
    fetchEmployeesList();
    fetchSafeBalances();
    fetchExpenseCategories();
    fetchPendingOrdersCount();

    const handleOrdersChange = () => {
      fetchPendingOrdersCount();
    };

    window.addEventListener('ecp-orders-updated', handleOrdersChange);
    window.addEventListener('focus', handleOrdersChange);
    const interval = setInterval(fetchPendingOrdersCount, 20000);

    return () => {
      window.removeEventListener('ecp-orders-updated', handleOrdersChange);
      window.removeEventListener('focus', handleOrdersChange);
      clearInterval(interval);
    };
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

        <div className="swm-home-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ zIndex: 1, minWidth: 240, flex: 1 }}>
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

          <div className="swm-home-header-meta" style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 1, flexWrap: 'wrap' }}>
            <div
              className="swm-home-header-badge"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '8px 14px',
                textAlign: 'right'
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
      {/* "القطاعات والوحدات الرئيسية" — System Navigation Hub     */}
      {/* ========================================================= */}
      <div style={{ marginBottom: 32 }}>
        {/* Hub Section Title */}
        <div className="swm-hub-section-title">
          <div className="hub-title-accent" style={{ background: '#4F46E5', height: 32, width: 5 }} />
          <div>
            <h3 className="swm-hub-title-heading" style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              القطاعات والوحدات الرئيسية (Navigation Hub)
            </h3>
            <Text type="secondary" className="swm-hub-title-desc" style={{ fontSize: 13, color: '#64748b' }}>
              بوابة التحكم الشاملة لكافة أقسام ووحدات المنصة — اختر القسم المطلوب للانتقال الفوري
            </Text>
          </div>
        </div>

        {/* ── Domain 1: أقسام نقاط البيع والعمليات اليومية ── */}
        <div className="swm-domain-group domain-purchases" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#ECFDF5', color: '#059669', width: 52, height: 52, borderRadius: 14 }}>
              <ScanLine size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام نقاط البيع والعمليات اليومية</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>إصدار فواتير البيع السريعة • تقفيل الوردية اليومية • متابعة طلبات الأونلاين</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: نقطة البيع وفاتورة بيع جديدة */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('pos')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('pos'); }}
              aria-label="فتح شاشة نقطة البيع وفاتورة بيع جديدة"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
                <ScanLine size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>نقطة البيع وفاتورة بيع جديدة (POS)</strong>
                <span>إصدار الفواتير بالباركود، حساب الخصومات، وطباعة الإيصال الحراري</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: تقفيل الوردية اليومية */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('daily_shift')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('daily_shift'); }}
              aria-label="فتح صفحة تقفيل الوردية اليومية"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
                <Clock size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>تقفيل الوردية اليومية وتسليم العهدة</strong>
                <span>تسليم النقدية، تدقيق مبيعات الكاشير، عجز وزيادة الخزينة</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: طلبات المتجر الإلكتروني */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('orders')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('orders'); }}
              aria-label="فتح صفحة طلبات المتجر الإلكتروني"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#ECFDF5', color: '#059669', position: 'relative' }}>
                <ShoppingBag size={28} />
                {pendingOrdersCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      background: '#EF4444',
                      color: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '1px 6px',
                      fontSize: '11.5px',
                      fontWeight: 900,
                      minWidth: '22px',
                      height: '22px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)',
                      border: '2px solid #FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                      zIndex: 3
                    }}
                  >
                    {pendingOrdersCount > 99 ? '+99' : pendingOrdersCount}
                  </span>
                )}
              </div>
              <div className="swm-entry-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <strong style={{ margin: 0 }}>طلبات المتجر الإلكتروني</strong>
                  {pendingOrdersCount > 0 && (
                    <span
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
                      <span>{pendingOrdersCount} طلب جديد</span>
                    </span>
                  )}
                </div>
                <span>استعراض وتجهيز وشحن فواتير الطلبات الواردة من المتجر</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

        {/* ── Domain 2: أقسام إدارة المخزون والأصناف ── */}
        <div className="swm-domain-group domain-inventory" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#EFF6FF', color: '#1D4ED8', width: 52, height: 52, borderRadius: 14 }}>
              <Boxes size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام إدارة المخزون والأصناف</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>التصنيفات والباركود • الجرد الميداني وسندات التسوية • التحويلات بين الفروع</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: المجموعات والأصناف */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('groups_items')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('groups_items'); }}
              aria-label="فتح صفحة المجموعات والأصناف"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                <Layers size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>المجموعات والأصناف (دليل الكتالوج)</strong>
                <span>شجرة التصنيفات، المقاسات، الألوان، الأسعار، وتوليد الباركود</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: الجرد الفعلي وسندات التسوية */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('stock_adjustments')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('stock_adjustments'); }}
              aria-label="فتح صفحة الجرد الفعلي وسندات التسوية"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                <ClipboardCheck size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>الجرد الفعلي وسندات التسوية</strong>
                <span>الجرد الميداني المخزني، معالجة العجز والزيادة، واعتماد التسويات</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: التحويلات بين الفروع والمستودعات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('transfers')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('transfers'); }}
              aria-label="فتح صفحة التحويلات وأذونات الصرف"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                <ArrowLeftRight size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>التحويل بين الفروع والمستودعات</strong>
                <span>إصدار ومتابعة أذونات الصرف والتحويل وسندات استلام البضائع</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

        {/* ── Domain 3: أقسام المشتريات والتوريد ── */}
        <div className="swm-domain-group domain-purchases" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#F0FDF4', color: '#065F46', width: 52, height: 52, borderRadius: 14 }}>
              <Receipt size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام المشتريات والتوريد</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>فواتير الشراء والتوريد • كشوف حسابات الموردين والأرصدة الدائنة</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: فواتير المشتريات والتوريد */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('purchases')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('purchases'); }}
              aria-label="فتح صفحة فواتير المشتريات والتوريد"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F0FDF4', color: '#065F46' }}>
                <Receipt size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>فواتير المشتريات والتوريد</strong>
                <span>تسجيل ومراجعة فواتير الشراء، حساب تكلفة الوحدة، ودفعات الموردين</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: الموردين والحسابات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('suppliers')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('suppliers'); }}
              aria-label="فتح صفحة الموردين والحسابات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F0FDF4', color: '#065F46' }}>
                <Truck size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>الموردين والحسابات الدائنة</strong>
                <span>دليل الموردين، كشوف الحسابات التفصيلية، وسجل المدفوعات والديون</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

        {/* ── Domain 4: أقسام المالية والخزائن ── */}
        <div className="swm-domain-group domain-finance" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#FFFBEB', color: '#92400E', width: 52, height: 52, borderRadius: 14 }}>
              <Landmark size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام المالية والخزائن</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>الخزينة المركزية • حركة السيولة • مسير الرواتب والمصروفات</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: الخزينة المركزية والتحويلات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('treasury_admin')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('treasury_admin'); }}
              aria-label="فتح صفحة الخزينة المركزية والتحويلات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#FFFBEB', color: '#92400E' }}>
                <Landmark size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>الخزينة المركزية والتحويلات البنكية</strong>
                <span>حركة السيولة النقدية، التحويلات البنكية، تصفير الخزائن، وسندات الصرف</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: مسير الرواتب */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('admin_journals')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('admin_journals'); }}
              aria-label="فتح صفحة مسير الرواتب واليوميات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#FFFBEB', color: '#92400E' }}>
                <Users size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>مسير الرواتب وبنود المصروفات</strong>
                <span>تسوية مرتبات البائعين، السلف والخصومات، وإدارة وتعميم بنود المصروفات</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

        {/* ── Domain 5: أقسام التحليلات والتقارير الرقابية ── */}
        <div className="swm-domain-group domain-analytics" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#F5F3FF', color: '#5B21B6', width: 52, height: 52, borderRadius: 14 }}>
              <BarChart3 size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام التحليلات والتقارير الرقابية</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>تحليلات المبيعات • يومية الفروع الشاملة • دفاتر التدقيق الإداري</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: تحليلات المبيعات والإيرادات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('retail_analytics')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('retail_analytics'); }}
              aria-label="فتح صفحة تحليلات المبيعات والإيرادات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F5F3FF', color: '#5B21B6' }}>
                <TrendingUp size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>تحليلات المبيعات والإيرادات المركزية</strong>
                <span>رسوم بيانية تفاعلية، مقارنة الفروع، تقييم البائعين، وسجل المرتجعات</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: يومية الفروع المجمعة */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('branches_daily')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('branches_daily'); }}
              aria-label="فتح صفحة يومية الفروع المجمعة"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F5F3FF', color: '#5B21B6' }}>
                <CalendarCheck size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>يومية الفروع المجمعة</strong>
                <span>كشف الحساب اليومي الشامل لمبيعات ومصروفات ونقدية كل فرع بالصالات</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: اليوميات الإدارية والرقابة */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('admin_journals')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('admin_journals'); }}
              aria-label="فتح صفحة اليوميات الإدارية والرقابة"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F5F3FF', color: '#5B21B6' }}>
                <BookOpenCheck size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>اليوميات الإدارية والرقابة العامة</strong>
                <span>سجلات التدقيق الإداري، دفتر المصروفات، وأرشيف العمليات المخزنية</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

        {/* ── Domain 6: أقسام إدارة النظام والفروع ── */}
        <div className="swm-domain-group domain-system" style={{ marginBottom: 20 }}>
          <div className="swm-domain-header">
            <div className="swm-domain-icon" style={{ background: '#F0FDFA', color: '#0F766E', width: 52, height: 52, borderRadius: 14 }}>
              <Building2 size={26} strokeWidth={2.2} />
            </div>
            <div className="swm-domain-info">
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>أقسام إدارة النظام والفروع</h4>
              <p style={{ fontSize: 13, color: '#64748b' }}>هيكل الفروع والمستودعات • حسابات الموظفين والصلاحيات</p>
            </div>
          </div>
          <div className="swm-entries-grid">

            {/* Entry: الفروع والمستودعات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('branches')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('branches'); }}
              aria-label="فتح صفحة الفروع والمستودعات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F0FDFA', color: '#0F766E' }}>
                <Store size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>الفروع والمستودعات</strong>
                <span>تأسيس وإدارة الفروع، نقاط البيع، والمستودعات وتعيين المسؤولين</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

            {/* Entry: المستخدمين والصلاحيات */}
            <div
              role="button" tabIndex={0}
              className="swm-entry-btn"
              onClick={() => onNavigate('users')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('users'); }}
              aria-label="فتح صفحة المستخدمين والصلاحيات"
            >
              <div className="swm-entry-icon-wrap" style={{ background: '#F0FDFA', color: '#0F766E' }}>
                <ShieldCheck size={28} />
              </div>
              <div className="swm-entry-text">
                <strong>المستخدمين والصلاحيات</strong>
                <span>إدارة حسابات المديرين والمشرفين والبائعين وتحديد صلاحيات الوصول</span>
              </div>
              <ArrowRight size={20} className="swm-entry-arrow" style={{ transform: 'rotate(180deg)' }} />
            </div>

          </div>
        </div>

      </div>
      {/* End Sections Hub */}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => setProductModalOpen(false)} size="large" style={{ height: 48, borderRadius: 10, minWidth: 100 }}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              block
              style={{ height: 48, fontWeight: 700, borderRadius: 10, backgroundColor: '#4f46e5' }}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ المنتج وتثبيته'}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => setBranchModalOpen(false)} size="large" style={{ height: 48, borderRadius: 10, minWidth: 100 }}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              block
              style={{ height: 48, fontWeight: 700, borderRadius: 10, backgroundColor: '#059669' }}
            >
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الفرع وحساب الدخول'}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => setUserModalOpen(false)} size="large" style={{ height: 48, borderRadius: 10, minWidth: 100 }}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              block
              style={{ height: 48, fontWeight: 700, borderRadius: 10, backgroundColor: '#2563eb' }}
            >
              {submitting ? 'جاري التسجيل...' : 'تسجيل حساب الموظف'}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => setSupplierModalOpen(false)} size="large" style={{ height: 48, borderRadius: 10, minWidth: 100 }}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              block
              style={{ height: 48, fontWeight: 700, borderRadius: 10, backgroundColor: '#d97706' }}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ المورد'}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => setExpenseModalOpen(false)} size="large" style={{ height: 48, borderRadius: 10, minWidth: 100 }}>
              إلغاء
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              block
              style={{ height: 48, fontWeight: 700, borderRadius: 10, backgroundColor: '#db2777' }}
            >
              {submitting ? 'جاري الترحيل...' : 'ترحيل المصروف للخزينة'}
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
