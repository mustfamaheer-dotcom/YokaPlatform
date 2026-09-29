import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Tabs, Space, Divider, Tag } from 'antd';
import {
  ShieldCheck,
  Store,
  Lock,
  User,
  Building2,
  Sparkles,
  Zap,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Layers,
  Activity
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

        // Evaluate user role immediately
        const isSupervisor = user.role === 'supervisor' || user.isSupervisor === true;
        const isAdmin = ['admin', 'super_admin'].includes(user.role);

        let targetRoute = '/pos';
        if (isSupervisor && !isAdmin) {
          targetRoute = '/supervisor-dashboard';
        } else if (isAdmin) {
          targetRoute = '/dashboard';
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img
              src={yokaLogo}
              alt="Yoka Store"
              style={{
                height: 52,
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.35))'
              }}
            />
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 20, display: 'block', letterSpacing: '-0.5px' }}>
                Yoka Enterprise SWM
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                منظومة إدارة المتاجر والمخازن الذكية
              </Text>
            </div>
          </div>

          <div style={{ marginTop: 18, maxWidth: 480 }}>
            <Tag color="indigo" style={{ padding: '3px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12, border: 'none', background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', marginBottom: 8 }}>
              ✨ الإصدار الاحترافي 2026
            </Tag>
            <Title level={3} style={{ color: '#ffffff', fontWeight: 800, margin: '6px 0 12px', lineHeight: 1.3, fontSize: 22 }}>
              تحكم كامل في مبيعات الفروع، المستودعات، والتجارة الإلكترونية في مكان واحد.
            </Title>
            <Paragraph style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              نظام سحابي موحد يربط حركة المخزون اللحظية، ونقاط البيع السريعة (POS)، مع بوابات التوريد وإدارة النقدية بحماية تشفير عالية.
            </Paragraph>
          </div>
        </div>

        {/* Middle Feature Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: '22px 0', position: 'relative', zIndex: 2 }}>
          <div className="auth-feature-pill">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
              <Building2 size={18} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13, display: 'block' }}>
                مزامنة المخازن والفروع اللحظية
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                تحويلات بضائع آلية، جرد مجمع، وتسوية دقيقة للعجز والزيادة
              </Text>
            </div>
          </div>

          <div className="auth-feature-pill">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0 }}>
              <Zap size={18} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13, display: 'block' }}>
                نقاط بيع ذكية POS فائقة السرعة
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                إصدار فواتير بمسح الباركود، خصومات فورية، وتسليم عهدة الوردية
              </Text>
            </div>
          </div>

          <div className="auth-feature-pill">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0 }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <Text strong style={{ color: '#ffffff', fontSize: 13, display: 'block' }}>
                تكامل متجر إلكتروني ECP مباشر
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                متابعة طلبات العملاء وتجهيز الشحنات مباشرة من مستودع الـ E-Com
              </Text>
            </div>
          </div>
        </div>

        {/* Bottom Uptime / Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 16, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" />
            <span style={{ color: '#34d399', fontSize: 12, fontWeight: 500 }}>خادم العمليات المركزي يعمل بكفاءة 100%</span>
          </div>
          <Text style={{ color: '#64748b', fontSize: 11 }}>Yoka SWM Cloud v2.4</Text>
        </div>
      </div>

      {/* Left Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-card-inner">
          {/* Header Branding (Clean & High-Contrast for Mobile & Desktop) */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <img
                src={yokaLogo}
                alt="Yoka Store"
                style={{
                  height: 48,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08))'
                }}
              />
            </div>
            <Title level={3} style={{ margin: '0 0 4px', fontWeight: 800, color: '#0f172a', fontSize: 21, letterSpacing: '-0.3px' }}>
              منصة يوكا ستور
            </Title>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', color: '#64748b' }}>
              نظام إدارة المتاجر والمخازن المركزية الموحد
            </Text>
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
              backgroundColor: isAdmin ? '#f5f3ff' : '#ecfdf5',
              border: `1px solid ${isAdmin ? '#ddd6fe' : '#a7f3d0'}`,
              borderRadius: 12,
              padding: '10px 12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            {isAdmin ? (
              <ShieldCheck size={20} color="#6366f1" style={{ flexShrink: 0 }} />
            ) : (
              <Store size={20} color="#059669" style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ display: 'block', color: isAdmin ? '#4338ca' : '#065f46', fontSize: 12.5 }}>
                {isAdmin ? 'دخول الإدارة العامة والمستودع الرئيسي' : 'دخول الفرع ونقاط البيع (POS)'}
              </Text>
              <Text style={{ color: isAdmin ? '#6366f1' : '#047857', fontSize: 11.5, display: 'block', lineHeight: 1.4 }}>
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

            <Form.Item style={{ marginTop: 12, marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={<ArrowLeft size={18} style={{ marginLeft: 6 }} />}
                style={{
                  height: 48,
                  backgroundColor: isAdmin ? '#4f46e5' : '#059669',
                  borderColor: isAdmin ? '#4f46e5' : '#059669',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  boxShadow: isAdmin
                    ? '0 4px 14px rgba(79, 70, 229, 0.35)'
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

          {/* Footer Status & Security Badge */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: 14,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="pulse-dot" style={{ width: 7, height: 7 }} />
              <Text style={{ fontSize: 11.5, color: '#10b981', fontWeight: 500 }}>
                الخادم المركزي وقاعدة البيانات متصلة
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 11, color: '#94a3b8' }}>
              منصة يوكا ستور © 2026 • اتصال سحابي آمن ومشفر SSL
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

