import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Drawer,
  InputNumber,
  Tooltip,
  Divider,
  Alert,
  Select,
  Tabs
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  UserAddOutlined,
  CrownOutlined,
  HistoryOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import {
  Award,
  Users,
  Wallet,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Trophy,
  Store,
  FileSpreadsheet,
  Download,
  ShoppingBag,
  Receipt
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../api';
import { antMessage as message } from '../utils/antAppBridge';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Customers({ currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_customers: 0,
    total_points: 0,
    total_lifetime_points: 0,
    monetary_value: 0
  });

  // Filters & Pagination
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [exporting, setExporting] = useState(false);

  // Modals & Drawers state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustForm] = Form.useForm();

  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

  // 1. Fetch Retail Branches Only for Filter Dropdown
  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data?.success && Array.isArray(res.data.data)) {
        // Retail branches only: exclude warehouses
        const retailBranches = res.data.data.filter(
          (b) => b.branch_type === 'retail_branch' && b.status === 'active'
        );
        setBranches(retailBranches);
      }
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  // 2. Fetch Loyalty Stats with Optional Branch Scope
  const fetchStats = async (branchId = selectedBranchId) => {
    try {
      const params = {};
      if (branchId && branchId !== 'all') {
        params.branch_id = branchId;
      }
      const res = await api.get('/api/swm/loyalty/stats', { params });
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load loyalty stats', e);
    }
  };

  // 3. Fetch Customers List
  const fetchCustomers = async (page = 1, search = searchQuery, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        search: search?.trim() || undefined
      };
      if (branchId && branchId !== 'all') {
        params.branch_id = branchId;
      }
      const res = await api.get('/api/swm/loyalty/customers', { params });
      if (res.data?.success) {
        setCustomers(res.data.data.customers || []);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: res.data.data.pagination?.total || 0
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل جلب قائمة العملاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchCustomers(1, '', 'all');
    fetchStats('all');
  }, []);

  const handleSearchSubmit = () => {
    fetchCustomers(1, searchQuery, selectedBranchId);
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
    fetchCustomers(1, searchQuery, value);
    fetchStats(value);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranchId('all');
    fetchCustomers(1, '', 'all');
    fetchStats('all');
  };

  // 4. Excel Sheet Export Ability (UTF-8 BOM CSV with Full Arabic Support)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = {
        export: true,
        search: searchQuery?.trim() || undefined
      };
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.branch_id = selectedBranchId;
      }

      const res = await api.get('/api/swm/loyalty/customers', { params });
      const rows = res.data?.data?.customers || [];

      if (rows.length === 0) {
        message.warning('لا توجد بيانات عملاء لتصديرها وفق خيارات البحث والتصفية المحددة');
        return;
      }

      const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        'كود العميل',
        'اسم العميل',
        'رقم الهاتف',
        'الفرع المنسوب إليه',
        'رصيد النقاط الحالي',
        'القيمة النقدية المقابلة (ج.م)',
        'إجمالي النقاط المكتسبة',
        'عدد الفواتير',
        'إجمالي المشتريات (ج.م)',
        'تاريخ آخر طلب',
        'تاريخ التسجيل'
      ];

      const csvRows = rows.map((c) => {
        const points = parseInt(c.total_points || 0, 10);
        const monetaryVal = (points * 0.50).toFixed(2);
        const lifetime = parseInt(c.lifetime_points || 0, 10);
        const orders = parseInt(c.total_orders || 0, 10);
        const spent = parseFloat(c.total_spent || 0).toFixed(2);
        const lastOrder = c.last_order_date ? dayjs(c.last_order_date).format('YYYY-MM-DD HH:mm') : '—';
        const regDate = c.created_at ? dayjs(c.created_at).format('YYYY-MM-DD') : '—';
        const branchName = c.branch_name || 'المركز الرئيسي';

        return [
          escapeCsv(c.customer_code),
          escapeCsv(c.full_name),
          escapeCsv(c.phone),
          escapeCsv(branchName),
          points,
          monetaryVal,
          lifetime,
          orders,
          spent,
          escapeCsv(lastOrder),
          escapeCsv(regDate)
        ].join(',');
      });

      // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic correctly without garbled characters
      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let branchTag = 'كافة_فروع_التجزئة';
      if (selectedBranchId !== 'all') {
        const foundB = branches.find((b) => String(b.id) === String(selectedBranchId));
        branchTag = (foundB?.branch_name || `فرع_${selectedBranchId}`).replace(/\s+/g, '_');
      }

      link.setAttribute('download', `سجل_العملاء_ونقاط_الولاء_${branchTag}_${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(`تم تصدير ${rows.length} عميل إلى شيت إكسيل بنجاح`);
    } catch (err) {
      console.error('Export excel error:', err);
      message.error('فشل تصدير ملف الإكسيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setExporting(false);
    }
  };

  // 5. Customer Creation
  const handleCreateCustomer = async (values) => {
    setCreating(true);
    try {
      const res = await api.post('/api/swm/loyalty/customers', values);
      if (res.data?.success) {
        message.success(`تم تسجيل العميل بنجاح (${res.data.data.customer_code})`);
        setCreateModalOpen(false);
        createForm.resetFields();
        fetchCustomers(1, searchQuery, selectedBranchId);
        fetchStats(selectedBranchId);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تسجيل العميل');
    } finally {
      setCreating(false);
    }
  };

  // 6. Open History & Invoices Drawer
  const handleOpenHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryDrawerOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/swm/loyalty/customers/${customer.id}`);
      if (res.data?.success) {
        setSelectedCustomer(res.data.data.customer);
        setHistoryTransactions(res.data.data.history || []);
        setCustomerInvoices(res.data.data.invoices || []);
      }
    } catch (e) {
      message.error('فشل جلب كشف حساب العميل وسجل النقاط');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 7. Manual Points Adjust
  const handleOpenAdjust = (customer) => {
    setSelectedCustomer(customer);
    adjustForm.setFieldsValue({
      customer_id: customer.id,
      points: 0,
      notes: ''
    });
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (values) => {
    setAdjusting(true);
    try {
      const res = await api.post('/api/swm/loyalty/adjust', {
        customer_id: selectedCustomer.id,
        points: values.points,
        notes: values.notes
      });
      if (res.data?.success) {
        message.success('تم تعديل رصيد النقاط بنجاح');
        setAdjustModalOpen(false);
        fetchCustomers(pagination.current, searchQuery, selectedBranchId);
        fetchStats(selectedBranchId);
        if (historyDrawerOpen) {
          handleOpenHistory(selectedCustomer);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تعديل النقاط');
    } finally {
      setAdjusting(false);
    }
  };

  // 8. Table Columns
  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      width: 55,
      align: 'center',
      render: (_, __, i) => (pagination.current - 1) * pagination.pageSize + i + 1
    },
    {
      title: 'كود العميل',
      dataIndex: 'customer_code',
      width: 125,
      render: (code) => (
        <Tag color="gold" style={{ fontWeight: 800, fontFamily: 'monospace', borderRadius: 4 }}>
          {code}
        </Tag>
      )
    },
    {
      title: 'اسم العميل',
      dataIndex: 'full_name',
      render: (name) => (
        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>
          {name}
        </span>
      )
    },
    {
      title: 'رقم الهاتف',
      dataIndex: 'phone',
      width: 145,
      render: (phone) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: '#C8A45C' }} />
          <Text copyable style={{ fontFamily: 'monospace', fontWeight: 600 }}>{phone}</Text>
        </Space>
      )
    },
    {
      title: 'الفرع المنسوب إليه',
      dataIndex: 'branch_name',
      width: 155,
      render: (name, record) => (
        <Tag
          color={record.branch_id ? 'blue' : 'default'}
          icon={<Store size={12} style={{ marginLeft: 3, verticalAlign: 'middle' }} />}
          style={{ fontWeight: 600, borderRadius: 6, fontSize: 11.5, padding: '2px 8px' }}
        >
          {name || 'المركز الرئيسي'}
        </Tag>
      )
    },
    {
      title: 'رصيد النقاط الحالي',
      dataIndex: 'total_points',
      width: 165,
      render: (points) => {
        const val = parseInt(points || 0, 10);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color={val > 0 ? 'orange' : 'default'} icon={<Trophy size={11} />} style={{ fontWeight: 800, fontSize: 12, margin: 0, borderRadius: 6 }}>
              {val.toLocaleString('ar-EG')} نقطة
            </Tag>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              (≈ {(val * 0.5).toFixed(1)} ج.م)
            </span>
          </div>
        );
      }
    },
    {
      title: 'إجمالي المشتريات والطلبات',
      key: 'purchases',
      width: 175,
      render: (_, record) => {
        const orders = parseInt(record.total_orders || 0, 10);
        const spent = parseFloat(record.total_spent || 0);
        return (
          <div>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13 }}>
              {spent.toLocaleString('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ج.م
            </div>
            <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <ShoppingBag size={11} color="#64748B" />
              <span>{orders} فاتورة مكتملة</span>
            </div>
          </div>
        );
      }
    },
    {
      title: 'تاريخ التسجيل',
      dataIndex: 'created_at',
      width: 120,
      render: (dt) => dt ? dayjs(dt).format('YYYY-MM-DD') : '—'
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 175,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="عرض كشف حساب سجل النقاط والفواتير">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => handleOpenHistory(record)}
              style={{ borderRadius: 6, borderColor: '#C8A45C', color: '#B45309' }}
            >
              كشف الحساب
            </Button>
          </Tooltip>

          {isAdmin && (
            <Tooltip title="تعديل رصيد النقاط يدوياً">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenAdjust(record)}
                style={{ borderRadius: 6 }}
              >
                تعديل
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const historyColumns = [
    {
      title: 'التاريخ',
      dataIndex: 'created_at',
      width: 130,
      render: (dt) => dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '—'
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      width: 100,
      render: (type) => {
        const types = {
          earn: { label: 'اكتساب بيع', color: 'green' },
          redeem: { label: 'استبدال خصم', color: 'red' },
          reverse: { label: 'عكس مرتجع', color: 'volcano' },
          adjust: { label: 'تعديل يدوي', color: 'blue' }
        };
        const t = types[type] || { label: type, color: 'default' };
        return <Tag color={t.color} style={{ fontWeight: 700 }}>{t.label}</Tag>;
      }
    },
    {
      title: 'النقاط',
      dataIndex: 'points',
      width: 90,
      align: 'center',
      render: (pts) => {
        const num = parseInt(pts || 0, 10);
        return (
          <span style={{ fontWeight: 800, color: num > 0 ? '#15803d' : '#b91c1c' }}>
            {num > 0 ? `+${num}` : num}
          </span>
        );
      }
    },
    {
      title: 'الرصيد بعد',
      dataIndex: 'balance_after',
      width: 90,
      align: 'center',
      render: (b) => <strong>{b}</strong>
    },
    {
      title: 'الملاحظات / الفاتورة',
      dataIndex: 'notes',
      render: (notes, row) => (
        <div>
          <div>{notes || '—'}</div>
          {row.invoice_number && (
            <Tag color="cyan" style={{ fontSize: 10, marginTop: 2 }}>
              {row.invoice_number}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'الفرع / المنفذ',
      dataIndex: 'branch_name',
      width: 130,
      render: (b, row) => b || row.created_by_name || '—'
    }
  ];

  const invoiceColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      width: 130,
      render: (inv) => <strong style={{ color: '#0284C7' }}>{inv || '—'}</strong>
    },
    {
      title: 'الفرع',
      dataIndex: 'branch_name',
      width: 120,
      render: (b) => <Tag color="blue">{b || 'الرئيسي'}</Tag>
    },
    {
      title: 'قيمة الفاتورة',
      dataIndex: 'total_amount',
      width: 120,
      render: (val) => <strong>{parseFloat(val || 0).toLocaleString('ar-EG')} ج.م</strong>
    },
    {
      title: 'النقاط المكتسبة',
      dataIndex: 'points_earned',
      width: 110,
      align: 'center',
      render: (pts) => pts > 0 ? <Tag color="green">+{pts}</Tag> : '—'
    },
    {
      title: 'خصم النقاط',
      dataIndex: 'points_discount',
      width: 110,
      align: 'center',
      render: (disc) => parseFloat(disc || 0) > 0 ? <Tag color="red">-{parseFloat(disc).toFixed(1)} ج.م</Tag> : '—'
    },
    {
      title: 'التاريخ',
      dataIndex: 'created_at',
      width: 130,
      render: (dt) => dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '—'
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16
        }}
      >
        <Space align="center" size="middle">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#0B0F17',
              border: '1px solid #C8A45C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CrownOutlined style={{ color: '#DFCA95', fontSize: 22 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0F172A' }}>
                سجل العملاء ونقاط الولاء (Customers & Loyalty)
              </Title>
              <Tag color="gold" style={{ fontWeight: 700, borderRadius: 6 }}>
                {stats.total_customers.toLocaleString('ar-EG')} عميل مسجل
              </Tag>
              {selectedBranchId !== 'all' && (
                <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6 }}>
                  {branches.find(b => String(b.id) === String(selectedBranchId))?.branch_name || 'فرع مخصص'}
                </Tag>
              )}
            </div>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              قاعدة بيانات عملاء التجزئة المركزية، كشف حساب النقاط، وتصفية المبيعات حسب الفرع مع تصدير إكسيل
            </Text>
          </div>
        </Space>

        <Space size="middle" wrap>
          {/* Excel Export Button */}
          <Button
            icon={<FileSpreadsheet size={16} style={{ marginLeft: 4 }} />}
            onClick={handleExportExcel}
            loading={exporting}
            style={{
              backgroundColor: '#059669',
              borderColor: '#047857',
              color: '#FFFFFF',
              fontWeight: 700,
              borderRadius: 8,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            تصدير شيت إكسيل (Excel Export)
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchCustomers(pagination.current, searchQuery, selectedBranchId);
              fetchStats(selectedBranchId);
            }}
            loading={loading}
            style={{ borderRadius: 8, height: 36 }}
          >
            تحديث
          </Button>

          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              createForm.resetFields();
              if (selectedBranchId !== 'all') {
                createForm.setFieldsValue({ branch_id: parseInt(selectedBranchId, 10) });
              }
              setCreateModalOpen(true);
            }}
            style={{
              backgroundColor: '#0B0F17',
              borderColor: '#C8A45C',
              color: '#DFCA95',
              fontWeight: 700,
              borderRadius: 8,
              height: 36
            }}
          >
            تسجيل عميل جديد
          </Button>
        </Space>
      </div>

      {/* 2. KPIs Overview Grid */}
      <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
              border: '1px solid #BAE6FD'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: 600 }}>إجمالي العملاء</Text>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0C4A6E', marginTop: 4 }}>
                  {stats.total_customers.toLocaleString('ar-EG')}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} color="#0284C7" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)',
              border: '1px solid #FDE68A'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>رصيد النقاط النشطة</Text>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#92400E', marginTop: 4 }}>
                  {stats.total_points.toLocaleString('ar-EG')}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} color="#D97706" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              border: '1px solid #A7F3D0'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>القيمة النقدية المقابلة</Text>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                  {stats.monetary_value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={22} color="#059669" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
              border: '1px solid #E9D5FF'
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: 12, color: '#6B21A8', fontWeight: 600 }}>إجمالي النقاط المكتسبة</Text>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#581C87', marginTop: 4 }}>
                  {stats.total_lifetime_points.toLocaleString('ar-EG')}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} color="#7C3AED" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Search and Branch Filters Card */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        styles={{ body: { padding: '14px 16px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          {/* Branch Filter */}
          <Col xs={24} sm={12} md={7}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Store size={16} color="#0284C7" style={{ flexShrink: 0 }} />
              <Select
                value={selectedBranchId}
                onChange={handleBranchChange}
                style={{ width: '100%' }}
                size="middle"
                placeholder="تصفية حسب فرع التجزئة..."
              >
                <Option value="all">كافة فروع التجزئة (All Retail Branches)</Option>
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.branch_name} {b.branch_code ? `(${b.branch_code})` : ''}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>

          {/* Search Input */}
          <Col xs={24} sm={12} md={10}>
            <Input
              size="middle"
              placeholder="بحث باسم العميل، رقم الهاتف، أو كود العميل..."
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearchSubmit}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>

          {/* Action Buttons */}
          <Col xs={24} sm={24} md={7} style={{ textAlign: 'left' }}>
            <Space wrap>
              <Button
                type="primary"
                onClick={handleSearchSubmit}
                style={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#C8A45C',
                  color: '#DFCA95',
                  fontWeight: 600,
                  borderRadius: 8
                }}
              >
                تطبيق الفلترة
              </Button>

              {(searchQuery || selectedBranchId !== 'all') && (
                <Button onClick={handleResetFilters} style={{ borderRadius: 8 }}>
                  إلغاء الفلاتر
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 4. Customers Table */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        styles={{ body: { padding: '0' } }}
      >
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false,
            showTotal: (total) => `إجمالي ${total.toLocaleString('ar-EG')} عميل مسجل`,
            onChange: (p) => fetchCustomers(p, searchQuery, selectedBranchId)
          }}
          scroll={{ x: 950 }}
          locale={{ emptyText: 'لا يوجد عملاء يطابقون خيارات البحث والتصفية المحددة' }}
        />
      </Card>

      {/* 5. Customer Details, Ledger & Invoices Drawer */}
      <Drawer
        title={
          <Space>
            <CrownOutlined style={{ color: '#C8A45C' }} />
            <span>كشف حساب العميل والولاء</span>
          </Space>
        }
        width={Math.min(720, typeof window !== 'undefined' ? window.innerWidth * 0.95 : 720)}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        destroyOnHidden
      >
        {selectedCustomer && (
          <div>
            {/* Customer Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)',
                padding: '16px 20px',
                borderRadius: 12,
                border: '1px solid #FDE68A',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 16, color: '#92400E' }}>
                    {selectedCustomer.full_name}
                  </Text>
                  <Tag color="gold" style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                    {selectedCustomer.customer_code}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#78350F', marginTop: 4 }}>
                  <span>الهاتف: {selectedCustomer.phone}</span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>الفرع: {selectedCustomer.branch_name || 'المركز الرئيسي'}</span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>تاريخ التسجيل: {dayjs(selectedCustomer.created_at).format('YYYY-MM-DD')}</span>
                </div>
              </div>

              <div style={{ textAlign: 'left' }}>
                <Text style={{ fontSize: 11, color: '#78350F', display: 'block' }}>الرصيد المتاح حالياً</Text>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#B45309' }}>
                  {parseInt(selectedCustomer.total_points || 0, 10).toLocaleString('ar-EG')}
                </span>
                <span style={{ fontSize: 12, color: '#B45309', marginRight: 4 }}>نقطة</span>
              </div>
            </div>

            {/* Tabs for Points Ledger and Sales Invoices */}
            <Tabs
              defaultActiveKey="points"
              items={[
                {
                  key: 'points',
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Award size={15} />
                      <span>حركات نقاط الولاء ({historyTransactions.length})</span>
                    </span>
                  ),
                  children: (
                    <Table
                      size="small"
                      columns={historyColumns}
                      dataSource={historyTransactions}
                      rowKey="id"
                      loading={loadingHistory}
                      scroll={{ x: 600 }}
                      pagination={{ pageSize: 12 }}
                      locale={{ emptyText: 'لا توجد حركات نقاط مسجلة لهذا العميل' }}
                    />
                  )
                },
                {
                  key: 'invoices',
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Receipt size={15} />
                      <span>فواتير ومشتريات العميل ({customerInvoices.length})</span>
                    </span>
                  ),
                  children: (
                    <Table
                      size="small"
                      columns={invoiceColumns}
                      dataSource={customerInvoices}
                      rowKey="id"
                      loading={loadingHistory}
                      scroll={{ x: 620 }}
                      pagination={{ pageSize: 12 }}
                      locale={{ emptyText: 'لا توجد فواتير مبيعات سابقة لهذا العميل' }}
                    />
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* 6. Manual Adjust Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#C8A45C' }} />
            <span>تعديل رصيد نقاط العميل يدوياً</span>
          </Space>
        }
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={450}
      >
        {selectedCustomer && (
          <Form form={adjustForm} layout="vertical" onFinish={handleAdjustSubmit}>
            <Alert
              type="warning"
              showIcon
              message={`العميل: ${selectedCustomer.full_name} (${selectedCustomer.customer_code})`}
              description={`الرصيد الحالي: ${selectedCustomer.total_points} نقطة. يمكنك إدخال قيمة موجبة (+) للإضافة، أو سالبة (-) للخصم.`}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />

            <Form.Item
              name="points"
              label="مقدار التعديل (نقاط)"
              rules={[{ required: true, message: 'مطلوب تحديد عدد النقاط' }]}
              extra="مثال: 50 لإضافة 50 نقطة، أو -30 لخصم 30 نقطة"
            >
              <InputNumber
                style={{ width: '100%', borderRadius: 8 }}
                precision={0}
                placeholder="عدد النقاط..."
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="سبب التعديل الإداري"
              rules={[{ required: true, message: 'يرجى كتابة سبب التعديل للتدقيق المحاسبي' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="مثال: ترضية عميل، مكافأة عيد ميلاد، تصحيح خطأ إدخال..."
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setAdjustModalOpen(false)}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={adjusting}
                style={{ backgroundColor: '#0B0F17', borderColor: '#C8A45C', color: '#DFCA95', fontWeight: 700 }}
              >
                تأكيد وحفظ التعديل
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* 7. Quick Register Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#C8A45C' }} />
            <span>تسجيل عميل جديد بنظام الولاء</span>
          </Space>
        }
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={460}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateCustomer}>
          <Form.Item
            name="full_name"
            label="اسم العميل الكامل"
            rules={[{ required: true, message: 'يرجى إدخال اسم العميل' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="مثال: محمود علي" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="رقم الهاتف"
            rules={[
              { required: true, message: 'يرجى إدخال رقم الهاتف' },
              { min: 9, message: 'رقم الهاتف قصير جداً' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="01xxxxxxxxx" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="branch_id"
            label="فرع التجزئة المنسوب إليه"
          >
            <Select placeholder="اختر فرع التجزئة (اختياري)..." allowClear>
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.branch_name} {b.branch_code ? `(${b.branch_code})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setCreateModalOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              style={{ backgroundColor: '#0B0F17', borderColor: '#C8A45C', color: '#DFCA95', fontWeight: 700 }}
            >
              حفظ وتسجيل
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
