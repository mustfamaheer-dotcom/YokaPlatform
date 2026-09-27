import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Alert, message, Divider, Row, Col, Space } from 'antd';
import {
  ShopOutlined,
  SaveOutlined,
  ReloadOutlined,
  LinkOutlined,
  EyeOutlined,
  FontSizeOutlined,
  CompassOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import { PhoneCall, MessageCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../api';

const { Title, Text } = Typography;

export default function StoreSettings({ currentUser }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live preview states
  const [heroTitle, setHeroTitle] = useState('أناقة وفخامة تليق بك مع يوكا ستور');
  const [buttonText, setButtonText] = useState('تسوق الكتالوج الآن');
  const [buttonLink, setButtonLink] = useState('/catalog');
  const [contactPhone, setContactPhone] = useState('01000000000');
  const [contactWhatsapp, setContactWhatsapp] = useState('01000000000');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/store-settings');
      if (res.data.success && res.data.data) {
        const map = {};
        res.data.data.forEach((item) => {
          map[item.key] = item.value;
        });

        const title = map['hero_title'] || 'أناقة وفخامة تليق بك مع يوكا ستور';
        const btnText = map['hero_button_text'] || 'تسوق الكتالوج الآن';
        const btnLink = map['hero_button_link'] || '/catalog';
        const phone = map['contact_phone'] || '01000000000';
        const whatsapp = map['contact_whatsapp'] || '01000000000';

        setHeroTitle(title);
        setButtonText(btnText);
        setButtonLink(btnLink);
        setContactPhone(phone);
        setContactWhatsapp(whatsapp);

        form.setFieldsValue({
          hero_title: title,
          hero_button_text: btnText,
          hero_button_link: btnLink,
          contact_phone: phone,
          contact_whatsapp: whatsapp
        });
      }
    } catch (err) {
      console.error('Error loading store settings:', err);
      message.error('تعذر جلب إعدادات المتجر');
    } finally {
      setLoading(false);
    }
  };

  const handleValuesChange = (changed) => {
    if (changed.hero_title !== undefined) setHeroTitle(changed.hero_title);
    if (changed.hero_button_text !== undefined) setButtonText(changed.hero_button_text);
    if (changed.hero_button_link !== undefined) setButtonLink(changed.hero_button_link);
    if (changed.contact_phone !== undefined) setContactPhone(changed.contact_phone);
    if (changed.contact_whatsapp !== undefined) setContactWhatsapp(changed.contact_whatsapp);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        hero_title: values.hero_title || 'أناقة وفخامة تليق بك مع يوكا ستور',
        hero_offer_enabled: 'false',
        hero_button_text: values.hero_button_text || 'تسوق الكتالوج الآن',
        hero_button_link: values.hero_button_link || '/catalog',
        contact_phone: values.contact_phone || '01000000000',
        contact_whatsapp: values.contact_whatsapp || '01000000000'
      };

      const res = await api.post('/api/swm/store-settings/bulk', { settings: payload });
      if (res.data.success) {
        message.success('تم حفظ إعدادات واجهة المتجر وأرقام التواصل بنجاح وتحديث المتجر فورياً!');
      } else {
        message.error(res.data.message || 'فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Error saving store settings:', err);
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '8px 0 24px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShopOutlined style={{ color: '#C8A45C' }} />
            التحكم في واجهة المتجر وقنوات التواصل (Storefront, Hero & Contact Settings)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            تعديل محتوى قسم الهيرو وأرقام التواصل (الهاتف والواتساب) لمتجر العملاء مع التحديث الفوري المباشر
          </Text>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={loading}>
            تحديث البيانات
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
        initialValues={{
          hero_title: 'أناقة وفخامة تليق بك مع يوكا ستور',
          hero_button_text: 'تسوق الكتالوج الآن',
          hero_button_link: '/catalog',
          contact_phone: '01000000000',
          contact_whatsapp: '01000000000'
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Settings Fields Column */}
          <Col xs={24} lg={13}>
            {/* Card 1: Hero Section Settings */}
            <Card
              bordered
              style={{
                borderRadius: 12,
                borderColor: '#E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                marginBottom: 20
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F172A' }}>
                  <FontSizeOutlined style={{ color: '#C8A45C', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>بيانات قسم الهيرو (Hero Section)</span>
                </div>
              }
            >
              {/* Hero Title */}
              <Form.Item
                name="hero_title"
                label={<span style={{ fontWeight: 600 }}>عنوان الهيرو الرئيسي (Headline)</span>}
                rules={[{ required: true, message: 'يرجى إدخال العنوان' }]}
              >
                <Input
                  size="large"
                  placeholder="مثال: أناقة وفخامة تليق بك مع يوكا ستور"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Divider style={{ margin: '16px 0' }} />

              {/* CTA Button Controls */}
              <span style={{ fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: 12 }}>
                زر التسوق الرئيسي (CTA Button)
              </span>
              <Row gutter={12}>
                <Col xs={24} sm={14}>
                  <Form.Item
                    name="hero_button_text"
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>نص الزر</span>}
                    rules={[{ required: true, message: 'يرجى إدخال نص الزر' }]}
                  >
                    <Input
                      prefix={<CompassOutlined style={{ color: '#C8A45C' }} />}
                      placeholder="مثال: تسوق الكتالوج الآن"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={10}>
                  <Form.Item
                    name="hero_button_link"
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>رابط الزر</span>}
                    rules={[{ required: true, message: 'يرجى إدخال رابط الزر' }]}
                  >
                    <Input
                      prefix={<LinkOutlined style={{ color: '#C8A45C' }} />}
                      placeholder="/catalog"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Card 2: Contact Numbers & Support Channels */}
            <Card
              bordered
              style={{
                borderRadius: 12,
                borderColor: '#E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                marginBottom: 20
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F172A' }}>
                  <CustomerServiceOutlined style={{ color: '#C8A45C', fontSize: 18 }} />
                  <span style={{ fontWeight: 700 }}>أرقام وقنوات التواصل لمتجر العملاء (Call & WhatsApp Channels)</span>
                </div>
              }
            >
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                يتم استخدام هذه الأرقام في صفحة "تواصل معنا" المخصصة، وفي زر التواصل في الشريط السفلي للجوال (Mobile Nav)، ولتأكيد الطلبات عبر واتساب.
              </Text>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="contact_phone"
                    label={<span style={{ fontWeight: 600 }}>رقم الاتصال الهاتفي المباشر (Direct Phone)</span>}
                    rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
                    extra="الرقم الذي سيتصل به العميل هاتفياً عند النقر على اتصال مباشر"
                  >
                    <Input
                      size="large"
                      prefix={<PhoneOutlined style={{ color: '#C8A45C' }} />}
                      placeholder="مثال: 01000000000"
                      style={{ borderRadius: 8, direction: 'ltr', textAlign: 'right' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    name="contact_whatsapp"
                    label={<span style={{ fontWeight: 600 }}>رقم محادثات الواتساب (WhatsApp Number)</span>}
                    rules={[{ required: true, message: 'يرجى إدخال رقم الواتساب' }]}
                    extra="الرقم المستخدم لفتح محادثة الدعم عبر تطبيق WhatsApp فورياً"
                  >
                    <Input
                      size="large"
                      prefix={<WhatsAppOutlined style={{ color: '#25D366' }} />}
                      placeholder="مثال: 01000000000 أو 201000000000"
                      style={{ borderRadius: 8, direction: 'ltr', textAlign: 'right' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Submit Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<SaveOutlined />}
                loading={saving}
                style={{
                  backgroundColor: '#0F172A',
                  borderColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  fontWeight: 700,
                  minWidth: 200,
                  height: 46
                }}
              >
                حفظ وتطبيق التغييرات فوراً
              </Button>
            </div>
          </Col>

          {/* Live Preview Column */}
          <Col xs={24} lg={11}>
            <Card
              bordered
              style={{
                borderRadius: 12,
                borderColor: '#E2E8F0',
                background: '#F8FAFC',
                height: '100%'
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A' }}>
                  <EyeOutlined style={{ color: '#C8A45C' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>معاينة حية للمتجر (Live Storefront Preview)</span>
                </div>
              }
            >
              {/* Simulated Hero Banner Preview */}
              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                معاينة قسم الهيرو الرئيسي:
              </div>
              <div
                style={{
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  borderRadius: 14,
                  padding: '24px 20px',
                  color: '#FFFFFF',
                  border: '1px solid rgba(200, 164, 92, 0.35)',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
                  textAlign: 'right'
                }}
              >
                {/* Hero Title in preview */}
                <h3 style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 18, margin: '0 0 16px', lineHeight: 1.4 }}>
                  {heroTitle ? (
                    heroTitle.includes('يوكا ستور') ? (
                      <>
                        {heroTitle.split('يوكا ستور')[0]}
                        <span style={{ color: '#C8A45C' }}>يوكا ستور</span>
                        {heroTitle.split('يوكا ستور')[1] || ''}
                      </>
                    ) : (
                      heroTitle
                    )
                  ) : (
                    'عنوان الهيرو...'
                  )}
                </h3>

                {/* Button in preview */}
                <div>
                  <Button
                    type="primary"
                    style={{
                      height: 38,
                      padding: '0 20px',
                      backgroundColor: '#C8A45C',
                      color: '#0F172A',
                      fontWeight: 800,
                      borderRadius: 19,
                      fontSize: 13,
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(200,164,92,0.35)'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{buttonText || 'نص الزر...'}</span>
                      <ArrowLeft size={14} strokeWidth={2.5} />
                    </span>
                  </Button>
                </div>
              </div>

              {/* Simulated Contact Buttons Preview */}
              <Divider style={{ margin: '22px 0 16px' }} />
              <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                معاينة قنوات التواصل وأزرار صفحة "تواصل معنا" وشريط الجوال:
              </div>

              <Row gutter={[12, 12]}>
                {/* Phone Call Card Preview */}
                <Col xs={12}>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        margin: '0 auto 8px',
                        borderRadius: '50%',
                        background: 'rgba(200, 164, 92, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <PhoneOutlined style={{ color: '#C8A45C', fontSize: 18 }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                      اتصال هاتفي
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', direction: 'ltr', fontWeight: 700, marginBottom: 8 }}>
                      {contactPhone || '01000000000'}
                    </div>
                    <div
                      style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: 6,
                        padding: '5px 0',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <PhoneCall size={12} strokeWidth={2.4} />
                      <span>اتصل بنا الآن</span>
                    </div>
                  </div>
                </Col>

                {/* WhatsApp Card Preview */}
                <Col xs={12}>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '14px 10px',
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        margin: '0 auto 8px',
                        borderRadius: '50%',
                        background: 'rgba(37, 211, 102, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <WhatsAppOutlined style={{ color: '#25D366', fontSize: 22 }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                      محادثة واتساب
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', direction: 'ltr', fontWeight: 700, marginBottom: 8 }}>
                      {contactWhatsapp || '01000000000'}
                    </div>
                    <div
                      style={{
                        background: '#25D366',
                        color: '#FFFFFF',
                        borderRadius: 6,
                        padding: '5px 0',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      <MessageCircle size={12} strokeWidth={2.4} />
                      <span>محادثة واتساب</span>
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 20 }}>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12 }}>
                        التغييرات تنعكس فورياً على متجر العملاء المباشر (Port 3000).
                      </span>
                      <a href="http://localhost:3000/contact" target="_blank" rel="noopener noreferrer">
                        <Button size="small" type="primary" style={{ backgroundColor: '#C8A45C', color: '#0F172A', border: 'none', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>صفحة التواصل</span>
                          <ExternalLink size={11} strokeWidth={2.4} />
                        </Button>
                      </a>
                    </div>
                  }
                  style={{ borderRadius: 8, borderColor: '#CBD5E1', background: '#FFFFFF' }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
