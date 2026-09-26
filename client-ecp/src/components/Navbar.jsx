import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Input, Space, Grid } from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  ShopOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined
} from '@ant-design/icons';

const { useBreakpoint } = Grid;

export default function Navbar({ cartCount, onOpenCart, cartBounce }) {
  const [searchVal, setSearchVal] = useState('');
  const navigate = useNavigate();
  const screens = useBreakpoint();

  // If screens is empty on initial render, default gracefully
  const isMobile = screens.xs || (screens.sm === false && screens.md === false);
  const isTablet = screens.md && !screens.lg;

  const handleSearchSubmit = (e) => {
    if (e?.key === 'Enter' || e?.type === 'click' || !e) {
      if (searchVal.trim()) {
        navigate(`/catalog?search=${encodeURIComponent(searchVal.trim())}`);
      } else {
        navigate('/catalog');
      }
    }
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#0A0A0A', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
      {/* Top Announcement Bar (Tablet & Desktop) */}
      <div className="announcement-bar desktop-only" style={{ background: '#141414', color: '#E8D5A8', padding: '6px 16px', fontSize: 12, textAlign: 'center', borderBottom: '1px solid rgba(200, 164, 92, 0.15)' }}>
        <Space size="middle" wrap style={{ justifyContent: 'center' }}>
          <span>✨ شحن مجاني لجميع محافظات مصر للطلبات فوق 1500 ج.م</span>
          <span className="tablet-hide">•</span>
          <span className="tablet-hide"><SafetyCertificateOutlined style={{ color: '#C8A45C' }} /> الدفع عند الاستلام مع فحص الأوردر</span>
          <span>•</span>
          <span><PhoneOutlined style={{ color: '#C8A45C' }} /> خدمة العملاء: 01000000000</span>
        </Space>
      </div>

      {/* Main Navbar */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '8px 14px' : '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img
            src="/yokaStoreTransparent.png"
            alt="Yoka Store Logo"
            style={{ height: isMobile ? 38 : 46, objectFit: 'contain' }}
          />
        </Link>

        {/* Search Bar for Tablet & Desktop (screens.md and up) */}
        <div style={{ flex: 1, maxWidth: 520, display: isMobile ? 'none' : 'block' }}>
          <Input
            size="large"
            placeholder="ابحث عن منتج، كود، أو ماركة (مثال: بلوفر، جاكيت، Hermas)..."
            prefix={<SearchOutlined style={{ color: '#C8A45C', fontSize: 16 }} />}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
            allowClear
            style={{ borderRadius: 24, fontSize: 14, backgroundColor: '#1A1A1A', color: '#FAFAF8', borderColor: '#2D2D2D' }}
          />
        </div>

        {/* Action Buttons */}
        <Space size={isMobile ? 'small' : 'middle'} style={{ flexShrink: 0 }}>
          <Link to="/catalog" className="desktop-only">
            <Button type="text" icon={<ShopOutlined />} style={{ fontWeight: 600, color: '#E8D5A8' }}>
              الكتالوج
            </Button>
          </Link>

          {/* Desktop/Tablet Full Cart Button */}
          <Button
            type="primary"
            size={isMobile ? 'middle' : 'large'}
            className="desktop-only"
            icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
            onClick={onOpenCart}
            aria-label="سلة التسوق"
            style={{
              borderRadius: 24,
              backgroundColor: '#C8A45C',
              color: '#0A0A0A',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 700,
              padding: isTablet ? '0 14px' : '0 20px',
              border: 'none'
            }}
          >
            <span>السلة</span>
            <Badge
              count={cartCount}
              showZero
              className={cartBounce ? 'cart-badge-bounce' : ''}
              style={{
                backgroundColor: '#0A0A0A',
                color: '#C8A45C',
                marginRight: 8,
                boxShadow: 'none',
                fontWeight: 800
              }}
            />
          </Button>

          {/* Mobile Cart Icon button in Navbar */}
          <Button
            className="mobile-only btn-touch"
            type="text"
            onClick={onOpenCart}
            aria-label="سلة التسوق"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Badge count={cartCount} size="small" className={cartBounce ? 'cart-badge-bounce' : ''} style={{ backgroundColor: '#C8A45C', color: '#0A0A0A', fontWeight: 800 }}>
              <ShoppingCartOutlined style={{ fontSize: 22, color: '#E8D5A8' }} />
            </Badge>
          </Button>
        </Space>
      </div>

      {/* Mobile-Only Search Input Bar */}
      <div className="mobile-only" style={{ padding: '0 14px 10px', background: '#0A0A0A' }}>
        <Input
          size="middle"
          placeholder="ابحث عن منتج، كود، أو ماركة..."
          prefix={<SearchOutlined style={{ color: '#C8A45C', fontSize: 16 }} onClick={() => handleSearchSubmit()} />}
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
          allowClear
          style={{ borderRadius: 20, fontSize: 13, backgroundColor: '#1A1A1A', color: '#FAFAF8', borderColor: '#2D2D2D' }}
        />
      </div>

      {/* Sub Nav / Category Scroll Strip (Responsive on all screens) */}
      <div style={{ borderTop: '1px solid rgba(200, 164, 92, 0.12)', background: '#0D0D0D', padding: isMobile ? '6px 14px' : '8px 20px' }}>
        <div className="horizontal-scroll-strip" style={{ maxWidth: 1280, margin: '0 auto', fontSize: 13, fontWeight: 600 }}>
          <Link to="/" style={{ color: '#C8A45C', padding: '4px 10px', background: 'rgba(200, 164, 92, 0.1)', borderRadius: 16, whiteSpace: 'nowrap' }}>الرئيسية</Link>
          <Link to="/catalog" style={{ color: '#E8D5A8', padding: '4px 10px', borderRadius: 16, whiteSpace: 'nowrap' }}>جميع المنتجات</Link>
          <Link to="/catalog?sort=popular" style={{ color: '#E8D5A8', padding: '4px 10px', borderRadius: 16, whiteSpace: 'nowrap' }}>
            <FireOutlined style={{ color: '#C8A45C', marginLeft: 4 }} /> الأكثر مبيعاً
          </Link>
          <Link to="/catalog?min_price=1000" style={{ color: '#E8D5A8', padding: '4px 10px', borderRadius: 16, whiteSpace: 'nowrap' }}>عروض الشتاء</Link>
          <Link to="/catalog?brand=Hermas" style={{ color: '#E8D5A8', padding: '4px 10px', borderRadius: 16, whiteSpace: 'nowrap' }}>تشكيلة Hermas</Link>
        </div>
      </div>
    </header>
  );
}
