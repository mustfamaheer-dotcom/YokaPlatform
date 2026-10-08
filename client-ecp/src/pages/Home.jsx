import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Button, Skeleton, Typography, Empty, Tag, Space } from 'antd';
import {
  ArrowLeftOutlined,
  FireOutlined,
  ShopOutlined,
  SkinOutlined,
  CrownOutlined,
  SmileOutlined,
  SketchOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  WhatsAppOutlined,
  CompassOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import api from '../api';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { Sparkles, Star, ShieldCheck, Users, ExternalLink, Lightbulb } from 'lucide-react';
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
  const [branches, setBranches] = useState([]);
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mouseStartX, setMouseStartX] = useState(null);
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
      const [prodRes, catRes, settingsRes, branchRes] = await Promise.all([
        api.get('/api/ecp/catalog', { params: { limit: 12, sort: 'newest' } }),
        api.get('/api/ecp/catalog/categories'),
        api.get('/api/ecp/catalog/store-settings').catch(() => null),
        api.get('/api/ecp/catalog/branches').catch(() => null)
      ]);

      if (prodRes?.data?.success) {
        setFeaturedProducts((prodRes.data.data || []).filter(p => (parseInt(p.total_stock, 10) || 0) > 0));
      }
      if (catRes?.data?.success) {
        setCategories(catRes.data.data);
      }
      if (settingsRes?.data?.success && settingsRes.data.data) {
        setStoreSettings(prev => ({ ...prev, ...settingsRes.data.data }));
      }
      if (branchRes?.data?.success && Array.isArray(branchRes.data.data)) {
        setBranches(branchRes.data.data);
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

  const homeSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://yokastore.runasp.net/#organization',
        'name': 'يوكا ستور | Yoka Store',
        'url': 'https://yokastore.runasp.net/',
        'logo': 'https://yokastore.runasp.net/yokaStoreTransparent.png',
        'description': storeSettings?.seo_description || 'أرقى أزياء وموضة وملابس في مصر مع شحن سريع ودفع عند الاستلام',
        'contactPoint': {
          '@type': 'ContactPoint',
          'telephone': storeSettings?.contact_phone || '+201000000000',
          'contactType': 'customer service',
          'areaServed': 'EG',
          'availableLanguage': ['Arabic']
        }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://yokastore.runasp.net/#website',
        'url': 'https://yokastore.runasp.net/',
        'name': 'يوكا ستور Yoka Store',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': 'https://yokastore.runasp.net/catalog?search={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  }), [storeSettings]);

  const handleNextBranch = () => {
    if (branches.length === 0) return;
    setActiveBranchIndex((prev) => (prev + 1) % branches.length);
  };

  const handlePrevBranch = () => {
    if (branches.length === 0) return;
    setActiveBranchIndex((prev) => (prev - 1 + branches.length) % branches.length);
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;

    // In RTL layout, swiping left (positive deltaX) advances to next branch
    if (deltaX > 40) {
      handleNextBranch();
    } else if (deltaX < -40) {
      handlePrevBranch();
    }
    setTouchStartX(null);
  };

  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setMouseStartX(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (!isMouseDown || mouseStartX === null) return;
    const deltaX = mouseStartX - e.clientX;
    if (deltaX > 45) {
      handleNextBranch();
    } else if (deltaX < -45) {
      handlePrevBranch();
    }
    setIsMouseDown(false);
    setMouseStartX(null);
  };

  return (
    <div className="fade-in">
      <SEO
        title={storeSettings?.seo_title ? storeSettings.seo_title.replace(' | يوكا ستور', '') : 'الرئيسية — تسوق أحدث صيحات الموضة والأزياء في مصر'}
        description={storeSettings?.seo_description}
        keywords={storeSettings?.seo_keywords}
        schemaData={homeSchema}
      />

      {/* 1. Hero Banner Section */}
      <section
        className="hero-gradient"
        style={{
          borderRadius: 20,
          padding: 'clamp(20px, 3.8vw, 44px) clamp(16px, 3.5vw, 44px)',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="hero-main-layout">
          {/* Header Block: Badges, Headline, and Editorial Subtitle */}
          <div className="hero-header-area">
            {/* Category / Collection Badge */}
            {storeSettings.hero_badge_text && (
              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(200, 164, 92, 0.18)',
                    border: '1px solid rgba(200, 164, 92, 0.45)',
                    color: '#DFCA95',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 20,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  <Sparkles size={13} color="#C8A45C" />
                  <span>{storeSettings.hero_badge_text}</span>
                </span>
              </div>
            )}

            <Title level={1} className="hero-title" style={{ color: '#FFFFFF', fontWeight: 900, marginBottom: storeSettings.hero_subtitle ? 10 : 18, textWrap: 'balance' }}>
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

            {/* Editorial Subtitle */}
            {storeSettings.hero_subtitle && (
              <p
                className="hero-subtitle"
                style={{
                  color: '#CBD5E1',
                  lineHeight: 1.6,
                  marginBottom: 16,
                  maxWidth: 540
                }}
              >
                {storeSettings.hero_subtitle}
              </p>
            )}
          </div>

          {/* 3D Luxury Product Bag Showcase */}
          <div className="hero-3d-wrapper">
            {/* Luxury Backlight Halo */}
            <div className="hero-3d-backlight" />

            {/* Dynamic Breathing Pedestal Shadow */}
            <div className="hero-pedestal-shadow" />

            {/* 3D Floating Bag (Optimized LCP) */}
            <img
              src={heroBagImg}
              alt="حقيبة جلدية فاخرة يوكا ستور"
              className="hero-3d-bag"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={380}
              height={380}
            />
          </div>

          {/* Call-To-Action (CTA) Buttons Group */}
          <div className="hero-cta-group">
            <Link to={storeSettings.hero_button_link || '/catalog'} className="hero-cta-link">
              <Button
                type="primary"
                size="large"
                icon={<ArrowLeftOutlined />}
                className="hero-btn-primary"
              >
                <span className="hero-btn-text">{storeSettings.hero_button_text || 'تسوق الكتالوج الآن'}</span>
              </Button>
            </Link>

            {storeSettings.hero_secondary_button_text && (
              <Link to={storeSettings.hero_secondary_button_link || '/catalog?sort=popular'} className="hero-cta-link">
                <Button
                  size="large"
                  className="hero-btn-secondary"
                >
                  <span className="hero-btn-text">{storeSettings.hero_secondary_button_text}</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Floating Trust & Credibility Statistics */}
          {storeSettings.hero_stats_enabled !== 'false' && (
            <div className="hero-stats-bar">
              <div className="hero-stat-item">
                <Users size={14} color="#C8A45C" style={{ flexShrink: 0 }} />
                <span className="hero-stat-num">+2,500</span>
                <span className="hero-stat-label">عميل</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <Star size={13} color="#EAB308" fill="#EAB308" style={{ flexShrink: 0 }} />
                <span className="hero-stat-rating">4.9 تقييم</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <ShieldCheck size={14} color="#C8A45C" style={{ flexShrink: 0 }} />
                <span className="hero-stat-label">فحص عند الاستلام</span>
              </div>
            </div>
          )}
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

      {/* Products Section (Immediately after Hero) */}

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
            {[...Array(8)].map((_, i) => (
              <Col xs={12} sm={8} lg={6} key={i}>
                <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(226, 232, 240, 0.85)', padding: 8, overflow: 'hidden', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ width: '100%', aspectRatio: '3 / 4', background: '#F1F5F9', borderRadius: 14, marginBottom: 12 }} />
                  <div style={{ padding: '0 6px 6px' }}>
                    <Skeleton active paragraph={{ rows: 2 }} title={{ width: '75%' }} />
                  </div>
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
                className="btn-brand-primary"
                style={{ borderRadius: 8, fontWeight: 700 }}
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

      {/* 3. Interactive Branches Spotlight Card (Swipe / Swap in place) */}
      {branches.length > 0 && (
        <section
          style={{
            marginTop: 48,
            marginBottom: 24
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 18
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(200, 164, 92, 0.15)',
                    color: '#C8A45C',
                    padding: '3px 10px',
                    borderRadius: 14,
                    fontSize: 11.5,
                    fontWeight: 800
                  }}
                >
                  <CompassOutlined />
                  <span>معارضنا على الطبيعة</span>
                </span>
              </div>
              <Title
                level={2}
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 'clamp(20px, 3.5vw, 26px)',
                  color: '#0F172A'
                }}
              >
                فروعنا ومعارضنا
              </Title>
              <Text type="secondary" style={{ fontSize: 13, color: '#64748B' }}>
                تفضل بزيارتنا في فروع يوكا ستور للاستمتاع بتجربة تسوق فريدة ومعاينة الأزياء
              </Text>
            </div>

            {/* Controls: Counter + Arrow Navigation + View All */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Counter Badge */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#64748B',
                  background: '#FFFFFF',
                  padding: '5px 12px',
                  borderRadius: 16,
                  border: '1px solid #E2E8F0',
                  direction: 'ltr'
                }}
              >
                {activeBranchIndex + 1} / {branches.length}
              </span>

              {/* Prev Button (In RTL, Right arrow goes previous) */}
              <Button
                shape="circle"
                icon={<RightOutlined style={{ fontSize: 12 }} />}
                onClick={handlePrevBranch}
                aria-label="الفرع السابق"
                style={{
                  width: 38,
                  height: 38,
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                }}
              />

              {/* Next Button (In RTL, Left arrow goes next) */}
              <Button
                shape="circle"
                icon={<LeftOutlined style={{ fontSize: 12 }} />}
                onClick={handleNextBranch}
                aria-label="الفرع التالي"
                style={{
                  width: 38,
                  height: 38,
                  borderColor: '#E2E8F0',
                  color: '#0F172A',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                }}
              />

              {/* Link to Full Branches Page */}
              <Link to="/branches">
                <Button
                  type="text"
                  style={{
                    color: '#C8A45C',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '4px 10px'
                  }}
                >
                  <span>عرض الكل</span>
                  <ArrowLeftOutlined style={{ fontSize: 11 }} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Swipeable Card View Container */}
          {(() => {
            const currentBranch = branches[activeBranchIndex] || branches[0];
            const hasMap = Boolean(currentBranch?.google_maps_url);
            const workingHours = currentBranch?.working_hours || 'يومياً من 10:00 صباحاً إلى 11:00 مساءً';

            return (
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                style={{
                  userSelect: 'none',
                  cursor: 'grab',
                  position: 'relative'
                }}
              >
                <div
                  key={currentBranch.id}
                  className="fade-in"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 22,
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Decorative Top Accent Gradient */}
                  <div
                    style={{
                      height: 5,
                      background: 'linear-gradient(90deg, #0F172A 0%, #C8A45C 50%, #0F172A 100%)'
                    }}
                  />

                  <div style={{ padding: 'clamp(18px, 3vw, 28px)' }}>
                    {/* Header Row: Icon + Name + Code + City Tag */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 18,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(200, 164, 92, 0.18) 0%, rgba(15, 23, 42, 0.08) 100%)',
                            border: '1px solid rgba(200, 164, 92, 0.35)',
                            color: '#C8A45C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            flexShrink: 0
                          }}
                        >
                          <ShopOutlined />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Title
                              level={3}
                              style={{
                                margin: 0,
                                fontWeight: 800,
                                color: '#0F172A',
                                fontSize: 'clamp(17px, 2.5vw, 21px)'
                              }}
                            >
                              {currentBranch.branch_name}
                            </Title>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12, color: '#64748B' }}>
                            كود الفرع: {currentBranch.branch_code}
                          </Text>
                        </div>
                      </div>

                      {currentBranch.city && (
                        <Tag
                          style={{
                            backgroundColor: '#FFFBEB',
                            color: '#B45309',
                            borderColor: '#FDE68A',
                            borderRadius: 16,
                            fontWeight: 800,
                            padding: '4px 14px',
                            fontSize: 12,
                            margin: 0
                          }}
                        >
                          {currentBranch.city}
                        </Tag>
                      )}
                    </div>

                    {/* Details Info Grid */}
                    <Row gutter={[16, 14]} style={{ marginBottom: 22 }}>
                      <Col xs={24} md={12}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            background: '#F8FAFC',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: '1px solid #F1F5F9',
                            height: '100%'
                          }}
                        >
                          <EnvironmentOutlined style={{ color: '#EA4335', fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, color: '#94A3B8', display: 'block', fontWeight: 700 }}>عنوان الفرع:</span>
                            <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: 600, lineHeight: 1.5 }}>
                              {currentBranch.address || 'العنوان متاح عبر خدمة العملاء'}
                            </Text>
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            background: '#F8FAFC',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: '1px solid #F1F5F9',
                            height: '100%'
                          }}
                        >
                          <ClockCircleOutlined style={{ color: '#C8A45C', fontSize: 17, marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, color: '#94A3B8', display: 'block', fontWeight: 700 }}>مواعيد العمل:</span>
                            <Text style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
                              {workingHours}
                            </Text>
                          </div>
                        </div>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            background: '#F8FAFC',
                            padding: '12px 14px',
                            borderRadius: 12,
                            border: '1px solid #F1F5F9',
                            height: '100%'
                          }}
                        >
                          <PhoneOutlined style={{ color: '#16A34A', fontSize: 17, marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, color: '#94A3B8', display: 'block', fontWeight: 700 }}>رقم هاتف الفرع:</span>
                            {currentBranch.phone ? (
                              <a
                                href={`tel:${currentBranch.phone}`}
                                style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', direction: 'ltr', textDecoration: 'none' }}
                              >
                                {currentBranch.phone}
                              </a>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>غير متوفر</Text>
                            )}
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {hasMap ? (
                        <a
                          href={currentBranch.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', flex: 1, minWidth: 200 }}
                        >
                          <Button
                            type="primary"
                            block
                            icon={<EnvironmentOutlined style={{ fontSize: 15 }} />}
                            className="btn-cobalt"
                            style={{
                              height: 44,
                              borderRadius: 12,
                              fontWeight: 800,
                              fontSize: 13.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                          >
                            <span>عرض الموقع على خرائط جوجل</span>
                            <ExternalLink size={14} />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          disabled
                          style={{ height: 44, borderRadius: 12, flex: 1, minWidth: 200 }}
                        >
                          الخريطة ستتوفر قريباً
                        </Button>
                      )}

                      {currentBranch.phone && (
                        <a
                          href={`https://wa.me/${currentBranch.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', minWidth: 160 }}
                        >
                          <Button
                            block
                            icon={<WhatsAppOutlined style={{ color: '#25D366', fontSize: 16 }} />}
                            style={{
                              height: 44,
                              borderRadius: 12,
                              fontWeight: 700,
                              color: '#0F172A',
                              borderColor: '#E2E8F0',
                              fontSize: 13,
                              backgroundColor: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6
                            }}
                          >
                            <span>واتساب الفرع</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Swipe Help Caption on Mobile */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      borderTop: '1px solid #F1F5F9',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11.5,
                      color: '#94A3B8'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Lightbulb size={13} style={{ color: '#C8A45C' }} />
                      <span>يمكنك السحب يميناً أو يساراً للتنقل بين الفروع</span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#C8A45C' }}>
                      اسحب للتالي ←
                    </span>
                  </div>
                </div>

                {/* Dot Indicators */}
                {branches.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 14
                    }}
                  >
                    {branches.map((b, idx) => {
                      const isActive = idx === activeBranchIndex;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setActiveBranchIndex(idx)}
                          aria-label={`الانتقال إلى ${b.branch_name}`}
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            height: 8,
                            width: isActive ? 28 : 8,
                            borderRadius: 4,
                            backgroundColor: isActive ? '#C8A45C' : '#CBD5E1',
                            transition: 'all 0.3s ease',
                            padding: 0
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}
