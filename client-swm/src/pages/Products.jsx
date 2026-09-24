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
  Switch,
  Alert,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined
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

  // Auto-generated codes and dynamic constructed name state
  const [autoCode, setAutoCode] = useState('');
  const [autoBarcode, setAutoBarcode] = useState('');
  const [constructedName, setConstructedName] = useState('');

  const [form] = Form.useForm();
  const currentCode = Form.useWatch('product_code', form) || autoCode;
  const currentPrice = Form.useWatch('selling_price', form);

  // Generate unique product code and 13-digit EAN barcode
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = `622${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
    return { code, barcode };
  };

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

  const handleOpenCreate = () => {
    form.resetFields();
    const { code, barcode } = generateCodes();
    setAutoCode(code);
    setAutoBarcode(barcode);
    setConstructedName('');
    setGeneratedVariants([]);

    form.setFieldsValue({
      product_code: code,
      barcode: barcode,
      brand: 'Yoka Store',
      cost_price: 150,
      selling_price: 250,
      is_ecom_listed: true,
      base_name: '',
      color: '',
      size: '',
      product_name: ''
    });

    setIsModalOpen(true);
  };

  const handleRegenerateCodes = () => {
    const { code, barcode } = generateCodes();
    setAutoCode(code);
    setAutoBarcode(barcode);
    form.setFieldsValue({
      product_code: code,
      barcode: barcode
    });
    message.info('تم توليد كود وباركود جديدين تلقائياً');
  };

  // Automatically construct descriptive product name: Base Name + Color + Size
  const handleValuesChange = (changedValues, allValues) => {
    if ('base_name' in changedValues || 'color' in changedValues || 'size' in changedValues) {
      const base = allValues.base_name ? allValues.base_name.trim() : '';
      const color = allValues.color ? allValues.color.trim() : '';
      const size = allValues.size ? allValues.size.trim() : '';

      const parts = [base];
      if (color) parts.push(color);
      if (size) parts.push(size);
      const finalName = parts.filter(Boolean).join(' - ');

      setConstructedName(finalName);
      form.setFieldsValue({ product_name: finalName });
    }
  };

  const handleCreateProduct = async (values) => {
    const finalProductName = constructedName.trim() || values.product_name?.trim() || values.base_name?.trim();
    if (!finalProductName) {
      return message.error('يرجى إدخال اسم الصنف الأساسي لتوليد اسم المنتج');
    }

    setSubmitting(true);
    try {
      const payload = {
        product_code: autoCode || values.product_code,
        barcode: autoBarcode || values.barcode,
        product_name: finalProductName,
        category_id: values.category_id,
        brand: values.brand || 'Yoka Store',
        color: values.color || null,
        size: values.size || null,
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
        message.success('تم حفظ المنتج وتوليد الكود والمتغيرات بنجاح!');
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
      title: 'كود المنتج / الباركود',
      key: 'codes',
      render: (_, record) => (
        <div>
          <div><Text strong code>{record.product_code}</Text></div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            <BarcodeOutlined style={{ marginLeft: 4 }} />
            {record.barcode || record.product_code}
          </div>
        </div>
      )
    },
    {
      title: 'اسم المنتج الوصفي (الاسم + المقاس + اللون)',
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
          <Title level={4} style={{ margin: 0 }}>كتالوج المنتجات والمخزون (Product Catalog & Inventory)</Title>
          <Text type="secondary">توليد الأكواد آلياً، بناء الأسماء الوصفية الشاملة، وإدارة مصفوفات الأصناف</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          style={{ backgroundColor: '#2563eb', height: 40 }}
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

      {/* Modal: New Product with Auto-Generated Codes & Auto-Constructed Descriptive Name */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#2563eb' }} />
            <span>إضافة منتج جديد (توليد آلي للأكواد وبناء الاسم الوصفي)</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          onValuesChange={handleValuesChange}
        >
          {/* Requirement 3.1: Auto-generated Product Code & Barcode (No typing required) */}
          <Alert
            type="info"
            showIcon
            icon={<BarcodeOutlined />}
            style={{ marginBottom: 16, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ color: '#1e40af' }}>تم توليد الأكواد تلقائياً للنظام:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="blue" style={{ fontSize: 13, padding: '3px 8px' }}>
                      كود الصنف: <strong>{autoCode}</strong>
                    </Tag>
                    <Tag color="cyan" style={{ fontSize: 13, padding: '3px 8px' }}>
                      الباركود الدولي: <strong>{autoBarcode}</strong>
                    </Tag>
                  </div>
                </div>
                <Tooltip title="توليد كود وباركود جديدين">
                  <Button size="small" icon={<ReloadOutlined />} onClick={handleRegenerateCodes}>
                    توليد جديد
                  </Button>
                </Tooltip>
              </div>
            }
          />

          {/* Hidden fields storing the auto-generated code and barcode */}
          <Form.Item name="product_code" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="barcode" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="product_name" hidden>
            <Input />
          </Form.Item>

          {/* Requirement 3.2: Automatically construct Product Name by concatenating Base Name + Size + Color */}
          <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 10, color: '#1e293b' }}>
              تفاصيل الصنف الأساسية (تُدمج تلقائياً لتوليد الاسم الكامل في الفواتير):
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="اسم الصنف الأساسي (Base Name) *"
                  name="base_name"
                  rules={[{ required: true, message: 'يرجى إدخال اسم الصنف الأساسي' }]}
                >
                  <Input placeholder="مثال: تيشيرت أوفر سايز / قميص كتان" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="اللون الأساسي (Color)" name="color">
                  <Input placeholder="مثال: أسود / White" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="المقاس (Size)" name="size">
                  <Input placeholder="مثال: L / XL / 42" />
                </Form.Item>
              </Col>
            </Row>

            {/* Live Preview of the Auto-Constructed Product Name */}
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                padding: '10px 14px',
                borderRadius: 6,
                marginTop: 2
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                معاينة الاسم الوصفي المعتمد في الفواتير وكشوف الحساب (Product Full Name):
              </Text>
              <Text strong style={{ fontSize: 16, color: constructedName ? '#1e40af' : '#94a3b8' }}>
                {constructedName || 'سيظهر الاسم الكامل هنا بمجرد كتابة التفاصيل...'}
              </Text>
            </div>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="القسم (Category) *"
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
                label="سعر التكلفة (ج.م) *"
                name="cost_price"
                rules={[{ required: true, message: 'يرجى تحديد سعر التكلفة' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="ج.م" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="سعر البيع الأساسي (ج.م) *"
                name="selling_price"
                rules={[{ required: true, message: 'يرجى تحديد سعر البيع' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="ج.م" />
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
                style={{ backgroundColor: '#2563eb' }}
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
