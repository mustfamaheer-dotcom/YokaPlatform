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
  Statistic,
  InputNumber,
  Tooltip,
  Divider,
  Alert
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
  GiftOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Award, Users, Wallet, TrendingUp, Sparkles, ArrowLeft } from 'lucide-react';
import api from '../api';
import { antMessage as message } from '../utils/antAppBridge';

const { Title, Text } = Typography;

export default function Customers({ currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_customers: 0,
    total_points: 0,
    total_lifetime_points: 0,
    monetary_value: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Modals & Drawers state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustForm] = Form.useForm();

  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/swm/loyalty/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load loyalty stats', e);
    }
  };

  const fetchCustomers = async (page = 1, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/loyalty/customers', {
        params: {
          page,
          limit: pagination.pageSize,
          search: search?.trim() || undefined
        }
      });
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
    fetchCustomers(1, '');
    fetchStats();
  }, []);

  const handleSearchSubmit = () => {
    fetchCustomers(1, searchQuery);
  };

  const handleCreateCustomer = async (values) => {
    setCreating(true);
    try {
      const res = await api.post('/api/swm/loyalty/customers', values);
      if (res.data?.success) {
        message.success(`تم تسجيل العميل بنجاح (${res.data.data.customer_code})`);
        setCreateModalOpen(false);
        createForm.resetFields();
        fetchCustomers(1);
        fetchStats();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تسجيل العميل');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryDrawerOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/swm/loyalty/customers/${customer.id}`);
      if (res.data?.success) {
        setSelectedCustomer(res.data.data.customer);
        setHistoryTransactions(res.data.data.history || []);
      }
    } catch (e) {
      message.error('فشل جلب سجل حركات النقاط');
    } finally {
      setLoadingHistory(false);
    }
  };

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
        fetchCustomers(pagination.current);
        fetchStats();
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
      width: 130,
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
      width: 150,
      render: (phone) => (
        <Space size={4}>
          <PhoneOutlined style={{ color: '#C8A45C' }} />
          <Text copyable style={{ fontFamily: 'monospace', fontWeight: 600 }}>{phone}</Text>
        </Space>
      )
    },
    {
      title: 'رصيد النقاط الحالي',
      dataIndex: 'total_points',
      width: 170,
      render: (points) => {
        const val = parseInt(points || 0, 10);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color={val > 0 ? 'orange' : 'default'} style={{ fontWeight: 800, fontSize: 12, margin: 0, borderRadius: 6 }}>
              🏆 {val} نقطة
            </Tag>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              (≈ {(val * 0.5).toFixed(1)} ج.م)
            </span>
          </div>
        );
      }
    },
    {
      title: 'إجمالي النقاط المكتسبة',
      dataIndex: 'lifetime_points',
      width: 160,
      render: (lp) => (
        <span style={{ color: '#475569', fontWeight: 600 }}>
          {parseInt(lp || 0, 10)} نقطة
        </span>
      )
    },
    {
      title: 'تاريخ التسجيل',
      dataIndex: 'created_at',
      width: 140,
      render: (dt) => dt ? new Date(dt).toLocaleDateString('ar-EG') : '—'
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="عرض كشف حساب سجل النقاط">
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
      render: (dt) => dt ? new Date(dt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
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
      width: 100,
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
      width: 100,
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
      width: 120,
      render: (b, row) => b || row.created_by_name || '—'
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
                {stats.total_customers} عميل مسجل
              </Tag>
            </div>
            <Text style={{ fontSize: 12, color: '#64748B' }}>
              قاعدة بيانات عملاء التجزئة، أرصدة النقاط، وسجل الحركات المحاسبي لكل عميل
            </Text>
          </div>
        </Space>

        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchCustomers(pagination.current);
              fetchStats();
            }}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            تحديث
          </Button>

          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{
              backgroundColor: '#0B0F17',
              borderColor: '#C8A45C',
              color: '#DFCA95',
              fontWeight: 700,
              borderRadius: 8
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
            bodyStyle={{ padding: '16px' }}
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
            bodyStyle={{ padding: '16px' }}
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
            bodyStyle={{ padding: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>القيمة النقدية المقابلة</Text>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#065F46', marginTop: 4 }}>
                  {stats.monetary_value.toFixed(2)} ج.م
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
            bodyStyle={{ padding: '16px' }}
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

      {/* 3. Search Bar Card */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Input
            size="middle"
            placeholder="بحث سريع باسم العميل، رقم الهاتف، أو كود العميل..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearchSubmit}
            allowClear
            style={{ maxWidth: 420, borderRadius: 8 }}
          />
          <Button
            type="primary"
            onClick={handleSearchSubmit}
            style={{ backgroundColor: '#0B0F17', borderColor: '#C8A45C', color: '#DFCA95', fontWeight: 600, borderRadius: 8 }}
          >
            تطبيق البحث
          </Button>
          {searchQuery && (
            <Button
              onClick={() => {
                setSearchQuery('');
                fetchCustomers(1, '');
              }}
              style={{ borderRadius: 8 }}
            >
              إلغاء التصفية
            </Button>
          )}
        </div>
      </Card>

      {/* 4. Customers Table */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
        bodyStyle={{ padding: '0' }}
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
            showTotal: (total) => `إجمالي ${total} عميل مسجل`,
            onChange: (p) => fetchCustomers(p)
          }}
          locale={{ emptyText: 'لا يوجد عملاء مسجلين بنظام الولاء حالياً' }}
        />
      </Card>

      {/* 5. Points History Drawer */}
      <Drawer
        title={
          selectedCustomer ? (
            <Space align="center">
              <CrownOutlined style={{ color: '#C8A45C', fontSize: 18 }} />
              <span>كشف حساب نقاط العميل: {selectedCustomer.full_name}</span>
              <Tag color="gold">{selectedCustomer.customer_code}</Tag>
            </Space>
          ) : 'كشف حساب النقاط'
        }
        placement="left"
        width={720}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        destroyOnClose
      >
        {selectedCustomer && (
          <div>
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFDF8 0%, #FEF3C7 100%)',
                padding: '14px 18px',
                borderRadius: 10,
                border: '1px solid #FDE68A',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <Text strong style={{ fontSize: 15, display: 'block', color: '#92400E' }}>
                  {selectedCustomer.full_name}
                </Text>
                <Text style={{ fontSize: 12, color: '#78350F' }}>
                  الهاتف: {selectedCustomer.phone} • تاريخ الانضمام: {new Date(selectedCustomer.created_at).toLocaleDateString('ar-EG')}
                </Text>
              </div>

              <div style={{ textAlign: 'left' }}>
                <Text style={{ fontSize: 11, color: '#78350F', display: 'block' }}>الرصيد المتاح حالياً</Text>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#B45309' }}>
                  {selectedCustomer.total_points}
                </span>
                <span style={{ fontSize: 12, color: '#B45309', marginRight: 4 }}>نقطة</span>
              </div>
            </div>

            <Table
              size="small"
              columns={historyColumns}
              dataSource={historyTransactions}
              rowKey="id"
              loading={loadingHistory}
              pagination={{ pageSize: 15 }}
              locale={{ emptyText: 'لا توجد حركات نقاط مسجلة لهذا العميل' }}
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
        destroyOnClose
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
        destroyOnClose
        width={420}
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
