import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import arEG from 'antd/locale/ar_EG';
import App from './App';
import './index.css';

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
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
