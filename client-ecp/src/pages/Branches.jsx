import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Button, Breadcrumb, Space, Tag, Spin, Empty, App as AntdApp } from 'antd';
import {
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  HomeOutlined,
  WhatsAppOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ExternalLink, PhoneCall, Sparkles } from 'lucide-react';
import api from '../api';
import SEO from '../components/SEO';

const { Title, Text, Paragraph } = Typography;

export default function Branches() {
  const { message } = AntdApp.useApp();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('ALL');

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/ecp/catalog/branches');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      message.error('تعذر تحميل فروع المتجر');
    } finally {
      setLoading(false);
    }
  };

  // Filter out cities
  const cities = ['ALL', ...new Set(branches.map((b) => b.city).filter(Boolean))];

  const filteredBranches = selectedCity === 'ALL'
    ? branches
    : branches.filter((b) => b.city === selectedCity);

  return (
    <div className="fade-in" style={{ padding: '0 8px 60px' }}>
      <SEO
        title="فروعنا ومعارضنا | مواقع فروع يوكا ستور على خرائط جوجل"
        description="تعرف على عناوين ومواقع فروع ومعارض يوكا ستور في القاهرة والمحافظات ومواعيد العمل وأرقام الهواتف ورابط الموقع المباشر على Google Maps."
        keywords="فروع يوكا ستور, عناوين يوكا, لوكيشن يوكا ستور, فروع Yoka Store, اماكن يوكا"
      />

      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 20, fontSize: 13 }}
        items={[
          {
            title: (
              <Link to="/" style={{ color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <HomeOutlined />
                <span>الرئيسية</span>
              </Link>
            )
          },
          {
            title: <span style={{ color: '#C8A45C', fontWeight: 700 }}>فروعنا ومعارضنا</span>
          }
        ]}
      />

      {/* Page Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #070D1B 0%, #0F172A 50%, #1E293B 100%)',
          borderRadius: 24,
          padding: '40px 24px',
          textAlign: 'center',
          color: '#FFFFFF',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(200, 164, 92, 0.3)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 760, margin: '0 auto' }}>
          <Tag
            color="gold"
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 800,
              borderRadius: 20,
              marginBottom: 14,
              backgroundColor: 'rgba(200, 164, 92, 0.15)',
              borderColor: 'rgba(200, 164, 92, 0.4)',
              color: '#DFCA95'
            }}
          >
            <CompassOutlined style={{ marginLeft: 6 }} />
            شبكة فروع ومعارض يوكا ستور الرسمية
          </Tag>

          <Title level={1} style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 'clamp(24px, 4vw, 36px)', margin: '0 0 12px' }}>
            فروعنا ومعارضنا في خدمتك دائماً
          </Title>

          <Paragraph style={{ color: '#94A3B8', fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            تفضل بزيارتنا في أقرب فرع لك واستمتع بتجربة تسوق فريدة ومميزة مع أرقى تشكيلات الموضة والأزياء العصرية، أو استخدم خرائط جوجل للوصول مباشرة.
          </Paragraph>
        </div>
      </div>

      {/* City Filter Pills */}
      {cities.length > 2 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 20 }}>
          {cities.map((city) => {
            const isSelected = selectedCity === city;
            const label = city === 'ALL' ? 'جميع الفروع' : city;
            return (
              <Button
                key={city}
                type={isSelected ? 'primary' : 'default'}
                onClick={() => setSelectedCity(city)}
                style={{
                  borderRadius: 20,
                  height: 38,
                  padding: '0 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  borderColor: isSelected ? '#0F172A' : '#E2E8F0',
                  boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none'
                }}
              >
                {label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Branches List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 14 }}>جاري تحميل مواقع الفروع...</Text>
        </div>
      ) : filteredBranches.length === 0 ? (
        <Card style={{ borderRadius: 20, textAlign: 'center', padding: '40px 0' }}>
          <Empty description="لا توجد فروع مسجلة حالياً في هذه المدينة" />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {filteredBranches.map((branch) => {
            const hasMap = Boolean(branch.google_maps_url);
            const workingHours = branch.working_hours || 'يومياً من 10:00 صباحاً إلى 11:00 مساءً';

            return (
              <Col xs={24} sm={12} lg={8} key={branch.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 24,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                  bodyStyle={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  {/* Card Header: Icon + Branch Name + City */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(200, 164, 92, 0.12)',
                          color: '#C8A45C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0
                        }}
                      >
                        <ShopOutlined />
                      </div>
                      <div>
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0F172A', fontSize: 17 }}>
                          {branch.branch_name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 11.5 }}>
                          كود الفرع: {branch.branch_code}
                        </Text>
                      </div>
                    </div>

                    {branch.city && (
                      <Tag
                        style={{
                          backgroundColor: '#FFFBEB',
                          color: '#B45309',
                          borderColor: '#FDE68A',
                          borderRadius: 12,
                          fontWeight: 700,
                          padding: '3px 10px',
                          fontSize: 11.5,
                          margin: 0
                        }}
                      >
                        {branch.city}
                      </Tag>
                    )}
                  </div>

                  {/* Details Body */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, flex: 1 }}>
                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <EnvironmentOutlined style={{ color: '#EA4335', fontSize: 16, marginTop: 3, flexShrink: 0 }} />
                      <Text style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                        {branch.address || 'العنوان متاح عبر خدمة العملاء'}
                      </Text>
                    </div>

                    {/* Working Hours */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ClockCircleOutlined style={{ color: '#C8A45C', fontSize: 15, flexShrink: 0 }} />
                      <Text type="secondary" style={{ fontSize: 12.5, color: '#64748B' }}>
                        {workingHours}
                      </Text>
                    </div>

                    {/* Phone Number */}
                    {branch.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PhoneOutlined style={{ color: '#16A34A', fontSize: 15, flexShrink: 0 }} />
                        <a
                          href={`tel:${branch.phone}`}
                          style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', direction: 'ltr', textDecoration: 'none' }}
                        >
                          {branch.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions / CTA Buttons */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {hasMap ? (
                      <a
                        href={branch.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <Button
                          type="primary"
                          block
                          icon={<EnvironmentOutlined style={{ fontSize: 16 }} />}
                          className="btn-cobalt"
                          style={{
                            height: 44,
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 13.5
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            عرض الموقع على خرائط جوجل <ExternalLink size={14} />
                          </span>
                        </Button>
                      </a>
                    ) : (
                      <Button
                        disabled
                        block
                        icon={<EnvironmentOutlined />}
                        style={{ height: 44, borderRadius: 12, fontSize: 13 }}
                      >
                        سيتم إضافة رابط الخريطة قريباً
                      </Button>
                    )}

                    {branch.phone && (
                      <a
                        href={`https://wa.me/${branch.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <Button
                          block
                          icon={<WhatsAppOutlined style={{ color: '#25D366', fontSize: 16 }} />}
                          style={{
                            height: 40,
                            borderRadius: 12,
                            fontWeight: 700,
                            color: '#0F172A',
                            borderColor: '#E2E8F0',
                            fontSize: 12.5
                          }}
                        >
                          تواصل عبر واتساب الفرع
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
