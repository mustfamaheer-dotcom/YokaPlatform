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
  Popconfirm,
  Statistic
} from 'antd';
import {
  Wallet,
  Send,
  Building,
  History,
  CheckCircle2,
  DollarSign,
  CreditCard,
  ArrowRightLeft,
  Info,
  RotateCcw
} from 'lucide-react';
import SupervisorPageLayout from './SupervisorPageLayout';
import api from '../../../api';

const { Title, Text, Paragraph } = Typography;

export default function TreasuryPage({ currentUser }) {
  const { message } = App.useApp();
  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const [loading, setLoading] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [safeData, setSafeData] = useState({
    cash_balance: 0,
    visa_balance: 0,
    transfer_balance: 0,
    total_balance: 0
  });
  const [transfers, setTransfers] = useState([]);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [form] = Form.useForm();

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
    loadTreasuryData();
  }, [branchId]);

  const cashAvailable = parseFloat(safeData.cash_balance || 0);
  const visaAvailable = parseFloat(safeData.visa_balance || 0);
  const transferAvailable = parseFloat(safeData.transfer_balance || 0);
  const totalAvailable = Number((cashAvailable + visaAvailable + transferAvailable).toFixed(2));

  // Watch form fields for live total calculation in modal
  const watchedCash = Form.useWatch('cash_amount', form) || 0;
  const watchedVisa = Form.useWatch('visa_amount', form) || 0;
  const watchedTransfer = Form.useWatch('transfer_amount', form) || 0;
  const totalSettlementAmount = Number(
    ((Number(watchedCash) || 0) + (Number(watchedVisa) || 0) + (Number(watchedTransfer) || 0)).toFixed(2)
  );

  // Open Handover Modal prefilled with available branch balances
  const openHandoverModal = () => {
    if (totalAvailable <= 0) {
      message.warning('رصيد الخزينة الحالي 0.00 ج.م (لا توجد مبالغ متراكمة حالياً للتسليم).');
      return;
    }
    form.setFieldsValue({
      cash_amount: cashAvailable,
      visa_amount: visaAvailable,
      transfer_amount: transferAvailable,
      transfer_method: 'multi_method',
      reference_no: '',
      notes: ''
    });
    setIsHandoverModalOpen(true);
  };

  // Execute Handover with 3-field Payment Breakdown to Main Safe
  const handleHandoverSubmit = async (values) => {
    const cash = Number(values.cash_amount || 0);
    const visa = Number(values.visa_amount || 0);
    const transfers = Number(values.transfer_amount || 0);
    const totalToSettle = Number((cash + visa + transfers).toFixed(2));

    if (totalToSettle <= 0) {
      message.warning('يرجى تحديد مبلغ أكبر من صفر في وسيلة دفع واحدة على الأقل للتسليم.');
      return;
    }

    setHandingOver(true);
    try {
      const payload = {
        from_branch_id: branchId,
        amount: totalToSettle,
        payment_breakdown: {
          cash,
          visa,
          transfers
        },
        cash,
        visa,
        transfers,
        transfer_method: values.transfer_method || 'multi_method',
        reference_no: values.reference_no,
        notes: values.notes || 'تسليم خزن شامل للفرع الرئيسي'
      };

      const res = await api.post('/api/v1/cash-transfers', payload);
      if (res.data.success) {
        message.success(res.data.message || `تم تسليم إجمالي ${totalToSettle.toLocaleString()} ج.م بنجاح للفرع الرئيسي`);
        setIsHandoverModalOpen(false);
        form.resetFields();
        loadTreasuryData();
      } else {
        message.error(res.data.message || 'فشل في تسليم الخزينة');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تنفيذ تسليم الخزينة');
    } finally {
      setHandingOver(false);
    }
  };

  return (
    <SupervisorPageLayout
      currentUser={currentUser}
      pageTitle="خزينة الفرع والتحويلات النقدية"
      pageIcon={<Wallet size={20} />}
      pageSubtitle="متابعة الأرصدة المتراكمة من إغلاق الورديات وتسليم النقدية للفرع الرئيسي"
    >
      <Spin spinning={loading}>
        {/* Info Card on Safe Rollover Workflow */}
        <Alert
          type="info"
          showIcon
          icon={<Info size={18} />}
          message={
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              دورة الخزينة التراكمية اليدوية (100% Manual): تتراكم النقدية والفيزا والمحافظ في خزينة الفرع من إغلاق الورديات اليومية وتبقى محتجزة بالفرع بصفة دائمة دون أي تحويل تلقائي. لا يتم ترحيل أي مبالغ للخزينة الرئيسية إلا يدوياً وحصرياً عند قيام المشرف بالضغط على زر تسليم النقدية واعتماد نموذج التحويل.
            </span>
          }
          style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #bae6fd' }}
        />

        {/* ─── 4 Account Summary Cards ─── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Total Accumulated Safe Holdings */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: 14,
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
                  إجمالي أرصدة الخزينة الحالية
                </span>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8', marginTop: 6 }}>
                  {(safeData.total_balance || 0).toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 14 }}>
                شامل النقدية، الفيزا، والتحويلات
              </div>
            </div>
          </Col>

          {/* Accumulated Cash (Can be handed over & reset) */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 14,
                padding: '20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>💵 النقدية المتراكمة بالخزينة</span>
                <Tag color="success" style={{ margin: 0, fontWeight: 700 }}>قابلة للتسليم</Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', margin: '8px 0 4px' }}>
                {(safeData.cash_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#166534' }}>
                يتم تصفيرها إلى 0 ج.م فور تسليمها للفرع الرئيسي
              </Text>
            </div>
          </Col>

          {/* Visa Settlement Account */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 14,
                padding: '20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 700 }}>💳 تسويات الفيزا البنكية</span>
                <Tag color="processing" style={{ margin: 0, fontWeight: 700 }}>حساب بنكي</Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1d4ed8', margin: '8px 0 4px' }}>
                {(safeData.visa_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#1e40af' }}>
                متحصلات شبكة ماكينات الدفع الإلكتروني
              </Text>
            </div>
          </Col>

          {/* Transfer & Wallets Account */}
          <Col xs={24} md={6}>
            <div
              style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 14,
                padding: '20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b21a8', fontWeight: 700 }}>📲 تحويلات إنستاباي والمحافظ</span>
                <Tag color="purple" style={{ margin: 0, fontWeight: 700 }}>محافظ رقمية</Tag>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7e22ce', margin: '8px 0 4px' }}>
                {(safeData.transfer_balance || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600 }}>ج.م</span>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5, color: '#6b21a8' }}>
                InstaPay وفودافون كاش
              </Text>
            </div>
          </Col>
        </Row>

        {/* ─── Handover Safe Action Banner ─── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <div>
            <Title level={4} style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f172a' }}>
              تسليم الخزينة اليدوي للفرع الرئيسي (Manual Safe Handover to Main Safe)
            </Title>
            <Paragraph style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              تحويل يدوي شامل: يمكنك تسليم وتصفير أرصدة الفرع المتراكمة (كاش، فيزا، تحويلات ومحافظ) وترحيلها للخزينة الرئيسية بمعاملة ذرية واحدة موثقة بالكامل.
            </Paragraph>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<Send size={18} style={{ marginLeft: 8 }} />}
            onClick={openHandoverModal}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 14,
              height: 46,
              padding: '0 24px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            تسليم وتحويل الخزينة للخزينة الرئيسية ({totalAvailable.toLocaleString()} ج.م)
          </Button>
        </div>

        {/* ─── Past Transfers Table ─── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={18} color="#059669" />
              <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                سجل حركات تسليم وتوريد الخزينة السابقة
              </Title>
            </div>
            <Button onClick={loadTreasuryData}>تحديث السجل</Button>
          </div>

          <Table
            size="small"
            dataSource={transfers}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: 'لا توجد حركات تسليم سابقة مسجلة لهذا الفرع' }}
            columns={[
              {
                title: 'رقم المرجع',
                dataIndex: 'transfer_ref',
                key: 'transfer_ref',
                render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>{v}</span>
              },
              {
                title: 'المبلغ المسلَّم وتفصيل الدفع',
                dataIndex: 'amount',
                key: 'amount',
                render: (v, r) => {
                  let pb = null;
                  try {
                    pb = typeof r.payment_breakdown === 'string' ? JSON.parse(r.payment_breakdown) : r.payment_breakdown;
                  } catch (e) {
                    pb = null;
                  }

                  return (
                    <div>
                      <div style={{ color: '#059669', fontSize: 13, fontWeight: 800 }}>
                        {parseFloat(v || 0).toLocaleString()} ج.م
                      </div>
                      {pb && (pb.cash > 0 || pb.visa > 0 || pb.transfers > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {pb.cash > 0 && (
                            <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                              💵 كاش: {parseFloat(pb.cash).toLocaleString()}
                            </Tag>
                          )}
                          {pb.visa > 0 && (
                            <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                              💳 فيزا: {parseFloat(pb.visa).toLocaleString()}
                            </Tag>
                          )}
                          {pb.transfers > 0 && (
                            <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
                              📲 تحويل: {parseFloat(pb.transfers).toLocaleString()}
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              },
              {
                title: 'طريقة التسليم',
                dataIndex: 'transfer_method',
                key: 'transfer_method',
                render: (v) => {
                  if (v === 'multi_method') return <Tag color="geekblue">تسليم شامل مجمع</Tag>;
                  if (v === 'manual_cash') return <Tag color="green">تسليم كاش باليد</Tag>;
                  if (v === 'bank_deposit') return <Tag color="blue">إيداع بنكي</Tag>;
                  if (v === 'courier') return <Tag color="orange">تسليم لمندوب</Tag>;
                  return <Tag>{v}</Tag>;
                }
              },
              {
                title: 'تاريخ التسليم',
                dataIndex: 'requested_at',
                key: 'requested_at',
                render: (v) => (v ? new Date(v).toLocaleString('ar-EG') : '—')
              },
              {
                title: 'الحالة',
                dataIndex: 'status',
                key: 'status',
                align: 'center',
                render: (v) => {
                  if (v === 'completed') return <Tag color="success">مكتمل ومودع بالخزينة الرئيسية</Tag>;
                  if (v === 'pending') return <Tag color="warning">معلق في انتظار الاستلام</Tag>;
                  if (v === 'cancelled') return <Tag color="default">ملغى ومسترد</Tag>;
                  return <Tag>{v}</Tag>;
                }
              },
              {
                title: 'الملاحظات / الإيصال',
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

      {/* ─── Modal: Multi-Method Handover Confirmation Form ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={18} color="#059669" />
            <span style={{ fontWeight: 800 }}>تأكيد تسليم الخزينة للفرع الرئيسي (كاش + فيزا + تحويلات)</span>
          </div>
        }
        open={isHandoverModalOpen}
        onCancel={() => setIsHandoverModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={650}
      >
        <Alert
          type="info"
          message={
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
              حدد المبالغ المراد تسليمها لكل وسيلة دفع أدناه. سيتم خصم المبالغ المحددة من أرصدة خزينة الفرع وترحيلها وإيداعها مباشرة في الخزينة الرئيسية بمعاملة آمنة.
            </span>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        {/* Current Accumulated Safe Balances Overview */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            الأرصدة المتراكمة الحالية بخزينة الفرع:
          </div>
          <Row gutter={[12, 8]}>
            <Col span={8}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ fontSize: 11, color: '#166534', fontWeight: 600, display: 'block' }}>💵 كاش متراكم:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>
                  {cashAvailable.toLocaleString()} ج.م
                </span>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, display: 'block' }}>💳 فيزا بنكية:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>
                  {visaAvailable.toLocaleString()} ج.م
                </span>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ fontSize: 11, color: '#6b21a8', fontWeight: 600, display: 'block' }}>📲 تحويلات ومحافظ:</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#7e22ce' }}>
                  {transferAvailable.toLocaleString()} ج.م
                </span>
              </div>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
            <Button
              size="small"
              onClick={() => {
                form.setFieldsValue({
                  cash_amount: cashAvailable,
                  visa_amount: visaAvailable,
                  transfer_amount: transferAvailable
                });
              }}
              style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', borderColor: '#86efac' }}
            >
              تعبئة كامل الأرصدة المتاحة للتسليم (تصفير الكل)
            </Button>
            <Button
              size="small"
              onClick={() => {
                form.setFieldsValue({
                  cash_amount: 0,
                  visa_amount: 0,
                  transfer_amount: 0
                });
              }}
              style={{ fontSize: 11.5 }}
            >
              تصفير الحقول
            </Button>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleHandoverSubmit}>
          <Row gutter={16}>
            {/* 1. Cash Breakdown Field */}
            <Col xs={24} sm={8}>
              <Form.Item
                name="cash_amount"
                label={
                  <span style={{ fontWeight: 700, color: '#166534' }}>
                    تسليم النقدية (كاش) 💵
                  </span>
                }
                extra={<span style={{ fontSize: 11, color: '#64748b' }}>الحد الأقصى: {cashAvailable.toLocaleString()} ج.م</span>}
                rules={[
                  { required: true, message: 'أدخل المبلغ' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value > cashAvailable) {
                        return Promise.reject(new Error(`المبلغ يتجاوز الكاش المتاح (${cashAvailable} ج.م)`));
                      }
                      if (value !== undefined && value < 0) {
                        return Promise.reject(new Error('لا يمكن إدخال قيمة سالبة'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={cashAvailable}
                  style={{ width: '100%', borderRadius: 8, fontWeight: 700 }}
                  prefix={<DollarSign size={16} color="#059669" />}
                />
              </Form.Item>
            </Col>

            {/* 2. Visa Breakdown Field */}
            <Col xs={24} sm={8}>
              <Form.Item
                name="visa_amount"
                label={
                  <span style={{ fontWeight: 700, color: '#1e40af' }}>
                    تسليم الفيزا البنكية 💳
                  </span>
                }
                extra={<span style={{ fontSize: 11, color: '#64748b' }}>الحد الأقصى: {visaAvailable.toLocaleString()} ج.م</span>}
                rules={[
                  { required: true, message: 'أدخل المبلغ' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value > visaAvailable) {
                        return Promise.reject(new Error(`المبلغ يتجاوز رصيد الفيزا (${visaAvailable} ج.م)`));
                      }
                      if (value !== undefined && value < 0) {
                        return Promise.reject(new Error('لا يمكن إدخال قيمة سالبة'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={visaAvailable}
                  style={{ width: '100%', borderRadius: 8, fontWeight: 700 }}
                  prefix={<CreditCard size={16} color="#2563eb" />}
                />
              </Form.Item>
            </Col>

            {/* 3. Transfers / Wallets Breakdown Field */}
            <Col xs={24} sm={8}>
              <Form.Item
                name="transfer_amount"
                label={
                  <span style={{ fontWeight: 700, color: '#6b21a8' }}>
                    تسليم التحويلات والمحافظ 📲
                  </span>
                }
                extra={<span style={{ fontSize: 11, color: '#64748b' }}>الحد الأقصى: {transferAvailable.toLocaleString()} ج.م</span>}
                rules={[
                  { required: true, message: 'أدخل المبلغ' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value > transferAvailable) {
                        return Promise.reject(new Error(`المبلغ يتجاوز رصيد التحويلات (${transferAvailable} ج.م)`));
                      }
                      if (value !== undefined && value < 0) {
                        return Promise.reject(new Error('لا يمكن إدخال قيمة سالبة'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={transferAvailable}
                  style={{ width: '100%', borderRadius: 8, fontWeight: 700 }}
                  prefix={<ArrowRightLeft size={16} color="#7c3aed" />}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Live Total Settlement Summary Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: 10,
              padding: '12px 18px',
              margin: '8px 0 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontWeight: 700, color: '#334155', fontSize: 13 }}>
              إجمالي المبلغ المعتمد للتسليم الآن:
            </span>
            <span
              style={{
                fontWeight: 900,
                fontSize: 20,
                color: totalSettlementAmount > 0 ? '#059669' : '#94a3b8'
              }}
            >
              {totalSettlementAmount.toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
            </span>
          </div>

          <Form.Item
            name="transfer_method"
            label="طريقة التوريد والتسليم"
            initialValue="multi_method"
            rules={[{ required: true }]}
          >
            <Select size="large" style={{ borderRadius: 8 }}>
              <Select.Option value="multi_method">تسليم شامل مجمع (كاش + إلكتروني ومحافظ)</Select.Option>
              <Select.Option value="manual_cash">تسليم كاش باليد لمسؤول الخزينة الرئيسي</Select.Option>
              <Select.Option value="bank_deposit">إيداع بنكي مباشر في حساب الشركة</Select.Option>
              <Select.Option value="courier">تسليم لمندوب تحصيل / شركة شحن</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference_no" label="رقم إيصال الإيداع أو المرجع (اختياري)">
            <Input size="large" placeholder="مثال: REC-1029 أو رقم إيصال البنك أو رقم المعاملة" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="notes" label="ملاحظات التسليم">
            <Input.TextArea rows={2} placeholder="تفاصيل إضافية عن تسليم الخزينة..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setIsHandoverModalOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={handingOver}
              disabled={totalSettlementAmount <= 0}
              style={{
                backgroundColor: totalSettlementAmount > 0 ? '#059669' : undefined,
                borderColor: totalSettlementAmount > 0 ? '#059669' : undefined,
                fontWeight: 800
              }}
            >
              تأكيد التسليم وترحيل الخزينة ({totalSettlementAmount.toLocaleString()} ج.م)
            </Button>
          </div>
        </Form>
      </Modal>
    </SupervisorPageLayout>
  );
}
