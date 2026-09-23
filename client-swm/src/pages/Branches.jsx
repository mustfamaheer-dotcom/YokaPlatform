import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, Card } from 'antd';
import { PlusOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل الفروع والمستودعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreate = async (values) => {
    try {
      const res = await api.post('/api/swm/branches', values);
      if (res.data.success) {
        message.success('تم إنشاء الفرع بنجاح');
        setIsModalOpen(false);
        form.resetFields();
        fetchBranches();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء الفرع');
    }
  };

  const columns = [
    {
      title: 'كود الفرع',
      dataIndex: 'branch_code',
      key: 'branch_code',
      render: (code) => <Text code strong>{code}</Text>
    },
    {
      title: 'اسم الفرع / المستودع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'نوع الفرع',
      dataIndex: 'branch_type',
      key: 'branch_type',
      render: (type) => {
        const map = {
          main_warehouse: { label: 'مستودع رئيسي', color: 'volcano' },
          retail_branch: { label: 'فرع تجزئة', color: 'blue' },
          ecom_warehouse: { label: 'مستودع المتجر الإلكتروني', color: 'purple' }
        };
        const item = map[type] || { label: type, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      }
    },
    {
      title: 'العنوان',
      dataIndex: 'address',
      key: 'address'
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
          <Title level={4} style={{ margin: 0 }}>الفروع والمستودعات (Branches Master)</Title>
          <Text type="secondary">إدارة نقاط البيع، المستودعات اللوجستية، ومراكز التوزيع</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchBranches}>تحديث</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#4f46e5' }}
          >
            إضافة فرع / مخزن
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={branches}
        rowKey="id"
        loading={loading}
        bordered
      />

      <Modal
        title="إضافة فرع أو مستودع جديد"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="كود الفرع (Branch Code)"
            name="branch_code"
            rules={[{ required: true, message: 'يرجى إدخال كود الفرع' }]}
          >
            <Input placeholder="مثال: BR-NASR-CITY" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            label="اسم الفرع"
            name="branch_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم الفرع' }]}
          >
            <Input placeholder="فرع مدينة نصر" />
          </Form.Item>

          <Form.Item
            label="نوع الفرع"
            name="branch_type"
            initialValue="retail_branch"
          >
            <Select>
              <Option value="retail_branch">فرع تجزئة (Retail Branch)</Option>
              <Option value="main_warehouse">مستودع رئيسي (Main Warehouse)</Option>
              <Option value="ecom_warehouse">مستودع المتجر الإلكتروني (E-Com Warehouse)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="العنوان" name="address">
            <Input.TextArea rows={2} placeholder="شارع عباس العقاد، مدينة نصر، القاهرة" />
          </Form.Item>

          <Form.Item label="رقم الهاتف" name="phone">
            <Input placeholder="+201000000000" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#4f46e5' }}>
                حفظ الفرع
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
