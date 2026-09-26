import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Button, Skeleton, Typography, Card } from 'antd';
import { ArrowLeftOutlined, FireOutlined, ThunderboltOutlined, ShopOutlined } from '@ant-design/icons';
import api from '../api';
import ProductCard from '../components/ProductCard';

const { Title, Text } = Typography;

export default function Home({ onAddToCart }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/api/ecp/catalog', { params: { limit: 8, sort: 'newest' } }),
        api.get('/api/ecp/catalog/categories')
      ]);

      if (prodRes.data.success) {
        setFeaturedProducts(prodRes.data.data);
      }
      if (catRes.data.success) {
        setCategories(catRes.data.data);
      }
    } catch (err) {
      console.error('Home data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Hero Banner Section */}
      <section
        className="hero-gradient"
        style={{
          borderRadius: 16,
          padding: 'clamp(28px, 5vw, 48px) clamp(16px, 4vw, 36px)',
          color: '#FAFAF8',
          marginBottom: 36,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: 640, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(200,164,92,0.15)', padding: '5px 12px', borderRadius: 20, marginBottom: 14, fontSize: 12, backdropFilter: 'blur(4px)', color: '#E8D5A8' }}>
            <ThunderboltOutlined style={{ color: '#C8A45C' }} />
            <span>تشكيلة الموسم الجديد متوفرة الآن</span>
          </div>

          <Title level={1} className="hero-title" style={{ color: '#FAFAF8', fontWeight: 900, marginBottom: 14, textWrap: 'balance' }}>
            أناقة وفخامة تليق بك مع <span style={{ color: '#C8A45C' }}>يوكا ستور</span>
          </Title>

          <Text className="hero-subtitle" style={{ color: '#E8E8E8', display: 'block', marginBottom: 24, lineHeight: 1.7, textWrap: 'balance' }}>
            تسوق أفضل خامات الملابس الرجالية والشبابية، بلوفرات وتيشيرتات بتصاميم عصرية، مع تجربة شحن فائقة السرعة والدفع عند الاستلام.
          </Text>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/catalog" style={{ flex: '1 1 200px' }}>
              <Button
                type="primary"
                size="large"
                icon={<ArrowLeftOutlined />}
                style={{
                  height: 48,
                  width: '100%',
                  backgroundColor: '#C8A45C',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  borderRadius: 24,
                  fontSize: 15,
                  border: 'none'
                }}
              >
                تسوق التشكيلة الآن
              </Button>
            </Link>

            <Link to="/catalog?brand=Hermas" style={{ flex: '1 1 180px' }}>
              <Button
                size="large"
                style={{
                  height: 48,
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#FAFAF8',
                  borderColor: 'rgba(200,164,92,0.3)',
                  fontWeight: 600,
                  borderRadius: 24,
                  fontSize: 14
                }}
              >
                منتجات Hermas
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 320,
            height: 320,
            background: 'radial-gradient(circle, rgba(200, 164, 92, 0.2) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
      </section>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 3vw, 22px)' }}>التصنيفات المميزة</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>تصفح منتجاتنا المفضلة حسب الفئة</Text>
            </div>
            <Link to="/catalog" style={{ color: '#C8A45C', fontWeight: 600, fontSize: 13 }}>
              عرض الكل <ArrowLeftOutlined />
            </Link>
          </div>

          <Row gutter={[{ xs: 10, sm: 14, md: 16 }, { xs: 10, sm: 14, md: 16 }]}>
            {categories.map((cat) => (
              <Col xs={12} sm={8} md={6} key={cat.id}>
                <Link to={`/catalog?category_id=${cat.id}`}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      textAlign: 'center',
                      background: '#FFFFFF',
                      border: '1px solid #E8E4DB',
                      transition: 'all 0.2s',
                      height: '100%'
                    }}
                    styles={{ body: { padding: '16px 10px' } }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        margin: '0 auto 10px',
                        background: 'rgba(200, 164, 92, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C8A45C',
                        fontSize: 22
                      }}
                    >
                      <ShopOutlined aria-hidden="true" />
                    </div>
                    <Text strong style={{ fontSize: 14, display: 'block', color: '#1A1A1A' }}>
                      {cat.category_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {cat.products_count} منتج متوفر
                    </Text>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* Featured Products Grid */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 3vw, 22px)', textWrap: 'balance' }}>
              <FireOutlined style={{ color: '#C8A45C', marginLeft: 6 }} />
              وصل حديثاً وأحدث المنتجات
            </Title>
            <Text type="secondary" style={{ fontSize: 13, textWrap: 'balance' }}>أحدث ما تم إضافته لمتجر يوكا بجودة استثنائية</Text>
          </div>
          <Link to="/catalog" className="desktop-only">
            <Button style={{ borderRadius: 8, fontWeight: 600 }}>مشاهدة المزيد</Button>
          </Link>
        </div>

        {loading ? (
          <Row gutter={[{ xs: 10, sm: 14, md: 16 }, { xs: 12, sm: 16, md: 20 }]}>
            {[...Array(4)].map((_, i) => (
              <Col xs={12} sm={8} md={6} key={i}>
                <Card style={{ borderRadius: 12, overflow: 'hidden' }} styles={{ body: { padding: 12 } }}>
                  <div style={{ width: '100%', paddingTop: '100%', background: '#F5F5F3', borderRadius: 8, marginBottom: 12 }} />
                  <Skeleton active paragraph={{ rows: 2 }} title={{ width: '60%' }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <>
            <Row gutter={[{ xs: 10, sm: 14, md: 16 }, { xs: 12, sm: 16, md: 20 }]}>
              {featuredProducts.map((product) => (
                <Col xs={12} sm={8} md={6} key={product.id}>
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </Col>
              ))}
            </Row>

            {/* Mobile View More Button */}
            <Link to="/catalog" className="mobile-only" style={{ display: 'block', marginTop: 24 }}>
              <Button block size="large" style={{ borderRadius: 8, fontWeight: 700, height: 46, borderColor: '#C8A45C', color: '#1A1A1A' }}>
                مشاهدة جميع المنتجات في الكتالوج <ArrowLeftOutlined style={{ marginRight: 6 }} />
              </Button>
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
