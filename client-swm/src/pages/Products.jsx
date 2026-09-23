import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  Tag,
  Typography,
  message,
  Card,
  Row,
  Col,
  Switch
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import api from '../api';
import VariantMatrix from '../components/VariantMatrix';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState([]);

  const [form] = Form.useForm();
  const currentCode = Form.useWatch('product_code', form);
  const currentPrice = Form.useWatch('selling_price', form);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;

      const res = await api.get('/api/swm/products', { params });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل قائمة المنتجات');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/swm/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory]);

  const handleCreateProduct = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        product_code: values.product_code,
        product_name: values.product_name,
        barcode: values.barcode || values.product_code,
        category_id: values.category_id,
        brand: values.brand || 'Yoka Store',
        cost_price: values.cost_price,
        selling_price: values.selling_price,
        is_ecom_listed: Boolean(values.is_ecom_listed),
        variants: generatedVariants.map((v) => ({
          color: v.color,
          size: v.size,
          price_modifier: v.price_modifier
        }))
      };

      const res = await api.post('/api/swm/products', payload);
      if (res.data.success) {
        message.success('تم إضافة المنتج والمتغيرات بنجاح في معاملة واحدة!');
        setIsModalOpen(false);
        form.resetFields();
        setGeneratedVariants([]);
        fetchProducts();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ المنتج');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'كود المنتج',
      dataIndex: 'product_code',
      key: 'product_code',
      render: (code) => <Text strong code>{code}</Text>
    },
    {
      title: 'اسم المنتج',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.brand && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.brand}</Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'القسم',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (cat) => <Tag color="geekblue">{cat || 'عام'}</Tag>
    },
    {
      title: 'سعر التكلفة',
      dataIndex: 'cost_price',
      key: 'cost_price',
      render: (val) => `${Number(val).toFixed(2)} ج.م`
    },
    {
      title: 'سعر البيع',
      dataIndex: 'selling_price',
      key: 'selling_price',
      render: (val) => (
        <Text strong style={{ color: '#059669' }}>
          {Number(val).toFixed(2)} ج.م
        </Text>
      )
    },
    {
      title: 'المتغيرات',
      dataIndex: 'variant_count',
      key: 'variant_count',
      render: (count) => <Tag color="purple">{count || 0} صنف</Tag>
    },
    {
      title: 'الرصيد المتاح',
      dataIndex: 'total_stock',
      key: 'total_stock',
      render: (stock) => {
        const qty = parseInt(stock, 10) || 0;
        return (
          <Tag color={qty > 10 ? 'success' : qty > 0 ? 'warning' : 'error'}>
            {qty} قطعة
          </Tag>
        );
      }
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
          <Title level={4} style={{ margin: 0 }}>كتالوج المنتجات والمخزون (Products Master)</Title>
          <Text type="secondary">إدارة الأصناف، الأسعار، ومصفوفات المقاسات والألوان</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#4f46e5', height: 40 }}
        >
          إضافة منتج جديد
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="البحث باسم المنتج أو الكود أو الباركود..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={fetchProducts}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="تصفية حسب القسم"
              style={{ width: '100%' }}
              allowClear
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              {categories.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.category_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button icon={<ReloadOutlined />} onClick={fetchProducts}>
              تحديث
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        bordered
      />

      {/* Modal: New Product with Variant Matrix */}
      <Modal
        title="إضافة منتج جديد مع مصفوفة المتغيرات"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={780}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          initialValues={{
            brand: 'Yoka Store',
            cost_price: 150,
            selling_price: 250,
            is_ecom_listed: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="كود المنتج (Product Code)"
                name="product_code"
                rules={[{ required: true, message: 'يرجى إدخال كود المنتج' }]}
              >
                <Input placeholder="مثال: TSH-001" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="اسم المنتج"
                name="product_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم المنتج' }]}
              >
                <Input placeholder="مثال: تيشيرت قطن أوفر سايز" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="القسم (Category)"
                name="category_id"
                rules={[{ required: true, message: 'يرجى اختيار القسم' }]}
              >
                <Select placeholder="اختر القسم">
                  {categories.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.category_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="الماركة / البراند" name="brand">
                <Input placeholder="Yoka Store" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="سعر التكلفة (ج.م)"
                name="cost_price"
                rules={[{ required: true, message: 'يرجى تحديد سعر التكلفة' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="سعر البيع الأساسي (ج.م)"
                name="selling_price"
                rules={[{ required: true, message: 'يرجى تحديد سعر البيع' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="إتاحة في المتجر الإلكتروني (E-Commerce Sync)" name="is_ecom_listed" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          {/* Variant Matrix Generator Component */}
          <VariantMatrix
            productCode={currentCode}
            basePrice={currentPrice}
            onChange={(variants) => setGeneratedVariants(variants)}
          />

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ backgroundColor: '#4f46e5' }}
              >
                حفظ المنتج والمتغيرات (Single Transaction)
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
