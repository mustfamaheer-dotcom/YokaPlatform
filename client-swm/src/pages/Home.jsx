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
  Tooltip
} from 'antd';
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
  DollarSign
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

          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate('stock_adjustments', { autoOpenCreate: true })}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="quick-action-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                <SlidersHorizontal size={24} />
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div>
              <Title level={5} style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>سند تسوية المخزون</Title>
              <p className="quick-card-desc">تسوية العجز أو الزيادة والتالف بدقة ومصادقة</p>
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
          <Card className="quick-action-card" variant="borderless" onClick={() => onNavigate(isRetailBranch ? 'branch_treasury' : 'treasury_admin', { autoOpenCreate: true })}>
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
              onClick={() => { setExpenseModalOpen(false); onNavigate(isRetailBranch ? 'branch_treasury' : 'treasury_admin'); }}
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
    </div>
  );
}
