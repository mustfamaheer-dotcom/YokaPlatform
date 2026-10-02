import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Typography, Modal, Space, Tag, App } from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  EyeOutlined,
  CheckOutlined,
  FireOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import styles from './ProductCard.module.css';

const { Text, Title } = Typography;

// Helper to resolve simple color names to hex codes for swatch dots
const resolveColorHex = (name) => {
  if (!name) return '#CBD5E1';
  const n = String(name).toLowerCase();
  if (n.includes('أسود') || n.includes('black')) return '#1E293B';
  if (n.includes('أبيض') || n.includes('white')) return '#FFFFFF';
  if (n.includes('أحمر') || n.includes('red')) return '#DC2626';
  if (n.includes('أزرق') || n.includes('blue') || n.includes('كحلي') || n.includes('navy')) return '#1E3A8A';
  if (n.includes('أخضر') || n.includes('green') || n.includes('زيتي')) return '#15803D';
  if (n.includes('بيج') || n.includes('beige')) return '#D4B996';
  if (n.includes('بني') || n.includes('brown')) return '#78350F';
  if (n.includes('رمادي') || n.includes('رصاصي') || n.includes('grey') || n.includes('gray')) return '#64748B';
  if (n.includes('ذهبي') || n.includes('gold')) return '#C8A45C';
  if (n.includes('وردي') || n.includes('pink') || n.includes('روز')) return '#F43F5E';
  if (n.includes('أصفر') || n.includes('yellow')) return '#EAB308';
  return '#94A3B8';
};

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Card-level active color state
  const [activeCardColor, setActiveCardColor] = useState(null);

  // Quick View local selection state
  const [qvSelectedColor, setQvSelectedColor] = useState(null);
  const [qvSelectedSize, setQvSelectedSize] = useState(null);
  const [qvQty, setQvQty] = useState(1);

  const totalStock = parseInt(product.total_stock || 0, 10);
  const isAvailable = totalStock > 0;
  const isLowStock = isAvailable && totalStock <= 3;

  const rawSelling = parseFloat(product.selling_price);
  const originalPrice = !isNaN(rawSelling) && rawSelling > 0 ? rawSelling : 0;
  const rawSale = parseFloat(product.sale_price);
  const hasDiscount = !isNaN(rawSale) && rawSale > 0 && rawSale < originalPrice;
  const price = hasDiscount ? rawSale : originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  // Helper to find image for a specific color variant
  const getColorImage = (colorName) => {
    if (!colorName || !product.variants || !Array.isArray(product.variants)) return null;
    const match = product.variants.find((v) => v.color === colorName && v.image_url);
    return match?.image_url || null;
  };

  // Main card image based on active color selection or default featured image
  const cardMainImage =
    (activeCardColor && getColorImage(activeCardColor)) ||
    product.featured_image ||
    yokaLogo;

  // Quick View modal active preview image
  const qvActiveImage =
    (qvSelectedColor && getColorImage(qvSelectedColor)) ||
    (activeCardColor && getColorImage(activeCardColor)) ||
    product.featured_image ||
    yokaLogo;

  // Secondary image candidate for hover reveal
  const secondaryImage =
    (product.variants && product.variants.find((v) => v.image_url && v.image_url !== product.featured_image)?.image_url) ||
    null;

  // Wishlist local storage sync
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('yoka_wishlist') || '[]');
      setIsWishlisted(stored.includes(product.id));
    } catch (e) {}
  }, [product.id]);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem('yoka_wishlist') || '[]');
      let updated;
      if (stored.includes(product.id)) {
        updated = stored.filter((id) => id !== product.id);
        setIsWishlisted(false);
        message.info('تمت إزالة المنتج من قائمة الرغبات');
      } else {
        updated = [...stored, product.id];
        setIsWishlisted(true);
        message.success('تمت إضافة المنتج إلى قائمة الرغبات');
      }
      localStorage.setItem('yoka_wishlist', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleCardAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If item has variants, open Quick View modal so customer can pick size/color easily
    if ((product.variants && product.variants.length > 1) || (product.sizes && product.sizes.length > 1) || (product.colors && product.colors.length > 1)) {
      const initialColor = activeCardColor || (product.colors?.length > 0 ? product.colors[0] : null);
      setQvSelectedColor(initialColor);
      if (product.sizes?.length > 0) setQvSelectedSize(product.sizes[0]);
      setQvQty(1);
      setQuickViewOpen(true);
      return;
    }

    if (!isAvailable) {
      message.warning('عذراً، هذا المنتج غير متوفر حالياً');
      return;
    }

    const defaultVariant = product.variants?.[0]?.id || product.variant_id || null;
    onAddToCart?.({
      ...product,
      variant_id: defaultVariant
    });
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1800);
  };

  const handleOpenQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const initialColor = activeCardColor || (product.colors?.length > 0 ? product.colors[0] : null);
    setQvSelectedColor(initialColor);
    if (product.sizes?.length > 0) setQvSelectedSize(product.sizes[0]);
    setQvQty(1);
    setQuickViewOpen(true);
  };

  const handleQuickViewAdd = () => {
    if (!isAvailable) {
      message.warning('المنتج غير متوفر في المخزون');
      return;
    }

    let matchedVariant = null;
    if (product.variants?.length > 0) {
      matchedVariant = product.variants.find(
        (v) => (!qvSelectedColor || v.color === qvSelectedColor) && (!qvSelectedSize || v.size === qvSelectedSize)
      );
      if (!matchedVariant && qvSelectedColor) {
        matchedVariant = product.variants.find((v) => v.color === qvSelectedColor);
      }
      if (!matchedVariant) {
        matchedVariant = product.variants[0];
      }
    }

    onAddToCart?.({
      ...product,
      variant_id: matchedVariant?.id || product.variant_id || null,
      color: qvSelectedColor || matchedVariant?.color,
      size: qvSelectedSize || matchedVariant?.size,
      quantity: qvQty
    });

    setQuickViewOpen(false);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1800);
  };

  // Extract unique colors for swatches
  const colorList = product.colors || (product.variants ? [...new Set(product.variants.map((v) => v.color).filter(Boolean))] : []);

  return (
    <>
      <div className={styles['product-card']}>
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={toggleWishlist}
          className={`${styles['wishlist-btn']} ${isWishlisted ? styles['active'] : ''}`}
          aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          {isWishlisted ? <HeartFilled style={{ fontSize: 16 }} /> : <HeartOutlined style={{ fontSize: 16 }} />}
        </button>

        {/* Discount Badge */}
        {hasDiscount && (
          <span className={styles['discount-badge']}>
            <span>-{discountPercent}%</span>
          </span>
        )}

        {/* Low Stock Warning */}
        {isLowStock && (
          <span className={styles['low-stock-badge']}>
            <span className={styles['low-stock-dot']} />
            <span>متبقي {totalStock} فقط</span>
          </span>
        )}

        {/* Image wrapper */}
        <Link to={`/product/${product.slug || product.id}`} className={styles['product-img-wrapper']}>
          <img
            src={cardMainImage}
            alt={product.product_name || 'صورة المنتج'}
            loading="lazy"
            className={styles['product-img']}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = yokaLogo;
            }}
          />

          {/* Secondary Image for smooth hover preview */}
          {secondaryImage && !activeCardColor && (
            <img
              src={secondaryImage}
              alt={product.product_name || 'صورة إضافية'}
              loading="lazy"
              className={styles['product-img-secondary']}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}

          {/* Out of Stock Visual Overlay */}
          {!isAvailable && (
            <div className={styles['out-of-stock-overlay']}>
              <span className={styles['out-of-stock-pill']}>غير متوفر حالياً</span>
            </div>
          )}

          {/* Quick View Button (Desktop Hover) */}
          <div className={styles['quick-view-overlay']}>
            <button
              type="button"
              className={styles['quick-view-btn']}
              onClick={handleOpenQuickView}
              aria-label="معاينة سريعة"
            >
              <EyeOutlined style={{ fontSize: 14 }} />
              <span>معاينة سريعة</span>
            </button>
          </div>
        </Link>

        {/* Content Details */}
        <div className={styles['product-content']}>
          {product.category_name && (
            <span className={styles['product-category-tag']}>{product.category_name}</span>
          )}

          <Link to={`/product/${product.slug || product.id}`} className={styles['product-title-link']}>
            <h3 className={styles['product-title']} title={product.product_name}>
              {product.product_name}
            </h3>
          </Link>

          {/* Color Swatch Dots */}
          {colorList.length > 0 && (
            <div className={styles['color-swatches-strip']} title={`${colorList.length} ألوان متوفرة`}>
              {colorList.slice(0, 5).map((c, i) => {
                const isSelected = (activeCardColor || product.colors?.[0]) === c;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveCardColor(c);
                    }}
                    onMouseEnter={() => {
                      const cImg = getColorImage(c);
                      if (cImg) setActiveCardColor(c);
                    }}
                    className={`${styles['color-dot']} ${isSelected ? styles['color-dot-active'] : ''}`}
                    style={{
                      backgroundColor: resolveColorHex(c)
                    }}
                    title={c}
                    aria-label={`اختيار لون ${c}`}
                  />
                );
              })}
              {colorList.length > 5 && (
                <span className={styles['color-dot-more']}>+{colorList.length - 5}</span>
              )}
            </div>
          )}

          {/* Rating & Price row */}
          <div className={styles['product-meta-row']}>
            <div className={styles['rating-stars-wrap']} title="تقييم 5 نجوم">
              <span className={styles['rating-star']}>★</span>
              <span className={styles['rating-star']}>★</span>
              <span className={styles['rating-star']}>★</span>
              <span className={styles['rating-star']}>★</span>
              <span className={styles['rating-star']}>★</span>
            </div>
            <span className={styles['meta-dot-divider']}>•</span>
            <div className={styles['product-price-row']}>
              <span className={styles['product-price']}>
                {price.toLocaleString()}
                <span className={styles['product-currency']}>ج.م</span>
              </span>
              {hasDiscount && (
                <span className={styles['product-original-price']}>
                  {originalPrice.toLocaleString()} ج.م
                </span>
              )}
            </div>
          </div>

          {/* Add to cart action (Pill CTA with Button-in-Button Capsule) */}
          <button
            type="button"
            className={`${styles['add-to-cart-btn']} ${addedFlash ? styles['add-to-cart-btn-added'] : ''}`}
            onClick={handleCardAdd}
            disabled={!isAvailable}
            aria-label={`إضافة ${product.product_name} إلى السلة`}
          >
            <span className={styles['add-to-cart-text']}>
              {addedFlash
                ? 'تمت الإضافة بنجاح'
                : !isAvailable
                ? 'نفد المخزون'
                : (product.sizes?.length > 1 || product.colors?.length > 1)
                ? 'اختيار المقاس واللون'
                : 'إضافة إلى السلة'}
            </span>
            <span className={styles['add-to-cart-capsule']}>
              {addedFlash ? (
                <CheckOutlined style={{ fontSize: 15 }} />
              ) : (
                <ShoppingCartOutlined style={{ fontSize: 16 }} />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Quick View Modal (Boutique Pop-up) */}
      <Modal
        open={quickViewOpen}
        onCancel={() => setQuickViewOpen(false)}
        footer={null}
        centered
        width={560}
        styles={{
          mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
          content: { borderRadius: 20, padding: 0, overflow: 'hidden' },
          body: { padding: '24px' }
        }}
      >
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', direction: 'rtl' }}>
          {/* Product Thumbnail with Dynamic Color Preview */}
          <div
            style={{
              width: 190,
              height: 240,
              background: '#F8FAFC',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              flexShrink: 0,
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.04)'
            }}
          >
            <img
              key={qvActiveImage}
              src={qvActiveImage}
              alt={`${product.product_name} - ${qvSelectedColor || ''}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transition: 'opacity 0.25s ease-in-out',
                display: 'block'
              }}
              onError={(e) => {
                e.target.src = product.featured_image || yokaLogo;
              }}
            />

            {/* Selected Color Badge on Thumbnail */}
            {qvSelectedColor && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: '#FFFFFF',
                  padding: '3px 9px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  backdropFilter: 'blur(6px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: resolveColorHex(qvSelectedColor),
                    border: '1px solid rgba(255,255,255,0.6)'
                  }}
                />
                <span>{qvSelectedColor}</span>
              </span>
            )}
          </div>

          {/* Quick Details & Options */}
          <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              {product.category_name && (
                <span style={{ fontSize: 11, color: '#8A7A5D', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  {product.category_name}
                </span>
              )}
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A', fontSize: 16, lineHeight: 1.4 }}>
                {product.product_name}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {price.toLocaleString()} <span style={{ fontSize: 13, color: '#8A7A5D', fontWeight: 800 }}>ج.م</span>
              </span>
              {hasDiscount && (
                <span style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>
                  {originalPrice.toLocaleString()} ج.م
                </span>
              )}
            </div>

            {/* Colors */}
            {product.colors?.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    اللون: <span style={{ color: '#0F172A', fontWeight: 800 }}>{qvSelectedColor || '—'}</span>
                  </Text>
                  {getColorImage(qvSelectedColor) && (
                    <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                      ✓ تم تحديث الصورة
                    </span>
                  )}
                </div>
                <Space wrap size={[6, 6]}>
                  {product.colors.map((c) => {
                    const isSelected = qvSelectedColor === c;
                    return (
                      <Button
                        key={c}
                        size="small"
                        type={isSelected ? 'primary' : 'default'}
                        onClick={() => {
                          setQvSelectedColor(c);
                          setActiveCardColor(c);
                        }}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#0F172A',
                          borderColor: isSelected ? '#0F172A' : '#E2E8F0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.18)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: resolveColorHex(c),
                            display: 'inline-block',
                            border: '1px solid rgba(0,0,0,0.15)',
                            flexShrink: 0
                          }}
                        />
                        <span>{c}</span>
                      </Button>
                    );
                  })}
                </Space>
              </div>
            )}

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>المقاس:</Text>
                <Space wrap size={[6, 6]}>
                  {product.sizes.map((s) => (
                    <Button
                      key={s}
                      size="small"
                      type={qvSelectedSize === s ? 'primary' : 'default'}
                      onClick={() => setQvSelectedSize(s)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        backgroundColor: qvSelectedSize === s ? '#0F172A' : '#FFFFFF',
                        color: qvSelectedSize === s ? '#FFFFFF' : '#0F172A',
                        borderColor: qvSelectedSize === s ? '#0F172A' : '#E2E8F0'
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </Space>
              </div>
            )}

            {/* Quantity Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <Text strong style={{ fontSize: 12 }}>الكمية:</Text>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#FFFFFF'
                }}
              >
                <button
                  type="button"
                  onClick={() => setQvQty((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B'
                  }}
                  aria-label="تقليل الكمية"
                >
                  <MinusOutlined style={{ fontSize: 11 }} />
                </button>
                <span
                  style={{
                    width: 36,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#0F172A'
                  }}
                >
                  {qvQty}
                </span>
                <button
                  type="button"
                  onClick={() => setQvQty((prev) => prev + 1)}
                  style={{
                    width: 32,
                    height: 32,
                    border: 'none',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B'
                  }}
                  aria-label="زيادة الكمية"
                >
                  <PlusOutlined style={{ fontSize: 11 }} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                type="primary"
                block
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={handleQuickViewAdd}
                style={{
                  height: 44,
                  backgroundColor: '#C8A45C',
                  color: '#0F172A',
                  fontWeight: 800,
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(200, 164, 92, 0.35)'
                }}
              >
                أضف إلى السلة الآن
              </Button>

              <Link
                to={`/product/${product.slug || product.id}`}
                onClick={() => setQuickViewOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: '#64748B',
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span>مشاهدة كافة التفاصيل والصور الإضافية</span>
                <ArrowLeftOutlined style={{ fontSize: 11 }} />
              </Link>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
