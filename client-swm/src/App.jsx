import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Space, Typography, Tag, Dropdown } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShopOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Branches from './pages/Branches';
import Users from './pages/Users';
import api from './api';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/api/auth/logout', { refreshToken });
    } catch (e) {
      // ignore
    } finally {
      localStorage.clear();
      setCurrentUser(null);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'لوحة التحكم' },
    { key: 'products', icon: <ShoppingOutlined />, label: 'كتالوج المنتجات والمخزون' },
    { key: 'branches', icon: <ShopOutlined />, label: 'الفروع والمستودعات' },
    { key: 'users', icon: <TeamOutlined />, label: 'إدارة المستخدمين والموظفين' }
  ];

  return (
    <Layout style={{ minHeight: '100vh', direction: 'rtl' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={240}
        style={{
          backgroundColor: '#0f172a',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', borderBottom: '1px solid #1e293b', gap: 10 }}>
          <img
            src="/yokaStoreTransparent.png"
            alt="Yoka Store"
            style={{
              height: collapsed ? 32 : 38,
              maxWidth: collapsed ? 36 : 140,
              objectFit: 'contain'
            }}
          />
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 16, whiteSpace: 'nowrap' }}>
              SWM
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[activeTab]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setActiveTab(key)}
          style={{ backgroundColor: '#0f172a', marginTop: 12 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}
        >
          <div>
            <Tag color="indigo" style={{ fontSize: 13, padding: '2px 10px' }}>
              Bulk 1 · منصة إدارة العمليات
            </Tag>
          </div>

          <Space size="middle">
            <Space>
              <Avatar style={{ backgroundColor: '#4f46e5' }} icon={<UserOutlined />} />
              <div style={{ lineHeight: 1.2, textAlign: 'right' }}>
                <Text strong style={{ display: 'block', fontSize: 14 }}>
                  {currentUser.fullName || currentUser.username}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {currentUser.role}
                </Text>
              </div>
            </Space>

            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              تسجيل الخروج
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'branches' && <Branches />}
          {activeTab === 'users' && <Users />}
        </Content>
      </Layout>
    </Layout>
  );
}
