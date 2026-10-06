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
          colorPrimary: '#C8A45C',
          colorLink: '#C8A45C',
          colorLinkHover: '#B38E46',
          colorSuccess: '#16A34A',
          colorError: '#DC2626',
          colorWarning: '#F59E0B',
          colorInfo: '#C8A45C',
          fontFamily: 'Cairo, Inter, sans-serif',
          borderRadius: 10,
          borderRadiusLG: 14,
          borderRadiusSM: 6,
          colorBgContainer: '#FFFFFF',
          colorBgLayout: '#F8FAFC',
          colorBorder: '#E2E8F0',
          colorBorderSecondary: '#F1F5F9',
          controlHeight: 40,
          controlHeightLG: 48,
          fontSize: 14,
          fontSizeLG: 16,
        },
        components: {
          Button: {
            colorPrimary: '#C8A45C',
            colorPrimaryHover: '#DFCA95',
            colorPrimaryActive: '#B38E46',
            primaryColor: '#0B0F17',
            paddingInline: 18,
            fontWeight: 700,
          },
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#334155',
            rowHoverBg: '#FBF9F5',
            borderColor: '#E2E8F0',
          },
          Card: {
            paddingLG: 20,
          },
          Modal: {
            borderRadiusLG: 16,
          },
          Tabs: {
            inkBarColor: '#C8A45C',
            itemActiveColor: '#C8A45C',
            itemSelectedColor: '#C8A45C',
          },
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
