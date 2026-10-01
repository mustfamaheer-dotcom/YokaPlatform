import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, Card, Popconfirm, Divider, Tooltip, Alert } from 'antd';
import { PlusOutlined, ShopOutlined, ReloadOutlined, EditOutlined, UserOutlined, KeyOutlined, LockOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const BRANCH_TYPES = {
  main_warehouse: { label: 'مستودع رئيسي (Main Warehouse)', color: 'volcano' },
  retail_branch: { label: 'فرع تجزئة (Retail Branch)', color: 'blue' },
  ecom_warehouse: { label: 'مستودع المتجر الإلكتروني (E-Com Warehouse)', color: 'purple' }
};

const BRANCH_TYPE_DESCRIPTIONS = {
  retail_branch: {
    title: 'فرع تجزئة ونقاط بيع (Retail Branch)',
    description: 'نقطة بيع فعلية للجمهور. يتم تلقائياً تهيئة درج نقدية (Cash Register) وخزينة فرع (Safe)، ويدخل الموظفون مباشرة إلى شاشة الكاشير السريع (POS) ونظام الورديات النقدية.',
    portalLabel: 'بوابة الكاشير (POS)',
    color: 'blue',
    accountTitle: 'بيانات دخول كاشير نقطة البيع (POS)'
  },
  ecom_warehouse: {
    title: 'مستودع المتجر الإلكتروني (E-Com Warehouse)',
    description: 'مستودع مخصص لتجهيز وتعبئة وشحن طلبات الأونلاين. لن يتم إنشاء درج كاشير نقاط بيع أو وردية كاشير، ويدخل الموظفون مباشرة إلى بوابة (الطلبات، المخزون، الإحصائيات).',
    portalLabel: 'بوابة المتجر (Orders/Inv/Stats)',
    color: 'purple',
    accountTitle: 'بيانات دخول مسؤول مستودع وتجهيز المتجر الإلكتروني'
  },
  main_warehouse: {
    title: 'المستودع الرئيسي (Main Warehouse)',
    description: 'المركز اللوجستي الرئيسي لاستلام فواتير المشتريات من الموردين وتوزيع البضائع على الفروع ومستودع الأونلاين.',
    portalLabel: 'المستودع الرئيسي والعمليات',
    color: 'volcano',
    accountTitle: 'بيانات دخول إدارة المستودع الرئيسي'
  }
};

export default function Branches({ autoOpenCreate, onResetAction, currentUser }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [generatingCode, setGeneratingCode] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const selectedCreateType = Form.useWatch('branch_type', createForm) || 'retail_branch';
  const selectedEditType = Form.useWatch('branch_type', editForm) || 'retail_branch';

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

  const handleOpenCreateModal = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ branch_type: 'retail_branch' });
    setIsCreateModalOpen(true);
    fetchNextBranchCode('retail_branch');
  };

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

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    editForm.setFieldsValue({
      branch_name: branch.branch_name,
      branch_type: branch.branch_type,
      login_username: branch.login_username || '',
      password: branch.login_password_plain || '',
      address: branch.address,
      phone: branch.phone,
      supervisor_id: branch.supervisor_id || undefined,
      status: branch.status
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (values) => {
    if (!editingBranch) return;
    try {
      const res = await api.put(`/api/swm/branches/${editingBranch.id}`, values);
      if (res.data.success) {
        message.success('تم تحديث بيانات الفرع وبيانات الدخول بنجاح');
        setIsEditModalOpen(false);
        setEditingBranch(null);
        editForm.resetFields();
        fetchBranches();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث الفرع');
    }
  };

  const columns = [
    {
      title: 'كود الفرع',
      dataIndex: 'branch_code',
      key: 'branch_code',
      render: (code) => <Text code strong>{code}</Text>
    },
    {
      title: 'اسم الفرع / المستودع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'بيانات الدخول والنظام المخصص',
      key: 'credentials',
      render: (_, record) => {
        const typeInfo = BRANCH_TYPE_DESCRIPTIONS[record.branch_type] || BRANCH_TYPE_DESCRIPTIONS.retail_branch;
        if (!record.login_username) {
          return <Tag color="warning">لم يتم تعيين حساب</Tag>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Tag color={typeInfo.color} style={{ width: 'fit-content', margin: 0, fontSize: 11, fontWeight: 700, borderRadius: 4 }}>
              {typeInfo.portalLabel}
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>اليوزر:</Text>
              <Tag color="geekblue" icon={<KeyOutlined />} style={{ margin: 0, fontWeight: 600 }}>
                {record.login_username}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>السر:</Text>
              {record.login_password_plain ? (
                <Text
                  code
                  copyable={{ text: record.login_password_plain, tooltips: ['نسخ كلمة المرور', 'تم النسخ!'] }}
                  style={{ color: '#059669', fontWeight: 600, margin: 0 }}
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
      title: 'نوع الفرع',
      dataIndex: 'branch_type',
      key: 'branch_type',
      render: (type) => {
        const item = BRANCH_TYPES[type] || { label: type, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      }
    },
    {
      title: 'مشرف الفرع',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
      render: (sup) => sup ? (
        <Space>
          <UserOutlined style={{ color: '#ea580c' }} />
          <Text strong>{sup}</Text>
        </Space>
      ) : <Text type="secondary">لم يعين</Text>
    },
    {
      title: 'طاقم العمل',
      dataIndex: 'staff_count',
      key: 'staff_count',
      render: (cnt) => (
        <Tag color="cyan" style={{ fontWeight: 600 }}>
          {cnt || 0} موظف مسجل
        </Tag>
      )
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      key: 'phone',
      render: (ph) => ph || '—'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'نشط' : status}
        </Tag>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenEdit(record)}
        >
          تعديل
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>الفروع والمستودعات (Branches Master)</Title>
          <Text type="secondary">
            إدارة الفروع والمستودعات، وتعيين وعرض اسم المستخدم وكلمة المرور الخاصة بكل فرع لتسجيل الدخول في بوابة الفروع (POS)
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchBranches}>تحديث</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#4f46e5' }}
          >
            إضافة فرع / مخزن
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={branches}
        rowKey="id"
        loading={loading}
        bordered
      />

      {/* CREATE BRANCH MODAL */}
      <Modal
        title="إضافة فرع أو مستودع جديد"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label={
              <Space>
                <span>كود الفرع (Branch Code)</span>
                <Tag color="purple">توليد تلقائي</Tag>
              </Space>
            }
            name="branch_code"
            rules={[{ required: true, message: 'يرجى إدخال كود الفرع' }]}
            extra="تم توليد كود الفرع تلقائياً، ويمكنك تعديله يدوياً إن أردت."
          >
            <Input
              placeholder="مثال: BR-008"
              style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}
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

          <Form.Item
            label="اسم الفرع / المستودع"
            name="branch_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
          >
            <Input placeholder="فرع مدينة نصر" />
          </Form.Item>

          <Form.Item
            label="نوع الفرع / المنشأة"
            name="branch_type"
            initialValue="retail_branch"
            rules={[{ required: true }]}
          >
            <Select onChange={(val) => fetchNextBranchCode(val)}>
              <Option value="retail_branch">فرع تجزئة (Retail Branch)</Option>
              <Option value="ecom_warehouse">مستودع المتجر الإلكتروني (E-Com Warehouse)</Option>
              <Option value="main_warehouse">مستودع رئيسي (Main Warehouse)</Option>
            </Select>
          </Form.Item>

          {/* Dynamic Branch Type Guide */}
          {(() => {
            const info = BRANCH_TYPE_DESCRIPTIONS[selectedCreateType] || BRANCH_TYPE_DESCRIPTIONS.retail_branch;
            return (
              <Alert
                message={info.title}
                description={info.description}
                type={selectedCreateType === 'ecom_warehouse' ? 'warning' : (selectedCreateType === 'main_warehouse' ? 'error' : 'info')}
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            );
          })()}

          <Divider style={{ margin: '12px 0' }}>
            {(BRANCH_TYPE_DESCRIPTIONS[selectedCreateType] || BRANCH_TYPE_DESCRIPTIONS.retail_branch).accountTitle}
          </Divider>

          <Form.Item
            label="اسم المستخدم (Username)"
            name="login_username"
            rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم لتسجيل الدخول' }]}
          >
            <Input prefix={<KeyOutlined style={{ color: '#6366f1' }} />} placeholder="مثال: branch_user" />
          </Form.Item>

          <Form.Item
            label="كلمة المرور (Password)"
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة مرور الحساب' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#6366f1' }} />} placeholder="••••••••" />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }}>بيانات الاتصال والموقع</Divider>

          <Form.Item label="العنوان" name="address">
            <Input.TextArea rows={2} placeholder="شارع عباس العقاد، مدينة نصر، القاهرة" />
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ الفرع وبيانات الدخول
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* EDIT BRANCH MODAL */}
      <Modal
        title={`تعديل بيانات الفرع: ${editingBranch?.branch_name}`}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingBranch(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label="اسم الفرع / المستودع"
            name="branch_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
          >
            <Input placeholder="اسم الفرع" />
          </Form.Item>

          <Form.Item
            label="نوع الفرع"
            name="branch_type"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="retail_branch">فرع تجزئة (Retail Branch)</Option>
              <Option value="ecom_warehouse">مستودع المتجر الإلكتروني (E-Com Warehouse)</Option>
              <Option value="main_warehouse">مستودع رئيسي (Main Warehouse)</Option>
            </Select>
          </Form.Item>

          {/* Dynamic Branch Type Guide */}
          {(() => {
            const info = BRANCH_TYPE_DESCRIPTIONS[selectedEditType] || BRANCH_TYPE_DESCRIPTIONS.retail_branch;
            return (
              <Alert
                message={info.title}
                description={info.description}
                type={selectedEditType === 'ecom_warehouse' ? 'warning' : (selectedEditType === 'main_warehouse' ? 'error' : 'info')}
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
            );
          })()}

          <Divider style={{ margin: '12px 0' }}>
            {(BRANCH_TYPE_DESCRIPTIONS[selectedEditType] || BRANCH_TYPE_DESCRIPTIONS.retail_branch).accountTitle}
          </Divider>

          <Form.Item
            label="اسم المستخدم (Username)"
            name="login_username"
            rules={[{ required: true, message: 'يرجى إدخال اسم مستخدم الفرع' }]}
          >
            <Input prefix={<KeyOutlined style={{ color: '#6366f1' }} />} placeholder="اسم مستخدم الفرع" />
          </Form.Item>

          <Form.Item
            label="كلمة المرور (Password)"
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#6366f1' }} />} placeholder="••••••••" />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }}>الإشراف والموقع</Divider>

          <Form.Item label="مشرف الفرع" name="supervisor_id">
            <Select placeholder="اختر مشرف الفرع" allowClear>
              {supervisors.map((s) => (
                <Option key={s.id} value={s.id}>{s.full_name} ({s.username})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="العنوان" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input />
          </Form.Item>

          <Form.Item label="حالة الفرع" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="active">نشط</Option>
              <Option value="inactive">غير نشط</Option>
              <Option value="temporary_closed">مغلق مؤقتاً</Option>
            </Select>
          </Form.Item>

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
