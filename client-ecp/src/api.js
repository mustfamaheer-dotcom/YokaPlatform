import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:3001');

// Ensure unique guest cart token
const getGuestCartToken = () => {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('yoka_guest_cart_token');
  if (!token) {
    token = 'guest_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('yoka_guest_cart_token', token);
  }
  return token;
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to always attach guest cart token
api.interceptors.request.use((config) => {
  const guestToken = getGuestCartToken();
  if (guestToken) {
    config.headers['x-guest-cart-token'] = guestToken;
  }
  const customerToken = localStorage.getItem('yoka_customer_token');
  if (customerToken) {
    config.headers.Authorization = `Bearer ${customerToken}`;
  }
  return config;
});

export default api;
