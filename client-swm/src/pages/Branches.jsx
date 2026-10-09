import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  ExternalLink,
  Building2,
  Store,
  Warehouse,
  Users,
  KeyRound,
  MapPin,
  Clock,
  Phone,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  ShieldCheck,
  Coins,
  PackageCheck,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Typography,
  App, Card, Divider, Tooltip, Alert, Switch, InputNumber,
  Row, Col, Drawer, Segmented, Badge, Statistic, Spin, Empty
} from 'antd';
import {
  PlusOutlined, ShopOutlined, ReloadOutlined, EditOutlined, UserOutlined,
  KeyOutlined, LockOutlined, EyeOutlined, InfoCircleOutlined, EnvironmentOutlined,
  GlobalOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Formatting helpers for clean Western/English digits
const fmtNum = (v, digits = 0) => {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const BRANCH_TYPES = {
  retail_branch: {
    label: 'فرع تجزئة ونقاط بيع',
    sublabel: 'Retail Branch & POS',
    color: 'blue',
    icon: <ShopOutlined />
  },
  ecom_warehouse: {
    label: 'مستودع المتجر الإلكتروني',
    sublabel: 'E-Com Online Warehouse',
    color: 'purple',
    icon: <Store size={15} />
  },
  main_warehouse: {
    label: 'المستودع الرئيسي اللوجستي',
    sublabel: 'Main Logistic Hub',
    color: 'volcano',
    icon: <Warehouse size={15} />
  }
};

const BRANCH_TYPE_DESCRIPTIONS = {
  retail_branch: {
    title: 'فرع تجزئة ونقاط بيع (Retail Branch)',
    description: 'نقطة بيع فعلية للجمهور. يتم تلقائياً تهيئة درج نقدية (Cash Register) وخزينة فرع (Safe)، ويدخل الموظفون مباشرة إلى شاشة الكاشير السريع (POS) ونظام الورديات النقدية.',
    portalLabel: 'بوابة الكاشير (POS)',
    color: 'blue',
    accountTitle: 'بيانات دخول كاشير نقطة البيع (POS)',
    icon: <ShopOutlined style={{ fontSize: 24, color: '#0284c7' }} />
  },
  ecom_warehouse: {
    title: 'مستودع المتجر الإلكتروني (E-Com Warehouse)',
    description: 'مستودع مخصص لتجهيز وتعبئة وشحن طلبات الأونلاين. يدخل الموظفون مباشرة إلى بوابة (الطلبات، المخزون، والشحن والإحصائيات).',
    portalLabel: 'بوابة المتجر (Orders/Inv)',
    color: 'purple',
    accountTitle: 'بيانات دخول مسؤول مستودع المتجر الإلكتروني',
    icon: <Store size={24} style={{ color: '#8b5cf6' }} />
  },
  main_warehouse: {
    title: 'المستودع الرئيسي (Main Warehouse)',
    description: 'المركز اللوجستي الرئيسي لاستلام فواتير المشتريات من الموردين وتوزيع البضائع على الفروع ومستودع الأونلاين.',
    portalLabel: 'المستودع الرئيسي والعمليات',
    color: 'volcano',
    accountTitle: 'بيانات دخول إدارة المستودع الرئيسي',
    icon: <Warehouse size={24} style={{ color: '#ea580c' }} />
  }
};

// Common Egyptian Cities
const POPULAR_CITIES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الإسماعيلية',
  'بورسعيد',
  'السويس',
  'طنطا',
  'المنصورة',
  'الشرقية',
  'أسيوط'
];

export default function Branches({ autoOpenCreate, onResetAction, currentUser }) {
  const { message } = App.useApp();
  const navigate = useNavigate();

  // State
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [generatingCode, setGeneratingCode] = useState(false);

  // View & Filters State
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Modals & Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchStaff, setBranchStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const [selectedCreateType, setSelectedCreateType] = useState('retail_branch');
  const [selectedEditType, setSelectedEditType] = useState('retail_branch');

  // Fetch branches and supervisors
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const [bRes, uRes] = await Promise.all([
        api.get('/api/swm/branches'),
        api.get('/api/swm/users?role=supervisor')
      ]);

      if (bRes.data.success) {
        setBranches(bRes.data.data);
      }
      if (uRes.data.success) {
        setSupervisors(uRes.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل الفروع والمستودعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateModal();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  // Code generation
  const fetchNextBranchCode = async (type = 'retail_branch') => {
    setGeneratingCode(true);
    try {
      const res = await api.get('/api/swm/branches/next-code', { params: { branch_type: type } });
      if (res.data.success && res.data.next_code) {
        createForm.setFieldsValue({ branch_code: res.data.next_code });
      }
    } catch (e) {
      console.error('Error fetching next branch code:', e);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Password generator helper
  const generateStrongPassword = (formInstance) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    formInstance.setFieldsValue({ password: pwd });
    message.success(`تم توليد كلمة مرور جديدة: ${pwd}`);
  };

  // Open Create
  const handleOpenCreateModal = () => {
    createForm.resetFields();
    setSelectedCreateType('retail_branch');
    createForm.setFieldsValue({
      branch_type: 'retail_branch',
      city: 'القاهرة',
      show_in_store: true,
      display_order: 0,
      working_hours: 'يومياً من 10:00 صباحاً إلى 11:00 مساءً'
    });
    setIsCreateModalOpen(true);
    fetchNextBranchCode('retail_branch');
  };

  // Submit Create
  const handleCreate = async (values) => {
    try {
      const res = await api.post('/api/swm/branches', values);
      if (res.data.success) {
        message.success('تم إنشاء الفرع وبيانات تسجيل دخوله بنجاح');
        setIsCreateModalOpen(false);
        createForm.resetFields();
        fetchBranches();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء الفرع');
    }
  };

  // Open Edit
  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setSelectedEditType(branch.branch_type || 'retail_branch');
    editForm.setFieldsValue({
      branch_name: branch.branch_name,
      branch_type: branch.branch_type,
      login_username: branch.login_username || '',
      password: branch.login_password_plain || '',
      city: branch.city || '',
      address: branch.address || '',
      phone: branch.phone || '',
      google_maps_url: branch.google_maps_url || '',
      working_hours: branch.working_hours || 'يومياً من 10:00 صباحاً إلى 11:00 مساءً',
      show_in_store: branch.show_in_store !== false,
      display_order: branch.display_order || 0,
      supervisor_id: branch.supervisor_id || undefined,
      status: branch.status
    });
    setIsEditModalOpen(true);
  };

  // Submit Update
  const handleUpdate = async (values) => {
    if (!editingBranch) return;
    try {
      const res = await api.put(`/api/swm/branches/${editingBranch.id}`, values);
      if (res.data.success) {
        message.success('تم تحديث بيانات الفرع بنجاح');
        setIsEditModalOpen(false);
        setEditingBranch(null);
        editForm.resetFields();
        fetchBranches();
        if (selectedBranch?.id === editingBranch.id) {
          setSelectedBranch(prev => ({ ...prev, ...values }));
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث الفرع');
    }
  };

  // Toggle Storefront visibility
  const handleToggleStore = async (branchId, checked) => {
    try {
      const res = await api.patch(`/api/swm/branches/${branchId}/toggle-store`, { show_in_store: checked });
      if (res.data.success) {
        message.success(checked ? 'تم تفعيل عرض الفرع في المتجر الإلكتروني' : 'تم إخفاء الفرع من المتجر الإلكتروني');
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, show_in_store: checked } : b));
        if (selectedBranch?.id === branchId) {
          setSelectedBranch(prev => ({ ...prev, show_in_store: checked }));
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر تحديث حالة العرض');
    }
  };

  // Open Details Drawer
  const handleOpenDetails = async (branch) => {
    setSelectedBranch(branch);
    setShowPassword(false);
    setDrawerOpen(true);
    setLoadingStaff(true);
    try {
      const res = await api.get('/api/swm/users', { params: { branch_id: branch.id, limit: 100 } });
      if (res.data.success) {
        setBranchStaff(res.data.data || []);
      }
    } catch (e) {
      console.error('Error fetching branch staff:', e);
      setBranchStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Copy helper
  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    message.success(`تم نسخ ${label} إلى الحافظة`);
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      // Type
      if (typeFilter !== 'all' && b.branch_type !== typeFilter) return false;
      // Status
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      // City
      if (cityFilter !== 'all' && b.city !== cityFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (b.branch_name || '').toLowerCase().includes(q);
        const matchCode = (b.branch_code || '').toLowerCase().includes(q);
        const matchCity = (b.city || '').toLowerCase().includes(q);
        const matchUser = (b.login_username || '').toLowerCase().includes(q);
        const matchSup  = (b.supervisor_name || '').toLowerCase().includes(q);
        const matchPhone = (b.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCity && !matchUser && !matchSup && !matchPhone) return false;
      }
      return true;
    });
  }, [branches, typeFilter, statusFilter, cityFilter, searchQuery]);

  // Derived KPIs
  const kpis = useMemo(() => {
    const total = branches.length;
    const retail = branches.filter(b => b.branch_type === 'retail_branch').length;
    const warehouses = branches.filter(b => ['main_warehouse', 'ecom_warehouse'].includes(b.branch_type)).length;
    const totalStaff = branches.reduce((sum, b) => sum + (parseInt(b.staff_count, 10) || 0), 0);
    const active = branches.filter(b => b.status === 'active').length;
    return { total, retail, warehouses, totalStaff, active };
  }, [branches]);

  // Unique cities in data for filter
  const existingCities = useMemo(() => {
    const set = new Set();
    branches.forEach(b => { if (b.city) set.add(b.city); });
    return Array.from(set);
  }, [branches]);

  // Table Columns
  const tableColumns = [
    {
      title: 'كود الفرع',
      dataIndex: 'branch_code',
      key: 'branch_code',
      width: 110,
      render: (code) => (
        <Text code strong style={{ fontSize: 13, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
          {code}
        </Text>
      )
    },
    {
      title: 'اسم الفرع / المنشأة',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name, record) => (
        <div>
          <Text strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{name}</Text>
          {record.city && (
            <Space size={4} style={{ marginTop: 2 }}>
              <MapPin size={12} style={{ color: '#64748b' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.city}</Text>
            </Space>
          )}
        </div>
      )
    },
    {
      title: 'نوع المنشأة',
      dataIndex: 'branch_type',
      key: 'branch_type',
      width: 170,
      render: (type) => {
        const item = BRANCH_TYPES[type] || { label: type, color: 'default' };
        return (
          <Tag color={item.color} style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
            {item.label}
          </Tag>
        );
      }
    },
    {
      title: 'بيانات الدخول والبوابة',
      key: 'credentials',
      width: 210,
      render: (_, record) => {
        const typeInfo = BRANCH_TYPE_DESCRIPTIONS[record.branch_type] || BRANCH_TYPE_DESCRIPTIONS.retail_branch;
        if (!record.login_username) {
          return <Tag color="warning">لم يتم تعيين حساب</Tag>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Tag color={typeInfo.color} style={{ width: 'fit-content', margin: 0, fontSize: 11, fontWeight: 700, borderRadius: 4 }}>
              {typeInfo.portalLabel}
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>اليوزر:</Text>
              <Tag color="geekblue" icon={<KeyOutlined />} style={{ margin: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {record.login_username}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>السر:</Text>
              {record.login_password_plain ? (
                <Text
                  code
                  copyable={{ text: record.login_password_plain, tooltips: ['نسخ كلمة المرور', 'تم النسخ!'] }}
                  style={{ color: '#059669', fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}
                >
                  {record.login_password_plain}
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>••••••••</Text>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'المشرف وطاقم العمل',
      key: 'staff',
      width: 160,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {record.supervisor_name ? (
            <Space size={4}>
              <UserOutlined style={{ color: '#ea580c', fontSize: 12 }} />
              <Text strong style={{ fontSize: 12.5 }}>{record.supervisor_name}</Text>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>بدون مشرف</Text>
          )}
          <Tag color="cyan" style={{ width: 'fit-content', margin: 0, fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
            {fmtNum(record.staff_count || 0)} موظف مسجل
          </Tag>
        </div>
      )
    },
    {
      title: 'الهاتف والموقع',
      key: 'location',
      width: 180,
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {record.phone && (
            <Space size={4}>
              <Phone size={12} style={{ color: '#64748b' }} />
              <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{record.phone}</Text>
            </Space>
          )}
          {record.google_maps_url ? (
            <a href={record.google_maps_url} target="_blank" rel="noopener noreferrer">
              <Button size="small" type="link" icon={<EnvironmentOutlined />} style={{ padding: 0, height: 'auto', fontSize: 11.5, color: '#C8A45C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span>خرائط جوجل</span>
                <ExternalLink size={12} />
              </Button>
            </a>
          ) : (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>لا يوجد رابط خريطة</span>
          )}
        </div>
      )
    },
    {
      title: 'المتجر أونلاين',
      key: 'show_in_store',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Tooltip title={record.show_in_store !== false ? 'معروض للعملاء في موقع المتجر' : 'مخفي عن موقع المتجر'}>
          <Switch
            checked={record.show_in_store !== false}
            onChange={(checked) => handleToggleStore(record.id, checked)}
            checkedChildren="معروض"
            unCheckedChildren="مخفي"
            style={{ backgroundColor: record.show_in_store !== false ? '#10B981' : undefined }}
          />
        </Tooltip>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'} style={{ margin: 0, fontWeight: 700 }}>
          {status === 'active' ? 'نشط' : status === 'temporary_closed' ? 'مغلق مؤقتاً' : 'غير نشط'}
        </Tag>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetails(record)}
            style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
          >
            تفاصيل
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            تعديل
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 1. Header Bar */}
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
          <h2>الفروع والمستودعات (Branches Master)</h2>
          <p>إدارة شبكة الفروع والمستودعات اللوجستية، وتعيين بيانات الدخول الخاصة بكل نقطة بيع (POS)</p>
        </div>

        <div className="swm-page-actions">
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchBranches}
            style={{ height: 42, borderRadius: 8 }}
          >
            تحديث
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#4f46e5', fontWeight: 700, height: 42, borderRadius: 8 }}
          >
            إضافة فرع / مخزن
          </Button>
        </div>
      </div>

      {/* 2. Top Executive KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #0284c7',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700 }}>إجمالي المنشآت</Text>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(kpis.total)}
                  <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600, color: '#64748b' }}>منشأة</span>
                </div>
              </div>
              <div style={{ background: '#f0f9ff', padding: 10, borderRadius: 10, border: '1px solid #bae6fd' }}>
                <Building2 size={22} style={{ color: '#0284c7' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
              {fmtNum(kpis.active)} نشطة بالكامل في المنظومة
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #16a34a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700 }}>فروع التجزئة (POS)</Text>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(kpis.retail)}
                  <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600, color: '#64748b' }}>فرع كاشير</span>
                </div>
              </div>
              <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <ShopOutlined style={{ fontSize: 22, color: '#16a34a' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
              مزودة بأدراج نقدية وورديات مبيعات
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #ea580c',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700 }}>المستودعات اللوجستية</Text>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#ea580c', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(kpis.warehouses)}
                  <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600, color: '#64748b' }}>مستودع</span>
                </div>
              </div>
              <div style={{ background: '#fff7ed', padding: 10, borderRadius: 10, border: '1px solid #fed7aa' }}>
                <Warehouse size={22} style={{ color: '#ea580c' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
              المستودع الرئيسي + مستودع الأونلاين
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              borderTop: '3px solid #8b5cf6',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700 }}>القوة العاملة الموزعة</Text>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#8b5cf6', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(kpis.totalStaff)}
                  <span style={{ fontSize: 13, marginRight: 6, fontWeight: 600, color: '#64748b' }}>موظف</span>
                </div>
              </div>
              <div style={{ background: '#f5f3ff', padding: 10, borderRadius: 10, border: '1px solid #ddd6fe' }}>
                <Users size={22} style={{ color: '#8b5cf6' }} />
              </div>
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
              موزعون على الفروع ومسجلو الدوام
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Search & Filter Toolbar */}
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
          {/* Search Input */}
          <Col xs={24} md={8}>
            <Input
              prefix={<Search size={15} style={{ color: '#94a3b8' }} />}
              placeholder="بحث بالاسم، الكود، المدينة، المشرف، أو اليوزر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>

          {/* Filters */}
          <Col xs={24} md={11}>
            <Space wrap size={8}>
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 150 }}
                placeholder="نوع المنشأة"
              >
                <Option value="all">كافة الأنواع</Option>
                <Option value="retail_branch">فروع تجزئة (POS)</Option>
                <Option value="main_warehouse">مستودع رئيسي</Option>
                <Option value="ecom_warehouse">مستودع المتجر</Option>
              </Select>

              {existingCities.length > 0 && (
                <Select
                  value={cityFilter}
                  onChange={setCityFilter}
                  style={{ width: 120 }}
                  placeholder="المدينة"
                >
                  <Option value="all">كافة المدن</Option>
                  {existingCities.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              )}

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 110 }}
                placeholder="الحالة"
              >
                <Option value="all">كافة الحالات</Option>
                <Option value="active">نشط</Option>
                <Option value="inactive">غير نشط</Option>
                <Option value="temporary_closed">مغلق مؤقتاً</Option>
              </Select>

              <Tag color="blue" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(filteredBranches.length)} من {fmtNum(branches.length)}
              </Tag>
            </Space>
          </Col>

          {/* View Mode Switcher */}
          <Col xs={24} md={5} style={{ textAlign: 'left' }}>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  value: 'cards',
                  label: (
                    <Space size={6}>
                      <LayoutGrid size={14} style={{ verticalAlign: 'middle' }} />
                      <span>بطاقات</span>
                    </Space>
                  )
                },
                {
                  value: 'table',
                  label: (
                    <Space size={6}>
                      <List size={14} style={{ verticalAlign: 'middle' }} />
                      <span>جدول</span>
                    </Space>
                  )
                }
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* 4. Main Content: Grid Cards OR Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#64748b' }}>جاري تحميل الفروع والمستودعات...</div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty description="لا توجد فروع تطابق خيارات البحث والتصفية" />
        </Card>
      ) : viewMode === 'table' ? (
        <Card style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={tableColumns}
            dataSource={filteredBranches}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
          />
        </Card>
      ) : (
        /* Grid Cards View */
        <Row gutter={[16, 16]}>
          {filteredBranches.map((branch) => {
            const typeInfo = BRANCH_TYPE_DESCRIPTIONS[branch.branch_type] || BRANCH_TYPE_DESCRIPTIONS.retail_branch;
            return (
              <Col xs={24} sm={12} lg={8} key={branch.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    borderTop: `4px solid ${branch.branch_type === 'retail_branch' ? '#0284c7' : branch.branch_type === 'main_warehouse' ? '#ea580c' : '#8b5cf6'}`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' } }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text code strong style={{ fontSize: 12, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                          {branch.branch_code}
                        </Text>
                        <Tag color={branch.status === 'active' ? 'green' : 'default'} style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>
                          {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                        {branch.branch_name}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      {branch.branch_type === 'retail_branch' ? (
                        <ShopOutlined style={{ fontSize: 20, color: '#0284c7' }} />
                      ) : branch.branch_type === 'main_warehouse' ? (
                        <Warehouse size={20} style={{ color: '#ea580c' }} />
                      ) : (
                        <Store size={20} style={{ color: '#8b5cf6' }} />
                      )}
                    </div>
                  </div>

                  {/* Facility Type Badge */}
                  <div style={{ marginBottom: 12 }}>
                    <Tag color={typeInfo.color} style={{ fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>
                      {typeInfo.portalLabel}
                    </Tag>
                    {branch.city && (
                      <Tag color="gold" style={{ fontWeight: 700, borderRadius: 4, padding: '2px 8px' }}>
                        {branch.city}
                      </Tag>
                    )}
                  </div>

                  <Divider style={{ margin: '8px 0 12px 0' }} />

                  {/* Information Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <MapPin size={14} style={{ color: '#64748b', marginTop: 3, flexShrink: 0 }} />
                      <Text ellipsis={{ tooltip: branch.address }} style={{ color: '#475569', flex: 1 }}>
                        {branch.address || 'العنوان غير محدد'}
                      </Text>
                    </div>

                    {/* Phone */}
                    {branch.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                        <Text style={{ color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{branch.phone}</Text>
                      </div>
                    )}

                    {/* Supervisor & Staff */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Space size={6}>
                        <UserOutlined style={{ color: '#ea580c', fontSize: 13 }} />
                        <Text strong style={{ fontSize: 12 }}>
                          {branch.supervisor_name || 'بدون مشرف'}
                        </Text>
                      </Space>
                      <Tag color="cyan" style={{ margin: 0, fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtNum(branch.staff_count || 0)} موظف
                      </Tag>
                    </div>

                    {/* Login Credentials Box */}
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={6}>
                          <KeyRound size={13} style={{ color: '#6366f1' }} />
                          <Text style={{ fontSize: 11.5, color: '#475569' }}>اليوزر: <strong style={{ color: '#1e293b' }}>{branch.login_username || 'غير معين'}</strong></Text>
                        </Space>
                        {branch.login_password_plain && (
                          <Tooltip title="نسخ كلمة المرور">
                            <Button
                              type="text"
                              size="small"
                              icon={<Copy size={13} style={{ color: '#059669' }} />}
                              onClick={() => handleCopy(branch.login_password_plain, 'كلمة المرور')}
                            />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tooltip title={branch.show_in_store !== false ? 'معروض للعملاء في موقع المتجر' : 'مخفي عن موقع المتجر'}>
                        <Switch
                          size="small"
                          checked={branch.show_in_store !== false}
                          onChange={(checked) => handleToggleStore(branch.id, checked)}
                          style={{ backgroundColor: branch.show_in_store !== false ? '#10B981' : undefined }}
                        />
                      </Tooltip>
                      <Text type="secondary" style={{ fontSize: 11 }}>بالمتجر</Text>
                    </div>

                    <Space size={8}>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleOpenDetails(branch)}
                        style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', fontWeight: 600 }}
                      >
                        تفاصيل
                      </Button>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEdit(branch)}
                      >
                        تعديل
                      </Button>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 5. Branch Details Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} style={{ color: '#0284c7' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {selectedBranch?.branch_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                كود الفرع: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedBranch?.branch_code}</span>
              </div>
            </div>
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        destroyOnClose
        extra={
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setDrawerOpen(false);
              handleOpenEdit(selectedBranch);
            }}
          >
            تعديل الفرع
          </Button>
        }
      >
        {selectedBranch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Facility Header Badge */}
            <div
              style={{
                background: selectedBranch.branch_type === 'retail_branch' ? '#f0f9ff' : selectedBranch.branch_type === 'main_warehouse' ? '#fff7ed' : '#f5f3ff',
                padding: '14px 16px',
                borderRadius: 12,
                border: `1px solid ${selectedBranch.branch_type === 'retail_branch' ? '#bae6fd' : selectedBranch.branch_type === 'main_warehouse' ? '#fed7aa' : '#ddd6fe'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                    {BRANCH_TYPES[selectedBranch.branch_type]?.label}
                  </Text>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {BRANCH_TYPE_DESCRIPTIONS[selectedBranch.branch_type]?.portalLabel}
                  </div>
                </div>
                <Tag color={selectedBranch.status === 'active' ? 'green' : 'default'} style={{ fontSize: 12, padding: '3px 8px', fontWeight: 700 }}>
                  {selectedBranch.status === 'active' ? 'نشط بالكامل' : 'غير نشط'}
                </Tag>
              </div>
            </div>

            {/* Login Credentials Section */}
            <div>
              <Text strong style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <KeyRound size={15} style={{ color: '#6366f1' }} />
                <span>بيانات الدخول وبوابة النظام</span>
              </Text>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>اسم المستخدم (Username):</Text>
                  <Space size={6}>
                    <Text code strong style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {selectedBranch.login_username || 'غير محدد'}
                    </Text>
                    {selectedBranch.login_username && (
                      <Button
                        type="text"
                        size="small"
                        icon={<Copy size={13} />}
                        onClick={() => handleCopy(selectedBranch.login_username, 'اسم المستخدم')}
                      />
                    )}
                  </Space>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>كلمة المرور (Password):</Text>
                  <Space size={6}>
                    <Text code strong style={{ fontSize: 13, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                      {showPassword ? (selectedBranch.login_password_plain || '••••••••') : '••••••••'}
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      icon={showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                    {selectedBranch.login_password_plain && (
                      <Button
                        type="text"
                        size="small"
                        icon={<Copy size={13} style={{ color: '#059669' }} />}
                        onClick={() => handleCopy(selectedBranch.login_password_plain, 'كلمة المرور')}
                      />
                    )}
                  </Space>
                </div>

                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message={BRANCH_TYPE_DESCRIPTIONS[selectedBranch.branch_type]?.accountTitle}
                  description={BRANCH_TYPE_DESCRIPTIONS[selectedBranch.branch_type]?.description}
                  style={{ fontSize: 11.5, marginTop: 4, borderRadius: 6 }}
                />
              </div>
            </div>

            {/* Location & Contact Section */}
            <div>
              <Text strong style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MapPin size={15} style={{ color: '#ea580c' }} />
                <span>الموقع الجغرافي وبيانات التواصل</span>
              </Text>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">المدينة / المحافظة:</Text>
                  <Text strong>{selectedBranch.city || '—'}</Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">العنوان التفصيلي:</Text>
                  <Text style={{ maxWidth: 280, textAlign: 'left' }}>{selectedBranch.address || '—'}</Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">رقم الهاتف:</Text>
                  <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{selectedBranch.phone || '—'}</Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">مواعيد العمل:</Text>
                  <Text>{selectedBranch.working_hours || '—'}</Text>
                </div>

                {selectedBranch.google_maps_url && (
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <a href={selectedBranch.google_maps_url} target="_blank" rel="noopener noreferrer">
                      <Button block icon={<EnvironmentOutlined />} style={{ color: '#C8A45C', borderColor: '#C8A45C', fontWeight: 700 }}>
                        فتح الموقع على خرائط جوجل (Google Maps)
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Directory Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={15} style={{ color: '#8b5cf6' }} />
                  <span>طاقم العمل المسجل بالفرع</span>
                </Text>
                <Tag color="cyan" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {fmtNum(branchStaff.length)} موظفين
                </Tag>
              </div>

              {loadingStaff ? (
                <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
              ) : branchStaff.length === 0 ? (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  لا يوجد موظفون مسجلون بهذا الفرع حالياً
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {branchStaff.map(emp => (
                    <div
                      key={emp.id}
                      style={{
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 12.5, color: '#1e293b', display: 'block' }}>{emp.full_name || emp.username}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{emp.phone || 'بدون هاتف'}</Text>
                      </div>
                      <Tag color={emp.role === 'supervisor' ? 'orange' : emp.role === 'cashier' ? 'blue' : 'default'} style={{ fontSize: 11, fontWeight: 600 }}>
                        {emp.role === 'supervisor' ? 'مشرف' : emp.role === 'cashier' ? 'كاشير' : emp.role === 'salesperson' ? 'بائع' : emp.role}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fast Administrative Shortcuts */}
            <Divider style={{ margin: '8px 0' }}>إجراءات إدارية سريعة</Divider>
            <Row gutter={[10, 10]}>
              <Col span={12}>
                <Button
                  block
                  icon={<PackageCheck size={14} />}
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/dashboard/stock_audit');
                  }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  جرد مخزون الفرع
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<Coins size={14} />}
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/dashboard/treasury_admin');
                  }}
                  style={{ height: 38, borderRadius: 8 }}
                >
                  خزينة وحركات الفرع
                </Button>
              </Col>
            </Row>
          </div>
        )}
      </Drawer>

      {/* 6. CREATE BRANCH MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={20} style={{ color: '#4f46e5' }} />
            <span>إضافة فرع أو مستودع لوجستي جديد</span>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={680}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 12 }}>
          {/* Facility Type Selection with Visual Cards */}
          <Form.Item
            label="نوع المنشأة / الفرع"
            name="branch_type"
            initialValue="retail_branch"
            rules={[{ required: true }]}
          >
            <Row gutter={[10, 10]}>
              {Object.entries(BRANCH_TYPE_DESCRIPTIONS).map(([typeKey, info]) => {
                const isSelected = selectedCreateType === typeKey;
                return (
                  <Col xs={24} sm={8} key={typeKey}>
                    <div
                      onClick={() => {
                        createForm.setFieldsValue({ branch_type: typeKey });
                        setSelectedCreateType(typeKey);
                        fetchNextBranchCode(typeKey);
                      }}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 10,
                        border: isSelected ? `2px solid ${info.color === 'blue' ? '#0284c7' : info.color === 'volcano' ? '#ea580c' : '#8b5cf6'}` : '1px solid #e2e8f0',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <div style={{ marginBottom: 6 }}>{info.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{BRANCH_TYPES[typeKey]?.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{info.portalLabel}</div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Form.Item>

          <Alert
            message={BRANCH_TYPE_DESCRIPTIONS[selectedCreateType]?.title}
            description={BRANCH_TYPE_DESCRIPTIONS[selectedCreateType]?.description}
            type={selectedCreateType === 'ecom_warehouse' ? 'warning' : (selectedCreateType === 'main_warehouse' ? 'error' : 'info')}
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16, borderRadius: 8, fontSize: 12 }}
          />

          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item
                label={
                  <Space>
                    <span>كود الفرع (Code)</span>
                    <Tag color="purple">تلقائي</Tag>
                  </Space>
                }
                name="branch_code"
                rules={[{ required: true, message: 'يرجى إدخال كود الفرع' }]}
              >
                <Input
                  placeholder="مثال: BR-008"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}
                  suffix={
                    <Tooltip title="إعادة توليد كود جديد">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined spin={generatingCode} />}
                        onClick={() => fetchNextBranchCode(createForm.getFieldValue('branch_type') || 'retail_branch')}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={14}>
              <Form.Item
                label="اسم الفرع / المستودع"
                name="branch_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
              >
                <Input placeholder="مثال: فرع مدينة نصر، مستودع الأسكندرية..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
              {BRANCH_TYPE_DESCRIPTIONS[selectedCreateType]?.accountTitle}
            </span>
          </Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="اسم المستخدم (Username)"
                name="login_username"
                rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
              >
                <Input prefix={<KeyOutlined style={{ color: '#6366f1' }} />} placeholder="مثال: branch_user" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>كلمة المرور (Password)</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<Sparkles size={12} />}
                      onClick={() => generateStrongPassword(createForm)}
                      style={{ padding: 0, height: 'auto', fontSize: 11 }}
                    >
                      توليد كلمة سر
                    </Button>
                  </div>
                }
                name="password"
                rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#6366f1' }} />} placeholder="••••••••" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>الموقع الجغرافي وخريطة جوجل</Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="المدينة / المحافظة" name="city">
                <Select placeholder="اختر المدينة أو اكتبها" allowClear showSearch>
                  {POPULAR_CITIES.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="رقم هاتف الفرع" name="phone">
                <Input placeholder="+201000000000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="العنوان التفصيلي" name="address">
            <Input placeholder="شارع، منطقة، بجوار علامة مميزة..." />
          </Form.Item>

          <Form.Item
            label="رابط موقع الفرع على خرائط جوجل (Google Maps URL)"
            name="google_maps_url"
            extra="مثال: https://maps.app.goo.gl/... لتمكين الملاحة للفرع بنقرة واحدة."
          >
            <Input prefix={<EnvironmentOutlined style={{ color: '#ea4335' }} />} placeholder="https://maps.app.goo.gl/..." style={{ direction: 'ltr' }} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={14}>
              <Form.Item label="مواعيد العمل (Working Hours)" name="working_hours">
                <Input placeholder="يومياً من 10:00 صباحاً إلى 11:00 مساءً" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item label="ترتيب العرض" name="display_order">
                <InputNumber min={0} max={99} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item label="عرض بالمتجر" name="show_in_store" valuePropName="checked">
                <Switch checkedChildren="معروض" unCheckedChildren="مخفي" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5', fontWeight: 700 }}>
                حفظ الفرع وبيانات الدخول
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 7. EDIT BRANCH MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#0284c7' }} />
            <span>تعديل بيانات الفرع: {editingBranch?.branch_name}</span>
          </div>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingBranch(null);
        }}
        footer={null}
        destroyOnHidden
        width={680}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
          onValuesChange={(changed) => {
            if (changed.branch_type) setSelectedEditType(changed.branch_type);
          }}
          style={{ marginTop: 12 }}
        >
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="اسم الفرع / المستودع"
                name="branch_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
              >
                <Input placeholder="اسم الفرع" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="نوع المنشأة"
                name="branch_type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="retail_branch">فرع تجزئة (Retail Branch)</Option>
                  <Option value="ecom_warehouse">مستودع المتجر الإلكتروني (E-Com Warehouse)</Option>
                  <Option value="main_warehouse">مستودع رئيسي (Main Warehouse)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '10px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
              {BRANCH_TYPE_DESCRIPTIONS[selectedEditType]?.accountTitle}
            </span>
          </Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="اسم المستخدم (Username)"
                name="login_username"
                rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
              >
                <Input prefix={<KeyOutlined style={{ color: '#6366f1' }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>كلمة المرور (Password)</span>
                    <Button
                      type="link"
                      size="small"
                      icon={<Sparkles size={12} />}
                      onClick={() => generateStrongPassword(editForm)}
                      style={{ padding: 0, height: 'auto', fontSize: 11 }}
                    >
                      توليد كلمة سر
                    </Button>
                  </div>
                }
                name="password"
                rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#6366f1' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '10px 0' }}>الموقع الجغرافي والتواصل</Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="المدينة / المحافظة" name="city">
                <Select placeholder="اختر المدينة أو اكتبها" allowClear showSearch>
                  {POPULAR_CITIES.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="رقم هاتف الفرع" name="phone">
                <Input placeholder="+201000000000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="العنوان التفصيلي" name="address">
            <Input placeholder="شارع عباس العقاد، مدينة نصر..." />
          </Form.Item>

          <Form.Item
            label="رابط موقع الفرع على خرائط جوجل (Google Maps URL)"
            name="google_maps_url"
          >
            <Input prefix={<EnvironmentOutlined style={{ color: '#ea4335' }} />} placeholder="https://maps.app.goo.gl/..." style={{ direction: 'ltr' }} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={14}>
              <Form.Item label="مواعيد العمل" name="working_hours">
                <Input placeholder="يومياً من 10:00 صباحاً إلى 11:00 مساءً" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item label="ترتيب العرض" name="display_order">
                <InputNumber min={0} max={99} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item label="عرض بالمتجر" name="show_in_store" valuePropName="checked">
                <Switch checkedChildren="معروض" unCheckedChildren="مخفي" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '10px 0' }}>الإشراف وحالة التشغيل</Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="مشرف الفرع" name="supervisor_id">
                <Select placeholder="اختر مشرف الفرع" allowClear>
                  {supervisors.map((s) => (
                    <Option key={s.id} value={s.id}>{s.full_name} ({s.username})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="حالة الفرع" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="active">نشط</Option>
                  <Option value="inactive">غير نشط</Option>
                  <Option value="temporary_closed">مغلق مؤقتاً</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBranch(null);
                }}
              >
                إلغاء
              </Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5', fontWeight: 700 }}>
                حفظ التعديلات
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
