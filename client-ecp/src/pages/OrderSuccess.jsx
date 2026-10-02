import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Result, Button, Card, Descriptions, Table, Typography, Space, Spin, App as AntdApp } from 'antd';
import {
  CheckCircleFilled,
  ShoppingOutlined,
  PrinterOutlined,
  HomeOutlined,
  MessageOutlined,
  CameraOutlined
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { trackPurchase } from '../services/tracker';

const { Title, Text } = Typography;

export default function OrderSuccess() {
  const { message } = AntdApp.useApp();
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingImage, setSavingImage] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
    api.get('/api/ecp/catalog/store-settings')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setStoreSettings(res.data.data);
        }
      })
      .catch(() => {});
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/ecp/checkout/order/${orderNumber}`);
      if (res.data.success) {
        setOrder(res.data.data);
        trackPurchase(orderNumber, res.data.data?.total_amount);
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
  const rawWhatsapp = storeSettings?.contact_whatsapp || '01000000000';
  let cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
  if (cleanWhatsapp.startsWith('01') && cleanWhatsapp.length === 11) {
    cleanWhatsapp = '2' + cleanWhatsapp;
  }
  const contactPhone = storeSettings?.contact_phone || '01000000000';

  const handleSaveAsImage = async () => {
    const invoiceEl = document.querySelector('.customer-invoice-print');
    if (!invoiceEl) {
      window.print();
      return;
    }
    setSavingImage(true);
    message.loading({ content: 'جاري إنشاء وحفظ صورة الفاتورة...', key: 'save-invoice-msg' });
    try {
      const canvas = await html2canvas(invoiceEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        ignoreElements: (el) => el.classList.contains('no-print')
      });
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `فاتورة-طلب-${orderNumber || 'yoka'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      message.success({ content: 'تم حفظ الفاتورة كصورة بنجاح في جهازك!', key: 'save-invoice-msg' });
    } catch (err) {
      console.error('Failed to capture invoice image:', err);
      message.info({ content: 'سيتم فتح نافذة الطباعة/الحفظ الآن', key: 'save-invoice-msg' });
      window.print();
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      <Result
        status="success"
        icon={<CheckCircleFilled style={{ color: '#2D7A3A' }} />}
        title={<span style={{ fontWeight: 800, fontSize: 'clamp(22px, 4vw, 28px)', color: '#0F172A' }}>تم استلام طلبك بنجاح!</span>}
        subTitle={
          <span style={{ fontSize: 15, color: '#475569' }}>
            رقم الطلب الخاص بك: <strong style={{ color: '#C8A45C', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>#{orderNumber}</strong> — سنتواصل معك هاتفياً لتأكيد الشحن والتسليم.
          </span>
        }
        extra={
          <Space wrap size="middle" style={{ justifyContent: 'center' }}>
            <Button
              key="save-image"
              icon={<CameraOutlined />}
              onClick={handleSaveAsImage}
              loading={savingImage}
              className="print-invoice-highlight-btn"
            >
              حفظ الفاتورة ك صورة
            </Button>
            <Link to="/" key="home">
              <Button type="primary" size="large" icon={<HomeOutlined />} style={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderRadius: 8, fontWeight: 700, border: 'none', height: 44 }}>
                العودة للرئيسية
              </Button>
            </Link>
            <Link to="/catalog" key="catalog">
              <Button size="large" icon={<ShoppingOutlined />} style={{ borderRadius: 8, fontWeight: 600, height: 44, borderColor: '#CBD5E1', color: '#0F172A' }}>
                متابعة التسوق
              </Button>
            </Link>
            <a href={`https://wa.me/${cleanWhatsapp || '201000000000'}?text=${waText}`} target="_blank" rel="noopener noreferrer" key="whatsapp">
              <Button size="large" icon={<MessageOutlined />} style={{ backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: 8, fontWeight: 700, border: 'none', height: 44 }}>
                واتساب
              </Button>
            </a>
          </Space>
        }
      />

      {/* Customer Notice to Save Invoice as Image */}
      <div className="invoice-action-notice no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#D97706',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.28)'
            }}
          >
            <CameraOutlined />
          </div>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#92400E', marginBottom: 2 }}>
              تنبيه هام: يرجى حفظ الفاتورة ك صورة كمرجع لطلبك
            </div>
            <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
              يرجى الاحتفاظ بنسخة من صورة الفاتورة على هاتفك لمطابقة الأصناف مع مندوب التوصيل وتسهيل خدمات الضمان والاستبدال.
            </div>
          </div>
        </div>
        <Button
          type="primary"
          icon={<CameraOutlined />}
          onClick={handleSaveAsImage}
          loading={savingImage}
          className="print-invoice-highlight-btn"
        >
          حفظ الفاتورة ك صورة
        </Button>
      </div>

      {order && (
        <Card className="customer-invoice-print" style={{ borderRadius: 12, marginTop: 16, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          {/* Branded Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 120, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>أرقى ملابس المحجبات والأزياء الراقية • متجر أونلاين</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>خدمة العملاء: {contactPhone} • الموقع: yokastore.com</div>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  فاتورة شراء إلكترونية
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  رقم الطلب: <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13.5 }}>#{orderNumber}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  تاريخ الطلب: {new Date(order.created_at || Date.now()).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>
          </div>

          <Descriptions 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>بيانات الشحن والفاتورة</span>
                <Space className="no-print">
                  <Button
                    size="small"
                    icon={<CameraOutlined />}
                    onClick={handleSaveAsImage}
                    loading={savingImage}
                    style={{ borderColor: '#C8A45C', color: '#0F172A', fontWeight: 700, borderRadius: 6 }}
                  >
                    حفظ الفاتورة ك صورة
                  </Button>
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => window.print()}
                    style={{ borderRadius: 6 }}
                  >
                    طباعة
                  </Button>
                </Space>
              </div>
            }
            bordered 
            size="small" 
            column={{ xs: 1, sm: 2 }}
          >
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
            <Title level={5} style={{ color: '#0F172A' }}>المنتجات المطلوبة:</Title>
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

          <div style={{ marginTop: 20, textAlign: 'start', padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <Text type="secondary">إجمالي المنتجات:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>{parseFloat(order.subtotal).toLocaleString()} ج.م</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <Text type="secondary">تكلفة الشحن:</Text>
                <Text strong style={{ fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>{parseFloat(order.shipping_cost) === 0 ? 'مجاناً' : `${parseFloat(order.shipping_cost).toLocaleString()} ج.م`}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 4 }}>
                <Text strong style={{ color: '#0F172A' }}>الإجمالي الكلي:</Text>
                <Text strong style={{ color: '#C8A45C', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{parseFloat(order.total_amount).toLocaleString()} ج.م</Text>
              </div>
            </Space>
          </div>

          {/* Footer Notice */}
          <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '10.5px', color: '#64748b' }}>
            <div>شكراً لتسوقكم من متجر YOKA STORE • الاستبدال والاسترجاع متاح خلال 14 يوماً وفقاً للشروط والأحكام.</div>
            <div style={{ marginTop: 4, color: '#94a3b8' }}>تم استخراج هذه الفاتورة إلكترونياً من متجر Yoka Store</div>
          </div>
        </Card>
      )}
    </div>
  );
}
