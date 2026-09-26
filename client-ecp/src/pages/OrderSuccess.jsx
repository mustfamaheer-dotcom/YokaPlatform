import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Result, Button, Card, Descriptions, Table, Typography, Space, Spin } from 'antd';
import { CheckCircleFilled, ShoppingOutlined, PrinterOutlined, HomeOutlined, MessageOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/ecp/checkout/order/${orderNumber}`);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#8c8c8c' }}>جارٍ جلب تفاصيل الفاتورة والطلب...</div>
      </div>
    );
  }

  const columns = [
    {
      title: 'الصنف',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text, r) => (
        <div>
          <Text strong>{text}</Text>
          {r.variant_desc && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{r.variant_desc}</Text>}
        </div>
      )
    },
    {
      title: 'الكمية',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 80
    },
    {
      title: 'سعر الوحدة',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 110,
      render: (val) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{parseFloat(val).toLocaleString()} ج.م</span>
    },
    {
      title: 'الإجمالي',
      dataIndex: 'line_total',
      key: 'line_total',
      width: 120,
      render: (val) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{parseFloat(val).toLocaleString()} ج.م</span>
    }
  ];

  const waText = encodeURIComponent(`مرحباً يوكا ستور، أود الاستفسار عن طلبي رقم #${orderNumber}`);

  return (
    <div className="fade-in" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      <Result
        status="success"
        icon={<CheckCircleFilled style={{ color: '#2D7A3A' }} />}
        title={<span style={{ fontWeight: 800, fontSize: 'clamp(22px, 4vw, 28px)', color: '#1A1A1A' }}>تم استلام طلبك بنجاح!</span>}
        subTitle={
          <span style={{ fontSize: 15, color: '#4A4A4A' }}>
            رقم الطلب الخاص بك: <strong style={{ color: '#C8A45C', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>#{orderNumber}</strong> — سنتواصل معك هاتفياً لتأكيد الشحن والتسليم.
          </span>
        }
        extra={
          <Space wrap size="middle" style={{ justifyContent: 'center' }}>
            <Link to="/" key="home">
              <Button type="primary" size="large" icon={<HomeOutlined />} style={{ backgroundColor: '#C8A45C', color: '#0A0A0A', borderRadius: 8, fontWeight: 700, border: 'none', height: 44 }}>
                العودة للرئيسية
              </Button>
            </Link>
            <Link to="/catalog" key="catalog">
              <Button size="large" icon={<ShoppingOutlined />} style={{ borderRadius: 8, fontWeight: 600, height: 44 }}>
                متابعة التسوق
              </Button>
            </Link>
            <a href={`https://wa.me/201000000000?text=${waText}`} target="_blank" rel="noopener noreferrer" key="whatsapp">
              <Button size="large" icon={<MessageOutlined />} style={{ backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: 8, fontWeight: 700, border: 'none', height: 44 }}>
                واتساب
              </Button>
            </a>
            <Button key="print" type="text" icon={<PrinterOutlined />} onClick={() => window.print()} style={{ borderRadius: 8, height: 44 }}>
              طباعة الفاتورة
            </Button>
          </Space>
        }
      />

      {order && (
        <Card style={{ borderRadius: 12, marginTop: 24, border: '1px solid #E8E4DB' }}>
          <Descriptions title={<span style={{ fontWeight: 700 }}>بيانات الشحن والفاتورة</span>} bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="اسم العميل">
              {order.shipping_address?.recipient_name || 'عميل المتجر'}
            </Descriptions.Item>
            <Descriptions.Item label="رقم الهاتف">
              {order.shipping_address?.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="عنوان التوصيل" span={{ xs: 1, sm: 2 }}>
              {order.shipping_address?.governorate} — {order.shipping_address?.city} — {order.shipping_address?.street_address} {order.shipping_address?.building_apartment}
            </Descriptions.Item>
            <Descriptions.Item label="طريقة الدفع">
              <span style={{ fontWeight: 700 }}>
                {order.payment_method === 'cod' ? 'الدفع عند الاستلام' : (order.payment_method === 'card' ? 'بطاقة بنكية' : 'محفظة إلكترونية')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="حالة الدفع">
              <span style={{ color: order.payment_status === 'paid' ? '#2D7A3A' : '#C8A45C', fontWeight: 700 }}>
                {order.payment_status === 'paid' ? 'تم السداد' : 'في انتظار التحصيل عند الاستلام'}
              </span>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24 }}>
            <Title level={5}>المنتجات المطلوبة:</Title>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table
                dataSource={order.items || []}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 420 }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20, textAlign: 'start', padding: 16, background: '#FAFAF8', borderRadius: 8, border: '1px solid #E8E4DB' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <Text type="secondary">إجمالي المنتجات:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{parseFloat(order.subtotal).toLocaleString()} ج.م</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <Text type="secondary">تكلفة الشحن:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{parseFloat(order.shipping_cost) === 0 ? 'مجاناً' : `${parseFloat(order.shipping_cost).toLocaleString()} ج.م`}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, borderTop: '1px solid #E8E4DB', paddingTop: 12, marginTop: 4 }}>
                <Text strong>الإجمالي الكلي:</Text>
                <Text strong style={{ color: '#C8A45C', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{parseFloat(order.total_amount).toLocaleString()} ج.م</Text>
              </div>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
}
