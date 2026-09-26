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
  Tooltip,
  Popconfirm,
  Upload,
  Avatar
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  BarcodeOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  PictureOutlined
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
  
  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState([]);
  const [createImageUrl, setCreateImageUrl] = useState('');

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState('');

  // Auto-generated codes and dynamic constructed name state
  const [autoCode, setAutoCode] = useState('');
  const [autoBarcode, setAutoBarcode] = useState('');
  const [constructedName, setConstructedName] = useState('');

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const currentCode = Form.useWatch('product_code', form) || autoCode;
  const currentPrice = Form.useWatch('selling_price', form);

  // Generate unique product code and 13-digit EAN barcode
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = `622${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
    return { code, barcode };
  };

  // Helper to handle local file upload to Base64 data URI with canvas compression
  const handleFileUpload = (file, setUrlFunc, formInstance) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Optimal size for e-commerce product cards

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG 82% quality (typically ~40-90KB)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setUrlFunc(optimizedDataUrl);
        formInstance.setFieldsValue({ featured_image: optimizedDataUrl });
        message.success('تم تحسين ورفع الصورة بنجاح!');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    return false; // prevent automatic HTTP post by upload component
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
    setCreateImageUrl('');

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
      product_name: '',
      featured_image: ''
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

    if ('featured_image' in changedValues) {
      setCreateImageUrl(changedValues.featured_image || '');
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
        featured_image: values.featured_image || createImageUrl || null,
        variants: generatedVariants.map((v) => ({
          color: v.color,
          size: v.size,
          price_modifier: v.price_modifier
        }))
      };

      const res = await api.post('/api/swm/products', payload);
      if (res.data.success) {
        message.success('تم حفظ المنتج وتوليد الكود والصورة بنجاح!');
        setIsModalOpen(false);
        form.resetFields();
        setGeneratedVariants([]);
        setCreateImageUrl('');
        fetchProducts();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ المنتج');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEcom = async (record, checked) => {
    try {
      const res = await api.put(`/api/swm/products/${record.id}`, { is_ecom_listed: checked });
      if (res.data.success) {
        message.success(checked ? 'تم تفعيل عرض المنتج في المتجر (ECP)' : 'تم إخفاء المنتج من المتجر (ECP)');
        fetchProducts();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تغيير حالة عرض المنتج');
    }
  };

  const handleOpenEdit = (record) => {
    setEditingProduct(record);
    setEditImageUrl(record.featured_image || '');
    editForm.setFieldsValue({
      product_name: record.product_name,
      category_id: record.category_id,
      brand: record.brand,
      cost_price: record.cost_price,
      selling_price: record.selling_price,
      sale_price: record.sale_price,
      status: record.status,
      is_ecom_listed: record.is_ecom_listed,
      featured_image: record.featured_image || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditProduct = async (values) => {
    if (!editingProduct) return;
    setEditSubmitting(true);
    try {
      const payload = {
        ...values,
        featured_image: values.featured_image || editImageUrl || null
      };
      const res = await api.put(`/api/swm/products/${editingProduct.id}`, payload);
      if (res.data.success) {
        message.success('تم تحديث بيانات وصورة المنتج بنجاح!');
        setIsEditModalOpen(false);
        setEditingProduct(null);
        setEditImageUrl('');
        fetchProducts();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث بيانات المنتج');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const res = await api.delete(`/api/swm/products/${id}`);
      if (res.data.success) {
        message.success('تم إيقاف المنتج وتحويل حالته إلى غير نشط');
        fetchProducts();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حذف/إيقاف المنتج');
    }
  };

  const columns = [
    {
      title: 'صورة المنتج',
      key: 'photo',
      width: 70,
      render: (_, record) => (
        <Avatar
          shape="square"
          size={44}
          src={record.featured_image || '/yokaStoreTransparent.png'}
          icon={<PictureOutlined />}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', objectFit: 'contain' }}
        />
      )
    },
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
      title: 'عرض بالمتجر (ECP)',
      key: 'is_ecom_listed',
      render: (_, record) => (
        <Switch
          checkedChildren="معروض"
          unCheckedChildren="مخفي"
          checked={Boolean(record.is_ecom_listed)}
          onChange={(checked) => handleToggleEcom(record, checked)}
        />
      )
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
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            style={{ backgroundColor: '#2563eb' }}
          >
            تعديل
          </Button>

          <Popconfirm
            title="حذف المنتج؟"
            description="سيتم تحويل حالة المنتج إلى غير نشط (Discontinued)."
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="نعم، احذف"
            cancelText="إلغاء"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              حذف
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>كتالوج المنتجات والمخزون (Product Catalog & Inventory)</Title>
          <Text type="secondary">توليد الأكواد آلياً، تخصيص صور المنتجات، وتحديد الأسعار والعرض بالمتجر (ECP)</Text>
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

      {/* Modal: New Product */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#2563eb' }} />
            <span>إضافة منتج جديد مع تخصيص الصورة والتفاصيل</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          onValuesChange={handleValuesChange}
        >
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

          <Form.Item name="product_code" hidden><Input /></Form.Item>
          <Form.Item name="barcode" hidden><Input /></Form.Item>
          <Form.Item name="product_name" hidden><Input /></Form.Item>

          {/* Product Image Section */}
          <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 10, color: '#1e293b' }}>
              صورة المنتج الرئيسية (Featured Photo):
            </Text>
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Form.Item label="رابط الصورة المباشر (Image URL or Path)" name="featured_image" style={{ marginBottom: 8 }}>
                  <Input
                    placeholder="https://... أو /yokaStoreTransparent.png"
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                  />
                </Form.Item>
                <Upload
                  beforeUpload={(file) => handleFileUpload(file, setCreateImageUrl, form)}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />}>رفع صورة من الجهاز (Upload File)</Button>
                </Upload>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>معاينة الصورة:</Text>
                <div style={{ width: 80, height: 80, border: '1px dashed #cbd5e1', borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
                  {createImageUrl ? (
                    <img src={createImageUrl} alt="معاينة" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <PictureOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                  )}
                </div>
              </Col>
            </Row>
          </Card>

          <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 10, color: '#1e293b' }}>
              تفاصيل الصنف الأساسية:
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

            <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', padding: '10px 14px', borderRadius: 6, marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                معاينة الاسم الوصفي المعتمد:
              </Text>
              <Text strong style={{ fontSize: 16, color: constructedName ? '#1e40af' : '#94a3b8' }}>
                {constructedName || 'سيظهر الاسم الكامل هنا...'}
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
                    <Option key={c.id} value={c.id}>{c.category_name}</Option>
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
              <Form.Item label="سعر التكلفة (ج.م) *" name="cost_price" rules={[{ required: true, message: 'حدد التكلفة' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={1} prefix="ج.م " />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="سعر البيع الأساسي (ج.م) *" name="selling_price" rules={[{ required: true, message: 'حدد سعر البيع' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={1} prefix="ج.م " />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="إتاحة في المتجر الإلكتروني (E-Commerce Sync)" name="is_ecom_listed" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>

          <VariantMatrix
            productCode={currentCode}
            basePrice={currentPrice}
            onChange={(variants) => setGeneratedVariants(variants)}
          />

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#2563eb' }}>
                حفظ المنتج والمتغيرات والصورة
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal: Edit Existing Product */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#2563eb' }} />
            <span>تعديل بيانات وصورة المنتج ({editingProduct?.product_code})</span>
          </Space>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditProduct}
          onValuesChange={(changed) => {
            if ('featured_image' in changed) {
              setEditImageUrl(changed.featured_image || '');
            }
          }}
        >
          <Form.Item
            label="اسم المنتج"
            name="product_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم المنتج' }]}
          >
            <Input />
          </Form.Item>

          {/* Edit Photo Section */}
          <Card size="small" style={{ marginBottom: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <Text strong style={{ display: 'block', marginBottom: 10, color: '#1e293b' }}>
              صورة المنتج الرئيسية (Product Image):
            </Text>
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Form.Item label="رابط الصورة (Image URL / Data URI)" name="featured_image" style={{ marginBottom: 8 }}>
                  <Input placeholder="https://... أو /yokaStoreTransparent.png" />
                </Form.Item>
                <Upload
                  beforeUpload={(file) => handleFileUpload(file, setEditImageUrl, editForm)}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button icon={<UploadOutlined />}>تغيير الصورة من الجهاز (Upload File)</Button>
                </Upload>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>معاينة الصورة الحالية:</Text>
                <div style={{ width: 80, height: 80, border: '1px dashed #cbd5e1', borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
                  {editImageUrl ? (
                    <img src={editImageUrl} alt="معاينة" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <PictureOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                  )}
                </div>
              </Col>
            </Row>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="القسم" name="category_id">
                <Select placeholder="اختر القسم">
                  {categories.map((c) => (
                    <Option key={c.id} value={c.id}>{c.category_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="الماركة / البراند" name="brand">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="سعر التكلفة (ج.م)" name="cost_price">
                <InputNumber style={{ width: '100%' }} min={0} prefix="ج.م " />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="سعر البيع (ج.م)" name="selling_price">
                <InputNumber style={{ width: '100%' }} min={0} prefix="ج.م " />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="سعر التخفيض / الخصم (Sale Price)" name="sale_price">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="اختياري" prefix="ج.م " />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="حالة المنتج" name="status">
                <Select>
                  <Option value="active">نشط (Active)</Option>
                  <Option value="inactive">غير نشط (Inactive)</Option>
                  <Option value="discontinued">متوقف (Discontinued)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="العرض في المتجر الإلكتروني (ECP Listing)" name="is_ecom_listed" valuePropName="checked">
            <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={editSubmitting} style={{ backgroundColor: '#2563eb' }}>
                حفظ التعديلات والصورة
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
