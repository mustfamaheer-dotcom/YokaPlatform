import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Card, Select, Slider, Input, Button, Pagination, Spin, Skeleton, Empty, Typography, Space, Tag, Drawer, Grid } from 'antd';
import { FilterOutlined, SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../api';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export default function Catalog({ onAddToCart }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const screens = useBreakpoint();
  const isMobile = screens.xs || (screens.sm === false && screens.md === false);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [color, setColor] = useState(searchParams.get('color') || '');
  const [size, setSize] = useState(searchParams.get('size') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Sync URL params when they change externally
    const s = searchParams.get('search') || '';
    const b = searchParams.get('brand') || '';
    const c = searchParams.get('category_id') || '';
    const so = searchParams.get('sort') || 'newest';
    const focus = searchParams.get('focus') || '';

    setSearch(s);
    setBrand(b);
    setCategoryId(c);
    setSort(so);

    if (focus === 'search') {
      setFilterDrawerVisible(true);
    }

    fetchProducts(1, { search: s, brand: b, category_id: c, sort: so });
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/ecp/catalog/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async (page = 1, overrideFilters = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        search: overrideFilters.search !== undefined ? overrideFilters.search : search,
        category_id: overrideFilters.category_id !== undefined ? overrideFilters.category_id : categoryId,
        brand: overrideFilters.brand !== undefined ? overrideFilters.brand : brand,
        min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
        max_price: priceRange[1] < 5000 ? priceRange[1] : undefined,
        color: color || undefined,
        size: size || undefined,
        sort: overrideFilters.sort || sort
      };

      const res = await api.get('/api/ecp/catalog', { params });
      if (res.data.success) {
        const inStock = (res.data.data || []).filter(p => (parseInt(p.total_stock, 10) || 0) > 0);
        setProducts(inStock);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Catalog fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchProducts(1);
    setFilterDrawerVisible(false); // Close mobile drawer if open
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setBrand('');
    setPriceRange([0, 5000]);
    setColor('');
    setSize('');
    setSort('newest');
    setSearchParams({});
    fetchProducts(1, { search: '', category_id: '', brand: '', sort: 'newest' });
    setFilterDrawerVisible(false);
  };

  const renderFilterContent = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <FilterOutlined style={{ color: '#C8A45C' }} />
          <Text strong>فلاتر البحث والتصفية</Text>
        </Space>
        <Button type="link" size="small" onClick={handleResetFilters} style={{ color: '#C8A45C' }}>
          إعادة ضبط
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>كلمة البحث</Text>
        <Input
          placeholder="اسم المنتج أو الكود..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleApplyFilters}
          allowClear
        />
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>التصنيف</Text>
        <Select
          placeholder="جميع التصنيفات"
          value={categoryId || undefined}
          onChange={(val) => setCategoryId(val || '')}
          style={{ width: '100%' }}
          allowClear
        >
          {categories.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.category_name} ({c.products_count})
            </Option>
          ))}
        </Select>
      </div>

      {/* Brand Filter */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>الماركة / البراند</Text>
        <Input
          placeholder="مثال: Hermas, Nike..."
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          allowClear
        />
      </div>

      {/* Price Range Slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text strong>نطاق السعر</Text>
          <Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            {priceRange[0]} - {priceRange[1]} ج.م
          </Text>
        </div>
        <Slider
          range
          min={0}
          max={5000}
          step={50}
          value={priceRange}
          onChange={(val) => setPriceRange(val)}
        />
      </div>

      {/* Sizes Filter */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>المقاس</Text>
        <Space wrap size={[6, 6]}>
          {['S', 'M', 'L', 'XL', 'XXL'].map((s) => (
            <Tag.CheckableTag
              key={s}
              checked={size === s}
              onChange={(checked) => setSize(checked ? s : '')}
              style={{ padding: '4px 10px', borderRadius: 4, fontWeight: 700, backgroundColor: size === s ? '#0F172A' : '#F8FAFC', color: size === s ? '#FFFFFF' : '#0F172A', border: '1px solid', borderColor: size === s ? '#0F172A' : '#E2E8F0' }}
            >
              {s}
            </Tag.CheckableTag>
          ))}
        </Space>
      </div>

      <Button
        type="primary"
        block
        onClick={handleApplyFilters}
        style={{ backgroundColor: '#C8A45C', color: '#0F172A', borderRadius: 8, height: 44, fontWeight: 800, border: 'none', boxShadow: '0 2px 8px rgba(200, 164, 92, 0.25)' }}
      >
        تطبيق الفلاتر
      </Button>
    </>
  );

  const currentCategory = categories.find((c) => String(c.id) === String(categoryId));
  const hasPriceFilter = priceRange[0] > 0 || priceRange[1] < 5000;
  const activeFilters = [
    search ? { key: 'search', label: `بحث: ${search}`, onClear: () => { setSearch(''); fetchProducts(1, { search: '' }); } } : null,
    categoryId ? { key: 'category', label: `القسم: ${currentCategory?.category_name || categoryId}`, onClear: () => { setCategoryId(''); fetchProducts(1, { category_id: '' }); } } : null,
    brand ? { key: 'brand', label: `ماركة: ${brand}`, onClear: () => { setBrand(''); fetchProducts(1, { brand: '' }); } } : null,
    size ? { key: 'size', label: `مقاس: ${size}`, onClear: () => { setSize(''); fetchProducts(1, { size: '' }); } } : null,
    hasPriceFilter ? { key: 'price', label: `السعر: ${priceRange[0]} - ${priceRange[1]} ج.م`, onClear: () => { setPriceRange([0, 5000]); } } : null,
  ].filter(Boolean);

  const activeCategory = categories.find((c) => String(c.id) === String(categoryId));
  let catalogTitle = 'الكتالوج وجميع المنتجات';
  if (search) {
    catalogTitle = `نتائج البحث عن "${search}" في الكتالوج`;
  } else if (activeCategory) {
    catalogTitle = `تشكيلة ${activeCategory.category_name} الفاخرة`;
  } else if (sort === 'popular') {
    catalogTitle = 'المنتجات الأكثر مبيعاً والأعلى طلباً';
  }

  const catalogDesc = activeCategory
    ? `اكتشف أرقى موديلات ${activeCategory.category_name} متوفرة للطلب أونلاين بأسعار مميزة وخامات عالية الجودة مع شحن سريع ومعاينة قبل الاستلام من يوكا ستور مصر.`
    : `تسوق أونلاين من كتالوج يوكا ستور مصر — أحدث صيحات الموضة والملابس بجودة استثنائية وشحن سريع لجميع المحافظات والدفع عند الاستلام.`;

  const catalogSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': `${catalogTitle} | يوكا ستور مصر`,
    'description': catalogDesc,
    'url': typeof window !== 'undefined' ? window.location.href : 'https://yokastore.runasp.net/catalog'
  };

  return (
    <div className="fade-in">
      <SEO
        title={catalogTitle}
        description={catalogDesc}
        schemaData={catalogSchema}
      />

      {/* Page Title & Sort Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(20px, 3.5vw, 28px)', color: '#0F172A' }}>الكتالوج والمنتجات</Title>
          <Text type="secondary" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#64748B' }}>
            عرض {meta.total} منتج متوفر للطلب أونلاين
          </Text>
        </div>

        <Space size="middle">
          <Button 
            className="mobile-only btn-touch" 
            icon={<FilterOutlined style={{ color: '#C8A45C' }} />} 
            onClick={() => setFilterDrawerVisible(true)}
            style={{ borderRadius: 8, fontWeight: 700, borderColor: '#C8A45C', color: '#0F172A' }}
          >
            تصفية وفلاتر {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}
          </Button>

          <Space size="small">
            <Text style={{ fontWeight: 600, color: '#0F172A' }} className="desktop-only">ترتيب حسب:</Text>
            <Select
              value={sort}
              onChange={(val) => {
                setSort(val);
                fetchProducts(1, { sort: val });
              }}
              style={{ width: 145 }}
            >
              <Option value="newest">الأحدث وصولاً</Option>
              <Option value="price_asc">السعر: من الأقل</Option>
              <Option value="price_desc">السعر: من الأعلى</Option>
              <Option value="popular">الأكثر طلباً</Option>
            </Select>
          </Space>
        </Space>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18, background: '#FFFFFF', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>الفلاتر النشطة:</Text>
          {activeFilters.map((f) => (
            <Tag
              key={f.key}
              closable
              onClose={f.onClear}
              color="gold"
              style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}
            >
              {f.label}
            </Tag>
          ))}
          <Button type="link" size="small" onClick={handleResetFilters} style={{ padding: 0, fontSize: 12, color: '#C8A45C', fontWeight: 700 }}>
            مسح الكل
          </Button>
        </div>
      )}

      <Row gutter={[{ xs: 12, sm: 16, md: 24 }, { xs: 12, sm: 16, md: 24 }]}>
        {/* Desktop Sidebar Filters */}
        <Col xs={0} md={7} lg={6}>
          <Card style={{ borderRadius: 12, borderColor: '#E2E8F0', position: 'sticky', top: 120 }}>
            {renderFilterContent()}
          </Card>
        </Col>

        {/* Mobile Filter Drawer */}
        <Drawer
          zIndex={1300}
          title={
            <div>
              <div className="bottom-sheet-handle" />
              <span style={{ fontWeight: 700 }}>فلاتر البحث والتصفية</span>
            </div>
          }
          placement="bottom"
          height="85vh"
          destroyOnClose={true}
          onClose={() => setFilterDrawerVisible(false)}
          open={filterDrawerVisible}
          className="mobile-only"
        >
          {renderFilterContent()}
        </Drawer>

        {/* Products Grid Area */}
        <Col xs={24} md={17} lg={18}>
          {/* Quick Mobile Category Strip */}
          {categories.length > 0 && (
            <div
              className="horizontal-scroll-strip mobile-only"
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 8,
                marginBottom: 16
              }}
            >
              <button
                type="button"
                className={`category-filter-pill ${!categoryId ? 'active' : ''}`}
                onClick={() => {
                  setCategoryId('');
                  fetchProducts(1, { category_id: '' });
                }}
              >
                الكل
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`category-filter-pill ${String(categoryId) === String(c.id) ? 'active' : ''}`}
                  onClick={() => {
                    setCategoryId(String(c.id));
                    fetchProducts(1, { category_id: String(c.id) });
                  }}
                >
                  <span>{c.category_name}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <Row gutter={[{ xs: 10, sm: 12, md: 16 }, { xs: 12, sm: 16, md: 20 }]}>
              {[...Array(8)].map((_, i) => (
                <Col xs={12} sm={12} md={8} lg={6} key={i}>
                  <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid rgba(226, 232, 240, 0.85)', padding: 8, overflow: 'hidden', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)' }}>
                    <div style={{ width: '100%', aspectRatio: '3 / 4', background: '#F1F5F9', borderRadius: 14, marginBottom: 12 }} />
                    <div style={{ padding: '0 6px 6px' }}>
                      <Skeleton active paragraph={{ rows: 2 }} title={{ width: '75%' }} />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : products.length > 0 ? (
            <>
              <Row gutter={[{ xs: 10, sm: 12, md: 16 }, { xs: 12, sm: 16, md: 20 }]}>
                {products.map((product) => (
                  <Col xs={12} sm={12} md={8} lg={6} key={product.id}>
                    <ProductCard product={product} onAddToCart={onAddToCart} />
                  </Col>
                ))}
              </Row>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div style={{ textAlign: 'center', marginTop: 36, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    current={meta.page}
                    total={meta.total}
                    pageSize={meta.limit}
                    simple={!screens.md}
                    onChange={(p) => {
                      fetchProducts(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <Empty
                description={<span style={{ color: '#64748B', fontSize: 15 }}>لم يتم العثور على أي منتجات مطابقة للبحث</span>}
              >
                <Button type="primary" onClick={handleResetFilters} style={{ backgroundColor: '#C8A45C', color: '#0F172A', borderRadius: 6, border: 'none', fontWeight: 700 }}>
                  إعادة ضبط الفلاتر
                </Button>
              </Empty>
            </div>
          )}
        </Col>
      </Row>

      {/* Floating Mobile Filter Pill */}
      {isMobile && !filterDrawerVisible && (
        <button
          type="button"
          className="mobile-floating-filter-pill"
          onClick={() => setFilterDrawerVisible(true)}
          aria-label="تصفية المنتجات"
        >
          <FilterOutlined style={{ color: '#C8A45C' }} />
          <span>تصفية وفلاتر {activeFilters.length > 0 ? `(${activeFilters.length})` : ''}</span>
        </button>
      )}
    </div>
  );
}
