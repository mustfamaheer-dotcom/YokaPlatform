import React, { useState, useEffect, useMemo } from 'react';
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
  Divider
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
  LockOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = [
  { value: 'super_admin', label: 'مدير عام للنظام (Super Admin)', color: 'red', portal: 'admin' },
  { value: 'admin', label: 'مدير إداري (Admin)', color: 'volcano', portal: 'admin' },
  { value: 'supervisor', label: 'مشرف فرع (Supervisor)', color: 'orange', portal: 'branch' },
  { value: 'salesperson', label: 'بائع / كاشير (Salesperson)', color: 'blue', portal: 'branch' }
];

export default function Users({ currentUser, autoOpenCreate, onResetAction }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [filterRole, setFilterRole] = useState(null);
  const [filterBranch, setFilterBranch] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newlyCreatedId, setNewlyCreatedId] = useState(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

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
        message.success(`تم إنشاء حساب الموظف (${createdUser?.full_name || values.full_name}) بنجاح`);
        setIsCreateModalOpen(false);
        createForm.resetFields();

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
    editForm.setFieldsValue({
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      branch_id: user.branch_id || undefined,
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
        status: values.status,
        ...(values.password ? { password: values.password } : {})
      };

      const res = await api.put(`/api/swm/users/${editingUser.id}`, payload);
      if (res.data.success) {
        message.success('تم تحديث بيانات المستخدم بنجاح');
        setIsEditModalOpen(false);
        setEditingUser(null);
        editForm.resetFields();
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث بيانات الحساب');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.put(`/api/swm/users/${user.id}`, { status: nextStatus });
      if (res.data.success) {
        message.success(`تم ${nextStatus === 'active' ? 'تفعيل' : 'تعطيل'} حساب (${user.username}) بنجاح`);
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تغيير حالة الحساب');
    }
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
      title: 'اسم المستخدم',
      dataIndex: 'username',
      key: 'username',
      render: (u, record) => (
        <Space>
          <Text code strong>{u}</Text>
          {record.id === newlyCreatedId && (
            <Tag color="success" style={{ margin: 0, fontWeight: 'bold' }}>جديد ✨</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'الاسم الكامل',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'كلمة المرور',
      dataIndex: 'password_plain',
      key: 'password_plain',
      render: (pw) => {
        return pw ? (
          <Text
            code
            copyable={{ text: pw, tooltips: ['نسخ كلمة المرور', 'تم النسخ!'] }}
            style={{ fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdfa', fontSize: 13 }}
          >
            {pw}
          </Text>
        ) : (
          <Tooltip title="كلمة المرور مشفرة بالنظام. لتحديثها اضغط على تعديل في الإجراءات">
            <Tag color="default" style={{ fontStyle: 'italic', fontSize: 11 }}>
              مشفرة 🔒
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'الدور الوظيفي',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const found = ROLES.find((r) => r.value === role);
        return <Tag color={found?.color || 'default'}>{found?.label || role}</Tag>;
      }
    },
    {
      title: 'بوابة تسجيل الدخول',
      key: 'portal_type',
      render: (_, record) => {
        const isAdminRole = ['super_admin', 'admin'].includes(record.role);
        return (
          <Tag
            icon={isAdminRole ? <CrownOutlined /> : <ShopOutlined />}
            color={isAdminRole ? 'purple' : 'cyan'}
          >
            {isAdminRole ? 'بوابة الإدارة (Admin)' : 'بوابة الفروع (Branch)'}
          </Tag>
        );
      }
    },
    {
      title: 'الفرع التابع له',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (b, record) => {
        if (['super_admin', 'admin'].includes(record.role) && !b) {
          return <Tag color="geekblue">المستودع الرئيسي (الإدارة العامة)</Tag>;
        }
        return b ? (
          <Space size={4}>
            <ShopOutlined style={{ color: '#4f46e5' }} />
            <Text strong>{b}</Text>
          </Space>
        ) : (
          <Text type="secondary">غير محدد</Text>
        );
      }
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      key: 'phone',
      render: (p) => p || '—'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'نشط (مفعل)' : 'معطل'}
        </Tag>
      )
    },
    {
      title: 'تاريخ الإنشاء',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {date ? new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
        </Text>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => {
        const canEdit = isAdmin;
        if (!canEdit) return null;

        return (
          <Space size="small">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            >
              تعديل
            </Button>

            <Popconfirm
              title={`هل أنت متأكد من ${record.status === 'active' ? 'تعطيل' : 'تفعيل'} هذا الحساب؟`}
              okText="نعم"
              cancelText="إلغاء"
              onConfirm={() => handleToggleStatus(record)}
            >
              <Button
                size="small"
                danger={record.status === 'active'}
                type={record.status === 'active' ? 'default' : 'primary'}
                icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              >
                {record.status === 'active' ? 'تعطيل' : 'تفعيل'}
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>فريق العمل والمستخدمين (Staff Directory)</Title>
          <Text type="secondary">
            إدارة طاقم الفروع (مشرف فرع / كاشير)، تعيين الصلاحيات، ربطهم بالفروع، والتحكم في حالة الحسابات
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>تحديث</Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                createForm.resetFields();
                setIsCreateModalOpen(true);
              }}
              style={{ backgroundColor: '#4f46e5' }}
            >
              إضافة موظف جديد
            </Button>
          )}
        </Space>
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
      <Card style={{ marginBottom: 16, borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
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
        title="إضافة موظف / مستخدم جديد للنظام"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="اسم المستخدم (Username - لتسجيل الدخول)"
            name="username"
            rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
          >
            <Input placeholder="مثال: ahmed_pos" />
          </Form.Item>

          <Form.Item
            label="الاسم بالكامل"
            name="full_name"
            rules={[{ required: true, message: 'يرجى إدخال الاسم بالكامل' }]}
          >
            <Input placeholder="أحمد محمود" />
          </Form.Item>

          <Form.Item
            label="كلمة المرور"
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            label="الدور الوظيفي (Role)"
            name="role"
            rules={[{ required: true, message: 'يرجى اختيار الدور' }]}
            initialValue="salesperson"
          >
            <Select>
              {assignableRoles.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="الفرع المعين به"
            name="branch_id"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const role = getFieldValue('role');
                  if (['supervisor', 'salesperson'].includes(role) && !value) {
                    return Promise.reject(new Error('يجب تحديد فرع العمل لموظفي الفروع (مشرف / بائع).'));
                  }
                  return Promise.resolve();
                }
              })
            ]}
          >
            <Select placeholder="اختر الفرع التابع له الموظف" allowClear>
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ الحساب وتفعيله
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

          <Form.Item label="حالة الحساب" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="active">نشط (مفعل - يمكنه تسجيل الدخول)</Option>
              <Option value="inactive">معطل (محظور من تسجيل الدخول)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <Form.Item
            label="كلمة مرور جديدة (اتركها فارغة إذا لم ترد التغيير)"
            name="password"
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

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
    </div>
  );
}
