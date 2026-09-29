import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Tag, Space, App } from 'antd';
import {
  ArrowRight,
  ScanLine,
  Lock,
  LogOut,
  Building,
  LayoutGrid
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
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Left: Back to Hub Button & Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button
            icon={<ArrowRight size={17} style={{ marginLeft: 6 }} />}
            onClick={() => {
              if (['admin', 'super_admin'].includes(currentUser?.role)) {
                navigate('/dashboard');
              } else if (currentUser?.role === 'salesperson') {
                navigate('/pos');
              } else {
                navigate('/supervisor-dashboard');
              }
            }}
            style={{
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              borderColor: '#cbd5e1',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {['admin', 'super_admin'].includes(currentUser?.role)
              ? 'العودة للوحة المدير'
              : currentUser?.role === 'salesperson'
              ? 'العودة لنقاط البيع (POS)'
              : 'لوحة بطاقات المشرف'}
          </Button>

          <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5'
              }}
            >
              {pageIcon}
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                {pageTitle}
              </span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {pageSubtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Actions & Session Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

          <Space size="small">
            <Button
              type="primary"
              icon={<ScanLine size={15} style={{ marginLeft: 6 }} />}
              onClick={handleReturnToPos}
              style={{
                backgroundColor: '#059669',
                borderColor: '#059669',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              العودة للكاشير (POS)
            </Button>

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
              قفل المشرف
            </Button>
          </Space>

          <Button
            type="text"
            danger
            icon={<LogOut size={16} />}
            onClick={handleLogout}
            title="خروج"
          />
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main style={{ flex: 1, padding: '24px 28px 48px', maxWidth: 1440, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
}
