import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from 'antd';
import { Home, LayoutGrid, Search, ShoppingBag, MessageCircle } from 'lucide-react';

export default function MobileBottomNav({ cartCount, onOpenCart, cartBounce }) {
  return (
    <nav className="mobile-bottom-nav mobile-only" aria-label="شريط التنقل السفلي">
      {/* 1. Home */}
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} aria-label="الصفحة الرئيسية">
        <Home size={20} strokeWidth={2.2} />
        <span>الرئيسية</span>
      </NavLink>

      {/* 2. Catalog / Categories */}
      <NavLink to="/catalog" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} aria-label="الكتالوج والأقسام">
        <LayoutGrid size={20} strokeWidth={2.2} />
        <span>الأقسام</span>
      </NavLink>

      {/* 3. Search Quick Action */}
      <NavLink to="/catalog?focus=search" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} aria-label="بحث سريع">
        <Search size={20} strokeWidth={2.2} />
        <span>بحث</span>
      </NavLink>

      {/* 4. Cart Trigger */}
      <button onClick={onOpenCart} className="bottom-nav-btn bottom-nav-item" aria-label="سلة التسوق">
        <Badge
          count={cartCount}
          size="small"
          overflowCount={99}
          className={cartBounce ? 'cart-badge-bounce' : ''}
          style={{
            backgroundColor: '#C8A45C',
            color: '#0F172A',
            boxShadow: '0 2px 6px rgba(200, 164, 92, 0.4)',
            fontWeight: 800,
            fontSize: 10
          }}
        >
          <ShoppingBag size={20} strokeWidth={2.2} />
        </Badge>
        <span>السلة</span>
      </button>

      {/* 5. Contact / Support */}
      <NavLink to="/contact" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} aria-label="تواصل معنا">
        <MessageCircle size={20} strokeWidth={2.2} />
        <span>تواصل</span>
      </NavLink>
    </nav>
  );
}
