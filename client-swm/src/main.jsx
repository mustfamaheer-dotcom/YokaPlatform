import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import arEG from 'antd/locale/ar_EG';
import App from './App';
import { AntdAppBridge } from './utils/antAppBridge';
import './index.css';

// Ensure no rogue Service Worker controls /swm-admin
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (reg.scope && reg.scope.includes('/swm-admin')) {
        reg.unregister();
      }
    }
  }).catch(() => {});
}

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      direction="rtl"
      locale={arEG}
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          fontFamily: 'Cairo, Inter, sans-serif',
          borderRadius: 8
        }
      }}
    >
      <AntApp>
        <AntdAppBridge />
        <BrowserRouter
          basename={basename}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
