import React from 'react';
import { Row, Col, Typography } from 'antd';
import { Truck, RotateCcw, Award, Headphones } from 'lucide-react';

const { Text, Title } = Typography;

export default function TrustBar({ settings }) {
  const isEnabled = settings?.trust_bar_enabled !== 'false';
  if (!isEnabled) return null;

  const items = [
    {
      icon: <Truck size={22} color="#C8A45C" strokeWidth={2.2} />,
      title: settings?.trust_shipping_title || 'شحن سريع وموثوق',
      desc: settings?.trust_shipping_desc || 'توصيل لباب بيتك خلال 2-4 أيام عمل'
    },
    {
      icon: <RotateCcw size={22} color="#C8A45C" strokeWidth={2.2} />,
      title: settings?.trust_return_title || 'معاينة واسترجاع 14 يوم',
      desc: settings?.trust_return_desc || 'افحص شحنتك قبل الاستلام بكل اطمئنان'
    },
    {
      icon: <Award size={22} color="#C8A45C" strokeWidth={2.2} />,
      title: settings?.trust_quality_title || 'أصلي وخامات ممتازة 100%',
      desc: settings?.trust_quality_desc || 'انتقاء دقيق لأجود الخامات والموديلات'
    },
    {
      icon: <Headphones size={22} color="#C8A45C" strokeWidth={2.2} />,
      title: settings?.trust_support_title || 'خدمة عملاء وواتساب 24/7',
      desc: settings?.trust_support_desc || 'متابعة فورية خطوة بخطوة لطلبك'
    }
  ];

  return (
    <section
      aria-label="مزايا متجر يوكا ستور"
      style={{
        margin: '28px 0 36px',
        padding: '0 2px'
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '20px 18px',
          boxShadow: '0 4px 18px rgba(15, 23, 42, 0.03)'
        }}
      >
        <Row gutter={[{ xs: 12, sm: 16, md: 20 }, { xs: 16, sm: 16, md: 0 }]} align="middle">
          {items.map((item, idx) => (
            <Col xs={12} md={6} key={idx}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '6px 8px',
                  borderRadius: 10,
                  transition: 'transform 0.25s ease'
                }}
                className="trust-bar-item"
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: 12,
                    background: 'rgba(200, 164, 92, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(200, 164, 92, 0.25)',
                    flexShrink: 0
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <Title
                    level={5}
                    style={{
                      margin: '0 0 2px',
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.title}
                  </Title>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11.5,
                      color: '#64748B',
                      display: 'block',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.desc}
                  </Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}
