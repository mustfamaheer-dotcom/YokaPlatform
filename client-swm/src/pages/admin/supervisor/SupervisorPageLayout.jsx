import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Tag, Space, App, Dropdown } from 'antd';
import {
  ArrowRight,
  ScanLine,
  Lock,
  LogOut,
  Building,
  LayoutGrid,
  Home,
  LayoutDashboard,
  MoreVertical
} from 'lucide-react';
import api from '../../../api';
import yokaLogo from '../../../assets/yokaStoreTransparent.png';

export default function SupervisorPageLayout({
  currentUser,
  pageTitle,
  pageIcon,
  pageSubtitle,
  children
}) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const branchName = currentUser?.branch_name || currentUser?.branchName || 'الفرع الرئيسي';

  const handleReturnToPos = () => {
    navigate('/pos');
  };

  const handleLockToCashier = async () => {
    try {
      const res = await api.post('/api/auth/switch-to-cashier');
      if (res.data.success) {
        const { accessToken, user } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        message.info(res.data.message || 'تم قفل وضع المشرف والعودة لوضع البائع بأمان');
        navigate('/pos', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في قفل وضع المشرف');
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch (e) {
      // ignore
    } finally {
      localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  const mobileNavMenu = {
    items: [
      {
        key: 'home',
        icon: <Home size={15} />,
        label: 'الرئيسية',
        onClick: () => navigate('/')
      },
      {
        key: 'dashboard',
        icon: <LayoutDashboard size={15} />,
        label: 'لوحة الإدارة المركزية',
        onClick: () => navigate('/dashboard')
      },
      {
        key: 'sup_dash',
        icon: <ArrowRight size={15} />,
        label: 'لوحة المشرف',
        onClick: () => navigate('/supervisor-dashboard')
      },
      { type: 'divider' },
      {
        key: 'branch',
        icon: <Building size={15} />,
        label: `الفرع: ${branchName}`,
        disabled: true
      },
      {
        key: 'lock',
        icon: <Lock size={15} color="#DC2626" />,
        label: 'قفل وضع المشرف',
        danger: true,
        onClick: handleLockToCashier
      }
    ]
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* ─── Sticky Header ─── */}
      <header
        className="swm-top-header"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: isMobile ? '0 10px' : isTablet ? '0 14px' : '0 24px',
          height: isMobile ? 56 : isTablet ? 60 : 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Left: Back to Hub Button & Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0 }}>
          {isMobile ? (
            /* Mobile Quick Hub Back Button */
            <Button
              icon={<Home size={16} />}
              onClick={() => navigate('/supervisor-dashboard')}
              style={{
                borderRadius: 8,
                width: 36,
                height: 36,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#cbd5e1'
              }}
              title="لوحة المشرف"
            />
          ) : (
            <Space size="small" wrap={false}>
              <Button
                icon={<Home size={15} style={{ marginLeft: 4 }} />}
                onClick={() => navigate('/')}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  borderColor: '#cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                الرئيسية
              </Button>

              <Button
                icon={<LayoutDashboard size={15} style={{ marginLeft: 4 }} />}
                onClick={() => navigate('/dashboard')}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  background: '#0B0F17',
                  color: '#DFCA95',
                  borderColor: 'rgba(200, 164, 92, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                لوحة الإدارة
              </Button>

              <Button
                icon={<ArrowRight size={15} style={{ marginLeft: 4 }} />}
                onClick={() => navigate('/supervisor-dashboard')}
                style={{
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 12,
                  background: '#EEF2FF',
                  color: '#4338CA',
                  borderColor: '#C7D2FE',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                لوحة المشرف
              </Button>
            </Space>
          )}

          {!isMobile && (
            <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? 28 : 34,
                height: isMobile ? 28 : 34,
                borderRadius: 8,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                flexShrink: 0
              }}
            >
              {pageIcon}
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: isMobile ? 13.5 : 16, fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitle}
              </span>
              {!isMobile && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {pageSubtitle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Operational Actions & Session Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
          {!isMobile && (
            <Tag
              color="indigo"
              style={{
                fontWeight: 700,
                fontSize: 11,
                borderRadius: 6,
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Building size={12} />
              {branchName}
            </Tag>
          )}

          {/* Quick Return to POS Terminal */}
          <Button
            type="primary"
            icon={<ScanLine size={15} style={{ marginLeft: isMobile ? 0 : 6 }} />}
            onClick={handleReturnToPos}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              height: isMobile ? 34 : 36,
              padding: isMobile ? '0 10px' : '0 14px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="العودة لنظام الكاشير (POS)"
          >
            {isMobile ? 'POS' : 'العودة للكاشير (POS)'}
          </Button>

          {!isMobile && (
            <Button
              danger
              icon={<Lock size={14} style={{ marginLeft: 6 }} />}
              onClick={handleLockToCashier}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 12,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="قفل وضع المشرف والعودة لحساب كاشير آمن"
            >
              {isTablet ? 'قفل' : 'قفل المشرف'}
            </Button>
          )}

          {isMobile && (
            <Dropdown menu={mobileNavMenu} trigger={['click']}>
              <Button
                type="text"
                icon={<MoreVertical size={18} />}
                style={{
                  width: 34,
                  height: 34,
                  padding: 0,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F1F5F9'
                }}
                aria-label="خيارات إضافية"
              />
            </Dropdown>
          )}

          <Button
            type="text"
            danger
            icon={<LogOut size={16} />}
            onClick={handleLogout}
            style={{
              width: 34,
              height: 34,
              padding: 0,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="خروج"
          />
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="swm-main-content" style={{ flex: 1, padding: isMobile ? '12px 10px 36px' : '24px 28px 48px', maxWidth: 1440, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
}
