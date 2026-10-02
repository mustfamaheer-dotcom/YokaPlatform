import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Typography, Button, Tag, Space, Breadcrumb, Spin, App, Segmented, Grid } from 'antd';
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  CarOutlined,
  PlusOutlined,
  MinusOutlined,
  AppstoreOutlined,
  CheckOutlined,
  WhatsAppOutlined,
  ShareAltOutlined,
  CopyOutlined
} from '@ant-design/icons';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { trackProductView } from '../services/tracker';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ProductDetail({ onAddToCart }) {
  const { message } = App.useApp();
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mode: single variant vs multi-size selection
  const [orderMode, setOrderMode] = useState('single'); // 'single' | 'multi'

  // Responsive and Sticky CTA state
  const screens = useBreakpoint();
  const isMobile = screens.xs || (screens.sm === false && screens.md === false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaContainerRef = useRef(null);

  // Selected variant state (single mode)
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [displayImage, setDisplayImage] = useState(null);

  // Multi-size selection state: { [variantId]: qty }
  const [multiQuantities, setMultiQuantities] = useState({});
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [contactWhatsApp, setContactWhatsApp] = useState('01000000000');

  useEffect(() => {
    fetchProductDetails();
  }, [slug]);

  useEffect(() => {
    api.get('/api/ecp/catalog/store-settings')
      .then((res) => {
        if (res.data?.success && res.data?.data?.contact_whatsapp) {
          setContactWhatsApp(res.data.data.contact_whatsapp);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ctaContainerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0.1 }
    );
    observer.observe(ctaContainerRef.current);
    return () => observer.disconnect();
  }, [product, orderMode]);

  // Helper to find image for a specific color
  const getColorImage = (colorName) => {
    if (!colorName || !product?.variants) return null;
    const match = product.variants.find((v) => v.color === colorName && v.image_url);
    return match?.image_url || null;
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/ecp/catalog/${slug}`);
      if (res.data.success) {
        const prod = res.data.data;
        setProduct(prod);
        trackProductView(prod);

        // Fetch related products from same category
        if (prod.category_id) {
          api.get('/api/ecp/catalog', { params: { category_id: prod.category_id, limit: 5 } })
            .then((r) => {
              if (r.data?.success) {
                const list = (r.data.data || [])
                  .filter((p) => p.id !== prod.id && (parseInt(p.total_stock, 10) || 0) > 0)
                  .slice(0, 4);
                setRelatedProducts(list);
              }
            })
            .catch(() => {});
        }

        // Pre-select first variant if available
        if (prod.variants && prod.variants.length > 0) {
          const first = prod.variants[0];
          setSelectedColor(first.color || null);
          setSelectedSize(first.size || null);
          setSelectedVariant(first);

          const firstImg = (first.color && prod.variants.find(v => v.color === first.color && v.image_url)?.image_url) 
            || first.image_url 
            || prod.featured_image 
            || yokaLogo;
          setDisplayImage(firstImg);

          // Initialize multi-quantities mapping
          const initialMulti = {};
          prod.variants.forEach((v) => {
            initialMulti[v.id] = 0;
          });
          setMultiQuantities(initialMulti);
        } else {
          setDisplayImage(prod.featured_image || yokaLogo);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // When color or size changes, resolve selected variant
  useEffect(() => {
    if (!product?.variants || product.variants.length === 0) return;

    const matched = product.variants.find(
      (v) => (!selectedColor || v.color === selectedColor) && (!selectedSize || v.size === selectedSize)
    );
    setSelectedVariant(matched || product.variants[0]);
  }, [selectedColor, selectedSize, product]);

  // When selectedColor changes, update displayed image if a color image exists
  useEffect(() => {
    if (!product) return;
    if (selectedColor) {
      const colorImg = getColorImage(selectedColor);
      if (colorImg) {
        setDisplayImage(colorImg);
      } else if (product.featured_image) {
        setDisplayImage(product.featured_image);
      }
    }
  }, [selectedColor, product]);

  // Extract distinct images for gallery thumbnails
  const galleryItems = React.useMemo(() => {
    if (!product) return [];
    const items = [];
    const seenUrls = new Set();

    // 1. Featured product image
    if (product.featured_image && !seenUrls.has(product.featured_image)) {
      items.push({
        url: product.featured_image,
        label: 'الرئيسية',
        color: null
      });
      seenUrls.add(product.featured_image);
    }

    // 2. Distinct color variant images
    if (product.variants && Array.isArray(product.variants)) {
      for (const v of product.variants) {
        if (v.image_url && !seenUrls.has(v.image_url)) {
          items.push({
            url: v.image_url,
            label: v.color || 'لون إضافي',
            color: v.color || null
          });
          seenUrls.add(v.image_url);
        }
      }
    }

    // 3. Product gallery_images if present
    if (product.gallery_images) {
      let gImgs = [];
      if (Array.isArray(product.gallery_images)) {
        gImgs = product.gallery_images;
      } else if (typeof product.gallery_images === 'string') {
        try {
          const parsed = JSON.parse(product.gallery_images);
          if (Array.isArray(parsed)) gImgs = parsed;
        } catch (e) {
          gImgs = [product.gallery_images];
        }
      }
      for (const gUrl of gImgs) {
        if (gUrl && typeof gUrl === 'string' && !seenUrls.has(gUrl)) {
          items.push({
            url: gUrl,
            label: 'معاينة',
            color: null
          });
          seenUrls.add(gUrl);
        }
      }
    }

    return items;
  }, [product]);

  const handleSelectThumbnail = (item) => {
    setDisplayImage(item.url);
    if (item.color) {
      setSelectedColor(item.color);
    }
  };

  const handleColorChange = (c) => {
    setSelectedColor(c);
    const colorImg = getColorImage(c);
    if (colorImg) {
      setDisplayImage(colorImg);
    } else if (product.featured_image) {
      setDisplayImage(product.featured_image);
    }
  };

  const availableStock = selectedVariant
    ? parseInt(selectedVariant.available_qty || 0, 10)
    : parseInt(product?.total_stock || 0, 10);

  // Safe pricing calculation (immune to NaN)
  const rawSelling = parseFloat(product?.selling_price);
  const originalPrice = !isNaN(rawSelling) && rawSelling > 0 ? rawSelling : 0;
  const rawSale = parseFloat(product?.sale_price);
  const hasDiscount = !isNaN(rawSale) && rawSale > 0 && rawSale < originalPrice;
  const basePrice = hasDiscount ? rawSale : originalPrice;
  const modifier = parseFloat(selectedVariant?.price_modifier || 0) || 0;
  const price = basePrice + modifier;

  // Single item add to cart
  const handleAdd = (e) => {
    if (availableStock <= 0) {
      return message.warning('عذراً، هذا المقاس/اللون غير متوفر في المخزون حالياً');
    }

    const triggerPos = e?.clientX ? { x: e.clientX, y: e.clientY } : null;

    onAddToCart({
      id: product.id,
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      product_name: product.product_name,
      quantity,
      _triggerPos: triggerPos
    });
  };

  // Multi-size bulk add to cart
  const handleMultiAdd = async (e) => {
    const selectedEntries = Object.entries(multiQuantities).filter(([_, qty]) => qty > 0);
    if (selectedEntries.length === 0) {
      return message.warning('يرجى اختيار كمية لمقاس واحد على الأقل');
    }

    const triggerPos = e?.clientX ? { x: e.clientX, y: e.clientY } : null;

    for (const [vId, qty] of selectedEntries) {
      await onAddToCart({
        id: product.id,
        product_id: product.id,
        variant_id: parseInt(vId, 10),
        product_name: product.product_name,
        quantity: qty,
        _triggerPos: triggerPos
      });
    }

    const totalAdded = selectedEntries.reduce((sum, [_, q]) => sum + q, 0);
    message.success(`تمت إضافة ${totalAdded} قطعة بمقاسات مختلفة إلى السلة!`);
  };

  const updateMultiQty = (variantId, delta, maxStock) => {
    setMultiQuantities((prev) => {
      const current = prev[variantId] || 0;
      const next = Math.max(0, Math.min(maxStock, current + delta));
      return { ...prev, [variantId]: next };
    });
  };

  const totalMultiPieces = Object.values(multiQuantities).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#8c8c8c' }}>جارٍ تحميل تفاصيل المنتج...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Title level={4}>لم يتم العثور على المنتج المطلوب</Title>
        <Link to="/catalog">
          <Button type="primary" style={{ backgroundColor: '#C8A45C', color: '#1C1917', border: 'none' }}>العودة للكتالوج</Button>
        </Link>
      </div>
    );
  }

  const hasMultipleVariants = product.variants && product.variants.length > 1;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://yokastore.runasp.net/product/${product.slug || product.id}`;
  const prodImg = product.featured_image || 'https://yokastore.runasp.net/yokaStoreTransparent.png';
  const fullImg = prodImg.startsWith('/') ? `https://yokastore.runasp.net${prodImg}` : prodImg;

  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.product_name,
    'image': [fullImg],
    'description': product.description || `تسوق ${product.product_name} بجودة استثنائية وسعر مميز من يوكا ستور مصر مع شحن سريع ومعاينة قبل الاستلام.`,
    'sku': product.product_code || String(product.id),
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'Yoka Store'
    },
    'offers': {
      '@type': 'Offer',
      'url': currentUrl,
      'priceCurrency': 'EGP',
      'price': price,
      'availability': availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'itemCondition': 'https://schema.org/NewCondition',
      'seller': {
        '@type': 'Organization',
        'name': 'Yoka Store'
      }
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'الرئيسية',
        'item': 'https://yokastore.runasp.net/'
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'الكتالوج',
        'item': 'https://yokastore.runasp.net/catalog'
      },
      ...(product.category_name
        ? [
            {
              '@type': 'ListItem',
              'position': 3,
              'name': product.category_name,
              'item': `https://yokastore.runasp.net/catalog?category_id=${product.category_id}`
            },
            {
              '@type': 'ListItem',
              'position': 4,
              'name': product.product_name,
              'item': currentUrl
            }
          ]
        : [
            {
              '@type': 'ListItem',
              'position': 3,
              'name': product.product_name,
              'item': currentUrl
            }
          ])
    ]
  };

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [productSchema, breadcrumbSchema]
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      <SEO
        title={product.product_name}
        description={product.description || `تسوق ${product.product_name} كود ${product.product_code} بسعر ${price} ج.م من يوكا ستور مصر مع شحن سريع ومعاينة قبل الاستلام.`}
        image={product.featured_image}
        type="product"
        schemaData={combinedSchema}
      />

      {/* Mobile Back Link */}
      {isMobile && (
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/catalog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748B',
              fontSize: 13,
              fontWeight: 700,
              padding: '2px 0'
            }}
          >
            <ArrowRightOutlined style={{ fontSize: 12, color: '#C8A45C' }} />
            <span>العودة للكتالوج</span>
          </Link>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: 20, fontSize: 13 }}
        items={
          isMobile
            ? [
                { title: <Link to="/catalog">الكتالوج</Link> },
                { title: product.product_name }
              ]
            : [
                { title: <Link to="/">الرئيسية</Link> },
                { title: <Link to="/catalog">الكتالوج</Link> },
                ...(product.category_name
                  ? [{ title: <Link to={`/catalog?category_id=${product.category_id}`}>{product.category_name}</Link> }]
                  : []),
                { title: product.product_name }
              ]
        }
      />

      <Row gutter={[{ xs: 16, sm: 24, md: 36 }, { xs: 20, sm: 24, md: 36 }]}>
        {/* Product Image Area */}
        <Col xs={24} md={12}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              padding: isMobile ? 12 : 20,
              boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
              position: 'relative',
              width: '100%',
              height: isMobile ? 340 : 460,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              key={displayImage}
              src={displayImage || product.featured_image || yokaLogo}
              alt={product.product_name || 'صورة المنتج'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                transition: 'opacity 0.25s ease'
              }}
              onError={(e) => {
                e.target.src = yokaLogo;
              }}
            />
          </div>

          {/* Gallery Thumbnails Strip */}
          {galleryItems.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 14,
                overflowX: 'auto',
                paddingBottom: 6,
                scrollbarWidth: 'thin'
              }}
            >
              {galleryItems.map((item, idx) => {
                const currentActive = displayImage || product.featured_image;
                const isActive = currentActive === item.url;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectThumbnail(item)}
                    style={{
                      width: isMobile ? 64 : 76,
                      height: isMobile ? 64 : 76,
                      flexShrink: 0,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isActive ? '2px solid #C8A45C' : '1px solid #E2E8F0',
                      boxShadow: isActive ? '0 0 0 2px rgba(200,164,92,0.25)' : 'none',
                      background: '#FFFFFF',
                      padding: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: 6
                      }}
                      onError={(e) => {
                        e.target.src = yokaLogo;
                      }}
                    />
                    {item.label && item.label !== 'الرئيسية' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          right: 2,
                          background: 'rgba(15,23,42,0.8)',
                          color: '#FFFFFF',
                          fontSize: 9,
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: 3,
                          padding: '1px 2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Col>

        {/* Product Details & Purchase Form */}
        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {product.brand && (
              <Text strong style={{ color: '#C8A45C', fontSize: 14, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {product.brand}
              </Text>
            )}

            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0F172A', textWrap: 'balance' }}>
              {product.product_name}
            </Title>

            <Space size="middle">
              <Text type="secondary" style={{ fontSize: 12 }}>
                كود المنتج: <strong style={{ color: '#0F172A' }}>{product.product_code}</strong>
              </Text>
              {selectedVariant?.variant_sku && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  SKU: <strong style={{ color: '#0F172A' }}>{selectedVariant.variant_sku}</strong>
                </Text>
              )}
            </Space>

            {/* Price Box */}
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
                  {price.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 700 }}>ج.م</span>
                </span>
                {hasDiscount && (
                  <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                    {originalPrice.toLocaleString()} ج.م
                  </span>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12, color: '#64748B' }}>السعر شامل ضريبة القيمة المضافة</Text>
            </div>

            {/* Stock Availability */}
            <div>
              {availableStock > 0 ? (
                <Tag color="#2D7A3A" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, border: 'none' }}>
                  متوفر بالمخزن ({availableStock} قطعة متاحة)
                </Tag>
              ) : (
                <Tag color="#C62828" icon={<CloseCircleOutlined />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, border: 'none' }}>
                  غير متوفر بالمخزن حالياً
                </Tag>
              )}
            </div>

            {/* Variant Mode Selection (Single vs Multi-size) */}
            {hasMultipleVariants && (
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>طريقة الطلب:</Text>
                <Segmented
                  value={orderMode}
                  onChange={setOrderMode}
                  block
                  options={[
                    { label: 'اختيار مقاس محدد', value: 'single', icon: <CheckOutlined /> },
                    { label: 'طلب مقاسات متعددة (مقاس لكل قطعة)', value: 'multi', icon: <AppstoreOutlined /> }
                  ]}
                  style={{ backgroundColor: '#F0EDE6', padding: 3, borderRadius: 8, fontWeight: 700 }}
                />
              </div>
            )}

            {/* MODE 1: SINGLE VARIANT SELECTION */}
            {orderMode === 'single' ? (
              <>
                {/* Colors Selector */}
                {product.colors && product.colors.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong style={{ color: '#0F172A', fontSize: 14 }}>
                        اللون: <span style={{ color: '#C8A45C', fontWeight: 800 }}>{selectedColor || '—'}</span>
                      </Text>
                    </div>
                    <Space wrap size={[8, 8]}>
                      {product.colors.map((c) => {
                        const cImg = getColorImage(c);
                        const isSelected = selectedColor === c;
                        return (
                          <Button
                            key={c}
                            type={isSelected ? 'primary' : 'default'}
                            onClick={() => handleColorChange(c)}
                            style={{
                              borderRadius: 8,
                              fontWeight: 700,
                              height: 40,
                              padding: cImg ? '4px 14px 4px 8px' : '4px 16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#0F172A',
                              border: isSelected ? '2px solid #C8A45C' : '1px solid #E2E8F0',
                              boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.15)' : 'none'
                            }}
                          >
                            {cImg && (
                              <img
                                src={cImg}
                                alt={c}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 4,
                                  objectFit: 'cover',
                                  border: isSelected ? '1px solid #C8A45C' : '1px solid #CBD5E1'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <span>{c}</span>
                          </Button>
                        );
                      })}
                    </Space>
                  </div>
                )}

                {/* Sizes Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#0F172A' }}>المقاس:</Text>
                    <Space wrap>
                      {product.sizes.map((s) => (
                        <Button
                          key={s}
                          type={selectedSize === s ? 'primary' : 'default'}
                          onClick={() => setSelectedSize(s)}
                          style={{
                            borderRadius: 8,
                            fontWeight: 700,
                            minWidth: 44,
                            minHeight: 44,
                            backgroundColor: selectedSize === s ? '#0F172A' : '#FFFFFF',
                            color: selectedSize === s ? '#FFFFFF' : '#0F172A',
                            border: selectedSize === s ? 'none' : '1px solid #E2E8F0'
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Quantity Stepper & Add to Cart */}
                <div ref={ctaContainerRef} style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 8px' }}>
                    <Button
                      type="text"
                      icon={<MinusOutlined />}
                      disabled={quantity <= 1}
                      aria-label="تقليل الكمية"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ minWidth: 44, minHeight: 44 }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, padding: '0 8px', fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'center', color: '#0F172A' }}>{quantity}</span>
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      disabled={quantity >= availableStock}
                      aria-label="زيادة الكمية"
                      onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                      style={{ minWidth: 44, minHeight: 44 }}
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    disabled={availableStock <= 0}
                    icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
                    onClick={handleAdd}
                    style={{
                      flex: 1,
                      height: 52,
                      backgroundColor: availableStock > 0 ? '#C8A45C' : '#F1F5F9',
                      color: availableStock > 0 ? '#0F172A' : '#94A3B8',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 800,
                      border: 'none',
                      boxShadow: availableStock > 0 ? '0 4px 14px rgba(200,164,92,0.35)' : 'none'
                    }}
                  >
                    أضف إلى سلة التسوق ({quantity} قطعة)
                  </Button>
                </div>
              </>
            ) : (
              /* MODE 2: MULTI-SIZE SELECTION (Pick size for each piece) */
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                  حدد عدد القطع المطلوبة من كل مقاس ولون:
                </Text>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {product.variants.map((v) => {
                    const varStock = parseInt(v.available_qty || 0, 10);
                    const isVarInStock = varStock > 0;
                    const chosenQty = multiQuantities[v.id] || 0;

                    const vImg = v.image_url || getColorImage(v.color) || product.featured_image;

                    return (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#FFFFFF',
                          borderRadius: 8,
                          border: chosenQty > 0 ? '1px solid #C8A45C' : '1px solid #E2E8F0'
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: vImg ? 'pointer' : 'default' }}
                          onClick={() => vImg && setDisplayImage(vImg)}
                          title={vImg ? 'انقر لمعاينة صورة هذا اللون' : undefined}
                        >
                          {vImg && (
                            <img
                              src={vImg}
                              alt={v.color || 'صورة المقاس'}
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 6,
                                objectFit: 'contain',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <Text strong style={{ fontSize: 14, color: '#0F172A' }}>
                              المقاس: {v.size || 'قياسي'} {v.color ? `— ${v.color}` : ''}
                            </Text>
                            <div style={{ fontSize: 12 }}>
                              {isVarInStock ? (
                                <Text type="secondary">متاح بالمخزن: {varStock} قطعة</Text>
                              ) : (
                                <Text type="danger">نفد المخزون</Text>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stepper for this specific size */}
                        <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<MinusOutlined style={{ fontSize: 10 }} />}
                            disabled={chosenQty <= 0}
                            onClick={() => updateMultiQty(v.id, -1, varStock)}
                            style={{ minWidth: 32, minHeight: 32 }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 700, padding: '0 8px', minWidth: 24, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>
                            {chosenQty}
                          </span>
                          <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined style={{ fontSize: 10 }} />}
                            disabled={!isVarInStock || chosenQty >= varStock}
                            onClick={() => updateMultiQty(v.id, 1, varStock)}
                            style={{ minWidth: 32, minHeight: 32 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multi Add Button */}
                <Button
                  type="primary"
                  size="large"
                  block
                  disabled={totalMultiPieces === 0}
                  icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
                  onClick={handleMultiAdd}
                  style={{
                    height: 50,
                    backgroundColor: totalMultiPieces > 0 ? '#C8A45C' : '#F1F5F9',
                    color: totalMultiPieces > 0 ? '#0F172A' : '#94A3B8',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 800,
                    border: 'none',
                    boxShadow: totalMultiPieces > 0 ? '0 4px 14px rgba(200,164,92,0.35)' : 'none'
                  }}
                >
                  {totalMultiPieces > 0
                    ? `إضافة المقاسات المختارة (${totalMultiPieces} قطع) إلى السلة`
                    : 'حدد المقاسات أولاً للإضافة إلى السلة'}
                </Button>
              </div>
            )}

            {/* Delivery Guarantees */}
            <div style={{ marginTop: 16, borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
              <Space direction="vertical" size="small" style={{ width: '100%', fontSize: 13, color: '#64748B' }}>
                <div><CarOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> شحن سريع يصلك خلال 2-4 أيام عمل</div>
                <div><SafetyCertificateOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> الدفع عند الاستلام مع إمكانية فتح الشحنة والفحص</div>
                <div><SyncOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> استبدال واسترجاع مجاني خلال 14 يوماً</div>
              </Space>
            </div>

            {/* Quick Contact & Share Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <Button
                icon={<WhatsAppOutlined style={{ color: '#25D366', fontSize: 16 }} />}
                onClick={() => {
                  const msg = `مرحباً، أود الاستفسار والطلب بخصوص منتج: ${product.product_name} (كود: ${product.product_code}) ${window.location.href}`;
                  window.open(`https://wa.me/${contactWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  borderColor: '#25D366',
                  color: '#0F172A',
                  backgroundColor: '#F0FDF4'
                }}
              >
                طلب أو استفسار عبر واتساب
              </Button>

              <Button
                icon={<ShareAltOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  message.success('تم نسخ رابط المنتج بنجاح! شاركه مع أصدقائك');
                }}
                style={{
                  height: 42,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  borderColor: '#CBD5E1',
                  color: '#475569'
                }}
              >
                مشاركة الرابط
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section style={{ marginTop: 52, borderTop: '1px solid #E2E8F0', paddingTop: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 2.5vw, 22px)', color: '#0F172A' }}>
                منتجات مشابهة قد تعجبك
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>تشكيلة مميزة من نفس القسم لنفس الإطلالة الفاخرة</Text>
            </div>
            {product.category_id && (
              <Link to={`/catalog?category_id=${product.category_id}`} style={{ color: '#C8A45C', fontWeight: 700, fontSize: 13 }}>
                عرض جميع منتجات القسم ←
              </Link>
            )}
          </div>

          <Row gutter={[{ xs: 12, sm: 16, md: 20 }, { xs: 14, sm: 18, md: 24 }]}>
            {relatedProducts.map((rel) => (
              <Col xs={12} sm={8} md={6} key={rel.id}>
                <ProductCard product={rel} onAddToCart={onAddToCart} />
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* Sticky Bottom Add-to-Cart Bar for Mobile */}
      {isMobile && showStickyBar && (
        <div className="sticky-cta-bar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {price.toLocaleString()} <span style={{ fontSize: 12, color: '#C8A45C', fontWeight: 800 }}>ج.م</span>
            </span>
            {selectedVariant?.size && (
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>
                المقاس: {selectedVariant.size}
              </span>
            )}
          </div>
          <Button
            type="primary"
            size="large"
            disabled={availableStock <= 0}
            icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
            onClick={orderMode === 'single' ? handleAdd : handleMultiAdd}
            className="btn-touch"
            style={{
              flex: 1,
              maxWidth: 230,
              height: 48,
              backgroundColor: availableStock > 0 ? '#C8A45C' : '#F1F5F9',
              color: availableStock > 0 ? '#0F172A' : '#94A3B8',
              borderRadius: 10,
              fontWeight: 800,
              border: 'none',
              fontSize: 14.5,
              boxShadow: availableStock > 0 ? '0 4px 14px rgba(200, 164, 92, 0.38)' : 'none'
            }}
          >
            {availableStock > 0 ? 'أضف للسلة الآن' : 'غير متوفر'}
          </Button>
        </div>
      )}
    </div>
  );
}
