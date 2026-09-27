import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Tooltip, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import styles from './ProductCard.module.css';

const { Text, Title } = Typography;

// Simple colour resolver (fallback to gray)
const resolveColorHex = (name) => {
  return name ? name : '#E2E8F0';
};

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();
  const totalStock = parseInt(product.total_stock || 0, 10);
  const isAvailable = totalStock > 0;
  const rawSelling = parseFloat(product.selling_price);
  const originalPrice = !isNaN(rawSelling) && rawSelling > 0 ? rawSelling : 0;
  const rawSale = parseFloat(product.sale_price);
  const hasDiscount = !isNaN(rawSale) && rawSale > 0 && rawSale < originalPrice;
  const price = hasDiscount ? rawSale : originalPrice;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if ((product.sizes && product.sizes.length > 1) || (product.colors && product.colors.length > 1)) {
      navigate(`/product/${product.slug || product.id}`);
    } else {
      onAddToCart?.(product);
    }
  };

  return (
    <div className={styles['product-card']}>
      <Link to={`/product/${product.slug || product.id}`} className={styles['product-img-wrapper']}>
        <img
          src={product.featured_image || yokaLogo}
          alt={product.product_name || 'صورة المنتج'}
          loading="lazy"
          className={styles['product-img']}
          onError={(e) => {
            e.target.src = yokaLogo;
          }}
        />
        {hasDiscount && (
          <span className={styles['discount-badge']}>
            <FireOutlined style={{ fontSize: 11 }} />
            -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
          </span>
        )}
      </Link>

      <div className={styles['product-content']}>
        <Link to={`/product/${product.slug || product.id}`}>
          <Title level={5} ellipsis={{ rows: 2 }} className={styles['product-title']}>
            {product.product_name}
          </Title>
        </Link>

        <div className={styles['product-price']}> {price.toLocaleString()} ج.م</div>

        <Button
          type="primary"
          className={styles['add-to-cart-btn']}
          icon={<ShoppingCartOutlined />}
          onClick={handleClick}
          aria-label={`Add ${product.product_name} to cart`}
        >
          أضف إلى السلة
        </Button>
      </div>
    </div>
  );
}
