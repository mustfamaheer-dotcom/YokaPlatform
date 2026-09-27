import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Button, Skeleton, Typography, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  FireOutlined,
  ShopOutlined,
  SkinOutlined,
  CrownOutlined,
  SmileOutlined,
  SketchOutlined,
  ShoppingOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import api from '../api';
import ProductCard from '../components/ProductCard';
import heroBagImg from '../assets/hero-bag.png';

const { Title, Text } = Typography;

// Helper to assign distinctive luxury icons per category
const getCategoryIcon = (slug, name) => {
  const s = (slug || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (s.includes('men') || n.includes('رجال')) return <SkinOutlined />;
  if (s.includes('women') || n.includes('حريم') || n.includes('نساء')) return <CrownOutlined />;
  if (s.includes('kid') || n.includes('أطفال') || n.includes('اطفال')) return <SmileOutlined />;
  if (s.includes('access') || n.includes('إكسسوار') || n.includes('اكسسوار')) return <SketchOutlined />;
  if (s.includes('shoe') || s.includes('bag') || n.includes('شنط') || n.includes('حقائب') || n.includes('أحذية')) return <ShoppingOutlined />;
  return <ShopOutlined />;
};

export default function Home({ onAddToCart }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [storeSettings, setStoreSettings] = useState({
    hero_title: 'أناقة وفخامة تليق بك مع يوكا ستور',
    hero_offer_enabled: 'false',
    hero_offer_text: 'احصل على خصم يصل إلى 50%',
    hero_offer_link: '/catalog',
    hero_button_text: 'تسوق الكتالوج الآن',
    hero_button_link: '/catalog'
  });

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        api.get('/api/ecp/catalog', { params: { limit: 12, sort: 'newest' } }),
        api.get('/api/ecp/catalog/categories'),
        api.get('/api/ecp/catalog/store-settings').catch(() => null)
      ]);

      if (prodRes.data.success) {
        setFeaturedProducts((prodRes.data.data || []).filter(p => (parseInt(p.total_stock, 10) || 0) > 0));
      }
      if (catRes.data.success) {
        setCategories(catRes.data.data);
      }
      if (settingsRes?.data?.success && settingsRes.data.data) {
        setStoreSettings(prev => ({ ...prev, ...settingsRes.data.data }));
      }
    } catch (err) {
      console.error('Home data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on selected category tab and ensure strictly in stock
  const displayedProducts = useMemo(() => {
    const inStock = featuredProducts.filter(p => (parseInt(p.total_stock, 10) || 0) > 0);
    if (selectedCategoryFilter === 'all') return inStock;
    return inStock.filter(p => String(p.category_id) === String(selectedCategoryFilter));
  }, [featuredProducts, selectedCategoryFilter]);

  return (
    <div className="fade-in">
      {/* 1. Hero Banner Section */}
      <section
        className="hero-gradient"
        style={{
          borderRadius: 20,
          padding: 'clamp(28px, 4.5vw, 44px) clamp(20px, 4vw, 44px)',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'clamp(24px, 4vw, 56px)',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Right Side: Headline and Single Catalog CTA */}
          <div style={{ flex: '1 1 380px', maxWidth: 640, position: 'relative', zIndex: 2 }}>
            <Title level={1} className="hero-title" style={{ color: '#FFFFFF', fontWeight: 900, marginBottom: 28, textWrap: 'balance' }}>
              {storeSettings.hero_title ? (
                storeSettings.hero_title.includes('يوكا ستور') ? (
                  <>
                    {storeSettings.hero_title.split('يوكا ستور')[0]}
                    <span style={{ color: '#C8A45C' }}>يوكا ستور</span>
                    {storeSettings.hero_title.split('يوكا ستور')[1] || ''}
                  </>
                ) : (
                  storeSettings.hero_title
                )
              ) : (
                <>أناقة وفخامة تليق بك مع <span style={{ color: '#C8A45C' }}>يوكا ستور</span></>
              )}
            </Title>

            <div>
              <Link to={storeSettings.hero_button_link || '/catalog'}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  style={{
                    height: 52,
                    padding: '0 36px',
                    backgroundColor: '#C8A45C',
                    color: '#0F172A',
                    fontWeight: 800,
                    borderRadius: 26,
                    fontSize: 16,
                    border: 'none',
                    boxShadow: '0 6px 22px rgba(200,164,92,0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {storeSettings.hero_button_text || 'تسوق الكتالوج الآن'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Left Side: 3D Luxury Product Bag */}
          <div
            className="hero-3d-wrapper"
            style={{
              flex: '1 1 260px',
              maxWidth: 380,
              minWidth: 220,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Luxury Backlight Halo */}
            <div className="hero-3d-backlight" />

            {/* Dynamic Breathing Pedestal Shadow */}
            <div className="hero-pedestal-shadow" />

            {/* 3D Floating Bag */}
            <img
              src={heroBagImg}
              alt="حقيبة جلدية فاخرة يوكا ستور"
              className="hero-3d-bag"
              style={{
                width: '100%',
                maxHeight: 330,
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        </div>

        {/* Ambient Corner Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 360,
            height: 360,
            background: 'radial-gradient(circle, rgba(200, 164, 92, 0.22) 0%, rgba(15, 23, 42, 0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
      </section>

      {/* 2. Modern Category Section (Responsive Grid + Mobile Touch Track) */}
      {categories.length > 0 && (
        <section style={{ marginBottom: 44 }}>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(18px, 3vw, 24px)', color: '#0F172A' }}>
                <AppstoreOutlined style={{ color: '#C8A45C', marginLeft: 8 }} />
                التصنيفات المميزة
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>تصفح تشكيلاتنا الحصرية المتجددة بعناية</Text>
            </div>
            <Link to="/catalog" style={{ color: '#C8A45C', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>عرض الكل</span>
              <ArrowLeftOutlined style={{ fontSize: 11 }} />
            </Link>
          </div>

          {/* Desktop & Tablet Grid View */}
          <div className="desktop-only">
            <Row gutter={[16, 16]}>
              {categories.map((cat) => (
                <Col xs={12} sm={8} md={6} lg={Math.max(4, Math.floor(24 / Math.min(categories.length, 6)))} key={cat.id}>
                  <Link to={`/catalog?category_id=${cat.id}`} style={{ display: 'block', height: '100%' }}>
                    <div className="category-card" style={{ padding: '22px 14px' }}>
                      <div
                        className="category-icon-wrapper"
                        style={{
                          width: 56,
                          height: 56,
                          margin: '0 auto 12px',
                          background: 'rgba(200, 164, 92, 0.12)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#C8A45C',
                          fontSize: 24,
                          boxShadow: '0 4px 12px rgba(200, 164, 92, 0.15)'
                        }}
                      >
                        {getCategoryIcon(cat.slug, cat.category_name)}
                      </div>
                      <Text strong style={{ fontSize: 15, display: 'block', color: '#0F172A', marginBottom: 4 }}>
                        {cat.category_name}
                      </Text>
                      <span 
                        style={{ 
                          fontSize: 11, 
                          color: '#64748B', 
                          background: '#F1F5F9', 
                          padding: '2px 8px', 
                          borderRadius: 12,
                          display: 'inline-block'
                        }}
                      >
                        {cat.products_count} منتج متوفر
                      </span>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </div>

          {/* Mobile Horizontal Swipeable Category Track */}
          <div className="mobile-only">
            <div 
              className="horizontal-scroll-strip"
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollSnapType: 'x mandatory'
              }}
            >
              {categories.map((cat) => (
                <Link 
                  to={`/catalog?category_id=${cat.id}`} 
                  key={cat.id}
                  style={{
                    flex: '0 0 135px',
                    scrollSnapAlign: 'start'
                  }}
                >
                  <div 
                    className="category-card"
                    style={{
                      padding: '16px 10px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      className="category-icon-wrapper"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        background: 'rgba(200, 164, 92, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C8A45C',
                        fontSize: 20,
                        marginBottom: 8
                      }}
                    >
                      {getCategoryIcon(cat.slug, cat.category_name)}
                    </div>
                    <Text strong style={{ fontSize: 13, color: '#0F172A', textAlign: 'center', display: 'block' }}>
                      {cat.category_name}
                    </Text>
                    <span style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                      {cat.products_count} منتج
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Featured & New Arrivals Products Section */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(18px, 3vw, 24px)', textWrap: 'balance', color: '#0F172A' }}>
              <FireOutlined style={{ color: '#DC2626', marginLeft: 8 }} />
              وصل حديثاً وأحدث المنتجات
            </Title>
            <Text type="secondary" style={{ fontSize: 13, textWrap: 'balance' }}>
              أحدث ما تم إضافته لمتجر يوكا بجودة استثنائية وتفاصيل مميزة
            </Text>
          </div>
          <Link to="/catalog" className="desktop-only">
            <Button style={{ borderRadius: 8, fontWeight: 700, borderColor: '#C8A45C', color: '#0F172A' }}>
              مشاهدة الكتالوج بالكامل <ArrowLeftOutlined style={{ marginRight: 6 }} />
            </Button>
          </Link>
        </div>

        {/* Interactive Category Filter Pills */}
        {categories.length > 0 && (
          <div 
            className="horizontal-scroll-strip"
            style={{ 
              display: 'flex', 
              gap: 8, 
              overflowX: 'auto', 
              paddingBottom: 6, 
              marginBottom: 20 
            }}
          >
            <button
              type="button"
              className={`category-filter-pill ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategoryFilter('all')}
            >
              الكل ({featuredProducts.length})
            </button>

            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`category-filter-pill ${String(selectedCategoryFilter) === String(cat.id) ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter(String(cat.id))}
              >
                {getCategoryIcon(cat.slug, cat.category_name)}
                <span>{cat.category_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Products Grid / Skeleton / Empty State */}
        {loading ? (
          <Row gutter={[{ xs: 12, sm: 16, md: 20 }, { xs: 14, sm: 18, md: 24 }]}>
            {[...Array(4)].map((_, i) => (
              <Col xs={12} sm={8} lg={6} key={i}>
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 12, overflow: 'hidden' }}>
                  <div style={{ width: '100%', paddingTop: '100%', background: '#F8FAFC', borderRadius: 12, marginBottom: 12 }} />
                  <Skeleton active paragraph={{ rows: 2 }} title={{ width: '70%' }} />
                </div>
              </Col>
            ))}
          </Row>
        ) : displayedProducts.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <Empty
              description={<span style={{ fontSize: 14, color: '#64748B' }}>لا توجد منتجات متوفرة حالياً في هذا القسم المحدد</span>}
            >
              <Button 
                type="primary" 
                onClick={() => setSelectedCategoryFilter('all')}
                style={{ backgroundColor: '#0F172A', borderRadius: 8, fontWeight: 700 }}
              >
                عرض جميع المنتجات
              </Button>
            </Empty>
          </div>
        ) : (
          <>
            <Row gutter={[{ xs: 12, sm: 16, md: 20 }, { xs: 14, sm: 18, md: 24 }]}>
              {displayedProducts.map((product) => (
                <Col xs={12} sm={8} lg={6} key={product.id}>
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </Col>
              ))}
            </Row>

            {/* Mobile View More Catalog CTA */}
            <div className="mobile-only" style={{ marginTop: 24 }}>
              <Link to="/catalog" style={{ display: 'block' }}>
                <Button 
                  block 
                  size="large" 
                  style={{ 
                    borderRadius: 12, 
                    fontWeight: 800, 
                    height: 48, 
                    borderColor: '#C8A45C', 
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <span>مشاهدة جميع منتجات الكتالوج</span>
                  <ArrowLeftOutlined />
                </Button>
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
