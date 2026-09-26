import React from 'react';
import { Typography, Row, Col } from 'antd';
import {
  SafetyCertificateOutlined,
  SyncOutlined,
  CustomerServiceOutlined,
  CreditCardOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

export default function Footer() {
  return (
    <footer style={{ background: '#0A0A0A', color: '#E8D5A8', marginTop: 48, paddingTop: 32, borderTop: '1px solid #1A1A1A' }}>
      {/* Trust Badges Bar */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px 32px', borderBottom: '1px solid rgba(200, 164, 92, 0.15)' }}>
        <Row gutter={[16, 20]} justify="center" style={{ textAlign: 'center' }}>
          <Col xs={12} sm={12} md={6}>
            <div style={{ padding: '12px 8px' }}>
              <SafetyCertificateOutlined style={{ fontSize: 28, color: '#C8A45C', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#FAFAF8', margin: '0 0 4px', fontSize: 14 }}>منتجات أصلية 100%</Title>
              <Text style={{ color: '#A0A0A0', fontSize: 12, display: 'block' }}>خامات ومواصفات قياسية</Text>
            </div>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <div style={{ padding: '12px 8px' }}>
              <SyncOutlined style={{ fontSize: 28, color: '#C8A45C', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#FAFAF8', margin: '0 0 4px', fontSize: 14 }}>استبدال واسترجاع</Title>
              <Text style={{ color: '#A0A0A0', fontSize: 12, display: 'block' }}>معاينة واسترجاع 14 يوماً</Text>
            </div>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <div style={{ padding: '12px 8px' }}>
              <CreditCardOutlined style={{ fontSize: 28, color: '#C8A45C', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#FAFAF8', margin: '0 0 4px', fontSize: 14 }}>خيارات دفع مرنة</Title>
              <Text style={{ color: '#A0A0A0', fontSize: 12, display: 'block' }}>عند الاستلام، فيزا أو إنستاباي</Text>
            </div>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <div style={{ padding: '12px 8px' }}>
              <CustomerServiceOutlined style={{ fontSize: 28, color: '#C8A45C', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#FAFAF8', margin: '0 0 4px', fontSize: 14 }}>دعم فني سريع</Title>
              <Text style={{ color: '#A0A0A0', fontSize: 12, display: 'block' }}>متابعة فورية للطلب والشحن</Text>
            </div>
          </Col>
        </Row>
      </div>

      {/* Footer Info & Copyright */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 20px', textAlign: 'center', fontSize: 13, color: '#6B6B6B' }}>
        <p style={{ marginBottom: 8 }}>
          <strong style={{ color: '#C8A45C' }}>Yoka Store Platform</strong> — منصة التجارة الإلكترونية وإدارة الفروع المتكاملة.
        </p>
        <p>© 2026 Yoka Store. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
