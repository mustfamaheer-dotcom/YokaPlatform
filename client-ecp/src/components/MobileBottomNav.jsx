import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from 'antd';
import {
  HomeOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  PhoneOutlined
} from '@ant-design/icons';

export default function MobileBottomNav({ cartCount, onOpenCart, cartBounce }) {
  return (
    <nav className="mobile-bottom-nav mobile-only">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
        <HomeOutlined />
        <span>الرئيسية</span>
      </NavLink>
      <NavLink to="/catalog" className={({ isActive }) => isActive ? 'active' : ''}>
        <AppstoreOutlined />
        <span>المنتجات</span>
      </NavLink>
      <button onClick={onOpenCart} className="bottom-nav-btn" aria-label="عرض السلة">
        <Badge count={cartCount} size="small" className={cartBounce ? 'cart-badge-bounce' : ''} style={{ backgroundColor: '#C8A45C', color: '#1C1917', boxShadow: 'none', fontWeight: 800 }}>
          <ShoppingCartOutlined style={{ fontSize: '20px', color: 'inherit' }} />
        </Badge>
        <span>السلة</span>
      </button>
      <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''} aria-label="تواصل معنا">
        <PhoneOutlined />
        <span>تواصل معنا</span>
      </NavLink>
    </nav>
  );
}
