import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Table,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  App,
  Spin,
  Alert,
  Divider,
  Statistic
} from 'antd';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  ArrowLeftRight,
  DollarSign,
  Send,
  History,
  Info
} from 'lucide-react';
import api from '../../../api';

const { Title, Text, Paragraph } = Typography;

export default function SafeTreasuryCard({ branchId, currentUser }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [safeData, setSafeData] = useState({
    cash_balance: 0,
    visa_balance: 0,
    transfer_balance: 0,
    total_balance: 0
  });
  const [transfers, setTransfers] = useState([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Load Branch Safe and Transfers data
  const loadTreasuryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch branch safe balances
      const safeRes = await api.get('/api/swm/treasury/branch-safe', {
        params: { branch_id: branchId }
      });
      if (safeRes.data.success && safeRes.data.data?.safe) {
        setSafeData(safeRes.data.data.safe);
      }

      // 2. Fetch past transfers
      const trfRes = await api.get('/api/swm/treasury/transfers');
      if (trfRes.data.success && Array.isArray(trfRes.data.data)) {
        // Filter transfers originating from this branch
        const branchTransfers = trfRes.data.data.filter(
          (t) => String(t.from_branch_id) === String(branchId)
        );
        setTransfers(branchTransfers);
      }
    } catch (err) {
      console.error('Failed to load treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadTreasuryData();
    }
  }, [branchId]);

  // Handle Transfer to Main Safe Submission
  const handleTransferSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        from_branch_id: branchId,
        amount: values.amount,
        transfer_method: values.transfer_method || 'manual_cash',
        reference_no: values.reference_no,
        notes: values.notes
      };

      const res = await api.post('/api/swm/treasury/transfers', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم إرسال طلب تسليم النقدية بنجاح للخزينة الرئيسية');
        setIsTransferModalOpen(false);
        form.resetFields();
        loadTreasuryData();
      } else {
        message.error(res.data.message || 'فشل في إرسال طلب التحويل');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إرسال طلب تسليم النقدية');
    } finally {
      setSubmitting(false);
    }
  };

  const cashAvail = parseFloat(safeData.cash_balance || 0);

  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: 24,
        background: '#ffffff',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* ─── Card Header ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            <Wallet size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                2. بطاقة الخزنة والتحويلات (Safe & Treasury)
              </Title>
              <Tag color="green" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                تراكم تلقائي
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              تراكم الأرصدة اليومية الناتجة عن إغلاق الورديات وتسليم النقدية للخزينة الرئيسية
            </Text>
          </div>
        </div>

        {/* Action Button: Transfer to Main Safe */}
        <Button
          type="primary"
          icon={<Send size={15} style={{ marginLeft: 6 }} />}
          onClick={() => {
            form.resetFields();
            setIsTransferModalOpen(true);
          }}
          disabled={cashAvail <= 0}
          style={{
            backgroundColor: '#059669',
            borderColor: '#059669',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            height: 40,
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          تسليم النقدية للخزينة الرئيسية (Transfer to Main Safe)
        </Button>
      </div>

      <Spin spinning={loading}>
        {/* Info Banner on Accumulation Logic */}
        <Alert
          type="info"
          showIcon
          icon={<Info size={16} />}
          message={
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              ميزة التراكم التلقائي: يتم ترحيل وتجميع متحصلات الورديات اليومية (نقدية، فيزا، تحويلات) آلياً إلى حسابات خزينة الفرع حتى زيارة المشرف، ليتمكن من توريد النقدية دفعة واحدة.
            </span>
          }
          style={{ marginBottom: 20, borderRadius: 10, border: '1px solid #bae6fd' }}
        />

        {/* ─── 3 Accumulated Account Counters ─── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Total Accumulated Safe Holdings */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: 12,
                padding: '20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(15, 23, 42, 0.2)'
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block' }}>
                  إجمالي أرصدة الخزينة
                </span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>
                  {(safeData.total_balance || 0).toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12 }}>
                شامل النقدية بالدرج والفيزا والمحافظ
              </div>
            </div>
          </Col>

          {/* Cash in Safe (Available for transfer) */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 12,
                padding: '18px 20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>💵 نقدية الخزينة المتراكمة (Cash)</span>
                <Tag color="success" style={{ margin: 0, fontWeight: 700 }}>متاح للتسليم</Tag>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', margin: '8px 0 4px' }}>
                {(safeData.cash_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#166534' }}>
                النقدية المودعة فعلياً داخل خزينة الفرع
              </Text>
            </div>
          </Col>

          {/* Visa Settlement Account */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                padding: '18px 20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 700 }}>💳 تسويات الفيزا البنكية (Visa)</span>
                <Tag color="processing" style={{ margin: 0, fontWeight: 700 }}>حساب بنكي</Tag>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', margin: '8px 0 4px' }}>
                {(safeData.visa_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#1e40af' }}>
                متحصلات ماكينة البطاقات (POS Machine)
              </Text>
            </div>
          </Col>

          {/* Wallet / Bank Transfers Account */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 12,
                padding: '18px 20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b21a8', fontWeight: 700 }}>📲 تحويلات المحافظ والإنستاباي</span>
                <Tag color="purple" style={{ margin: 0, fontWeight: 700 }}>إلكتروني</Tag>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#7e22ce', margin: '8px 0 4px' }}>
                {(safeData.transfer_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#6b21a8' }}>
                InstaPay ومحافظ فودافون كاش
              </Text>
            </div>
          </Col>
        </Row>

        {/* ─── Past Transfers Table ─── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={18} color="#059669" />
              <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                سجل تسليم وتحويل النقدية للخزينة الرئيسية
              </Text>
            </div>
            <Button size="small" onClick={loadTreasuryData}>تحديث السجل</Button>
          </div>

          <Table
            size="small"
            dataSource={transfers}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: 'لا توجد حركات تحويل نقدية مسجلة لهذا الفرع بعد' }}
            columns={[
              {
                title: 'رقم المرجع',
                dataIndex: 'transfer_ref',
                key: 'transfer_ref',
                render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</span>
              },
              {
                title: 'المبلغ المحول',
                dataIndex: 'amount',
                key: 'amount',
                render: (v) => (
                  <strong style={{ color: '#059669', fontSize: 13 }}>
                    {parseFloat(v || 0).toLocaleString()} ج.م
                  </strong>
                )
              },
              {
                title: 'طريقة التحويل',
                dataIndex: 'transfer_method',
                key: 'transfer_method',
                render: (v) => {
                  if (v === 'manual_cash') return <Tag color="green">تسليم كاش مباشر</Tag>;
                  if (v === 'bank_deposit') return <Tag color="blue">إيداع بنكي</Tag>;
                  if (v === 'courier') return <Tag color="orange">تسليم لمندوب</Tag>;
                  return <Tag>{v}</Tag>;
                }
              },
              {
                title: 'تاريخ الطلب',
                dataIndex: 'requested_at',
                key: 'requested_at',
                render: (v) => (v ? new Date(v).toLocaleString('ar-EG') : '—')
              },
              {
                title: 'حالة التحويل',
                dataIndex: 'status',
                key: 'status',
                align: 'center',
                render: (v) => {
                  if (v === 'completed') return <Tag color="success">مكتمل ومؤكد بالخزينة الرئيسية</Tag>;
                  if (v === 'pending') return <Tag color="warning">معلق في انتظار استلام الإدارة</Tag>;
                  if (v === 'cancelled') return <Tag color="default">ملغى ومسترد للفرع</Tag>;
                  return <Tag>{v}</Tag>;
                }
              },
              {
                title: 'ملاحظات وتفاصيل',
                dataIndex: 'notes',
                key: 'notes',
                render: (v, r) => (
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {v || '—'} {r.reference_no ? `(إيصال: ${r.reference_no})` : ''}
                  </span>
                )
              }
            ]}
          />
        </div>
      </Spin>

      {/* ─── Modal: Transfer to Main Safe Form ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={18} color="#059669" />
            <span style={{ fontWeight: 800 }}>تسليم نقدية من الفرع إلى الخزينة الرئيسية</span>
          </div>
        }
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>الرصيد النقدي المتاح بالخزينة:</span>
            <strong style={{ color: '#059669', fontSize: 15 }}>{cashAvail.toLocaleString()} ج.م</strong>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item
            name="amount"
            label="المبلغ المراد تسليمه (ج.م)"
            rules={[
              { required: true, message: 'يرجى إدخال المبلغ' },
              {
                validator: (_, value) => {
                  if (value && value > cashAvail) {
                    return Promise.reject(new Error(`المبلغ يتجاوز الرصيد النقدي المتاح (${cashAvail} ج.م)`));
                  }
                  if (value && value <= 0) {
                    return Promise.reject(new Error('المبلغ يجب أن يكون أكبر من صفر'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              size="large"
              placeholder="0.00"
              precision={2}
              style={{ width: '100%', borderRadius: 8 }}
              prefix={<DollarSign size={16} color="#059669" />}
            />
          </Form.Item>

          <Form.Item
            name="transfer_method"
            label="طريقة التسليم / التوريد"
            initialValue="manual_cash"
            rules={[{ required: true, message: 'يرجى اختيار طريقة التسليم' }]}
          >
            <Select size="large" style={{ borderRadius: 8 }}>
              <Select.Option value="manual_cash">تسليم نقد كاش باليد لمسؤول الخزينة</Select.Option>
              <Select.Option value="bank_deposit">إيداع بنكي مباشر في حساب الشركة</Select.Option>
              <Select.Option value="courier">تسليم لمندوب / شركة شحن أموال</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference_no" label="رقم إيصال الإيداع أو مرجع التحويل (اختياري)">
            <Input size="large" placeholder="مثال: REC-9082 أو رقم إيصال البنك" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات التسليم">
            <Input.TextArea rows={3} placeholder="أي تفاصيل خاصة بتسليم النقدية..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setIsTransferModalOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 700 }}
            >
              تأكيد وإرسال التحويل
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
