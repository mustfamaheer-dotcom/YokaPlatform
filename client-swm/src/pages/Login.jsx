import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert } from 'antd';
import {
  ShieldCheck,
  Store,
  Lock,
  User,
  Building2,
  Zap,
  ShoppingBag,
  ArrowLeft,
  Phone,
  PhoneCall,
  Headphones
} from 'lucide-react';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginType, setLoginType] = useState('admin'); // 'admin' | 'branch'
  const [form] = Form.useForm();

  const handleTabChange = (key) => {
    setLoginType(key);
    setErrorMessage('');
    form.resetFields();
    if (key === 'admin') {
      form.setFieldsValue({ username: 'admin', password: '' });
    } else {
      form.setFieldsValue({ username: 'branch_retail', password: '' });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/api/auth/login', {
        username: values.username,
        password: values.password,
        loginType
      });

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Evaluate branch type & user role for dedicated portal navigation
        const isEcom = user.branchType === 'ecom_warehouse' || user.branchCode === 'BR-ECOM';
        const isSupervisor = user.role === 'supervisor' || user.isSupervisor === true;
        const isAdmin = ['admin', 'super_admin'].includes(user.role);
        const isWarehouseManager = user.role === 'warehouse_manager';

        let targetRoute = '/pos';
        if (isWarehouseManager) {
          targetRoute = '/warehouse-manager';
        } else if (isEcom) {
          targetRoute = '/ecom';
        } else if (isAdmin) {
          targetRoute = '/dashboard';
        } else if (isSupervisor) {
          targetRoute = '/supervisor-dashboard';
        } else if (user.role === 'salesperson') {
          targetRoute = '/pos';
        }

        if (onLoginSuccess) {
          onLoginSuccess(user);
        }

        navigate(targetRoute, { replace: true });
      } else {
        setErrorMessage(response.data.message || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'خطأ في الاتصال بالخادم. تأكد من تشغيل خادم SWM API.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = loginType === 'admin';

  return (
    <div className="auth-wrapper">
      {/* Right Showcase / Brand Panel (Desktop) */}
      <div className="auth-hero-panel">
        <div className="auth-hero-glow" />
        <div className="auth-hero-glow-2" />

        {/* Top Branding */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <img
              src={yokaLogo}
              alt="Yoka Store"
              style={{
                height: 54,
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 14px rgba(200, 164, 92, 0.4))'
              }}
            />
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 21, display: 'block', letterSpacing: '-0.5px' }}>
                Yoka Enterprise SWM
              </Text>
              <Text style={{ color: '#C8A45C', fontSize: 12.5, fontWeight: 600 }}>
                منظومة إدارة المتاجر والمخازن الذكية
              </Text>
            </div>
          </div>

          <div style={{ marginTop: 14, maxWidth: 480 }}>
            <Title level={3} style={{ color: '#ffffff', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.35, fontSize: 23 }}>
              تحكم كامل ومباشر في مبيعات الفروع والمستودعات
            </Title>
            
            {/* Contact & Support Numbers */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(200, 164, 92, 0.28)',
                borderRadius: 14,
                padding: '14px 18px',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Headphones size={18} color="#C8A45C" />
                <Text style={{ color: '#DFCA95', fontSize: 13.5, fontWeight: 700 }}>
                  أرقام التواصل والدعم الفني:
                </Text>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  '01017645959',
                  '01129115112',
                  '01155000072',
                  '01095132273'
                ].map((num) => (
                  <a
                    key={num}
                    href={`tel:${num}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'rgba(200, 164, 92, 0.12)',
                      border: '1px solid rgba(200, 164, 92, 0.35)',
                      padding: '8px 12px',
                      borderRadius: 10,
                      color: '#DFCA95',
                      fontSize: 14,
                      fontWeight: 800,
                      direction: 'ltr',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <PhoneCall size={15} color="#C8A45C" />
                    <span>{num}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Feature Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '22px 0', position: 'relative', zIndex: 2 }}>
          <div className="auth-feature-pill">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(200, 164, 92, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8A45C', flexShrink: 0 }}>
              <Building2 size={20} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13.5, display: 'block' }}>
                مزامنة المخازن والفروع اللحظية
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11.5 }}>
                تحويلات بضائع آلية، جرد مجمع، وتسوية دقيقة للعجز والزيادة
              </Text>
            </div>
          </div>

          <div className="auth-feature-pill">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(200, 164, 92, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8A45C', flexShrink: 0 }}>
              <Zap size={20} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13.5, display: 'block' }}>
                نقاط بيع ذكية POS فائقة السرعة
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11.5 }}>
                إصدار فواتير بمسح الباركود، خصومات فورية، وتسليم عهدة الوردية
              </Text>
            </div>
          </div>

          <div className="auth-feature-pill">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(200, 164, 92, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8A45C', flexShrink: 0 }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13.5, display: 'block' }}>
                تكامل متجر إلكتروني ECP مباشر
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11.5 }}>
                متابعة طلبات العملاء وتجهيز الشحنات مباشرة من مستودع الـ E-Com
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Left Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-card-inner">
          {/* Header Branding (Elevated Brand Monogram & High-Contrast Typography) */}
          <div className="auth-brand-header">
            <div className="auth-logo-badge">
              <img
                src={yokaLogo}
                alt="Yoka Store"
                className="auth-logo-img"
              />
            </div>
            <Title
              level={3}
              style={{
                margin: 0,
                fontWeight: 800,
                color: '#0B0F17',
                fontSize: 24,
                letterSpacing: '-0.4px',
                lineHeight: 1.3
              }}
            >
              منصة يوكا ستور
            </Title>
          </div>

          {/* Touch-Friendly Portal Segmented Switch */}
          <div className="auth-portal-selector">
            <button
              type="button"
              className={`auth-portal-btn ${isAdmin ? 'active-admin' : ''}`}
              onClick={() => handleTabChange('admin')}
            >
              <ShieldCheck size={18} />
              <span>بوابة الإدارة (Admin)</span>
            </button>
            <button
              type="button"
              className={`auth-portal-btn ${!isAdmin ? 'active-branch' : ''}`}
              onClick={() => handleTabChange('branch')}
            >
              <Store size={18} />
              <span>بوابة الفرع (Branch)</span>
            </button>
          </div>

          {/* Portal Context Banner */}
          <div
            style={{
              backgroundColor: isAdmin ? 'rgba(200, 164, 92, 0.08)' : '#ecfdf5',
              border: `1px solid ${isAdmin ? 'rgba(200, 164, 92, 0.35)' : '#a7f3d0'}`,
              borderRadius: 12,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            {isAdmin ? (
              <ShieldCheck size={20} color="#C8A45C" style={{ flexShrink: 0 }} />
            ) : (
              <Store size={20} color="#059669" style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', color: isAdmin ? '#8A6A24' : '#065f46', fontSize: 12.5 }}>
                {isAdmin ? 'دخول الإدارة العامة والمستودع الرئيسي' : 'دخول الفرع ونقاط البيع (POS)'}
              </Text>
              <Text style={{ color: isAdmin ? '#A68233' : '#047857', fontSize: 11.5, display: 'block', lineHeight: 1.4 }}>
                {isAdmin
                  ? 'لوحة القيادة، المخازن المركزية، والتقارير المالية والتشغيلية.'
                  : 'مخصص لبائعي ومشرفي الفروع لإصدار الفواتير وتسليم الوردية.'}
              </Text>
            </div>
          </div>

          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 16, borderRadius: 10, fontSize: 13 }}
              onClose={() => setErrorMessage('')}
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            name="modernLoginForm"
            layout="vertical"
            initialValues={{ username: 'admin', password: '' }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              label={
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {isAdmin ? 'اسم المستخدم أو البريد الإلكتروني' : 'اسم مستخدم الفرع / الكاشير'}
                </span>
              }
              name="username"
              rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<User size={18} color="#94a3b8" style={{ marginLeft: 8 }} />}
                placeholder={isAdmin ? 'اسم المستخدم (admin أو branch_main)' : 'اسم مستخدم الفرع أو الكاشير'}
                autoComplete="username"
                style={{ borderRadius: 10, height: 48, fontSize: 15 }}
              />
            </Form.Item>

            <Form.Item
              label={
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  كلمة المرور
                </span>
              }
              name="password"
              rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
              style={{ marginBottom: 14 }}
            >
              <Input.Password
                prefix={<Lock size={18} color="#94a3b8" style={{ marginLeft: 8 }} />}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ borderRadius: 10, height: 48, fontSize: 15 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 14, marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={<ArrowLeft size={18} style={{ marginLeft: 6 }} />}
                style={{
                  height: 48,
                  backgroundColor: isAdmin ? '#C8A45C' : '#059669',
                  borderColor: isAdmin ? '#C8A45C' : '#059669',
                  color: isAdmin ? '#0B0F17' : '#ffffff',
                  fontSize: 15,
                  fontWeight: 800,
                  borderRadius: 10,
                  boxShadow: isAdmin
                    ? '0 4px 14px rgba(200, 164, 92, 0.35)'
                    : '0 4px 14px rgba(5, 150, 105, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isAdmin ? 'دخول لوحة الإدارة العامة' : 'دخول نقطة بيع الفرع'}
              </Button>
            </Form.Item>
          </Form>

          {/* Footer Contacts & Security Badge */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>للتواصل والدعم الفني:</span>
              {[
                '01017645959',
                '01129115112',
                '01155000072',
                '01095132273'
              ].map((num, idx, arr) => (
                <React.Fragment key={num}>
                  <a
                    href={`tel:${num}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#0B0F17',
                      fontWeight: 700,
                      fontSize: 12,
                      textDecoration: 'none',
                      direction: 'ltr'
                    }}
                  >
                    <Phone size={12} color="#C8A45C" />
                    {num}
                  </a>
                  {idx < arr.length - 1 && <span style={{ color: '#cbd5e1' }}>•</span>}
                </React.Fragment>
              ))}
            </div>

            <Text type="secondary" style={{ fontSize: 11, color: '#94a3b8' }}>
              منصة يوكا ستور © 2026
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

