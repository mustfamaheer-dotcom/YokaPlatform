import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import arEG from 'antd/locale/ar_EG';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Self-healing check: If a stale service worker incorrectly served ECP on /swm-admin,
// unregister all service workers immediately and force a hard reload from the network.
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/swm-admin')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
      window.location.replace('/swm-admin/');
    });
  } else {
    window.location.replace('/swm-admin/');
  }
}

if (import.meta.env.PROD && typeof window !== 'undefined' && !window.location.pathname.startsWith('/swm-admin')) {
  registerSW({ immediate: true });
}
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfigProvider
        direction="rtl"
        locale={arEG}
        theme={{
          token: {
            colorPrimary: '#C8A45C',
            colorLink: '#C8A45C',
            colorLinkHover: '#A68942',
            colorSuccess: '#2D7A3A',
            colorError: '#C62828',
            fontFamily: 'Cairo, sans-serif',
            borderRadius: 8,
            colorBgContainer: '#FFFFFF',
            colorBgLayout: '#FAFAF8',
            colorBorder: '#E8E4DB',
            colorText: '#1A1A1A',
            colorTextSecondary: '#6B6B6B',
          },
          components: {
            Button: {
              colorPrimary: '#C8A45C',
              colorPrimaryHover: '#A68942',
              colorPrimaryActive: '#8A7035',
              primaryColor: '#FFFFFF',
            },
            Input: {
              activeBorderColor: '#C8A45C',
              hoverBorderColor: '#D4B76A',
            },
            Slider: {
              trackBg: '#C8A45C',
              handleColor: '#C8A45C',
            }
          }
        }}
      >
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
