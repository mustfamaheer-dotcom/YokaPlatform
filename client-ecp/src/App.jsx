import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, App as AntdApp } from 'antd';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import MobileBottomNav from './components/MobileBottomNav';
import api from './api';

const { Content } = Layout;

export default function App() {
  const { message } = AntdApp.useApp();
  const [cart, setCart] = useState({ items: [], items_count: 0, subtotal: 0 });
  const [cartDrawerVisible, setCartDrawerVisible] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [feedbackPos, setFeedbackPos] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await api.get('/api/ecp/cart');
      if (res.data.success) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.error('Cart fetch error:', err);
    }
  };

  const handleAddToCart = async (item) => {
    const triggerPos = item._triggerPos || null;
    try {
      const res = await api.post('/api/ecp/cart/items', {
        product_id: item.product_id || item.id,
        variant_id: item.variant_id || null,
        quantity: item.quantity || 1
      });

      if (res.data.success) {
        fetchCart();
        
        // Trigger cart badge bounce
        setCartBounce(true);
        setTimeout(() => setCartBounce(false), 650);

        // Show lightweight floating toast chip near trigger point if provided
        if (triggerPos) {
          setFeedbackPos(triggerPos);
          setTimeout(() => setFeedbackPos(null), 1100);
        } else {
          message.success(res.data.message || 'تمت إضافة المنتج إلى السلة');
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'تعذر إضافة المنتج للسلة');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Navbar
        cartCount={cart?.items_count || 0}
        onOpenCart={() => setCartDrawerVisible(true)}
        cartBounce={cartBounce}
      />

      <Content className="page-content" style={{ maxWidth: 1280, width: '100%', margin: '16px auto', flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home onAddToCart={handleAddToCart} />} />
          <Route path="/catalog" element={<Catalog onAddToCart={handleAddToCart} />} />
          <Route path="/product/:slug" element={<ProductDetail onAddToCart={handleAddToCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} onRefreshCart={fetchCart} />} />
          <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
          <Route path="*" element={<Home onAddToCart={handleAddToCart} />} />
        </Routes>
      </Content>

      <CartDrawer
        visible={cartDrawerVisible}
        onClose={() => setCartDrawerVisible(false)}
        cart={cart}
        onRefreshCart={fetchCart}
      />

      <Footer />
      <MobileBottomNav
        cartCount={cart?.items_count || 0}
        onOpenCart={() => setCartDrawerVisible(true)}
        cartBounce={cartBounce}
      />

      {/* Lightweight Floating Add Confirmation (removed after 1.1s) */}
      {feedbackPos && (
        <div
          className="add-to-cart-feedback"
          style={{
            left: Math.max(16, Math.min(window.innerWidth - 180, feedbackPos.x - 70)),
            top: Math.max(20, feedbackPos.y - 25)
          }}
          aria-live="polite"
        >
          <span>✓</span>
          <span>تمت الإضافة للسلة</span>
        </div>
      )}
    </Layout>
  );
}
