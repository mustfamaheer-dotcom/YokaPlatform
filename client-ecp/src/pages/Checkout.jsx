import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Radio,
  Button,
  Typography,
  Space,
  Divider,
  Alert,
  App as AntdApp,
  Grid,
  Modal,
  Tag
} from 'antd';
import {
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  LockOutlined,
  ArrowRightOutlined,
  UploadOutlined,
  CopyOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  PictureOutlined,
  CameraOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  QrcodeOutlined,
  WalletOutlined,
  CreditCardOutlined,
  EyeOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Checkout({ cart, onRefreshCart }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();

  const [governorates, setGovernorates] = useState([]);
  const [selectedGov, setSelectedGov] = useState('القاهرة');
  const [shippingFee, setShippingFee] = useState(45);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [transferReceiptUrl, setTransferReceiptUrl] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reservationTimeLeft, setReservationTimeLeft] = useState(900); // 15 mins in seconds

  useEffect(() => {
    fetchShippingRates();
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await api.get('/api/ecp/checkout/payment-methods');
      if (res.data.success && res.data.data?.length > 0) {
        setPaymentMethods(res.data.data);
        const cod = res.data.data.find((m) => m.method_key === 'cod');
        if (cod) {
          setPaymentMethod(cod.method_key);
        } else {
          setPaymentMethod(res.data.data[0].method_key);
        }
      }
    } catch (err) {
      console.warn('Using default payment methods fallback:', err);
    }
  };

  // 15-minute countdown timer
  useEffect(() => {
    if (reservationTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setReservationTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [reservationTimeLeft]);

  // Acquire 15-minute temporary reservation upon entering checkout
  useEffect(() => {
    if (cart?.cart_id && cart?.items?.length > 0) {
      reserveStock();
    }
  }, [cart?.cart_id]);

  const reserveStock = async () => {
    try {
      await api.post('/api/ecp/checkout/reserve', { cart_id: cart.cart_id });
      setReservationTimeLeft(900);
    } catch (err) {
      console.warn('Temporary stock reservation info:', err.response?.data?.message);
    }
  };

  const fetchShippingRates = async () => {
    try {
      const res = await api.get('/api/ecp/checkout/shipping-rates');
      if (res.data.success) {
        setGovernorates(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGovernorateChange = (govName) => {
    setSelectedGov(govName);
    const found = governorates.find((g) => g.name_ar === govName);
    if (found) {
      setShippingFee(found.shipping_fee);
    }
  };

  // Client-side lightweight image compression for instant receipt upload
  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    setUploadingReceipt(true);
    setReceiptError('');

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setTransferReceiptUrl(compressedDataUrl);
        setUploadingReceipt(false);
        message.success('تم إرفاق صورة إشعار التحويل بنجاح!');
      };
      img.onerror = () => {
        setUploadingReceipt(false);
        message.error('تعذر معالجة الصورة، يرجى تجربة صورة أخرى');
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCopyAccount = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    message.success('تم نسخ البيانات للحافظة');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const subtotal = cart?.subtotal || 0;
  const isFreeShipping = subtotal >= 1500;
  const finalShippingCost = isFreeShipping ? 0 : shippingFee;
  const totalAmount = subtotal + finalShippingCost;

  const onFinish = async (values) => {
    if (!cart?.items || cart.items.length === 0) {
      return message.warning('سلة التسوق فارغة، يرجى إضافة منتجات أولاً');
    }

    // Check receipt requirement
    const activeMethodObj = paymentMethods.find((m) => m.method_key === paymentMethod) || {
      method_key: paymentMethod,
      requires_receipt: paymentMethod !== 'cod'
    };

    if (activeMethodObj.requires_receipt && !transferReceiptUrl) {
      setReceiptError('مطلوب إرفاق صورة إشعار التحويل (Screenshot) من تطبيق إنستاباي أو المحفظة الإلكترونية لإتمام الطلب.');
      message.warning('يرجى إرفاق صورة إشعار التحويل للمتابعة');
      const el = document.getElementById('payment-step-card');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cart_id: cart.cart_id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email || undefined,
        governorate: selectedGov,
        city: values.city,
        street_address: values.street_address,
        building_apartment: values.building_apartment,
        payment_method: paymentMethod,
        customer_notes: values.customer_notes,
        transfer_receipt_url: transferReceiptUrl || undefined,
        transfer_reference: transferReference || undefined
      };

      const res = await api.post('/api/ecp/checkout/order', payload);
      if (res.data.success) {
        message.success('تم تأكيد طلبك بنجاح!');
        onRefreshCart();
        navigate(`/order-success/${res.data.data.order_number}`);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل إتمام الطلب، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', background: '#FFFFFF', borderRadius: 12 }}>
        <Title level={3}>سلة التسوق فارغة</Title>
        <p style={{ color: '#6B6B6B', marginBottom: 20 }}>يرجى اختيار بعض المنتجات لمتابعة الدفع</p>
        <Link to="/catalog">
          <Button type="primary" size="large" style={{ backgroundColor: '#C8A45C', color: '#0A0A0A', borderRadius: 8, border: 'none', fontWeight: 700 }}>
            تصفح الكتالوج الآن
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Reservation Active Banner */}
      <Alert
        message={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              <ClockCircleOutlined style={{ marginLeft: 6, color: '#C8A45C' }} />
              <strong>تم حجز محتويات سلتك مؤقتاً</strong> لمدة 15 دقيقة لضمان عدم نفاد المخزون أثناء إتمام الدفع.
            </span>
            <span style={{ fontWeight: 800, color: '#C8A45C', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
              الوقت المتبقي: {formatTime(reservationTimeLeft)}
            </span>
          </div>
        }
        type="warning"
        showIcon={false}
        style={{ marginBottom: 24, borderRadius: 8, backgroundColor: '#0A0A0A', border: '1px solid #A68942', color: '#E8D5A8' }}
      />

      <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', alignItems: screens.xs ? 'flex-start' : 'center', gap: 10, marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(20px, 3.5vw, 26px)' }}>إتمام الشراء وإنهاء الطلب</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>يرجى إدخال عنوان التوصيل لاكتمال الأوردر</Text>
        </div>
        <Link to="/catalog">
          <Button type="text" style={{ color: '#C8A45C', fontWeight: 600, padding: 0 }} icon={<ArrowRightOutlined />}>متابعة التسوق</Button>
        </Link>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ governorate: 'القاهرة' }}>
        <Row gutter={[24, 24]}>
          {/* Shipping Form & Payment Section */}
          <Col xs={24} lg={15}>
            {/* Step 1: Customer Contact Info */}
            <Card
              title={
                <Space>
                  <span style={{ width: 24, height: 24, background: '#C8A45C', color: '#0A0A0A', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>1</span>
                  <span>بيانات المستلم والتواصل</span>
                </Space>
              }
              style={{ borderRadius: 12, marginBottom: 20, borderColor: '#E8E4DB' }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="الاسم بالكامل"
                    name="customer_name"
                    rules={[{ required: true, message: 'يرجى كتابة الاسم الثلاثي' }]}
                  >
                    <Input size="large" autoComplete="name" placeholder="مثال: أحمد محمد علي" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="رقم الهاتف (للتواصل والتوصيل)"
                    name="customer_phone"
                    rules={[
                      { required: true, message: 'يرجى إدخال رقم الهاتف' },
                      { pattern: /^01[0125][0-9]{8}$/, message: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقم)' }
                    ]}
                  >
                    <Input size="large" type="tel" autoComplete="tel" placeholder="010XXXXXXXX" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="البريد الإلكتروني (اختياري لاستلام الفاتورة)"
                name="customer_email"
                rules={[{ type: 'email', message: 'بريد إلكتروني غير صالح' }]}
              >
                <Input size="large" type="email" autoComplete="email" placeholder="name@example.com" />
              </Form.Item>
            </Card>

            {/* Step 2: Shipping Address */}
            <Card
              title={
                <Space>
                  <span style={{ width: 24, height: 24, background: '#C8A45C', color: '#0A0A0A', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>2</span>
                  <span>عنوان التوصيل</span>
                </Space>
              }
              style={{ borderRadius: 12, marginBottom: 20, borderColor: '#E8E4DB' }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="المحافظة" required>
                    <Select
                      size="large"
                      value={selectedGov}
                      onChange={handleGovernorateChange}
                    >
                      {governorates.map((g) => (
                        <Option key={g.code} value={g.name_ar}>
                          {g.name_ar} (الشحن: {g.shipping_fee} ج.م)
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="المدينة / المركز / الحي"
                    name="city"
                    rules={[{ required: true, message: 'يرجى كتابة اسم المدينة أو الحي' }]}
                  >
                    <Input size="large" autoComplete="address-level2" placeholder="مثال: مدينة نصر، مصر الجديدة..." />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="اسم الشارع بالتفصيل"
                name="street_address"
                rules={[{ required: true, message: 'يرجى كتابة عنوان الشارع بالتفصيل' }]}
              >
                <Input size="large" autoComplete="street-address" placeholder="اسم الشارع، علامة مميزة قريبة..." />
              </Form.Item>

              <Form.Item label="رقم العقار / العمارة ورقم الشقة والدور" name="building_apartment">
                <Input size="large" placeholder="عمارة رقم ... شقة رقم ..." />
              </Form.Item>

              <Form.Item label="ملاحظات لمندوب الشحن والتوصيل" name="customer_notes">
                <TextArea rows={2} placeholder="مثال: الاتصال قبل الوصول بنصف ساعة..." />
              </Form.Item>
            </Card>

            {/* Step 3: Payment Method */}
            <Card
              id="payment-step-card"
              title={
                <Space>
                  <span style={{ width: 24, height: 24, background: '#C8A45C', color: '#0A0A0A', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>3</span>
                  <span>طريقة السداد</span>
                </Space>
              }
              style={{ borderRadius: 12, borderColor: '#E8E4DB' }}
            >
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setReceiptError('');
                }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {(paymentMethods.length > 0 ? paymentMethods : [
                  {
                    id: 1,
                    method_key: 'cod',
                    name_ar: 'الدفع عند الاستلام (COD)',
                    provider: 'cash',
                    instructions: 'ادفع نقداً لمندوب الشحن عند استلام الطلب ومعاينة المنتجات',
                    requires_receipt: false
                  },
                  {
                    id: 2,
                    method_key: 'instapay',
                    name_ar: 'إنستاباي - تحويل فوري (InstaPay IPN)',
                    provider: 'instapay',
                    account_number: 'yokastore@instapay',
                    account_name: 'Yoka Store',
                    instructions: 'قم بتحويل المبلغ المطلوب عبر تطبيق إنستاباي إلى العنوان أعلاه، ثم التقط صورة إشعار نجاح التحويل وارفعه في الأسفل لتأكيد حجز طلبك فورياً.',
                    requires_receipt: true
                  },
                  {
                    id: 3,
                    method_key: 'vodafone_cash',
                    name_ar: 'فودافون كاش ومحافظ إلكترونية (Smart Wallets)',
                    provider: 'vodafone',
                    account_number: '01000000000',
                    account_name: 'يوكا ستور - محفظة فودافون كاش',
                    instructions: 'قم بتحويل المبلغ إلى رقم المحفظة أعلاه، ثم أرفق سكرين شوت لرسالة أو إشعار تأكيد التحويل في الخانة المخصصة بالأسفل.',
                    requires_receipt: true
                  }
                ]).map((method) => {
                  const isSelected = paymentMethod === method.method_key;
                  return (
                    <Radio
                      key={method.method_key}
                      value={method.method_key}
                      style={{
                        border: '1px solid',
                        borderColor: isSelected ? '#C8A45C' : '#E8E4DB',
                        padding: '14px 16px',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(200,164,92,0.08)' : '#fff'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 15 }}>{method.name_ar}</strong>
                          {method.requires_receipt && (
                            <Tag color="purple" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                              يتطلب إشعار تحويل
                            </Tag>
                          )}
                        </div>
                        {method.instructions && (
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                            {method.instructions}
                          </Text>
                        )}
                      </div>
                    </Radio>
                  );
                })}
              </Radio.Group>

              {/* Dynamic Account Details & Transfer Receipt Upload for non-COD */}
              {(() => {
                const currentMethod = (paymentMethods.length > 0 ? paymentMethods : [
                  {
                    method_key: 'instapay',
                    requires_receipt: true,
                    account_number: 'yokastore@instapay',
                    account_name: 'Yoka Store',
                    instructions: 'قم بتحويل المبلغ المطلوب عبر تطبيق إنستاباي إلى العنوان أعلاه، ثم التقط صورة إشعار نجاح التحويل وارفعه في الأسفل لتأكيد حجز طلبك فورياً.'
                  },
                  {
                    method_key: 'vodafone_cash',
                    requires_receipt: true,
                    account_number: '01000000000',
                    account_name: 'يوكا ستور - محفظة فودافون كاش',
                    instructions: 'قم بتحويل المبلغ إلى رقم المحفظة أعلاه، ثم أرفق سكرين شوت لرسالة أو إشعار تأكيد التحويل في الخانة المخصصة بالأسفل.'
                  }
                ]).find((m) => m.method_key === paymentMethod);

                const needsReceipt = currentMethod ? currentMethod.requires_receipt : (paymentMethod !== 'cod');
                if (!needsReceipt) return null;

                return (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 16,
                      borderRadius: 10,
                      border: '1px solid #C8A45C',
                      backgroundColor: '#FAF7F0'
                    }}
                  >
                    {/* Account Details Banner */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, color: '#C8A45C' }}>✦</span>
                        <strong style={{ fontSize: 14, color: '#0A0A0A' }}>
                          بيانات تحويل المبلغ لحساب المتجر:
                        </strong>
                      </div>

                      {currentMethod?.account_number && (
                        <div
                          style={{
                            background: '#FFFFFF',
                            border: '1px dashed #C8A45C',
                            padding: '10px 14px',
                            borderRadius: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 8
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 12, color: '#666', display: 'block' }}>
                              رقم المحفظة / عنوان إنستاباي:
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A', letterSpacing: 0.5 }}>
                              {currentMethod.account_number}
                            </span>
                            {currentMethod.account_name && (
                              <div style={{ fontSize: 12, color: '#888' }}>
                                اسم الحساب: <strong>{currentMethod.account_name}</strong>
                              </div>
                            )}
                          </div>
                          <Button
                            type="primary"
                            icon={copiedKey ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={() => handleCopyAccount(currentMethod.account_number)}
                            style={{
                              backgroundColor: copiedKey ? '#16a34a' : '#0A0A0A',
                              borderColor: copiedKey ? '#16a34a' : '#0A0A0A',
                              color: '#fff',
                              borderRadius: 6
                            }}
                          >
                            {copiedKey ? 'تم النسخ!' : 'نسخ الرقم'}
                          </Button>
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                        {currentMethod?.instructions || 'يرجى إتمام عملية التحويل عبر تطبيق إنستاباي أو المحفظة الإلكترونية، ثم رفع سكرين شوت لإشعار نجاح التحويل أدناه.'}
                      </div>
                    </div>

                    <Divider style={{ margin: '14px 0', borderColor: '#E8E4DB' }} />

                    {/* Transfer Receipt Upload Area */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={{ fontWeight: 700, fontSize: 13, color: '#0A0A0A' }}>
                          إرفاق سكرين شوت إشعار التحويل (IPN Screenshot) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>إلزامي لإتمام الطلب</span>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        id="receipt-file-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleReceiptFileChange}
                      />

                      {!transferReceiptUrl ? (
                        <div
                          onClick={() => document.getElementById('receipt-file-input')?.click()}
                          style={{
                            border: '2px dashed #C8A45C',
                            borderRadius: 8,
                            padding: '24px 16px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: '#FFFFFF',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <CameraOutlined style={{ fontSize: 28, color: '#C8A45C', marginBottom: 8 }} />
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0A0A0A', marginBottom: 4 }}>
                            اضغط هنا لرفع أو التقاط صورة إشعار التحويل
                          </div>
                          <div style={{ fontSize: 12, color: '#777' }}>
                            يدعم صور الموبايل والسكرين شوت (JPG, PNG, WebP)
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #16a34a',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap'
                          }}
                        >
                          <img
                            src={transferReceiptUrl}
                            alt="إشعار التحويل"
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #ddd',
                              cursor: 'pointer'
                            }}
                            onClick={() => setPreviewModalOpen(true)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
                              <CheckCircleFilled />
                              <span>تم إرفاق صورة إشعار التحويل بنجاح</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                              يمكنك معاينة الصورة أو استبدالها بصورة أخرى
                            </div>
                          </div>
                          <Space>
                            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewModalOpen(true)}>
                              معاينة
                            </Button>
                            <Button size="small" onClick={() => document.getElementById('receipt-file-input')?.click()}>
                              تغيير
                            </Button>
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setTransferReceiptUrl('');
                                setReceiptError('');
                              }}
                            />
                          </Space>
                        </div>
                      )}

                      {/* Optional Sender Reference Input */}
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                          رقم الهاتف المحول منه أو رقم العملية المرجعي (اختياري لتسريع التحقق):
                        </label>
                        <Input
                          placeholder="مثال: 010xxxxxxxx أو رقم الحساب"
                          value={transferReference}
                          onChange={(e) => setTransferReference(e.target.value)}
                          maxLength={50}
                        />
                      </div>

                      {receiptError && (
                        <Alert
                          message={receiptError}
                          type="error"
                          showIcon
                          style={{ marginTop: 10, borderRadius: 6 }}
                        />
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </Col>

          {/* Order Summary Column */}
          <Col xs={24} lg={9}>
            <Card
              title={<span style={{ fontWeight: 800 }}>ملخص الطلب ({cart.items_count} قطعة)</span>}
              style={{ borderRadius: 12, position: 'sticky', top: 90, borderColor: '#E8E4DB' }}
            >
              {/* Items List preview */}
              <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                {cart.items.map((item) => (
                  <div key={item.item_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <div style={{ flex: 1, paddingLeft: 8 }}>
                      <Text strong ellipsis>{item.product_name}</Text>
                      <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                        الكمية: {item.quantity} × {parseFloat(item.unit_price).toLocaleString()} ج.م
                      </Text>
                    </div>
                    <Text strong style={{ color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
                      {(item.quantity * parseFloat(item.unit_price)).toLocaleString()} ج.م
                    </Text>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Pricing breakdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <Text type="secondary">إجمالي المنتجات:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{subtotal.toLocaleString()} ج.م</Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <Text type="secondary">تكلفة الشحن ({selectedGov}):</Text>
                <Text strong style={{ color: isFreeShipping ? '#2D7A3A' : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
                  {isFreeShipping ? 'مجاناً 🚚' : `${finalShippingCost} ج.م`}
                </Text>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: 16 }}>الإجمالي النهائي:</Text>
                <Text strong style={{ fontSize: 24, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
                  {totalAmount.toLocaleString()} <span style={{ fontSize: 14 }}>ج.م</span>
                </Text>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={submitting}
                icon={<LockOutlined />}
                style={{
                  height: 52,
                  backgroundColor: '#C8A45C',
                  color: '#0A0A0A',
                  borderRadius: 8,
                  fontSize: 17,
                  fontWeight: 800,
                  border: 'none'
                }}
              >
                تأكيد وإتمام الطلب الآن
              </Button>

              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#6B6B6B' }}>
                <SafetyCertificateOutlined style={{ color: '#C8A45C', marginLeft: 4 }} />
                معاملتك آمنة ومشفرة وفق أعلى معايير الحماية
              </div>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* Receipt Image Preview Modal */}
      <Modal
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        footer={null}
        title="معاينة إشعار التحويل المرفق"
        centered
        destroyOnHidden
      >
        <div style={{ textAlign: 'center', padding: 8 }}>
          <img
            src={transferReceiptUrl}
            alt="إشعار التحويل"
            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
}
