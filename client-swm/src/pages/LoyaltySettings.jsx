import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Typography,
  Row,
  Col,
  Space,
  Statistic,
  Divider,
  Alert,
  Tooltip,
  Tag,
  App as AntdApp
} from 'antd';
import {
  Award,
  Users,
  Coins,
  ShieldCheck,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle,
  Gift,
  HelpCircle,
  Flame
} from 'lucide-react';
import api from '../api';

const { Title, Text } = Typography;

const PRESETS = [
  { label: 'فاتورة صغيرة (رصيد غير كافٍ)', bill: 150, points: 50 },
  { label: 'فاتورة متوسطة (استبدال عادي)', bill: 800, points: 250 },
  { label: 'فاتورة كبيرة (سقف الخصم 50%)', bill: 1200, points: 2000 }
];

export default function LoyaltySettings({ currentUser, onNavigate }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role);

  // Stats from backend API (snake_case)
  const [stats, setStats] = useState({
    total_customers: 0,
    total_points: 0,
    total_lifetime_points: 0,
    monetary_value: 0,
    total_redeemed_points: 0,
    total_redeemed_amount: 0
  });

  // Simulator state
  const [simBillTotal, setSimBillTotal] = useState(1000);
  const [simCustomerPoints, setSimCustomerPoints] = useState(250);

  // Live form values for simulator
  const [liveSettings, setLiveSettings] = useState({
    loyalty_enabled: true,
    loyalty_points_per_egp: 10,
    loyalty_point_value: 0.50,
    loyalty_min_redeem: 100,
    loyalty_max_redeem_pct: 50
  });

  // Fetch settings & stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.allSettled([
        api.get('/api/swm/loyalty/settings'),
        api.get('/api/swm/loyalty/stats')
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data.success) {
        const s = settingsRes.value.data.data;
        form.setFieldsValue(s);
        setLiveSettings(s);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        const d = statsRes.value.data.data;
        setStats({
          total_customers: Number(d.total_customers) || 0,
          total_points: Number(d.total_points) || 0,
          total_lifetime_points: Number(d.total_lifetime_points) || 0,
          monetary_value: Number(d.monetary_value) || 0,
          total_redeemed_points: Number(d.total_redeemed_points) || 0,
          total_redeemed_amount: Number(d.total_redeemed_amount) || 0
        });
      }
    } catch (err) {
      console.error('Failed to load loyalty settings:', err);
      message.error('تعذر جلب إعدادات نظام الولاء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleValuesChange = (_, allValues) => {
    setLiveSettings((prev) => ({
      ...prev,
      ...allValues
    }));
  };

  const handleSetRecommended = () => {
    const recommended = {
      loyalty_enabled: true,
      loyalty_points_per_egp: 10,
      loyalty_point_value: 0.50,
      loyalty_min_redeem: 100,
      loyalty_max_redeem_pct: 50
    };
    form.setFieldsValue(recommended);
    setLiveSettings(recommended);
    message.info('تم تحميل الإعدادات الموصى بها (اضغط "حفظ وتطبيق القواعد" للاعتماد)');
  };

  const handleSave = async (values) => {
    if (!isAdmin) {
      message.warning('عذراً، يتطلب تعديل إعدادات الولاء صلاحيات المدير الإداري');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/api/swm/loyalty/settings', values);
      if (res.data.success) {
        message.success('تم حفظ وتطبيق قواعد محرك نقاط الولاء بنجاح على كافة الفروع!');
        setLiveSettings(values);
        // Refresh stats
        const statsRes = await api.get('/api/swm/loyalty/stats');
        if (statsRes.data?.success) {
          const d = statsRes.data.data;
          setStats({
            total_customers: Number(d.total_customers) || 0,
            total_points: Number(d.total_points) || 0,
            total_lifetime_points: Number(d.total_lifetime_points) || 0,
            monetary_value: Number(d.monetary_value) || 0,
            total_redeemed_points: Number(d.total_redeemed_points) || 0,
            total_redeemed_amount: Number(d.total_redeemed_amount) || 0
          });
        }
      } else {
        message.error(res.data.message || 'فشل حفظ الإعدادات');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Safe NaN-proof calculations for Live Simulator
  const billTotalSafe = Math.max(0, Number(simBillTotal) || 0);
  const customerPointsSafe = Math.max(0, Number(simCustomerPoints) || 0);
  const pointsPerEgpSafe = Math.max(1, Number(liveSettings?.loyalty_points_per_egp) || 10);
  const pointValueSafe = Math.max(0.01, Number(liveSettings?.loyalty_point_value) || 0.50);
  const minRedeemSafe = Math.max(1, Number(liveSettings?.loyalty_min_redeem) || 100);
  const maxRedeemPctSafe = Math.min(100, Math.max(1, Number(liveSettings?.loyalty_max_redeem_pct) || 50));
  const isEnabledSafe = liveSettings?.loyalty_enabled !== false;

  const pointsEarnedFromBill = isEnabledSafe && pointsPerEgpSafe > 0
    ? Math.floor(billTotalSafe / pointsPerEgpSafe)
    : 0;

  const canRedeem = isEnabledSafe && customerPointsSafe >= minRedeemSafe;
  const rawDiscount = canRedeem ? customerPointsSafe * pointValueSafe : 0;
  const maxAllowedDiscount = billTotalSafe * (maxRedeemPctSafe / 100);
  const actualDiscount = Math.min(rawDiscount, maxAllowedDiscount);
  const pointsActuallyRedeemed = pointValueSafe > 0
    ? Math.min(customerPointsSafe, Math.floor(actualDiscount / pointValueSafe))
    : 0;
  const finalPayable = Math.max(0, billTotalSafe - actualDiscount);

  // Business ROI KPI: Burn Rate %
  const burnRate = stats.total_lifetime_points > 0
    ? ((stats.total_redeemed_points / stats.total_lifetime_points) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ padding: '8px 0 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20
        }}
      >
        <div>
          <Title
            level={3}
            style={{
              margin: 0,
              fontWeight: 800,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
              }}
            >
              <Award size={24} color="#D97706" />
            </div>
            <span>إعدادات ومحرك نقاط وولاء العملاء</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
            التحكم في قواعد اكتساب النقاط، قيمة الاستبدال المالية (EGP)، والحد الأدنى لنقاط البيع (POS) بكافة فروع التجزئة
          </Text>
        </div>

        <Space>
          <Button
            icon={<RotateCcw size={15} style={{ marginLeft: 6 }} />}
            onClick={fetchData}
            loading={loading}
            style={{ borderRadius: 8, height: 38 }}
          >
            تحديث
          </Button>
          <Button
            type="dashed"
            icon={<Sparkles size={15} style={{ marginLeft: 6, color: '#D97706' }} />}
            onClick={handleSetRecommended}
            disabled={!isAdmin}
            style={{ borderRadius: 8, height: 38, borderColor: '#FDE68A', color: '#92400E' }}
          >
            الإعدادات الموصى بها
          </Button>
          {onNavigate && (
            <Button
              type="default"
              icon={<Users size={15} style={{ marginLeft: 6 }} />}
              onClick={() => onNavigate('customers')}
              style={{
                borderRadius: 8,
                height: 38,
                borderColor: '#CBD5E1',
                color: '#0F172A',
                fontWeight: 600
              }}
            >
              سجل العملاء والولاء
            </Button>
          )}
        </Space>
      </div>

      {!isAdmin && (
        <Alert
          type="info"
          showIcon
          message="وضع المشاهدة فقط"
          description="يمكنك الاطلاع على إعدادات الولاء ومحاكاتها؛ لكن تعديل وحفظ القواعد مقتصر على المديرين الإداريين فقط."
          style={{ borderRadius: 10, marginBottom: 20 }}
        />
      )}

      {/* Complete 5 KPI Stats Bar (ROI & Liability Metrics) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4} style={{ flexGrow: 1 }}>
          <Card
            variant="outlined"
            style={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>إجمالي عملاء الولاء</span>}
              value={stats.total_customers}
              prefix={<Users size={18} style={{ marginLeft: 8, color: '#3B82F6' }} />}
              valueStyle={{ fontWeight: 800, color: '#0F172A' }}
              suffix="عميل"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={5} style={{ flexGrow: 1 }}>
          <Card
            variant="outlined"
            style={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>النقاط الفعالة بالرصيد</span>}
              value={stats.total_points}
              prefix={<Coins size={18} style={{ marginLeft: 8, color: '#D97706' }} />}
              valueStyle={{ fontWeight: 800, color: '#D97706' }}
              suffix="نقطة"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={5} style={{ flexGrow: 1 }}>
          <Card
            variant="outlined"
            style={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Statistic
              title={
                <span style={{ fontWeight: 600, color: '#64748B' }}>
                  الالتزام المالي الحالي
                  <Tooltip title="القيمة المالية الإجمالية للنقاط النشطة حالياً القابلة للخصم من فواتير الفروع">
                    <HelpCircle size={13} style={{ display: 'inline', marginRight: 4, color: '#94A3B8' }} />
                  </Tooltip>
                </span>
              }
              value={stats.monetary_value}
              precision={2}
              prefix={<ShieldCheck size={18} style={{ marginLeft: 8, color: '#059669' }} />}
              valueStyle={{ fontWeight: 800, color: '#059669' }}
              suffix="ج.م"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={5} style={{ flexGrow: 1 }}>
          <Card
            variant="outlined"
            style={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>إجمالي الخصم الممنوح</span>}
              value={stats.total_redeemed_amount}
              precision={2}
              prefix={<Gift size={18} style={{ marginLeft: 8, color: '#6366F1' }} />}
              valueStyle={{ fontWeight: 800, color: '#6366F1' }}
              suffix="ج.م"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={5} style={{ flexGrow: 1 }}>
          <Card
            variant="outlined"
            style={{
              borderRadius: 12,
              borderColor: '#E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <Statistic
              title={
                <span style={{ fontWeight: 600, color: '#64748B' }}>
                  معدل استهلاك النقاط
                  <Tooltip title="نسبة النقاط التي استبدلها العملاء فعلياً من إجمالي النقاط المكتسبة تاريخياً (Burn Rate)">
                    <HelpCircle size={13} style={{ display: 'inline', marginRight: 4, color: '#94A3B8' }} />
                  </Tooltip>
                </span>
              }
              value={burnRate}
              prefix={<Flame size={18} style={{ marginLeft: 8, color: '#EA580C' }} />}
              valueStyle={{ fontWeight: 800, color: '#EA580C' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Main Settings Form Column */}
        <Col xs={24} lg={14}>
          <Card
            variant="outlined"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#D97706" />
                <span style={{ fontWeight: 700, fontSize: 16 }}>قواعد محرك الولاء ونقاط البيع (POS Rules)</span>
              </div>
            }
            style={{
              borderRadius: 14,
              borderColor: '#E2E8F0',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              onValuesChange={handleValuesChange}
            >
              {/* Toggle Engine */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: liveSettings.loyalty_enabled ? '#F0FDF4' : '#FFFBEB',
                  border: `1.5px solid ${liveSettings.loyalty_enabled ? '#BBF7D0' : '#FDE68A'}`,
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block', color: '#0F172A' }}>
                      تفعيل نظام نقاط وولاء العملاء في الفروع
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12.5 }}>
                      عند التفعيل، يمكن للكاشير البحث عن العملاء بالهاتف، واكتساب واستبدال النقاط آلياً على الفواتير
                    </Text>
                  </div>
                  <Form.Item name="loyalty_enabled" valuePropName="checked" style={{ margin: 0 }}>
                    <Switch
                      disabled={!isAdmin}
                      checkedChildren="مفعّل"
                      unCheckedChildren="معطّل"
                      style={{ backgroundColor: liveSettings.loyalty_enabled ? '#059669' : undefined }}
                    />
                  </Form.Item>
                </div>
              </div>

              <Row gutter={[16, 16]}>
                {/* Points Per EGP */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="loyalty_points_per_egp"
                    label={
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        معادلة اكتساب النقاط (مشتريات ⟵ نقاط)
                      </span>
                    }
                    extra="كم جنيه مشتريات يمنح العميل نقطة واحدة؟ (مثال: 10 يعني كل 10 ج.م = 1 نقطة)"
                    rules={[{ required: true, message: 'مطلوب إدخال النسبة' }]}
                  >
                    <InputNumber
                      disabled={!isAdmin}
                      min={1}
                      max={1000}
                      precision={0}
                      style={{ width: '100%', borderRadius: 8 }}
                      addonAfter="جنيه = 1 نقطة"
                    />
                  </Form.Item>
                </Col>

                {/* Point Value in EGP */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="loyalty_point_value"
                    label={
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        قيمة النقطة عند الاستبدال (نقاط ⟵ خصم مالي)
                      </span>
                    }
                    extra="كم يساوي كل نقطة واحدة بالجنيه المصري عند الخصم من الفاتورة؟ (مثال: 0.50 ج.م)"
                    rules={[{ required: true, message: 'مطلوب تحديد قيمة النقطة' }]}
                  >
                    <InputNumber
                      disabled={!isAdmin}
                      min={0.01}
                      max={100}
                      step={0.05}
                      precision={2}
                      style={{ width: '100%', borderRadius: 8 }}
                      addonAfter="ج.م لكل نقطة"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                {/* Min Redeem Points */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="loyalty_min_redeem"
                    label={
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        الحد الأدنى للنقاط لبدء الاستبدال
                      </span>
                    }
                    extra="أقل رصيد نقاط يجب أن يمتلكه العميل ليتمكن من بدء الاستبدال (مثال: 100 نقطة)"
                    rules={[{ required: true, message: 'مطلوب تحديد الحد الأدنى' }]}
                  >
                    <InputNumber
                      disabled={!isAdmin}
                      min={1}
                      max={10000}
                      precision={0}
                      style={{ width: '100%', borderRadius: 8 }}
                      addonAfter="نقطة كحد أدنى"
                    />
                  </Form.Item>
                </Col>

                {/* Max Redeem Percentage */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="loyalty_max_redeem_pct"
                    label={
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        أقصى نسبة خصم بالنقاط من إجمالي الفاتورة (%)
                      </span>
                    }
                    extra="الحد الأقصى لنسبة الفاتورة المسموح بسدادها عبر النقاط (مثال: 50%)"
                    rules={[{ required: true, message: 'مطلوب تحديد سقف النسبة' }]}
                  >
                    <InputNumber
                      disabled={!isAdmin}
                      min={1}
                      max={100}
                      precision={0}
                      style={{ width: '100%', borderRadius: 8 }}
                      addonAfter="% من الفاتورة"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '20px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Save size={16} style={{ marginLeft: 6 }} />}
                  loading={saving}
                  disabled={!isAdmin}
                  style={{
                    backgroundColor: isAdmin ? '#0F172A' : '#94A3B8',
                    borderColor: isAdmin ? '#0F172A' : '#94A3B8',
                    borderRadius: 8,
                    fontWeight: 700,
                    height: 40,
                    padding: '0 24px'
                  }}
                >
                  حفظ وتطبيق القواعد
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Live Simulator & Verification Column */}
        <Col xs={24} lg={10}>
          <Card
            variant="outlined"
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calculator size={18} color="#2563EB" />
                <span style={{ fontWeight: 700, fontSize: 16 }}>محاكي وحاسبة النقاط الحية (Live Simulator)</span>
              </div>
            }
            style={{
              borderRadius: 14,
              borderColor: '#E2E8F0',
              backgroundColor: '#FAFCFF',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
            }}
          >
            {/* Disabled System Warning Banner */}
            {!isEnabledSafe ? (
              <Alert
                type="warning"
                showIcon
                message="محرك الولاء معطل حالياً"
                description="لن يتم احتساب نقاط مكتسبة جديدة أو تطبيق أي خصم استبدال بالنقاط على الفواتير حتى يتم تفعيل النظام مجدداً."
                style={{ borderRadius: 10, marginBottom: 16 }}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="تجربة فورية لمعادلات الحساب"
                description="أدخل قيماً افتراضية لفاتورة تجريبية لمعاينة كيف سيحسب نظام الـ POS النقاط والخصومات للعميل بناءً على القواعد الحالية."
                style={{ borderRadius: 10, marginBottom: 16 }}
              />
            )}

            {/* Quick Scenario Presets */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 12.5, color: '#64748B', display: 'block', marginBottom: 8 }}>
                سيناريوهات تجريبية جاهزة بنقرة واحدة:
              </Text>
              <Space wrap size={[6, 8]}>
                {PRESETS.map((p, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    onClick={() => {
                      setSimBillTotal(p.bill);
                      setSimCustomerPoints(p.points);
                    }}
                    style={{
                      borderRadius: 6,
                      fontSize: 12,
                      borderColor: '#CBD5E1',
                      backgroundColor: simBillTotal === p.bill && simCustomerPoints === p.points ? '#EFF6FF' : '#FFFFFF',
                      color: simBillTotal === p.bill && simCustomerPoints === p.points ? '#1D4ED8' : '#334155',
                      fontWeight: simBillTotal === p.bill && simCustomerPoints === p.points ? 700 : 500
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Space>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                  مبلغ الفاتورة التجريبية:
                </Text>
                <InputNumber
                  value={simBillTotal}
                  onChange={(v) => setSimBillTotal(v || 0)}
                  min={0}
                  step={50}
                  style={{ width: '100%', borderRadius: 8 }}
                  addonAfter="ج.م"
                />
              </div>

              <div>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                  رصيد نقاط العميل الحالي:
                </Text>
                <InputNumber
                  value={simCustomerPoints}
                  onChange={(v) => setSimCustomerPoints(v || 0)}
                  min={0}
                  step={50}
                  style={{ width: '100%', borderRadius: 8 }}
                  addonAfter="نقطة"
                />
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* Simulation Result Box */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1.5px solid #E2E8F0',
                  padding: 16
                }}
              >
                <Text strong style={{ color: '#0F172A', display: 'block', marginBottom: 12, fontSize: 14 }}>
                  نتيجة العملية على شاشة الـ POS:
                </Text>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">النقاط المكتسبة من الفاتورة:</Text>
                    <Tag color={isEnabledSafe ? 'gold' : 'default'} style={{ fontSize: 13, fontWeight: 700, padding: '2px 8px' }}>
                      + {pointsEarnedFromBill} نقطة
                    </Tag>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">أهلية الاستبدال:</Text>
                    {!isEnabledSafe ? (
                      <Tag color="default">النظام معطل</Tag>
                    ) : canRedeem ? (
                      <Tag color="success" icon={<CheckCircle size={12} style={{ marginLeft: 4 }} />}>
                        مؤهل (لديه ≥ {minRedeemSafe} نقطة)
                      </Tag>
                    ) : (
                      <Tag color="error" icon={<AlertTriangle size={12} style={{ marginLeft: 4 }} />}>
                        غير مؤهل (أقل من {minRedeemSafe} نقطة)
                      </Tag>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">قيمة الخصم بالنقاط:</Text>
                    <Text strong style={{ color: actualDiscount > 0 ? '#059669' : '#64748B', fontSize: 14 }}>
                      - {actualDiscount.toFixed(2)} ج.م
                    </Text>
                  </div>

                  {actualDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <Text type="secondary">النقاط المستبدلة فعلياً:</Text>
                      <Text code>{pointsActuallyRedeemed} نقطة</Text>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">سقف الخصم المسموح ({maxRedeemPctSafe}%):</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      {maxAllowedDiscount.toFixed(2)} ج.م
                    </Text>
                  </div>

                  <Divider style={{ margin: '6px 0' }} />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      padding: '8px 12px',
                      borderRadius: 8
                    }}
                  >
                    <Text strong style={{ color: '#0F172A', fontSize: 14 }}>
                      صافي المبلغ المطلوب دفعه:
                    </Text>
                    <Text strong style={{ color: '#0F172A', fontSize: 16 }}>
                      {finalPayable.toFixed(2)} ج.م
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
