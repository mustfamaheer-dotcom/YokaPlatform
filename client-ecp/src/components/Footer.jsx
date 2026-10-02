import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Row, Col, Space } from 'antd';
import {
  PhoneOutlined,
  WhatsAppOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  InstagramOutlined,
  FacebookFilled
} from '@ant-design/icons';
import {
  ShieldCheck,
  CreditCard,
  Flame,
  Banknote,
  Zap,
  Smartphone
} from 'lucide-react';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Text, Title, Paragraph } = Typography;

export default function Footer({ settings }) {
  const phone = settings?.contact_phone || '01000000000';
  const whatsapp = settings?.contact_whatsapp || '01000000000';
  const email = settings?.contact_email || 'info@yokastore.com';
  const description =
    settings?.footer_description ||
    'يوكا ستور — وجهتك الأولى للموضة العصرية والأناقة الفاخرة. نقدم لك تشكيلات راقية تجمع بين الجودة الفائقة والتصميم الاستثنائي مع شحن سريع لكافة المحافظات.';

  const facebookUrl = settings?.footer_facebook_url || 'https://facebook.com';
  const instagramUrl = settings?.footer_instagram_url || 'https://instagram.com';
  const tiktokUrl = settings?.footer_tiktok_url || 'https://tiktok.com';

  return (
    <footer
      style={{
        background: '#070D1B',
        color: '#94A3B8',
        marginTop: 56,
        paddingTop: 48,
        borderTop: '1px solid rgba(200, 164, 92, 0.25)',
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px 40px' }}>
        <Row gutter={[{ xs: 24, sm: 32, md: 40 }, { xs: 32, sm: 32, md: 40 }]}>
          {/* Column 1: Brand & About */}
          <Col xs={24} md={10} lg={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <img
                  src={yokaLogo}
                  alt="Yoka Store"
                  style={{
                    height: 48,
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </Link>

              <Paragraph
                style={{
                  color: '#94A3B8',
                  fontSize: 13,
                  lineHeight: 1.7,
                  margin: 0
                }}
              >
                {description}
              </Paragraph>

              {/* Social Channels */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'rgba(37, 211, 102, 0.12)',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      color: '#25D366',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      transition: 'all 0.25s ease'
                    }}
                    className="social-icon-btn"
                  >
                    <WhatsAppOutlined />
                  </a>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'rgba(200, 164, 92, 0.12)',
                      border: '1px solid rgba(200, 164, 92, 0.3)',
                      color: '#C8A45C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.25s ease'
                    }}
                    className="social-icon-btn"
                  >
                    <InstagramOutlined style={{ fontSize: 18 }} />
                  </a>
                )}

                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#3B82F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.25s ease'
                    }}
                    className="social-icon-btn"
                  >
                    <FacebookFilled style={{ fontSize: 18 }} />
                  </a>
                )}
              </div>
            </div>
          </Col>

          {/* Column 2: Quick Links */}
          <Col xs={12} md={7} lg={7}>
            <Title level={5} style={{ color: '#FFFFFF', marginBottom: 16, fontSize: 15, fontWeight: 800 }}>
              روابط سريعة
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <Link to="/" style={{ color: '#94A3B8', transition: 'color 0.2s' }} className="footer-link">
                الرئيسية
              </Link>
              <Link to="/catalog" style={{ color: '#94A3B8', transition: 'color 0.2s' }} className="footer-link">
                جميع المنتجات
              </Link>
              <Link to="/catalog?sort=popular" style={{ color: '#94A3B8', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: 5 }} className="footer-link">
                <span>الأكثر مبيعاً</span>
                <Flame size={13} color="#C8A45C" />
              </Link>
              <Link to="/contact" style={{ color: '#94A3B8', transition: 'color 0.2s' }} className="footer-link">
                تواصل معنا
              </Link>
            </div>
          </Col>

          {/* Column 3: Contact & Support */}
          <Col xs={12} md={7} lg={7}>
            <Title level={5} style={{ color: '#FFFFFF', marginBottom: 16, fontSize: 15, fontWeight: 800 }}>
              خدمة العملاء
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}
                  className="footer-link"
                >
                  <PhoneOutlined style={{ color: '#C8A45C', fontSize: 15 }} />
                  <span style={{ direction: 'ltr' }}>{phone}</span>
                </a>
              )}

              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}
                  className="footer-link"
                >
                  <WhatsAppOutlined style={{ color: '#25D366', fontSize: 15 }} />
                  <span>دعم واتساب 24/7</span>
                </a>
              )}

              {email && (
                <a
                  href={`mailto:${email}`}
                  style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 8 }}
                  className="footer-link"
                >
                  <MailOutlined style={{ color: '#C8A45C', fontSize: 15 }} />
                  <span>{email}</span>
                </a>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', marginTop: 4 }}>
                <ShieldCheck size={16} color="#C8A45C" />
                <span>فحص الشحنة قبل الاستلام</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Bottom Sub-Footer Bar: Payment Methods & Copyright */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: '#040812',
          padding: '20px 20px',
          fontSize: 12.5
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14
          }}
        >
          {/* Copyright */}
          <div style={{ color: '#64748B' }}>
            <span>© 2026 </span>
            <strong style={{ color: '#C8A45C' }}>Yoka Store Platform</strong>
            <span> — جميع الحقوق محفوظة لمتجر يوكا للأزياء والموضة.</span>
          </div>

          {/* Payment Badges Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#CBD5E1',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Banknote size={13} color="#C8A45C" />
              <span>الدفع عند الاستلام</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#CBD5E1',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <CreditCard size={13} color="#C8A45C" />
              <span>فيزا / ماستركارد</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#CBD5E1',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Zap size={13} color="#C8A45C" />
              <span>إنستاباي InstaPay</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#CBD5E1',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Smartphone size={13} color="#C8A45C" />
              <span>فودافون كاش</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
