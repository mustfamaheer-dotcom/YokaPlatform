import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Typography, Button, Tag, Space, Breadcrumb, Spin, message, Segmented, Grid } from 'antd';
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
  CheckOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ProductDetail({ onAddToCart }) {
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

  // Multi-size selection state: { [variantId]: qty }
  const [multiQuantities, setMultiQuantities] = useState({});

  useEffect(() => {
    fetchProductDetails();
  }, [slug]);

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

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/ecp/catalog/${slug}`);
      if (res.data.success) {
        const prod = res.data.data;
        setProduct(prod);

        // Pre-select first variant if available
        if (prod.variants && prod.variants.length > 0) {
          const first = prod.variants[0];
          setSelectedColor(first.color || null);
          setSelectedSize(first.size || null);
          setSelectedVariant(first);

          // Initialize multi-quantities mapping
          const initialMulti = {};
          prod.variants.forEach((v) => {
            initialMulti[v.id] = 0;
          });
          setMultiQuantities(initialMulti);
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
          <Button type="primary" style={{ backgroundColor: '#C8A45C', color: '#0A0A0A', border: 'none' }}>العودة للكتالوج</Button>
        </Link>
      </div>
    );
  }

  const hasMultipleVariants = product.variants && product.variants.length > 1;

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
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
              border: '1px solid #E8E4DB',
              overflow: 'hidden',
              padding: isMobile ? 16 : 24,
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          >
            <img
              src={product.featured_image || '/yokaStoreTransparent.png'}
              alt={product.product_name || 'صورة المنتج'}
              style={{
                width: '100%',
                maxHeight: isMobile ? 320 : 450,
                objectFit: 'contain'
              }}
            />
          </div>
        </Col>

        {/* Product Details & Purchase Form */}
        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {product.brand && (
              <Text strong style={{ color: '#C8A45C', fontSize: 14, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {product.brand}
              </Text>
            )}

            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#0A0A0A', textWrap: 'balance' }}>
              {product.product_name}
            </Title>

            <Space size="middle">
              <Text type="secondary" style={{ fontSize: 12 }}>
                كود المنتج: <strong style={{ color: '#1A1A1A' }}>{product.product_code}</strong>
              </Text>
              {selectedVariant?.variant_sku && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  SKU: <strong style={{ color: '#1A1A1A' }}>{selectedVariant.variant_sku}</strong>
                </Text>
              )}
            </Space>

            {/* Price Box */}
            <div style={{ background: 'rgba(200,164,92,0.06)', padding: '16px 20px', borderRadius: 12, border: '1px solid #E8E4DB' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
                  {price.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 700 }}>ج.م</span>
                </span>
                {hasDiscount && (
                  <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#A0A0A0', fontVariantNumeric: 'tabular-nums' }}>
                    {originalPrice.toLocaleString()} ج.م
                  </span>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>السعر شامل ضريبة القيمة المضافة</Text>
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
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>اللون:</Text>
                    <Space wrap>
                      {product.colors.map((c) => (
                        <Button
                          key={c}
                          type={selectedColor === c ? 'primary' : 'default'}
                          onClick={() => setSelectedColor(c)}
                          style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            backgroundColor: selectedColor === c ? '#C8A45C' : '#FFFFFF',
                            color: selectedColor === c ? '#0A0A0A' : '#1A1A1A',
                            border: selectedColor === c ? 'none' : '1px solid #E8E4DB'
                          }}
                        >
                          {c}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Sizes Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>المقاس:</Text>
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
                            backgroundColor: selectedSize === s ? '#C8A45C' : '#FFFFFF',
                            color: selectedSize === s ? '#0A0A0A' : '#1A1A1A',
                            border: selectedSize === s ? 'none' : '1px solid #E8E4DB'
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
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAFAF8', border: '1px solid #E8E4DB', borderRadius: 8, padding: '4px 8px' }}>
                    <Button
                      type="text"
                      icon={<MinusOutlined />}
                      disabled={quantity <= 1}
                      aria-label="تقليل الكمية"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ minWidth: 44, minHeight: 44 }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, padding: '0 8px', fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'center' }}>{quantity}</span>
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
                      backgroundColor: availableStock > 0 ? '#C8A45C' : '#E8E8E8',
                      color: availableStock > 0 ? '#0A0A0A' : '#A0A0A0',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 800,
                      border: 'none'
                    }}
                  >
                    أضف إلى سلة التسوق ({quantity} قطعة)
                  </Button>
                </div>
              </>
            ) : (
              /* MODE 2: MULTI-SIZE SELECTION (Pick size for each piece) */
              <div style={{ background: '#FAFAF8', border: '1px solid #E8E4DB', borderRadius: 12, padding: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                  حدد عدد القطع المطلوبة من كل مقاس ولون:
                </Text>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {product.variants.map((v) => {
                    const varStock = parseInt(v.available_qty || 0, 10);
                    const isVarInStock = varStock > 0;
                    const chosenQty = multiQuantities[v.id] || 0;

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
                          border: chosenQty > 0 ? '1px solid #C8A45C' : '1px solid #E8E4DB'
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 14, color: '#1A1A1A' }}>
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

                        {/* Stepper for this specific size */}
                        <div style={{ display: 'flex', alignItems: 'center', background: '#FAFAF8', border: '1px solid #E8E4DB', borderRadius: 6 }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<MinusOutlined style={{ fontSize: 10 }} />}
                            disabled={chosenQty <= 0}
                            onClick={() => updateMultiQty(v.id, -1, varStock)}
                            style={{ minWidth: 32, minHeight: 32 }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 700, padding: '0 8px', minWidth: 24, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
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
                    backgroundColor: totalMultiPieces > 0 ? '#C8A45C' : '#E8E8E8',
                    color: totalMultiPieces > 0 ? '#0A0A0A' : '#A0A0A0',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 800,
                    border: 'none'
                  }}
                >
                  {totalMultiPieces > 0
                    ? `إضافة المقاسات المختارة (${totalMultiPieces} قطع) إلى السلة`
                    : 'حدد المقاسات أولاً للإضافة إلى السلة'}
                </Button>
              </div>
            )}

            {/* Delivery Guarantees */}
            <div style={{ marginTop: 16, borderTop: '1px solid #E8E4DB', paddingTop: 16 }}>
              <Space direction="vertical" size="small" style={{ width: '100%', fontSize: 13, color: '#4A4A4A' }}>
                <div><CarOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> شحن سريع يصلك خلال 2-4 أيام عمل</div>
                <div><SafetyCertificateOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> الدفع عند الاستلام مع إمكانية فتح الشحنة والفحص</div>
                <div><SyncOutlined style={{ color: '#C8A45C', marginLeft: 6 }} /> استبدال واسترجاع مجاني خلال 14 يوماً</div>
              </Space>
            </div>
          </div>
        </Col>
      </Row>

      {/* Sticky Bottom Add-to-Cart Bar for Mobile */}
      {isMobile && showStickyBar && (
        <div className="sticky-cta-bar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#C8A45C', fontVariantNumeric: 'tabular-nums' }}>
              {price.toLocaleString()} <span style={{ fontSize: 12 }}>ج.م</span>
            </span>
            {selectedVariant?.size && (
              <span style={{ fontSize: 11, color: '#E8D5A8' }}>
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
            style={{
              flex: 1,
              maxWidth: 220,
              height: 44,
              backgroundColor: availableStock > 0 ? '#C8A45C' : '#E8E8E8',
              color: availableStock > 0 ? '#0A0A0A' : '#A0A0A0',
              borderRadius: 8,
              fontWeight: 800,
              border: 'none',
              fontSize: 14
            }}
          >
            {availableStock > 0 ? 'أضف للسلة الآن' : 'غير متوفر'}
          </Button>
        </div>
      )}
    </div>
  );
}
