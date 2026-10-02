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
import SEO from '../components/SEO';
import { Sparkles, Star, ShieldCheck, Users } from 'lucide-react';
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

            {/* 3D Floating Bag */}
            <img
              src={heroBagImg}
              alt="حقيبة جلدية فاخرة يوكا ستور"
              className="hero-3d-bag"
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
