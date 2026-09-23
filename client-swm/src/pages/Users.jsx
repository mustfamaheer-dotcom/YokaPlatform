import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, Card } from 'antd';
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLES = [
  { value: 'super_admin', label: 'مدير عام للنظام (Super Admin)', color: 'red' },
  { value: 'admin', label: 'مدير إداري (Admin)', color: 'volcano' },
  { value: 'supervisor', label: 'مشرف فرع (Supervisor)', color: 'orange' },
  { value: 'salesperson', label: 'بائع / كاشير (Salesperson)', color: 'blue' },
  { value: 'inventory_manager', label: 'مدير مخازن (Inventory Manager)', color: 'green' },
  { value: 'content_manager', label: 'مدير محتوى (Content Manager)', color: 'purple' },
  { value: 'customer_service', label: 'خدمة عملاء (Customer Service)', color: 'cyan' },
  { value: 'data_analyst', label: 'محلل بيانات (Data Analyst)', color: 'magenta' }
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/api/swm/users'),
        api.get('/api/swm/branches')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (branchesRes.data.success) setBranches(branchesRes.data.data);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values) => {
    try {
      const res = await api.post('/api/swm/users', values);
      if (res.data.success) {
        message.success('تم إنشاء حساب المستخدم بنجاح');
        setIsModalOpen(false);
        form.resetFields();
        fetchData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء الحساب');
    }
  };

  const columns = [
    {
      title: 'اسم المستخدم',
      dataIndex: 'username',
      key: 'username',
      render: (u) => <Text code strong>{u}</Text>
    },
    {
      title: 'الاسم الكامل',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'الدور الوظيفي',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const found = ROLES.find((r) => r.value === role);
        return <Tag color={found?.color || 'default'}>{found?.label || role}</Tag>;
      }
    },
    {
      title: 'الفرع التابع له',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (b) => b || <Text type="secondary">الإدارة العامة</Text>
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'نشط' : status}
        </Tag>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>فريق العمل والمستخدمين (Staff Directory)</Title>
          <Text type="secondary">إدارة صلاحيات الموظفين، الأدوار، وربطهم بالفروع والمستودعات</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>تحديث</Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#4f46e5' }}
          >
            إضافة موظف جديد
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        bordered
      />

      <Modal
        title="إضافة مستخدم جديد للنظام"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="اسم المستخدم (Username)"
            name="username"
            rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم' }]}
          >
            <Input placeholder="ahmed_sales" />
          </Form.Item>

          <Form.Item
            label="الاسم بالكامل"
            name="full_name"
            rules={[{ required: true, message: 'يرجى إدخال الاسم بالكامل' }]}
          >
            <Input placeholder="أحمد محمود" />
          </Form.Item>

          <Form.Item
            label="كلمة المرور"
            name="password"
            rules={[{ required: true, message: 'يرجى إدخال كلمة المرور' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            label="الدور الوظيفي (Role)"
            name="role"
            rules={[{ required: true, message: 'يرجى اختيار الدور' }]}
            initialValue="salesperson"
          >
            <Select>
              {ROLES.map((r) => (
                <Option key={r.value} value={r.value}>{r.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="الفرع المعين به" name="branch_id">
            <Select placeholder="اختر الفرع (أو اتركه للإدارة العامة)" allowClear>
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>{b.branch_name} ({b.branch_code})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ الحساب
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
