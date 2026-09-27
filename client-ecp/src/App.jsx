import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout, App as AntdApp } from 'antd';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Contact from './pages/Contact';
import MobileBottomNav from './components/MobileBottomNav';
import api from './api';
import { trackPageView, trackAddToCart } from './services/tracker';
import { Check } from 'lucide-react';
import ScrollToTop from './components/ScrollToTop';

const { Content } = Layout;

export default function App() {
  const { message } = AntdApp.useApp();
  const location = useLocation();
  const [cart, setCart] = useState({ items: [], items_count: 0, subtotal: 0 });
  const [cartDrawerVisible, setCartDrawerVisible] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [feedbackPos, setFeedbackPos] = useState(null);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

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
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const prodId = item.product_id || item.id;
    const variantId = item.variant_id || null;

    // Preserve previous cart snapshot for rollback on failure
    const prevCartSnapshot = cart;

    // 1. REAL-TIME 0ms OPTIMISTIC UI UPDATE (Instant feedback for customer)
    setCart((prev) => {
      const prevItems = prev?.items ? [...prev.items] : [];
      const itemPrice = parseFloat(item.sale_price || item.selling_price || item.unit_price || 0);

      const existingIndex = prevItems.findIndex(
        (it) => it.product_id === prodId && (it.variant_id === variantId || (!it.variant_id && !variantId))
      );

      if (existingIndex >= 0) {
        const existing = prevItems[existingIndex];
        const newQty = (parseInt(existing.quantity, 10) || 0) + qty;
        const uPrice = parseFloat(existing.unit_price) || itemPrice;
        prevItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          line_total: uPrice * newQty
        };
      } else {
        prevItems.push({
          item_id: 'temp_' + Date.now(),
          product_id: prodId,
          variant_id: variantId,
          quantity: qty,
          unit_price: itemPrice,
          line_total: itemPrice * qty,
          product_name: item.product_name || 'منتج',
          slug: item.slug || '',
          featured_image: item.featured_image || null,
          color: item.color || null,
          size: item.size || null,
          is_in_stock: true
        });
      }

      const totalCount = prevItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
      const subtotal = prevItems.reduce((sum, it) => sum + (parseFloat(it.line_total) || 0), 0);

      return {
        ...prev,
        items: prevItems,
        items_count: totalCount,
        subtotal
      };
    });

    // 2. REAL-TIME 0ms FEEDBACK & BOUNCE
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 650);

    if (triggerPos) {
      setFeedbackPos(triggerPos);
      setTimeout(() => setFeedbackPos(null), 1200);
    } else {
      message.success('تمت إضافة المنتج إلى السلة');
    }

    // Telemetry: record add to cart event
    trackAddToCart({ ...item, quantity: qty, product_id: prodId, variant_id: variantId });

    // 3. BACKGROUND PERSISTENCE & DIRECT RECONCILIATION (No secondary round-trip)
    try {
      const res = await api.post('/api/ecp/cart/items', {
        product_id: prodId,
        variant_id: variantId,
        quantity: qty
      });

      if (res.data?.success && res.data?.data) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      // Revert optimistic change on network or validation error
      setCart(prevCartSnapshot);
      message.error(err.response?.data?.message || 'عذراً، تعذر إضافة المنتج للسلة');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <ScrollToTop />
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
          <Route path="/contact" element={<Contact />} />
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
            top: Math.max(20, feedbackPos.y - 25),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
          aria-live="polite"
        >
          <Check size={16} strokeWidth={2.8} />
          <span>تمت الإضافة للسلة</span>
        </div>
      )}
    </Layout>
  );
}
