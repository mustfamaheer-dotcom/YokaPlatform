import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  message,
  Card,
  Popconfirm,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
  Radio,
  Divider,
  InputNumber,
  Avatar,
  Switch,
  Spin
} from 'antd';
import {
  UserAddOutlined,
  ReloadOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  CrownOutlined,
  ShopOutlined,
  FilterOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  CheckOutlined,
  LockOutlined,
  ShoppingCartOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  FileExcelOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = [
  { value: 'super_admin', label: 'مدير عام للنظام (Super Admin)', color: 'red', portal: 'admin' },
  { value: 'admin', label: 'مدير إداري (Admin)', color: 'volcano', portal: 'admin' },
  { value: 'warehouse_manager', label: 'مدير المخازن (Warehouse Manager)', color: 'purple', portal: 'warehouse' },
  { value: 'supervisor', label: 'مشرف فرع (Supervisor)', color: 'orange', portal: 'branch' },
  { value: 'salesperson', label: 'بائع / كاشير (Salesperson)', color: 'blue', portal: 'branch' }
];

const DEFAULT_WM_PERMS = {
  perm_groups_items: true,
  perm_stock_audit: true,
  perm_transfers: true,
  perm_purchases: true,
  perm_suppliers: true,
  perm_payroll: true,
  perm_branches: true,
  perm_users: true
};

function WarehousePermissionsEditor({ permissions, onChange, loading = false }) {
  const perms = permissions || DEFAULT_WM_PERMS;

  const toggle = (key, val) => {
    onChange({ ...perms, [key]: val });
  };

  const setAll = (val) => {
    onChange({
      perm_groups_items: val,
      perm_stock_audit: val,
      perm_transfers: val,
      perm_purchases: val,
      perm_suppliers: val,
      perm_payroll: val,
      perm_branches: val,
      perm_users: val
    });
  };

  const sections = [
    {
      title: '1. أقسام إدارة المخزون والأصناف',
      color: '#16a34a',
      items: [
        { key: 'perm_groups_items', label: 'دليل المجموعات والأصناف' },
        { key: 'perm_stock_audit', label: 'الجرد الفعلي وسندات التسوية' },
        { key: 'perm_transfers', label: 'أذونات الصرف والتحويل بين الفروع' }
      ]
    },
    {
      title: '2. أقسام المشتريات والتوريد',
      color: '#d97706',
      items: [
        { key: 'perm_purchases', label: 'فواتير المشتريات والتوريد' },
        { key: 'perm_suppliers', label: 'دليل وحسابات الموردين' }
      ]
    },
    {
      title: '3. القبض الخاص ورواتب ومسحوبات العاملين',
      color: '#9333ea',
      items: [
        { key: 'perm_payroll', label: 'مسير الرواتب ومسحوبات العاملين' }
      ]
    },
    {
      title: '4. أقسام إدارة النظام والفروع',
      color: '#e11d48',
      items: [
        { key: 'perm_branches', label: 'الفروع والمستودعات' },
        { key: 'perm_users', label: 'المستخدمين والموظفين' }
      ]
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Spin />
        <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>جاري تحميل الصلاحيات...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 10, padding: 14, margin: '14px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space align="center">
          <LockOutlined style={{ color: '#7e22ce', fontSize: 16 }} />
          <Text strong style={{ color: '#7e22ce', fontSize: 13.5 }}>
            صلاحيات مدير المخازن (التحكم الإداري الكامل)
          </Text>
        </Space>
        <Space size="small">
          <Button size="small" type="primary" onClick={() => setAll(true)} style={{ backgroundColor: '#16a34a', fontSize: 11 }}>
            تفعيل الكل
          </Button>
          <Button size="small" danger onClick={() => setAll(false)} style={{ fontSize: 11 }}>
            تعطيل الكل
          </Button>
        </Space>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        {sections.map((sec, idx) => (
          <div key={idx} style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: sec.color, marginBottom: 8 }}>
              {sec.title}
            </div>
            <Row gutter={[12, 8]}>
              {sec.items.map((it) => (
                <Col span={12} key={it.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                    <Text style={{ fontSize: 12 }}>{it.label}</Text>
                    <Switch
                      size="small"
                      checked={perms[it.key] !== false}
                      onChange={(checked) => toggle(it.key, checked)}
                      style={{ backgroundColor: perms[it.key] !== false ? '#7e22ce' : undefined }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </Space>
    </div>
  );
}

const getAvatarColor = (name) => {
  const colors = ['#4f46e5', '#0284c7', '#16a34a', '#d97706', '#9333ea', '#e11d48', '#0d9488'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function Users({ currentUser, autoOpenCreate, onResetAction }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Quick Branch Transfer state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferringUser, setTransferringUser] = useState(null);
  const [targetBranchId, setTargetBranchId] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Quick Status Switch loading tracker
  const [statusLoadingId, setStatusLoadingId] = useState(null);

  const [filterRole, setFilterRole] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newlyCreatedId, setNewlyCreatedId] = useState(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const selectedCreateBranchId = Form.useWatch('branch_id', createForm);
  const selectedEditBranchId = Form.useWatch('branch_id', editForm);
  const selectedCreateRole = Form.useWatch('role', createForm);
  const selectedEditRole = Form.useWatch('role', editForm);

  const [createWmPerms, setCreateWmPerms] = useState({ ...DEFAULT_WM_PERMS });
  const [editWmPerms, setEditWmPerms] = useState({ ...DEFAULT_WM_PERMS });
  const [loadingEditPerms, setLoadingEditPerms] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role) || currentUser?.isMainWarehouse;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/api/swm/users'),
        api.get('/api/swm/branches')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.data || []);
      if (branchesRes.data.success) setBranches(branchesRes.data.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoOpenCreate) {
      createForm.resetFields();
      createForm.setFieldsValue({ role: 'salesperson', status: 'active' });
      setIsCreateModalOpen(true);
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleCreate = async (values) => {
    try {
      const res = await api.post('/api/swm/users', values);
      if (res.data.success) {
        const createdUser = res.data.data;
        if (values.role === 'warehouse_manager' && createdUser?.id) {
          try {
            await api.put(`/api/swm/wm-permissions/${createdUser.id}`, createWmPerms);
          } catch (e) {
            console.error('Failed to set WM permissions on create:', e);
          }
        }

        message.success(`تم إنشاء حساب الموظف (${createdUser?.full_name || values.full_name}) بنجاح`);
        setIsCreateModalOpen(false);
        createForm.resetFields();
        setCreateWmPerms({ ...DEFAULT_WM_PERMS });

        // Switch branch filter to show this user's branch so they appear immediately!
        if (values.branch_id) {
          setFilterBranch(values.branch_id);
        } else {
          setFilterBranch('all');
        }
        setFilterRole(null);
        setFilterStatus(null);
        setSearchQuery('');
        if (createdUser?.id) {
          setNewlyCreatedId(createdUser.id);
        }

        await fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء الحساب');
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    if (user.role === 'warehouse_manager') {
      setLoadingEditPerms(true);
      api.get(`/api/swm/wm-permissions/${user.id}`)
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setEditWmPerms(res.data.data);
          } else {
            setEditWmPerms({ ...DEFAULT_WM_PERMS });
          }
        })
        .catch(() => {
          setEditWmPerms({ ...DEFAULT_WM_PERMS });
        })
        .finally(() => setLoadingEditPerms(false));
    } else {
      setEditWmPerms({ ...DEFAULT_WM_PERMS });
    }

    editForm.setFieldsValue({
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      branch_id: user.branch_id || undefined,
      salary: user.salary ? parseFloat(user.salary) : undefined,
      status: user.status,
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (values) => {
    if (!editingUser) return;
    try {
      const payload = {
        full_name: values.full_name,
        phone: values.phone,
        role: values.role,
        branch_id: values.branch_id || null,
        salary: values.salary !== undefined && values.salary !== null && values.salary !== '' ? parseFloat(values.salary) : null,
        status: values.status,
        ...(values.password ? { password: values.password } : {})
      };

      const res = await api.put(`/api/swm/users/${editingUser.id}`, payload);
      if (res.data.success) {
        if (values.role === 'warehouse_manager') {
          try {
            await api.put(`/api/swm/wm-permissions/${editingUser.id}`, editWmPerms);
          } catch (e) {
            console.error('Failed to update WM permissions:', e);
          }
        }
        message.success('تم تحديث بيانات المستخدم بنجاح');
        setIsEditModalOpen(false);
        setEditingUser(null);
        editForm.resetFields();
        await fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث بيانات الحساب');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    setStatusLoadingId(user.id);
    try {
      const res = await api.put(`/api/swm/users/${user.id}`, { status: nextStatus });
      if (res.data.success) {
        message.success(`تم ${nextStatus === 'active' ? 'تفعيل' : 'تعطيل'} حساب (${user.full_name || user.username}) بنجاح`);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تغيير حالة الحساب');
    } finally {
      setStatusLoadingId(null);
    }
  };

  // Quick Branch Transfer Handlers
  const handleOpenTransfer = (user) => {
    setTransferringUser(user);
    setTargetBranchId(user.branch_id || null);
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async () => {
    if (!transferringUser) return;
    if (!targetBranchId) {
      message.warning('يرجى اختيار الفرع المستهدف للنقل');
      return;
    }
    if (targetBranchId === transferringUser.branch_id) {
      message.info('الموظف مسجل بالفعل في هذا الفرع');
      return;
    }

    setTransferLoading(true);
    try {
      const res = await api.put(`/api/swm/users/${transferringUser.id}`, {
        branch_id: targetBranchId
      });
      if (res.data.success) {
        const destBranch = branches.find((b) => b.id === targetBranchId);
        message.success(`تم نقل الموظف (${transferringUser.full_name || transferringUser.username}) إلى (${destBranch?.branch_name || 'الفرع المحدد'}) بنجاح`);
        setIsTransferModalOpen(false);
        setTransferringUser(null);
        await fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في نقل الموظف إلى الفرع');
    } finally {
      setTransferLoading(false);
    }
  };

  // Export Staff Directory to CSV with UTF-8 BOM
  const handleExportExcel = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      message.warning('لا يوجد موظفين لتصديرهم بناءً على الفلتر الحالي');
      return;
    }

    const headers = [
      'معرف الموظف (ID)',
      'الاسم الكامل',
      'اسم المستخدم',
      'رقم الهاتف',
      'الدور الوظيفي',
      'الفرع الحالي',
      'بوابة تسجيل الدخول',
      'المرتب الشهري',
      'حالة الحساب',
      'تاريخ الإنشاء'
    ];

    const getRoleLabel = (role) => {
      const found = ROLES.find((r) => r.value === role);
      return found ? found.label.replace(/\s*\(.*?\)\s*/g, '') : role;
    };

    const getPortalLabel = (record) => {
      if (['super_admin', 'admin'].includes(record.role)) return 'بوابة الإدارة العامة';
      if (record.branch_type === 'ecom_warehouse' || record.branch_code === 'BR-ECOM') return 'المتجر الإلكتروني';
      return 'كاشير الفروع (POS)';
    };

    const rows = filteredUsers.map((u) => [
      u.id,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${getRoleLabel(u.role)}"`,
      `"${(u.branch_name || (['super_admin', 'admin'].includes(u.role) ? 'الإدارة العامة' : 'غير محدد')).replace(/"/g, '""')}"`,
      `"${getPortalLabel(u)}"`,
      u.salary ? parseFloat(u.salary).toFixed(2) : '0.00',
      u.status === 'active' ? 'نشط (مفعل)' : 'معطل',
      u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `كشف_الموظفين_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`تم تصدير كشف بعدد ${filteredUsers.length} موظف بنجاح`);
  };

  // Compute staff counts per branch
  const branchCounts = useMemo(() => {
    const counts = { all: users.length, unassigned: 0 };
    branches.forEach((b) => {
      counts[b.id] = 0;
    });
    users.forEach((u) => {
      if (u.branch_id && counts[u.branch_id] !== undefined) {
        counts[u.branch_id]++;
      } else if (!u.branch_id) {
        counts.unassigned++;
      }
    });
    return counts;
  }, [users, branches]);

  // General counts for stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const branchStaff = users.filter((u) => ['supervisor', 'salesperson'].includes(u.role)).length;
    const adminStaff = users.filter((u) => ['super_admin', 'admin'].includes(u.role)).length;
    return { total, active, branchStaff, adminStaff };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Branch filtering
      if (filterBranch === 'unassigned') {
        if (u.branch_id !== null && u.branch_id !== undefined) return false;
      } else if (filterBranch !== null && filterBranch !== undefined && filterBranch !== 'all') {
        if (String(u.branch_id) !== String(filterBranch)) return false;
      }

      // Role filtering
      if (filterRole && u.role !== filterRole) return false;

      // Status filtering
      if (filterStatus && u.status !== filterStatus) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const username = (u.username || '').toLowerCase();
        const fullName = (u.full_name || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        if (!username.includes(q) && !fullName.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [users, filterRole, filterBranch, filterStatus, searchQuery]);

  // Roles available for user creation
  const assignableRoles = useMemo(() => {
    if (isSuperAdmin) return ROLES;
    // Regular admins can only create branch staff or admin
    return ROLES.filter((r) => r.value !== 'super_admin');
  }, [isSuperAdmin]);

  const columns = [
    {
      title: 'الموظف وبيانات الاتصال',
      key: 'profile',
      render: (_, record) => {
        const initial = (record.full_name || record.username || 'م').trim().charAt(0).toUpperCase();
        const avatarBg = getAvatarColor(record.full_name || record.username);
        return (
          <Space align="center" size={12}>
            <Avatar
              size={40}
              style={{
                backgroundColor: avatarBg,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 16,
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              {initial}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Space size={6} wrap>
                <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
                  {record.full_name || record.username}
                </Text>
                {record.id === newlyCreatedId && (
                  <Tag color="success" style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 4px', fontWeight: 'bold' }}>
                    جديد ✨
                  </Tag>
                )}
              </Space>
              <Space size={8} split={<Text type="secondary" style={{ fontSize: 10 }}>•</Text>} style={{ fontSize: 12 }}>
                <Text code style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                  @{record.username}
                </Text>
                {record.phone ? (
                  <Space size={3} style={{ color: '#64748b' }}>
                    <PhoneOutlined style={{ fontSize: 11 }} />
                    <span dir="ltr">{record.phone}</span>
                  </Space>
                ) : null}
              </Space>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'الفرع والمنظومة',
      key: 'branch_portal',
      render: (_, record) => {
        const isAdminRole = ['super_admin', 'admin'].includes(record.role);
        const isEcom = record.branch_type === 'ecom_warehouse' || record.branch_code === 'BR-ECOM';
        const branchName = record.branch_name || (isAdminRole ? 'المستودع الرئيسي (الإدارة العامة)' : 'غير محدد');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Space size={4}>
              <ShopOutlined style={{ color: '#4f46e5' }} />
              <Text strong style={{ fontSize: 13, color: '#334155' }}>
                {branchName}
              </Text>
            </Space>
            <div>
              {isAdminRole ? (
                <Tag icon={<CrownOutlined />} color="purple" style={{ margin: 0, fontSize: 11 }}>
                  بوابة الإدارة (Admin)
                </Tag>
              ) : record.role === 'warehouse_manager' ? (
                <Tag icon={<LockOutlined />} color="purple" style={{ margin: 0, fontSize: 11 }}>
                  بوابة مدير المخازن
                </Tag>
              ) : isEcom ? (
                <Tag icon={<ShoppingCartOutlined />} color="magenta" style={{ margin: 0, fontSize: 11 }}>
                  بوابة المتجر (E-Com)
                </Tag>
              ) : (
                <Tag icon={<ShopOutlined />} color="cyan" style={{ margin: 0, fontSize: 11 }}>
                  بوابة الكاشير (POS)
                </Tag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'الدور الوظيفي',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const found = ROLES.find((r) => r.value === role);
        return (
          <Tag color={found?.color || 'default'} style={{ fontSize: 12, padding: '2px 8px' }}>
            {found?.label || role}
          </Tag>
        );
      }
    },
    {
      title: 'المرتب وكلمة المرور',
      key: 'salary_credentials',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            {record.salary ? (
              <Text strong style={{ color: '#15803d', fontSize: 13 }}>
                {parseFloat(record.salary).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>المرتب: غير محدد</Text>
            )}
          </div>
          <div>
            {record.password_plain ? (
              <Text
                code
                copyable={{ text: record.password_plain, tooltips: ['نسخ كلمة المرور', 'تم النسخ!'] }}
                style={{ fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdfa', fontSize: 12 }}
              >
                {record.password_plain}
              </Text>
            ) : (
              <Tooltip title="كلمة المرور مشفرة بالنظام. لتحديثها اضغط على تعديل في الإجراءات">
                <Tag color="default" style={{ fontStyle: 'italic', fontSize: 10, margin: 0 }}>
                  مشفرة 🔒
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: 100,
      render: (status, record) => {
        const isActive = status === 'active';
        return (
          <Tooltip title={isActive ? 'انقر لتعطيل الحساب' : 'انقر لتفعيل الحساب'}>
            <Popconfirm
              title={`هل أنت متأكد من ${isActive ? 'تعطيل' : 'تفعيل'} حساب (${record.full_name || record.username})؟`}
              okText="نعم، تأكيد"
              cancelText="إلغاء"
              onConfirm={() => handleToggleStatus(record)}
              okButtonProps={{ danger: isActive }}
            >
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                <Switch
                  checked={isActive}
                  loading={statusLoadingId === record.id}
                  checkedChildren="نشط"
                  unCheckedChildren="معطل"
                  style={{ backgroundColor: isActive ? '#16a34a' : undefined }}
                />
              </div>
            </Popconfirm>
          </Tooltip>
        );
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      align: 'center',
      width: 170,
      render: (_, record) => {
        if (!isAdmin) return null;
        const canTransfer = !['super_admin'].includes(record.role);

        return (
          <Space size="small">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              تعديل
            </Button>

            {canTransfer && (
              <Tooltip title="نقل سريع لفرع آخر">
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => handleOpenTransfer(record)}
                  style={{ color: '#4f46e5', borderColor: '#c7d2fe' }}
                >
                  نقل الفرع
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div>
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
          <h2>فريق العمل والمستخدمين (Staff Directory)</h2>
          <p>إدارة طاقم الفروع (مشرف فرع / كاشير)، تعيين الصلاحيات، ربطهم بالفروع، والتحكم في حالة الحسابات</p>
        </div>

        <div className="swm-page-actions">
          <Button
            icon={<FileExcelOutlined style={{ color: '#16a34a' }} />}
            onClick={handleExportExcel}
            style={{ height: 44, borderRadius: 8 }}
          >
            تصدير كشف الموظفين (Excel)
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ height: 44, borderRadius: 8 }}>
            تحديث
          </Button>
          {isAdmin && (
            <Button
              type="primary"
              size="large"
              icon={<UserAddOutlined />}
              onClick={() => {
                createForm.resetFields();
                setIsCreateModalOpen(true);
              }}
              style={{ backgroundColor: '#4f46e5', fontWeight: 700, height: 44, borderRadius: 8 }}
            >
              إضافة موظف جديد
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #4f46e5' }}>
            <Statistic
              title="إجمالي طاقم العمل"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#4f46e5' }} />}
              suffix="موظف"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #16a34a' }}>
            <Statistic
              title="حسابات نشطة ومفعلة"
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #0284c7' }}>
            <Statistic
              title="طاقم الفروع (مشرف / بائع)"
              value={stats.branchStaff}
              prefix={<ShopOutlined style={{ color: '#0284c7' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #9333ea' }}>
            <Statistic
              title="الإدارة العامة"
              value={stats.adminStaff}
              prefix={<CrownOutlined style={{ color: '#9333ea' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Branch Selector & Search Filter Card */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: '16px' } }}>
        {/* Quick Branch Filter Bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <ShopOutlined style={{ marginLeft: 6, color: '#4f46e5', fontSize: 16 }} />
            <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
              فلتر موظفي الفروع:
            </Text>
            {filterBranch && filterBranch !== 'all' && (
              <Tag color="blue" style={{ marginRight: 8 }}>
                محدد فرع حالياً
              </Tag>
            )}
          </div>

          <Radio.Group
            value={filterBranch === null ? 'all' : filterBranch}
            onChange={(e) => setFilterBranch(e.target.value === 'all' ? null : e.target.value)}
            buttonStyle="solid"
            size="middle"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
          >
            <Radio.Button value="all" style={{ borderRadius: 6 }}>
              🏢 كل الفروع ({branchCounts.all || 0})
            </Radio.Button>
            {branches.map((b) => (
              <Radio.Button key={b.id} value={b.id} style={{ borderRadius: 6 }}>
                <ShopOutlined style={{ marginLeft: 4 }} />
                {b.branch_name} ({branchCounts[b.id] || 0})
              </Radio.Button>
            ))}
            {branchCounts.unassigned > 0 && (
              <Radio.Button value="unassigned" style={{ borderRadius: 6 }}>
                <CrownOutlined style={{ marginLeft: 4 }} />
                الإدارة العامة ({branchCounts.unassigned})
              </Radio.Button>
            )}
          </Radio.Group>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Detailed Filters (Search + Role + Status) */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="ابحث بالاسم الكامل، اسم المستخدم، أو رقم الهاتف..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="الدور الوظيفي (الكل)"
              allowClear
              value={filterRole}
              onChange={setFilterRole}
              style={{ width: '100%' }}
            >
              {ROLES.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="حالة الحساب"
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
            >
              <Option value="active">نشط (مفعل) فقط</Option>
              <Option value="inactive">معطل فقط</Option>
            </Select>
          </Col>
          <Col xs={24} md={5} style={{ textAlign: 'left' }}>
            {(filterRole || (filterBranch !== null && filterBranch !== 'all') || filterStatus || searchQuery) && (
              <Button
                size="middle"
                onClick={() => {
                  setFilterRole(null);
                  setFilterBranch(null);
                  setFilterStatus(null);
                  setSearchQuery('');
                }}
              >
                إعادة ضبط الفلاتر
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        bordered
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '30', '50'],
          showTotal: (total, range) => `عرض ${range[0]} - ${range[1]} من إجمالي ${total} موظف`
        }}
      />

      {/* CREATE USER MODAL */}
      <Modal
        title="إضافة موظف جديد"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={540}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            role: 'salesperson',
            password: '123456'
          }}
        >
          {/* 1. اسم الموظف */}
          <Form.Item
            label="اسم الموظف بالكامل"
            name="full_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم الموظف بالكامل' }]}
          >
            <Input placeholder="مثال: أحمد محمد علي" size="large" />
          </Form.Item>

          {/* 2. رقم الهاتف */}
          <Form.Item
            label="رقم الهاتف"
            name="phone"
            rules={[
              { required: true, message: 'يرجى إدخال رقم الهاتف' },
              { pattern: /^[0-9+]{8,15}$/, message: 'يرجى إدخال رقم هاتف صحيح' }
            ]}
          >
            <Input
              placeholder="مثال: 01012345678"
              size="large"
              onChange={(e) => {
                const phoneVal = e.target.value.trim();
                if (phoneVal) {
                  createForm.setFieldsValue({ username: phoneVal });
                }
              }}
            />
          </Form.Item>

          {/* 3. الفرع المعين له */}
          <Form.Item
            label="الفرع المعين له"
            name="branch_id"
            rules={[{ required: true, message: 'يرجى تحديد الفرع المعين له الموظف' }]}
          >
            <Select placeholder="اختر الفرع التابع له الموظف" size="large" allowClear>
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.branch_name} ({b.branch_code}) - {b.branch_type === 'main_warehouse' ? 'مستودع رئيسي' : (b.branch_type === 'ecom_warehouse' ? 'متجر إلكتروني' : 'فرع تجزئة')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {(() => {
            const b = branches.find(item => item.id === selectedCreateBranchId);
            if (!b) return null;
            if (b.branch_type === 'ecom_warehouse' || b.branch_code === 'BR-ECOM') {
              return (
                <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#7e22ce' }}>
                  🛒 <strong>مستودع المتجر الإلكتروني:</strong> هذا الموظف سيعمل في بوابة إدارة وتجهيز طلبات الأونلاين ومخزونها وإحصائياتها.
                </div>
              );
            }
            if (b.branch_type === 'retail_branch') {
              return (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#15803d' }}>
                  🏪 <strong>فرع تجزئة:</strong> هذا الموظف سيعمل في كاشير نقطة البيع (POS) ونظام الورديات النقدية للفرع.
                </div>
              );
            }
            return null;
          })()}

          {/* 4. المرتب الشهري */}
          <Form.Item
            label="المرتب الشهري"
            name="salary"
            rules={[{ required: true, message: 'يرجى إدخال المرتب الشهري' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              placeholder="مثال: 5000"
              precision={2}
              addonAfter="ج.م"
              min={0}
            />
          </Form.Item>

          <Divider style={{ margin: '16px 0 12px', fontSize: 13, color: '#64748b' }}>
            بيانات الدخول للنظام (اختيارية / مولدة تلقائياً)
          </Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="اسم المستخدم (Username)"
                name="username"
                rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
                extra="افتراضياً رقم هاتف الموظف"
              >
                <Input placeholder="اسم المستخدم" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="كلمة المرور"
                name="password"
                rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
                extra="الافتراضية: 123456"
              >
                <Input.Password placeholder="123456" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="الدور الوظيفي (Role)"
            name="role"
            rules={[{ required: true, message: 'يرجى اختيار الدور' }]}
          >
            <Select>
              {assignableRoles.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>

          {selectedCreateRole === 'warehouse_manager' && (
            <WarehousePermissionsEditor
              permissions={createWmPerms}
              onChange={setCreateWmPerms}
            />
          )}

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ بيانات الموظف
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal
        title={`تعديل حساب: ${editingUser?.full_name || editingUser?.username}`}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label="الاسم بالكامل"
            name="full_name"
            rules={[{ required: true, message: 'يرجى إدخال الاسم بالكامل' }]}
          >
            <Input placeholder="الاسم الكامل" />
          </Form.Item>

          <Form.Item
            label="الدور الوظيفي"
            name="role"
            rules={[{ required: true, message: 'يرجى اختيار الدور' }]}
          >
            <Select>
              {assignableRoles.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="الفرع التابع له" name="branch_id">
            <Select placeholder="اختر الفرع التابع له" allowClear>
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</Option>
              ))}
            </Select>
          </Form.Item>

          {(() => {
            const b = branches.find(item => item.id === selectedEditBranchId);
            if (!b) return null;
            if (b.branch_type === 'ecom_warehouse' || b.branch_code === 'BR-ECOM') {
              return (
                <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#7e22ce' }}>
                  🛒 <strong>مستودع المتجر الإلكتروني:</strong> هذا الموظف سيعمل في بوابة إدارة وتجهيز طلبات الأونلاين ومخزونها وإحصائياتها (بدون شاشة كاشير POS).
                </div>
              );
            }
            if (b.branch_type === 'retail_branch') {
              return (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#15803d' }}>
                  🏪 <strong>فرع تجزئة:</strong> هذا الموظف سيعمل في كاشير نقطة البيع (POS) ونظام الورديات النقدية للفرع.
                </div>
              );
            }
            return null;
          })()}

          <Form.Item label="حالة الحساب" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="active">نشط (مفعل - يمكنه تسجيل الدخول)</Option>
              <Option value="inactive">معطل (محظور من تسجيل الدخول)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <Form.Item label="المرتب الشهري" name="salary">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="5000"
              precision={2}
              addonAfter="ج.م"
              min={0}
            />
          </Form.Item>

          <Form.Item
            label="كلمة مرور جديدة (اتركها فارغة إذا لم ترد التغيير)"
            name="password"
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          {selectedEditRole === 'warehouse_manager' && (
            <WarehousePermissionsEditor
              permissions={editWmPerms}
              onChange={setEditWmPerms}
              loading={loadingEditPerms}
            />
          )}

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
              >
                إلغاء
              </Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ التعديلات
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* QUICK BRANCH TRANSFER MODAL */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#4f46e5' }} />
            <span>النقل السريع للموظف إلى فرع آخر</span>
          </Space>
        }
        open={isTransferModalOpen}
        onCancel={() => {
          setIsTransferModalOpen(false);
          setTransferringUser(null);
        }}
        onOk={handleTransferSubmit}
        okText="تأكيد النقل الآن"
        cancelText="إلغاء"
        confirmLoading={transferLoading}
        destroyOnClose
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              background: '#f8fafc',
              padding: '14px 16px',
              borderRadius: 8,
              marginBottom: 18,
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">الموظف المراد نقله:</Text>
              <Text strong style={{ fontSize: 14 }}>
                {transferringUser?.full_name || transferringUser?.username}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">الفرع الحالي:</Text>
              <Tag color="blue" style={{ margin: 0 }}>
                {transferringUser?.branch_name || 'غير محدد'}
              </Tag>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Text strong>اختر الفرع الجديد المنقول إليه:</Text>
          </div>
          <Select
            style={{ width: '100%' }}
            size="large"
            placeholder="حدد الفرع المستهدف للنقل..."
            value={targetBranchId}
            onChange={(val) => setTargetBranchId(val)}
          >
            {branches.map((b) => (
              <Option key={b.id} value={b.id} disabled={b.id === transferringUser?.branch_id}>
                <ShopOutlined style={{ marginLeft: 6 }} />
                {b.branch_name} ({b.branch_code})
                {b.id === transferringUser?.branch_id ? ' (الفرع الحالي)' : ''}
              </Option>
            ))}
          </Select>

          <div style={{ marginTop: 12, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1e40af' }}>
            💡 سيتم تحويل ارتباط الموظف فوراً بالفرع الجديد ليتمكن من تسجيل الدخول لكاشير وورديات الفرع الجديد مباشرة دون أي تعطيل.
          </div>
        </div>
      </Modal>
    </div>
  );
}
