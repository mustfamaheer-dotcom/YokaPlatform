import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Badge, Button, Input, Space, Grid } from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  FireOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { Flame } from 'lucide-react';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import api from '../api';

const { useBreakpoint } = Grid;

export default function Navbar({ cartCount, onOpenCart, cartBounce, settings }) {
  const [searchVal, setSearchVal] = useState('');
  const [storeSettings, setStoreSettings] = useState(settings || null);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  useEffect(() => {
    if (settings) {
      setStoreSettings(settings);
    } else {
      api.get('/api/ecp/catalog/store-settings')
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setStoreSettings(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [settings]);

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

  const isOfferActive = storeSettings?.hero_offer_enabled !== 'false';
  const offerText = storeSettings?.hero_offer_text || 'احصل على خصم يصل إلى 50%';
  const offerLink = storeSettings?.hero_offer_link || '/catalog';

  const isHome = location.pathname === '/';
  const isCatalog = location.pathname === '/catalog' && !location.search.includes('sort=popular');
  const isPopular = location.pathname === '/catalog' && location.search.includes('sort=popular');
  const isContact = location.pathname === '/contact';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Unified Single-Line Header */}
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          height: isMobile ? 54 : 68,
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 18
        }}
      >
        {/* Right Section: Logo + Desktop Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 18, flexShrink: 0 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              src={yokaLogo}
              alt="Yoka Store Logo"
              style={{
                height: isMobile ? 32 : 44,
                width: 'auto',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </Link>

          {/* Desktop Nav Links (One Line) */}
          {!isMobile && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
              <Link
                to="/"
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: isHome ? 800 : 600,
                  color: isHome ? '#0F172A' : '#475569',
                  backgroundColor: isHome ? 'rgba(200, 164, 92, 0.16)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                الرئيسية
              </Link>

              <Link
                to="/catalog"
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: isCatalog ? 800 : 600,
                  color: isCatalog ? '#0F172A' : '#475569',
                  backgroundColor: isCatalog ? 'rgba(200, 164, 92, 0.16)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                جميع المنتجات
              </Link>

              <Link
                to="/catalog?sort=popular"
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: isPopular ? 800 : 600,
                  color: isPopular ? '#0F172A' : '#475569',
                  backgroundColor: isPopular ? 'rgba(200, 164, 92, 0.16)' : 'transparent',
                  display: isTablet ? 'none' : 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <FireOutlined style={{ color: '#C8A45C', fontSize: 13 }} />
                <span>الأكثر مبيعاً</span>
              </Link>

              <Link
                to="/contact"
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: isContact ? 800 : 600,
                  color: isContact ? '#0F172A' : '#475569',
                  backgroundColor: isContact ? 'rgba(200, 164, 92, 0.16)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                تواصل معنا
              </Link>

              {/* Dynamic Offer Pill inside header if active */}
              {isOfferActive && (
                <Link
                  to={offerLink}
                  style={{
                    display: screens.xl ? 'inline-flex' : 'none',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 18,
                    background: 'rgba(200, 164, 92, 0.12)',
                    border: '1px solid rgba(200, 164, 92, 0.35)',
                    color: '#B38E46',
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    marginRight: 6
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={13} color="#C8A45C" strokeWidth={2.4} />
                    <span>{offerText}</span>
                  </span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Center: Search Bar (Integrated smoothly in the single line) */}
        <div style={{ flex: '1 1 auto', maxWidth: isMobile ? 260 : 440, minWidth: isMobile ? 130 : 200, margin: '0 4px' }}>
          <Input
            size={isMobile ? 'middle' : 'large'}
            placeholder={isMobile ? 'ابحث عن منتج...' : 'ابحث عن منتج، كود، أو ماركة...'}
            prefix={<SearchOutlined style={{ color: '#C8A45C', fontSize: isMobile ? 14 : 16 }} onClick={() => handleSearchSubmit()} />}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
            allowClear
            style={{
              height: isMobile ? 38 : 42,
              borderRadius: 22,
              fontSize: isMobile ? 12.5 : 13.5,
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              borderColor: '#CBD5E1'
            }}
          />
        </div>

        {/* Left Section: Catalog (on tablet) & Cart Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, flexShrink: 0 }}>
          {/* Desktop/Tablet Full Cart Button */}
          <Button
            type="primary"
            size={isMobile ? 'middle' : 'large'}
            className="desktop-only"
            icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
            onClick={onOpenCart}
            aria-label="سلة التسوق"
            style={{
              height: 44,
              borderRadius: 22,
              backgroundColor: '#C8A45C',
              color: '#0F172A',
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: 800,
              padding: isTablet ? '0 16px' : '0 20px',
              border: 'none',
              boxShadow: '0 2px 10px rgba(200, 164, 92, 0.28)'
            }}
          >
            <span>السلة</span>
            <Badge
              count={cartCount}
              showZero
              className={cartBounce ? 'cart-badge-bounce' : ''}
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                marginRight: 8,
                boxShadow: 'none',
                fontWeight: 800
              }}
            />
          </Button>

          {/* Mobile Cart Button */}
          <Button
            className="mobile-only btn-touch"
            type="text"
            onClick={onOpenCart}
            aria-label="سلة التسوق"
            style={{
              width: 44,
              height: 44,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0'
            }}
          >
            <Badge
              count={cartCount}
              size="small"
              className={cartBounce ? 'cart-badge-bounce' : ''}
              style={{ backgroundColor: '#C8A45C', color: '#0F172A', fontWeight: 800 }}
            >
              <ShoppingCartOutlined style={{ fontSize: 20, color: '#0F172A' }} />
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
