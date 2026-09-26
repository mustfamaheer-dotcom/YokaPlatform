import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Button, Progress, Space, Typography, Popconfirm, Empty, message, Grid } from 'antd';
import {
  ShoppingCartOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ArrowLeftOutlined,
  CarOutlined
} from '@ant-design/icons';
import api from '../api';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export default function CartDrawer({ visible, onClose, cart, onRefreshCart }) {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = screens.xs || (screens.sm === false && screens.md === false);

  const subtotal = cart?.subtotal || 0;
  const freeShippingThreshold = 1500;
  const diff = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  const handleUpdateQty = async (itemId, newQty) => {
    try {
      const res = await api.put(`/api/ecp/cart/items/${itemId}`, { quantity: newQty });
      if (res.data.success) {
        onRefreshCart();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تحديث الكمية');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await api.delete(`/api/ecp/cart/items/${itemId}`);
      if (res.data.success) {
        message.success('تم حذف الصنف من السلة');
        onRefreshCart();
      }
    } catch (err) {
      message.error('فشل حذف الصنف');
    }
  };

  const handleClearCart = async () => {
    try {
      await api.delete('/api/ecp/cart');
      message.success('تم إفراغ السلة');
      onRefreshCart();
    } catch (err) {
      message.error('فشل إفراغ السلة');
    }
  };

  const handleProceedToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const renderCheckoutSummary = () => (
    <div style={{ padding: '12px 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: '#FFFFFF' }}>
      {/* Free Shipping Progress */}
      <div style={{ marginBottom: 12, background: '#FAFAF8', border: '1px solid #E8E4DB', padding: '8px 12px', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>
            <CarOutlined style={{ color: '#C8A45C', marginLeft: 4 }} />
            {diff > 0 ? `أضف ${diff.toLocaleString()} ج.م للحصول على شحن مجاني!` : 'تهانينا! حصلت على شحن مجاني 🚚'}
          </span>
          <span style={{ fontWeight: 700, color: '#C8A45C' }}>{progressPct}%</span>
        </div>
        <Progress percent={progressPct} showInfo={false} strokeColor="#C8A45C" size="small" />
      </div>

      {/* Subtotal & Checkout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 }}>
        <Text strong style={{ color: '#6B6B6B' }}>إجمالي المنتجات:</Text>
        <Text strong style={{ fontSize: 19, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
          {subtotal.toLocaleString()} <span style={{ fontSize: 13 }}>ج.م</span>
        </Text>
      </div>

      <Button
        type="primary"
        size="large"
        block
        icon={<ArrowLeftOutlined />}
        onClick={handleProceedToCheckout}
        style={{
          height: 48,
          backgroundColor: '#C8A45C',
          color: '#0A0A0A',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 800,
          border: 'none',
          boxShadow: '0 2px 10px rgba(200, 164, 92, 0.35)'
        }}
      >
        متابعة الدفع وإنهاء الطلب
      </Button>
    </div>
  );

  return (
    <Drawer
      zIndex={1300}
      title={
        <div>
          {isMobile && (
            <div style={{ width: 36, height: 4, background: '#D4B76A', borderRadius: 2, margin: '-4px auto 10px', opacity: 0.7 }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <ShoppingCartOutlined style={{ fontSize: 20, color: '#C8A45C' }} />
              <span style={{ fontWeight: 700 }}>سلة التسوق ({cart?.items_count || 0})</span>
            </Space>
            {cart?.items?.length > 0 && (
              <Popconfirm title="تفريغ السلة؟" okText="نعم" cancelText="لا" onConfirm={handleClearCart}>
                <Button type="text" danger size="small">
                  إفراغ السلة
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      }
      placement={isMobile ? 'bottom' : 'left'}
      width={isMobile ? '100%' : 420}
      height={isMobile ? '88vh' : undefined}
      onClose={onClose}
      open={visible}
      styles={{
        body: {
          padding: isMobile ? '12px 14px' : '16px 20px',
          overflowY: 'auto'
        },
        footer: {
          padding: 0,
          background: '#FFFFFF',
          borderTop: '1px solid #E8E4DB'
        }
      }}
      footer={cart?.items?.length > 0 ? renderCheckoutSummary() : null}
    >
      {/* Items list */}
      {cart?.items?.length > 0 ? (
        <div>
          {cart.items.map((item) => (
            <div
              key={item.item_id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #F0EDE6',
                alignItems: 'center'
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#FAFAF8',
                  border: '1px solid #E8E4DB',
                  flexShrink: 0
                }}
              >
                <img
                  src={item.featured_image || '/yokaStoreTransparent.png'}
                  alt={item.product_name || 'صورة المنتج'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: item.featured_image ? 'cover' : 'contain',
                    padding: item.featured_image ? 0 : 8
                  }}
                />
              </div>

              {/* Item Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong ellipsis style={{ display: 'block', fontSize: 14, color: '#1A1A1A' }}>
                  {item.product_name}
                </Text>
                {(item.color || item.size) && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    {[item.color, item.size].filter(Boolean).join(' / ')}
                  </Text>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
                  {parseFloat(item.unit_price).toLocaleString()} ج.م
                </div>
              </div>

              {/* Quantity Stepper & Delete */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <Button
                  type="text"
                  danger
                  size="middle"
                  aria-label="حذف العنصر"
                  icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                  onClick={() => handleDeleteItem(item.item_id)}
                  style={{ minWidth: 38, minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                />

                <Space size={4} style={{ background: '#F0EDE6', borderRadius: 8, padding: '3px 6px' }}>
                  <Button
                    size="middle"
                    type="text"
                    shape="circle"
                    aria-label="تقليل الكمية"
                    icon={<MinusOutlined style={{ fontSize: 11 }} />}
                    onClick={() => handleUpdateQty(item.item_id, item.quantity - 1)}
                    style={{ minWidth: 36, minHeight: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, padding: '0 6px', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                  <Button
                    size="middle"
                    type="text"
                    shape="circle"
                    aria-label="زيادة الكمية"
                    icon={<PlusOutlined style={{ fontSize: 11 }} />}
                    onClick={() => handleUpdateQty(item.item_id, item.quantity + 1)}
                    style={{ minWidth: 36, minHeight: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Space>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#A0A0A0', fontSize: 14 }}>سلة التسوق فارغة حالياً</span>}
          >
            <Button
              type="primary"
              onClick={() => {
                onClose();
                navigate('/catalog');
              }}
              style={{ backgroundColor: '#C8A45C', color: '#0A0A0A', borderRadius: 6, border: 'none', fontWeight: 600 }}
            >
              تسوق الآن
            </Button>
          </Empty>
        </div>
      )}
    </Drawer>
  );
}
