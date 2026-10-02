import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, App, Card, Popconfirm, Divider, Tooltip, Alert, Switch, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, ShopOutlined, ReloadOutlined, EditOutlined, UserOutlined, KeyOutlined, LockOutlined, EyeOutlined, InfoCircleOutlined, EnvironmentOutlined, CompassOutlined, GlobalOutlined } from '@ant-design/icons';
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
  const { message } = App.useApp();
  const navigate = useNavigate();
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
        message.success('تم إنشاء الفرع وبيانات تسجيل دخوله وموقعه بنجاح');
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

  const handleToggleStore = async (branchId, checked) => {
    try {
      const res = await api.patch(`/api/swm/branches/${branchId}/toggle-store`, { show_in_store: checked });
      if (res.data.success) {
        message.success(checked ? 'تم تفعيل عرض الفرع في المتجر الإلكتروني' : 'تم إخفاء الفرع من المتجر الإلكتروني');
        setBranches((prev) => prev.map((b) => b.id === branchId ? { ...b, show_in_store: checked } : b));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر تحديث حالة العرض');
    }
  };

  const handleUpdate = async (values) => {
    if (!editingBranch) return;
    try {
      const res = await api.put(`/api/swm/branches/${editingBranch.id}`, values);
      if (res.data.success) {
        message.success('تم تحديث بيانات الفرع والموقع بنجاح');
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
      title: 'الموقع واللوكيشن',
      key: 'location',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {record.city && (
            <Tag color="gold" style={{ width: 'fit-content', fontWeight: 700, margin: 0 }}>
              {record.city}
            </Tag>
          )}
          <Text ellipsis={{ tooltip: record.address }} style={{ maxWidth: 170, fontSize: 12 }}>
            {record.address || 'لم يحدد العنوان'}
          </Text>
          {record.google_maps_url ? (
            <a href={record.google_maps_url} target="_blank" rel="noopener noreferrer">
              <Button size="small" type="link" icon={<EnvironmentOutlined />} style={{ padding: 0, height: 'auto', fontSize: 11, color: '#C8A45C', fontWeight: 700 }}>
                خرائط جوجل ↗
              </Button>
            </a>
          ) : (
            <span style={{ fontSize: 11, color: '#94A3B8' }}>لا يوجد رابط خريطة</span>
          )}
        </div>
      )
    },
    {
      title: 'المتجر أونلاين',
      key: 'show_in_store',
      align: 'center',
      render: (_, record) => (
        <Tooltip title={record.show_in_store ? 'معروض للعملاء في موقع المتجر' : 'مخفي عن موقع المتجر'}>
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
          <p>إدارة الفروع والمستودعات، وتعيين وعرض اسم المستخدم وكلمة المرور الخاصة بكل فرع لتسجيل الدخول في بوابة الفروع (POS)</p>
        </div>

        <div className="swm-page-actions">
          <Button icon={<ReloadOutlined />} onClick={fetchBranches} style={{ height: 44, borderRadius: 8 }}>
            تحديث
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#4f46e5', fontWeight: 700, height: 44, borderRadius: 8 }}
          >
            إضافة فرع / مخزن
          </Button>
        </div>
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

          <Divider style={{ margin: '14px 0' }}>الموقع الجغرافي وخريطة جوجل (Location & Maps)</Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="المدينة / المحافظة" name="city">
                <Select placeholder="اختر المدينة أو اكتبها" allowClear showSearch>
                  <Option value="القاهرة">القاهرة</Option>
                  <Option value="الجيزة">الجيزة</Option>
                  <Option value="الإسكندرية">الإسكندرية</Option>
                  <Option value="الإسماعيلية">الإسماعيلية</Option>
                  <Option value="بورسعيد">بورسعيد</Option>
                  <Option value="السويس">السويس</Option>
                  <Option value="طنطا">طنطا / الغربية</Option>
                  <Option value="المنصورة">المنصورة / الدقهلية</Option>
                  <Option value="الشرقية">الشرقية / الزقازيق</Option>
                  <Option value="أسيوط">أسيوط</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="رقم هاتف الفرع" name="phone">
                <Input placeholder="+201000000000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="العنوان التفصيلي للفرع" name="address">
            <Input.TextArea rows={2} placeholder="شارع عباس العقاد، مدينة نصر، بجوار..." />
          </Form.Item>

          <Form.Item
            label="رابط موقع الفرع على خرائط جوجل (Google Maps URL)"
            name="google_maps_url"
            extra="مثال: https://maps.app.goo.gl/... أو https://goo.gl/maps/... ليتمكن العميل من فتح موقع الفرع والملاحة إليه بنقرة واحدة."
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

          <Divider style={{ margin: '14px 0' }}>الموقع الجغرافي وخريطة جوجل (Location & Maps)</Divider>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="المدينة / المحافظة" name="city">
                <Select placeholder="اختر المدينة أو اكتبها" allowClear showSearch>
                  <Option value="القاهرة">القاهرة</Option>
                  <Option value="الجيزة">الجيزة</Option>
                  <Option value="الإسكندرية">الإسكندرية</Option>
                  <Option value="الإسماعيلية">الإسماعيلية</Option>
                  <Option value="بورسعيد">بورسعيد</Option>
                  <Option value="السويس">السويس</Option>
                  <Option value="طنطا">طنطا / الغربية</Option>
                  <Option value="المنصورة">المنصورة / الدقهلية</Option>
                  <Option value="الشرقية">الشرقية / الزقازيق</Option>
                  <Option value="أسيوط">أسيوط</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="رقم هاتف الفرع" name="phone">
                <Input placeholder="+201000000000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="العنوان التفصيلي للفرع" name="address">
            <Input.TextArea rows={2} placeholder="شارع عباس العقاد، مدينة نصر، بجوار..." />
          </Form.Item>

          <Form.Item
            label="رابط موقع الفرع على خرائط جوجل (Google Maps URL)"
            name="google_maps_url"
            extra="مثال: https://maps.app.goo.gl/... أو https://goo.gl/maps/... ليتمكن العميل من فتح موقع الفرع والملاحة إليه بنقرة واحدة."
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

          <Divider style={{ margin: '14px 0' }}>الإشراف وحالة التشغيل</Divider>

          <Form.Item label="مشرف الفرع" name="supervisor_id">
            <Select placeholder="اختر مشرف الفرع" allowClear>
              {supervisors.map((s) => (
                <Option key={s.id} value={s.id}>{s.full_name} ({s.username})</Option>
              ))}
            </Select>
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
