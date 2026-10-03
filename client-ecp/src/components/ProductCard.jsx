import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { App } from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  CheckOutlined
} from '@ant-design/icons';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import styles from './ProductCard.module.css';

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
  const [imageLoaded, setImageLoaded] = useState(false);

  // Card-level active color state
  const [activeCardColor, setActiveCardColor] = useState(null);

  const totalStock = parseInt(product.total_stock || 0, 10);
  const isAvailable = totalStock > 0;

  const rawSelling = parseFloat(product.selling_price);
  const originalPrice = !isNaN(rawSelling) && rawSelling > 0 ? rawSelling : 0;
  const rawSale = parseFloat(product.sale_price);
  const hasDiscount = !isNaN(rawSale) && rawSale > 0 && rawSale < originalPrice;
  const price = hasDiscount ? rawSale : originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const hasOptions =
    (product.variants && product.variants.length > 1) ||
    (product.sizes && product.sizes.length > 0) ||
    (product.colors && product.colors.length > 0);

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

    if (!isAvailable) {
      message.warning('عذراً، هذا المنتج غير متوفر حالياً');
      return;
    }

    // If item has variants or options, navigate to product page to choose color and size
    if (hasOptions) {
      navigate(`/product/${product.slug || product.id}`);
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

  // Extract unique colors for swatches
  const colorList = product.colors || (product.variants ? [...new Set(product.variants.map((v) => v.color).filter(Boolean))] : []);

  return (
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
                : hasOptions
                ? 'اختيار المقاس واللون'
                : 'إضافة إلى السلة'}
            </span>
            <span className={styles['add-to-capsule'] || styles['add-to-cart-capsule']}>
              {addedFlash ? (
                <CheckOutlined style={{ fontSize: 15 }} />
              ) : (
                <ShoppingCartOutlined style={{ fontSize: 16 }} />
              )}
            </span>
          </button>
        </div>
      </div>
  );
}
