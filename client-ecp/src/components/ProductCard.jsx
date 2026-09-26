import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Tag, Typography } from 'antd';
import { ShoppingCartOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const isAvailable = (product.total_stock || 0) > 0;
  
  // Safe price calculation that never produces NaN
  const rawSelling = parseFloat(product.selling_price);
  const originalPrice = !isNaN(rawSelling) && rawSelling > 0 ? rawSelling : 0;
  const rawSale = parseFloat(product.sale_price);
  const hasDiscount = !isNaN(rawSale) && rawSale > 0 && rawSale < originalPrice;
  const price = hasDiscount ? rawSale : originalPrice;

  const hasVariants = (product.sizes && product.sizes.length > 1) || (product.colors && product.colors.length > 1);

  const handleActionClick = (e) => {
    if (hasVariants) {
      navigate(`/product/${product.slug || product.id}`);
    } else {
      const triggerPos = e?.clientX ? { x: e.clientX, y: e.clientY } : null;
      onAddToCart({ ...product, _triggerPos: triggerPos });
    }
  };

  return (
    <div className="product-card">
      {/* Product Image Area */}
      <Link to={`/product/${product.slug || product.id}`} style={{ position: 'relative', display: 'block', overflow: 'hidden', background: '#FAFAF8', paddingTop: '100%' }}>
        <img
          src={product.featured_image || '/yokaStoreTransparent.png'}
          alt={product.product_name || 'صورة المنتج'}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: product.featured_image ? 'cover' : 'contain',
            padding: product.featured_image ? 0 : 24,
            transition: 'transform 0.3s ease'
          }}
          onError={(e) => {
            e.target.src = '/yokaStoreTransparent.png';
            e.target.style.objectFit = 'contain';
            e.target.style.padding = '24px';
          }}
        />

        {/* Discount Badge */}
        {hasDiscount && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#C62828', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
            خصم
          </div>
        )}

        {/* Stock Status Badge */}
        <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
          {isAvailable ? (
            <Tag color="#2D7A3A" icon={<CheckCircleOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 11, fontWeight: 700, border: 'none' }}>
              متوفر
            </Tag>
          ) : (
            <Tag color="#C62828" icon={<CloseCircleOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 11, fontWeight: 700, border: 'none' }}>
              نفد المخزون
            </Tag>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          {product.brand && (
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {product.brand}
            </Text>
          )}

          <Link to={`/product/${product.slug || product.id}`}>
            <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 14, fontWeight: 700, minHeight: 40, lineHeight: 1.4, color: '#1A1A1A' }}>
              {product.product_name}
            </Title>
          </Link>

          {/* Variants chips */}
          <div style={{ margin: '8px 0', display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 22 }}>
            {product.colors && product.colors.slice(0, 3).map((c) => (
              <span key={c} style={{ fontSize: 10, background: '#F0EDE6', padding: '1px 6px', borderRadius: 4, color: '#4A4A4A' }}>
                {c}
              </span>
            ))}
            {product.sizes && product.sizes.slice(0, 3).map((s) => (
              <span key={s} style={{ fontSize: 10, background: '#FAFAF8', border: '1px solid #E8E4DB', padding: '1px 6px', borderRadius: 4, color: '#1A1A1A', fontWeight: 700 }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Add to Cart button */}
        <div style={{ paddingTop: 10, borderTop: '1px solid #F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
              {price.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 600 }}>ج.م</span>
            </span>
            {hasDiscount && (
              <span style={{ fontSize: 12, textDecoration: 'line-through', color: '#A0A0A0', marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>
                {originalPrice.toLocaleString()} ج.م
              </span>
            )}
          </div>

          <Button
            type="primary"
            disabled={!isAvailable}
            icon={<ShoppingCartOutlined style={{ fontSize: 16 }} />}
            onClick={handleActionClick}
            aria-label={hasVariants ? "اختر المقاس واللون" : "أضف إلى السلة"}
            style={{ 
              backgroundColor: isAvailable ? '#C8A45C' : '#E8E8E8',
              color: isAvailable ? '#0A0A0A' : '#A0A0A0',
              border: 'none',
              borderRadius: hasVariants ? 22 : '50%',
              padding: hasVariants ? '0 12px' : 0,
              width: hasVariants ? 'auto' : 44,
              height: 44,
              minWidth: 44,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            {hasVariants ? 'اختر المقاس' : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
