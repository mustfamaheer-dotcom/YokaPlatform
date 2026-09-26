import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/api/auth/login', {
        username: values.username,
        password: values.password
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

  return (
    <div className="auth-container">
      <Card className="auth-card" variant="borderless">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/yokaStoreTransparent.png"
            alt="Yoka Store Logo"
            style={{
              height: 70,
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: 12,
              filter: 'drop-shadow(0 2px 8px rgba(79, 70, 229, 0.15))'
            }}
          />
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            نظام إدارة المتاجر والمخازن
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Store & Warehouse Management (SWM)
          </Text>
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
          name="loginForm"
          layout="vertical"
          initialValues={{ username: 'admin', password: '' }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            label="اسم المستخدم أو البريد الإلكتروني"
            name="username"
            rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="admin"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label="كلمة المرور"
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                backgroundColor: '#4f46e5',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              تسجيل الدخول للنظام
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            حساب المدير الافتراضي: <code>admin</code> / <code>Yoka@Admin2026!</code>
          </Text>
        </div>
      </Card>
    </div>
  );
}
