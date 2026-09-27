import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Button, Breadcrumb, Space, App as AntdApp, Tag } from 'antd';
import {
  PhoneOutlined,
  WhatsAppOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  AppstoreOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import api from '../api';

const { Title, Text, Paragraph } = Typography;

export default function Contact() {
  const { message } = AntdApp.useApp();
  const [storeSettings, setStoreSettings] = useState({
    contact_phone: '01000000000',
    contact_whatsapp: '01000000000'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/ecp/catalog/store-settings');
      if (res.data?.success && res.data?.data) {
        setStoreSettings({
          contact_phone: res.data.data.contact_phone || '01000000000',
          contact_whatsapp: res.data.data.contact_whatsapp || '01000000000'
        });
      }
    } catch (err) {
      console.error('Failed to load store settings in Contact:', err);
    } finally {
      setLoading(false);
    }
  };

  const contactPhone = storeSettings.contact_phone || '01000000000';
  const contactWhatsapp = storeSettings.contact_whatsapp || '01000000000';

  // Format WhatsApp Link
  const formatWhatsappLink = (number) => {
    let clean = (number || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('01') && clean.length === 11) {
      clean = '2' + clean; // Egyptian format: 010... -> 2010...
    }
    const defaultMsg = encodeURIComponent('مرحباً يوكا ستور، أود الاستفسار بخصوص منتجاتكم وطلبي.');
    return `https://wa.me/${clean}?text=${defaultMsg}`;
  };

  // Format Phone Call Link
  const formatPhoneLink = (number) => {
    const clean = (number || '').replace(/[^0-9+]/g, '');
    return `tel:${clean}`;
  };

  // Nice readable display format (e.g. 010 1234 5678)
  const formatDisplayNumber = (number) => {
    if (!number) return '';
    const clean = number.trim();
    if (clean.length === 11 && clean.startsWith('01')) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
    }
    return clean;
  };

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      message.success(`تم نسخ ${label} بنجاح: ${text}`);
    } else {
      message.info(`${label}: ${text}`);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '0 8px 60px' }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 20, fontSize: 13 }}
        items={[
          {
            title: (
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <HomeOutlined />
                <span>الرئيسية</span>
              </Link>
            )
          },
          {
            title: 'تواصل معنا'
          }
        ]}
      />

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 16,
          padding: 'clamp(28px, 4vw, 40px) clamp(18px, 4vw, 36px)',
          color: '#FFFFFF',
          marginBottom: 28,
          border: '1px solid rgba(200, 164, 92, 0.35)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(200, 164, 92, 0.15)',
            padding: '5px 16px',
            borderRadius: 20,
            marginBottom: 12,
            fontSize: 12.5,
            color: '#E8D5A8',
            fontWeight: 700
          }}
        >
          <CustomerServiceOutlined style={{ color: '#C8A45C' }} />
          <span>خدمة العملاء والدعم الفني المباشر</span>
        </div>

        <Title level={1} style={{ color: '#FFFFFF', fontWeight: 900, margin: '0 0 10px', fontSize: 'clamp(22px, 4vw, 32px)' }}>
          يسعدنا تواصلك مع <span style={{ color: '#C8A45C' }}>يوكا ستور</span>
        </Title>

        <Paragraph style={{ color: '#CBD5E1', fontSize: 'clamp(13px, 2vw, 15px)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
          فريق خدمة العملاء متاح للرد على جميع استفساراتكم حول المقاسات، تفاصيل الطلبات، والشحن السريع لجميع المحافظات.
        </Paragraph>
      </div>

      {/* Primary Contact Channels Cards (Call & WhatsApp) */}
      <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
        {/* Direct Call Card */}
        <Col xs={24} md={12}>
          <Card
            bordered
            style={{
              borderRadius: 16,
              borderColor: '#E2E8F0',
              boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.25s ease'
            }}
            styles={{
              body: {
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between'
              }
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(200, 164, 92, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhoneOutlined style={{ fontSize: 26, color: '#C8A45C' }} />
                </div>
                <Tag color="gold" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 700, fontSize: 12 }}>
                  مكالمة هاتفية مباشرة
                </Tag>
              </div>

              <Title level={3} style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                الاتصال الهاتفي المباشر
              </Title>

              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 18, lineHeight: 1.6 }}>
                تحدث هاتفياً مباشرة مع أحد ممثلي خدمة العملاء للاستفسار السريع أو تعديل وتأكيد عنوان الشحن لطلبك.
              </Text>

              {/* Number Box */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>
                    رقم الاتصال المباشر:
                  </Text>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#0F172A',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: 1,
                      direction: 'ltr',
                      display: 'inline-block'
                    }}
                  >
                    {formatDisplayNumber(contactPhone)}
                  </span>
                </div>

                <Button
                  icon={<CopyOutlined />}
                  size="middle"
                  onClick={() => copyToClipboard(contactPhone, 'رقم الهاتف')}
                  aria-label="نسخ رقم الهاتف"
                  style={{ borderRadius: 8, borderColor: '#CBD5E1' }}
                >
                  نسخ
                </Button>
              </div>
            </div>

            {/* Direct Action Button */}
            <div>
              <a href={formatPhoneLink(contactPhone)} style={{ textDecoration: 'none', display: 'block' }}>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<PhoneOutlined />}
                  style={{
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: '#0F172A',
                    borderColor: '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 16,
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                  }}
                >
                  اتصل بنا الآن
                </Button>
              </a>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#64748B' }}>
                <ClockCircleOutlined style={{ marginLeft: 4 }} />
                متاحون يومياً من 10:00 ص إلى 11:00 م
              </div>
            </div>
          </Card>
        </Col>

        {/* WhatsApp Chat Card */}
        <Col xs={24} md={12}>
          <Card
            bordered
            style={{
              borderRadius: 16,
              borderColor: '#E2E8F0',
              boxShadow: '0 4px 18px rgba(37, 211, 102, 0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.25s ease'
            }}
            styles={{
              body: {
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between'
              }
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(37, 211, 102, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <WhatsAppOutlined style={{ fontSize: 28, color: '#25D366' }} />
                </div>
                <Tag
                  color="success"
                  style={{
                    borderRadius: 12,
                    padding: '3px 10px',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Zap size={12} strokeWidth={2.6} />
                  <span>رد فوري ومباشر</span>
                </Tag>
              </div>

              <Title level={3} style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                محادثة فورية عبر واتساب
              </Title>

              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 18, lineHeight: 1.6 }}>
                تواصل معنا كتابياً أو أرسل صورة المنتج أو استفسر عن جدول المقاسات مع رد سريع وتأكيد فوري للطلب.
              </Text>

              {/* Number Box */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px dashed #86EFAC',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600 }}>
                    رقم الواتساب الرسمي:
                  </Text>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#166534',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: 1,
                      direction: 'ltr',
                      display: 'inline-block'
                    }}
                  >
                    {formatDisplayNumber(contactWhatsapp)}
                  </span>
                </div>

                <Button
                  icon={<CopyOutlined />}
                  size="middle"
                  onClick={() => copyToClipboard(contactWhatsapp, 'رقم الواتساب')}
                  aria-label="نسخ رقم الواتساب"
                  style={{ borderRadius: 8, borderColor: '#86EFAC', color: '#166534' }}
                >
                  نسخ
                </Button>
              </div>
            </div>

            {/* Direct WhatsApp Button */}
            <div>
              <a
                href={formatWhatsappLink(contactWhatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<WhatsAppOutlined style={{ fontSize: 20 }} />}
                  style={{
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: '#25D366',
                    borderColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: 16,
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                  }}
                >
                  محادثة واتساب الآن
                </Button>
              </a>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#166534', fontWeight: 600 }}>
                <CheckCircleOutlined style={{ marginLeft: 4 }} />
                يتم الرد خلال دقائق معدودة
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Helpful Support Info & Fast Navigation */}
      <Card
        bordered
        style={{
          borderRadius: 16,
          borderColor: '#E2E8F0',
          background: '#FAFAF8',
          marginBottom: 20
        }}
      >
        <Row gutter={[16, 20]} align="middle">
          <Col xs={24} md={16}>
            <Title level={4} style={{ margin: '0 0 8px', color: '#0F172A', fontWeight: 800 }}>
              هل ترغب في تصفح المزيد من الأزياء والمنتجات؟
            </Title>
            <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6, display: 'block' }}>
              تشكيلة متجددة من أرقى التصاميم والخامات الفاخرة متوفرة في كتالوج يوكا ستور مع توصيل لجميع المحافظات والدفع عند الاستلام.
            </Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'left' }}>
            <Space wrap size="middle">
              <Link to="/catalog">
                <Button
                  type="primary"
                  size="large"
                  icon={<AppstoreOutlined />}
                  style={{
                    backgroundColor: '#C8A45C',
                    borderColor: '#C8A45C',
                    color: '#0F172A',
                    fontWeight: 800,
                    borderRadius: 10,
                    height: 44
                  }}
                >
                  تصفح الكتالوج
                </Button>
              </Link>
              <Link to="/">
                <Button
                  size="large"
                  icon={<HomeOutlined />}
                  style={{
                    borderRadius: 10,
                    height: 44,
                    borderColor: '#CBD5E1',
                    fontWeight: 600
                  }}
                >
                  الرئيسية
                </Button>
              </Link>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
