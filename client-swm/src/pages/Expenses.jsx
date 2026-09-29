import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Typography,
  Space,
  Statistic,
  Radio,
  Divider
} from 'antd';
import { antMessage as message } from '../utils/antAppBridge';
import {
  PlusOutlined,
  DollarOutlined,
  WalletOutlined,
  FileTextOutlined,
  ReloadOutlined,
  UserOutlined,
  CalendarOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  HomeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Expenses({ currentUser, onNavigate, tabExtra, onResetTabExtra }) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [staff, setStaff] = useState([]);
  const [adminRecipients, setAdminRecipients] = useState([]);
  const [filterDate, setFilterDate] = useState(dayjs());
  const [filterCategory, setFilterCategory] = useState(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const operationalType = Form.useWatch('operational_type', form);
  const selectedCategory = Form.useWatch('category', form);

  // Respond to navigation with auto-open actions
  useEffect(() => {
    if (tabExtra?.action === 'record' || tabExtra?.type === 'expense') {
      form.resetFields();
      form.setFieldsValue({
        operational_type: 'expense',
        category: adminRecipients[0] || 'بائعين الفرع (سحب نقدية)'
      });
      setModalVisible(true);
    } else if (tabExtra?.action === 'returned' || tabExtra?.type === 'returned_expense') {
      form.resetFields();
      form.setFieldsValue({
        operational_type: 'returned_expense',
        category: 'refunded_expense'
      });
      setModalVisible(true);
    }
  }, [tabExtra, adminRecipients]);

  // Fetch branch staff for salesperson dynamic dropdown (restricted strictly to active branch)
  const fetchStaff = async () => {
    try {
      let bId = currentUser?.branch_id || currentUser?.branchId;
      if (!bId) {
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            bId = u?.branch_id || u?.branchId;
          }
        } catch (e) {}
      }
      if (!bId) {
        try {
          const sRes = await api.get('/api/swm/pos/session/current');
          bId = sRes.data?.data?.register?.branch_id;
        } catch (e) {}
      }

      const params = { status: 'active' };
      if (bId) {
        params.branch_id = bId;
      }
      const res = await api.get('/api/swm/users', { params });
      if (res.data.success) {
        const allUsers = res.data.data || [];
        // Filter strictly to staff assigned to this active branch ONLY
        const branchStaff = bId
          ? allUsers.filter((u) => Number(u.branch_id) === Number(bId))
          : allUsers;
        setStaff(branchStaff);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  // Fetch admin configured expense categories
  const fetchAdminRecipients = async () => {
    try {
      const res = await api.get('/api/swm/pos/settings');
      if (res.data.success && res.data.data?.allowed_expense_recipients) {
        setAdminRecipients(res.data.data.allowed_expense_recipients);
      } else {
        // Fallback standard admin categories
        setAdminRecipients([
          'بائعين الفرع (سحب نقدية)',
          'مصاريف إدارية وتشغيل',
          'مرافق وفواتير (كهرباء، مياه، غاز)',
          'نثريات وضيافة وبوفيه',
          'نظافة ومهمات',
          'مصاريف شحن ونقل',
          'أخرى'
        ]);
      }
    } catch (err) {
      console.error('Fetch admin recipients error:', err);
      setAdminRecipients([
        'بائعين الفرع (سحب نقدية)',
        'مصاريف إدارية وتشغيل',
        'مرافق وفواتير (كهرباء، مياه، غاز)',
        'نثريات وضيافة وبوفيه',
        'نظافة ومهمات',
        'أخرى'
      ]);
    }
  };

  // Fetch expenses and metrics
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        date: filterDate ? filterDate.format('YYYY-MM-DD') : undefined,
        category: filterCategory || undefined
      };
      const res = await api.get('/api/swm/expenses', { params });
      if (res.data.success) {
        setExpenses(res.data.data || []);
        setMetrics(res.data.summary || null);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل المصروفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchAdminRecipients();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filterDate, filterCategory]);

  // Dynamic dependency: check if category is tied to Sellers/Employees
  const isSellerCategory = Boolean(
    selectedCategory && (
      selectedCategory.includes('بائع') ||
      selectedCategory.includes('موظف') ||
      selectedCategory.includes('سحب') ||
      selectedCategory.includes('سلفة') ||
      selectedCategory.includes('advance') ||
      selectedCategory === 'sales_withdrawal'
    )
  );

  // Handle Create Expense or Returned Expense
  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const isReturned = values.operational_type === 'returned_expense';
      
      // Auto-determine recipient name based on category & selected branch seller
      let computedRecipient = values.category || 'مصروف عام';
      if (isSellerCategory && values.salesperson_id) {
        const foundSeller = staff.find((u) => u.id === values.salesperson_id);
        if (foundSeller) {
          computedRecipient = foundSeller.full_name || foundSeller.username;
        }
      }

      const payload = {
        operational_type: values.operational_type,
        category: isReturned ? 'refunded_expense' : (values.category || 'utility_bill'),
        amount: values.amount,
        recipient_name: computedRecipient,
        salesperson_id: isSellerCategory ? values.salesperson_id : undefined,
        description: values.description,
        payment_method: 'cash'
      };

      const res = await api.post('/api/swm/expenses', payload);
      if (res.data.success) {
        message.success(
          isReturned
            ? 'تم تسجيل المصروف المرتد وإعادة النقدية للدرج بنجاح'
            : (res.data.message || 'تم تسجيل المصروف بنجاح وتحديث رصيد الدرج')
        );
        setModalVisible(false);
        onResetTabExtra?.();
        form.resetFields();
        fetchExpenses();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل الحركة');
    } finally {
      setSubmitting(false);
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'رقم السند',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 140,
      render: (ref) => <Text strong code>{ref}</Text>
    },
    {
      title: 'الوقت والتاريخ',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 140,
      render: (d, row) => (
        <div>
          <Text strong>{dayjs(row.created_at || d).format('HH:mm:ss')}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{dayjs(d).format('YYYY-MM-DD')}</div>
        </div>
      )
    },
    {
      title: 'بند المصروف',
      dataIndex: 'category',
      key: 'category',
      width: 200,
      render: (cat, row) => {
        const isRefunded = cat === 'refunded_expense';
        const isWithdrawal = cat === 'sales_withdrawal' || (row.subcategory && row.subcategory.includes('بائع'));
        return (
          <div>
            <Tag color={isRefunded ? 'green' : (isWithdrawal ? 'orange' : 'blue')}>
              {row.subcategory || (isRefunded ? 'مصروف مرتد للدرج' : (isWithdrawal ? 'سحب بائعين' : 'فواتير وتشغيل'))}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'المبلغ المسحوب',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amount, row) => (
        <Text
          strong
          style={{
            fontSize: 16,
            color: row.category === 'refunded_expense' ? '#16a34a' : '#dc2626'
          }}
        >
          {row.category === 'refunded_expense' ? '+' : '-'}{parseFloat(amount).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'المستفيد / البيان',
      dataIndex: 'description',
      key: 'description',
      render: (desc, row) => (
        <div>
          <div>{desc || <Text type="secondary">-</Text>}</div>
          {row.recipient_name && (
            <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>المستلم: {row.recipient_name}</div>
          )}
        </div>
      )
    },
    {
      title: 'المسجل / البائع',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by_name',
      width: 160,
      render: (name, row) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>{name || row.recorded_by_username || 'الفرع'}</span>
        </Space>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Header & Fast Entry Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {onNavigate && (
            <Space>
              <Button
                icon={<ArrowRightOutlined />}
                onClick={() => onNavigate('expenses_selection')}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                اختيار نوع المصروف
              </Button>
              <Button
                icon={<HomeOutlined />}
                onClick={() => onNavigate('home')}
                style={{ borderRadius: 8 }}
              >
                الرئيسية
              </Button>
            </Space>
          )}

          <div>
            <Title level={4} style={{ margin: 0 }}>
              <WalletOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
              صفحة تسجيل وإدارة المصروفات (Expense Management)
            </Title>
            <Text type="secondary">
              تسجيل ومتابعة سحوبات البائعين، المصروفات التشغيلية، وحركات الدرج النقدية
            </Text>
          </div>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchExpenses} loading={loading}>
            تحديث
          </Button>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
            style={{ backgroundColor: '#2563eb', fontWeight: 'bold' }}
          >
            تسجيل مصروف جديد
          </Button>
        </Space>
      </div>

      {/* KPI Overview Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="إجمالي المصروفات (المسحوبة اليوم)"
              value={metrics?.total_out || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#dc2626', fontWeight: 'bold' }}
              prefix={<ArrowDownOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              صافي المنصرف: <strong>{(metrics?.net_expense || 0).toFixed(2)} ج.م</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="سحب البائعين (صرف نقدية)"
              value={metrics?.total_withdrawals || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#ea580c', fontWeight: 'bold' }}
              prefix={<UserOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              مسحوبات عهدة وطاقم العمل
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="دفع الفواتير والتشغيل"
              value={metrics?.total_bills || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              prefix={<FileTextOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              مرافق وتشغيل ونثريات
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="مصروف مرتد للدرج (+)"
              value={metrics?.total_refunded || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              prefix={<ArrowUpOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              إعادة نقدية غير مستهلكة
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Expenses Table */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
            <span>سجل الحركات المصروفة:</span>
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="اختر التاريخ"
              allowClear
              style={{ width: 150 }}
            />
            <Select
              placeholder="تصفية حسب البند"
              value={filterCategory}
              onChange={setFilterCategory}
              allowClear
              style={{ width: 220 }}
            >
              <Option value="sales_withdrawal">سحب البائعين</Option>
              <Option value="utility_bill">فواتير ومصاريف تشغيلية</Option>
              <Option value="refunded_expense">مصروف مرتد للدرج</Option>
            </Select>
          </div>
        }
      >
        <Table
          dataSource={expenses}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="middle"
          bordered
        />
      </Card>

      {/* Record Expense Modal (Data Entry strictly governed by Admin Configs) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusOutlined style={{ color: '#2563eb' }} />
            <span>تسجيل حركة مصروفات / سحب نقدية</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          onResetTabExtra?.();
        }}
        footer={null}
        destroyOnHidden
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            operational_type: 'expense',
            category: adminRecipients[0] || 'بائعين الفرع (سحب نقدية)'
          }}
        >
          {/* Operational Type: Expense vs Returned Expense */}
          <Form.Item
            name="operational_type"
            label="نوع الحركة التشغيلية"
            rules={[{ required: true, message: 'يرجى تحديد نوع الحركة' }]}
          >
            <Radio.Group style={{ width: '100%', display: 'flex' }} buttonStyle="solid">
              <Radio.Button
                value="expense"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: operationalType !== 'returned_expense' ? '#ea580c' : undefined
                }}
              >
                مصروف (خصم من الدرج)
              </Radio.Button>
              <Radio.Button
                value="returned_expense"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: operationalType === 'returned_expense' ? '#16a34a' : undefined
                }}
              >
                مصروف مرتد (إعادة إلى الدرج)
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Expense Category strictly populated from Admin Configurations */}
          <Form.Item
            name="category"
            label="بند المصروف (المعتمد إدارياً) *"
            rules={[{ required: true, message: 'يرجى اختيار بند المصروف' }]}
          >
            <Select size="large" placeholder="اختر بند المصروف من الإعدادات المعتمدة">
              {adminRecipients.map((cat) => (
                <Option key={cat} value={cat}>
                  📁 {cat}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Dynamic Dependency: If category is tied to Sellers/Employees, display branch seller dropdown */}
          {isSellerCategory && (
            <Form.Item
              name="salesperson_id"
              label="البائع المستلم (من طاقم الفرع) *"
              rules={[{ required: true, message: 'يرجى اختيار البائع المستلم للمبلغ' }]}
            >
              <Select placeholder="اختر البائع المستلم" size="large">
                {staff.map((u) => (
                  <Option key={u.id} value={u.id}>
                    👤 {u.full_name || u.username} ({u.role === 'supervisor' ? 'مشرف فرع' : 'بائع / كاشير'})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {/* Required Numerical Amount Field: قيمة المسحوب (ج.م) */}
          <Form.Item
            name="amount"
            label="قيمة المسحوب (ج.م) *"
            rules={[
              { required: true, message: 'يرجى إدخال قيمة المسحوب' },
              { type: 'number', min: 0.1, message: 'يجب أن تكون قيمة المسحوب أكبر من صفر' }
            ]}
          >
            <InputNumber
              size="large"
              placeholder="0.00"
              style={{ width: '100%' }}
              precision={2}
              prefix={<DollarOutlined style={{ color: operationalType === 'returned_expense' ? '#16a34a' : '#ea580c' }} />}
            />
          </Form.Item>

          {/* Field 4: Reason/Description (بيان سبب الصرف) */}
          <Form.Item
            name="description"
            label="بيان سبب الصرف والملاحظات *"
            rules={[{ required: true, message: 'يرجى كتابة بيان سبب الصرف' }]}
          >
            <TextArea rows={2} placeholder="اكتب تفاصيل حركة الصرف والسبب بدقة لتوثيقها في يومية البائع..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setModalVisible(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              style={{
                backgroundColor: operationalType === 'returned_expense' ? '#16a34a' : '#2563eb'
              }}
            >
              {operationalType === 'returned_expense' ? 'حفظ وإيداع بالدرج' : 'حفظ وخصم من الدرج'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
