import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Form, InputNumber,
  Select, Input, Tag, Space, Typography, message, Statistic,
  Divider, Badge, Alert, Empty, Spin
} from 'antd';
import {
  BankOutlined, SendOutlined, ClockCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined,
  WalletOutlined, ArrowUpOutlined, InfoCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_MAP = {
  pending:   { label: 'في الانتظار',      color: 'orange', icon: <ClockCircleOutlined /> },
  completed: { label: 'تم الاستلام',      color: 'green',  icon: <CheckCircleOutlined /> },
  cancelled: { label: 'ملغى',             color: 'red',    icon: <CloseCircleOutlined /> }
};

export default function BranchTreasury({ currentUser, autoOpenCreate, onResetAction }) {
  const [register, setRegister]         = useState(null);
  const [transfers, setTransfers]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [form]                          = Form.useForm();
  const transferMethod = Form.useWatch('transfer_method', form);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, trfRes] = await Promise.all([
        api.get('/api/swm/treasury/registers'),
        api.get('/api/swm/treasury/transfers', { params: { limit: 50 } })
      ]);
      if (regRes.data.success && regRes.data.data.length > 0) {
        setRegister(regRes.data.data[0]);
      }
      if (trfRes.data.success) setTransfers(trfRes.data.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الخزنة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (autoOpenCreate) {
      form.resetFields();
      setModalVisible(true);
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleSubmitTransfer = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/swm/treasury/transfers', values);
      if (res.data.success) {
        message.success(res.data.message);
        setModalVisible(false);
        form.resetFields();
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إرسال طلب التحويل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      const res = await api.put(`/api/swm/treasury/transfers/${id}/cancel`, { reason: 'إلغاء بواسطة المشرف' });
      if (res.data.success) {
        message.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إلغاء الطلب');
    }
  };

  const balance        = parseFloat(register?.current_balance || 0);
  const totalSent      = parseFloat(register?.total_transferred_out || 0);
  const pendingCount   = parseInt(register?.pending_requests || 0, 10);
  const hasPending     = pendingCount > 0;

  const stats = useMemo(() => {
    const completed = transfers.filter(t => t.status === 'completed').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const pending   = transfers.filter(t => t.status === 'pending');
    return { completed, pendingList: pending };
  }, [transfers]);

  const columns = [
    {
      title: 'رقم الطلب',
      dataIndex: 'transfer_ref',
      key: 'transfer_ref',
      render: v => <Text code style={{ fontSize: 12 }}>{v}</Text>
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: v => (
        <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
          {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
        </Text>
      )
    },
    {
      title: 'طريقة التحويل',
      dataIndex: 'transfer_method',
      key: 'transfer_method',
      render: v => (
        <Tag color={v === 'bank_transfer' ? 'blue' : 'geekblue'}>
          {v === 'bank_transfer' ? '🏦 تحويل بنكي' : '💵 نقدي يدوي'}
        </Tag>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: status => {
        const s = STATUS_MAP[status] || { label: status, color: 'default', icon: null };
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
      }
    },
    {
      title: 'تاريخ الطلب',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
    },
    {
      title: 'تاريخ التأكيد',
      dataIndex: 'confirmed_at',
      key: 'confirmed_at',
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
    },
    {
      title: 'ملاحظات',
      dataIndex: 'notes',
      key: 'notes',
      render: v => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '—'
    },
    {
      title: 'إجراء',
      key: 'actions',
      render: (_, record) => {
        if (record.status !== 'pending') return null;
        return (
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleCancel(record.id)}
          >
            إلغاء
          </Button>
        );
      }
    }
  ];

  if (loading && !register) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#64748b' }}>جاري تحميل بيانات الخزنة...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <WalletOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            خزنة الفرع
          </Title>
          <Text type="secondary">إدارة رصيد الخزنة وتحويل النقدية للخزينة الرئيسية</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>تحديث</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            style={{ backgroundColor: '#4f46e5' }}
            onClick={() => {
              form.resetFields();
              setModalVisible(true);
            }}
            disabled={balance <= 0}
          >
            طلب تحويل للخزينة الرئيسية
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #4f46e5' }} size="small">
            <Statistic
              title="الرصيد الحالي في الخزنة"
              value={balance}
              precision={2}
              suffix="ج.م"
              prefix={<BankOutlined style={{ color: '#4f46e5' }} />}
              valueStyle={{ color: balance > 0 ? '#4f46e5' : '#ef4444', fontSize: 22 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              حالة الدرج: {register?.register_status === 'open' ? <Tag color="green">مفتوح</Tag> : <Tag color="red">مغلق</Tag>}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #16a34a' }} size="small">
            <Statistic
              title="إجمالي ما تم تحويله (مؤكد)"
              value={stats.completed}
              precision={2}
              suffix="ج.م"
              prefix={<ArrowUpOutlined style={{ color: '#16a34a' }} />}
              valueStyle={{ color: '#16a34a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #f59e0b' }} size="small">
            <Statistic
              title="طلبات في انتظار التأكيد"
              value={stats.pendingList.length}
              suffix="طلب"
              prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f59e0b', fontSize: 22 }}
            />
            {stats.pendingList.length > 0 && (
              <Text type="warning" style={{ fontSize: 12 }}>
                إجمالي: {stats.pendingList.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)} ج.م في الانتظار
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {hasPending && (
        <Alert
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          message={`لديك ${pendingCount} طلب تحويل في الانتظار`}
          description="الطلبات المعلقة تم خصمها من رصيد الخزنة وستُضاف للخزينة الرئيسية فور تأكيد المدير."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Transfers History */}
      <Card
        title={
          <Space>
            <DollarOutlined style={{ color: '#4f46e5' }} />
            <span>سجل طلبات التحويل</span>
            <Badge count={transfers.length} showZero style={{ backgroundColor: '#4f46e5' }} />
          </Space>
        }
        style={{ borderRadius: 10 }}
      >
        {transfers.length === 0 ? (
          <Empty description="لا توجد طلبات تحويل بعد" />
        ) : (
          <Table
            dataSource={transfers}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 15, showTotal: (t) => `${t} طلب` }}
            rowClassName={(record) => record.status === 'pending' ? 'ant-table-row-pending' : ''}
          />
        )}
      </Card>

      {/* Transfer Request Modal */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#4f46e5' }} />
            <span>طلب تحويل نقدي للخزينة الرئيسية</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Alert
          type="info"
          showIcon
          message={`الرصيد المتاح في خزنة الفرع: ${balance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Form form={form} layout="vertical" onFinish={handleSubmitTransfer}>
          <Form.Item
            label="المبلغ المراد تحويله (ج.م)"
            name="amount"
            rules={[
              { required: true, message: 'يرجى إدخال المبلغ' },
              { type: 'number', min: 1, message: 'المبلغ يجب أن يكون أكبر من صفر' },
              { type: 'number', max: balance, message: `المبلغ يتجاوز الرصيد المتاح (${balance.toFixed(2)} ج.م)` }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              min={1}
              max={balance}
              step={50}
              precision={2}
              placeholder="0.00"
              addonAfter="ج.م"
            />
          </Form.Item>

          <Form.Item
            label="طريقة التحويل"
            name="transfer_method"
            initialValue="manual_cash"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Option value="manual_cash">💵 تسليم نقدي مباشر</Option>
              <Option value="bank_transfer">🏦 تحويل بنكي / إيصال</Option>
            </Select>
          </Form.Item>

          {transferMethod === 'bank_transfer' && (
            <Form.Item
              label="رقم الإيصال أو مرجع التحويل البنكي"
              name="reference_no"
              rules={[{ required: true, message: 'يرجى إدخال رقم المرجع للتحويل البنكي' }]}
            >
              <Input size="large" placeholder="مثال: TXN-2026092601234" />
            </Form.Item>
          )}

          <Form.Item label="ملاحظات (اختياري)" name="notes">
            <TextArea rows={3} placeholder="أي ملاحظات إضافية للمدير..." />
          </Form.Item>

          <Alert
            type="warning"
            showIcon
            message="سيتم خصم المبلغ من رصيد خزنة الفرع فوراً وإضافته للخزينة الرئيسية بعد تأكيد المدير."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <div style={{ textAlign: 'left' }}>
            <Space>
              <Button onClick={() => { setModalVisible(false); form.resetFields(); }}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SendOutlined />}
                style={{ backgroundColor: '#4f46e5' }}
              >
                إرسال الطلب
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
