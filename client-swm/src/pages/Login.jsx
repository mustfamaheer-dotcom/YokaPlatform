import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tabs, Space, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  CrownOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  KeyOutlined
} from '@ant-design/icons';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;

export default function Login({ onLoginSuccess }) {
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
        if (onLoginSuccess) {
          onLoginSuccess(user);
        } else {
          window.location.href = '/dashboard';
        }
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

  const tabItems = [
    {
      key: 'admin',
      label: (
        <Space style={{ fontSize: 15, fontWeight: 600, padding: '4px 8px' }}>
          <CrownOutlined style={{ color: '#4f46e5' }} />
          <span>بوابة الإدارة (Admin)</span>
        </Space>
      )
    },
    {
      key: 'branch',
      label: (
        <Space style={{ fontSize: 15, fontWeight: 600, padding: '4px 8px' }}>
          <ShopOutlined style={{ color: '#0d9488' }} />
          <span>بوابة الفرع (Branch Login)</span>
        </Space>
      )
    }
  ];

  const isAdmin = loginType === 'admin';

  return (
    <div className="auth-container">
      <Card className="auth-card" variant="borderless">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src={yokaLogo}
            alt="Yoka Store Logo"
            style={{
              height: 64,
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: 10,
              filter: 'drop-shadow(0 2px 8px rgba(79, 70, 229, 0.15))'
            }}
          />
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            نظام إدارة المتاجر والمخازن
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Store & Warehouse Management (SWM Platform)
          </Text>
        </div>

        {/* Dual Portal Tabs */}
        <Tabs
          activeKey={loginType}
          onChange={handleTabChange}
          centered
          size="large"
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

        {/* Informative Portal Banner */}
        <div
          style={{
            backgroundColor: isAdmin ? '#f5f3ff' : '#f0fdf4',
            border: `1px solid ${isAdmin ? '#ddd6fe' : '#bbf7d0'}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          {isAdmin ? (
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#7c3aed' }} />
          ) : (
            <ShopOutlined style={{ fontSize: 24, color: '#059669' }} />
          )}
          <div>
            <Text strong style={{ display: 'block', color: isAdmin ? '#5b21b6' : '#065f46', fontSize: 13 }}>
              {isAdmin ? 'دخول الإدارة والمستودع الرئيسي' : 'دخول الفرع ونقاط البيع (POS)'}
            </Text>
            <Text style={{ color: isAdmin ? '#6d28d9' : '#047857', fontSize: 12 }}>
              {isAdmin
                ? 'مخصص للمديرين ومسؤولي المستودع الرئيسي لإدارة العمليات، المخزون، توزيع المنتجات، والمشتريات.'
                : 'تسجيل الدخول بحساب الفرع العام أو حساب موظف الفرع (مشرف / بائع).'}
            </Text>
          </div>
        </div>

        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 20 }}
            onClose={() => setErrorMessage('')}
          />
        )}

        <Form
          form={form}
          name="loginForm"
          layout="vertical"
          initialValues={{ username: 'admin', password: '' }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            label={isAdmin ? 'اسم المستخدم أو البريد الإلكتروني' : 'اسم مستخدم الفرع أو الموظف (Username)'}
            name="username"
            rules={[{ required: true, message: isAdmin ? 'يرجى إدخال اسم المستخدم' : 'يرجى إدخال اسم المستخدم' }]}
          >
            <Input
              prefix={isAdmin ? <UserOutlined style={{ color: '#9ca3af' }} /> : <KeyOutlined style={{ color: '#0d9488' }} />}
              placeholder={isAdmin ? 'اسم مستخدم المدير أو المستودع (admin أو branch_main)' : 'اسم مستخدم الفرع أو الموظف (مشرف / بائع)'}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label={isAdmin ? 'كلمة المرور' : 'كلمة مرور الفرع (Branch Password)'}
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                backgroundColor: isAdmin ? '#4f46e5' : '#0d9488',
                borderColor: isAdmin ? '#4f46e5' : '#0d9488',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              {isAdmin ? 'تسجيل الدخول للإدارة أو المستودع' : 'تسجيل الدخول لحساب الفرع'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0 12px' }} />

        {/* Demo credentials hint for convenience */}
        <div style={{ textAlign: 'center' }}>
          {isAdmin ? (
            <div style={{ fontSize: 12, margin: 0, color: '#64748b' }}>
              <div>👑 الإدارة العامة: <code>admin</code> / <code>Yoka@Admin2026!</code></div>
              <div style={{ marginTop: 4 }}>🏢 المستودع الرئيسي: <code>branch_main</code> / <code>Yoka@Branch2026!</code></div>
            </div>
          ) : (
            <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
              حساب الفرع التجريبي: <code>branch_retail</code> / كلمة المرور: <code>Yoka@Branch2026!</code> (محدد في الفروع والمستودعات)
            </Paragraph>
          )}
        </div>
      </Card>
    </div>
  );
}
