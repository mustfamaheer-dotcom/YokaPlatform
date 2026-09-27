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
  Avatar,
  Radio,
  Divider,
  Popover
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
  PictureOutlined,
  CameraOutlined,
  BgColorsOutlined,
  ColumnWidthOutlined,
  TagsOutlined,
  FolderOpenOutlined,
  EyeOutlined
} from '@ant-design/icons';
import api from '../api';
import VariantMatrix from '../components/VariantMatrix';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import BarcodeImage from '../components/BarcodeImage';
import { generateValidEAN13 } from '../utils/barcode';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Products({ currentUser, autoOpenCreate, onResetAction }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(undefined);

  // Attributes list (colors & sizes)
  const [colorsList, setColorsList] = useState([]);
  const [sizesList, setSizesList] = useState([]);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState([]);
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [variantMode, setVariantMode] = useState('single');
  const [selectedMultiColors, setSelectedMultiColors] = useState([]);
  const [selectedMultiSizes, setSelectedMultiSizes] = useState([]);
  const [colorImages, setColorImages] = useState({});

  // Inline Quick Add state inside modal
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [creatingCategoryInline, setCreatingCategoryInline] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [newColorHex, setNewColorHex] = useState('#1e293b');
  const [creatingColorInline, setCreatingColorInline] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [creatingSizeInline, setCreatingSizeInline] = useState(false);

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
  const watchedColor = Form.useWatch('color', form);
  const watchedBarcode = Form.useWatch('barcode', form);
  const watchedEditBarcode = Form.useWatch('barcode', editForm);

  const activeColors = variantMode === 'multi'
    ? selectedMultiColors
    : (watchedColor ? [watchedColor] : []);

  // Generate unique product code and valid 13-digit EAN barcode
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = generateValidEAN13('622');
    return { code, barcode };
  };

  // Helper to handle local file upload to Base64 data URI with canvas compression
  const handleCompressFile = (file, callback) => {
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
        callback(optimizedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    return false; // prevent automatic HTTP post
  };

  const handleFileUpload = (file, setUrlFunc, formInstance) => {
    handleCompressFile(file, (optimizedDataUrl) => {
      setUrlFunc(optimizedDataUrl);
      if (formInstance) {
        formInstance.setFieldsValue({ featured_image: optimizedDataUrl });
      }
      message.success('تم تحسين ورفع الصورة بنجاح!');
    });
    return false;
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

  // Fetch attributes
  const fetchAttributes = async () => {
    try {
      const [colRes, szRes] = await Promise.all([
        api.get('/api/swm/attributes', { params: { type: 'color' } }),
        api.get('/api/swm/attributes', { params: { type: 'size' } })
      ]);
      if (colRes.data.success && Array.isArray(colRes.data.data) && colRes.data.data.length > 0) {
        setColorsList(colRes.data.data);
      } else {
        setColorsList([
          { id: '1', name: 'أسود', code: '#000000' },
          { id: '2', name: 'أبيض', code: '#ffffff' },
          { id: '3', name: 'كحلي', code: '#1e3a8a' },
          { id: '4', name: 'بيج', code: '#d4b996' },
          { id: '5', name: 'رمادي', code: '#64748b' },
          { id: '6', name: 'أحمر', code: '#ef4444' },
          { id: '7', name: 'زيتي', code: '#365314' }
        ]);
      }
      if (szRes.data.success && Array.isArray(szRes.data.data) && szRes.data.data.length > 0) {
        setSizesList(szRes.data.data);
      } else {
        setSizesList([
          { id: '1', name: 'S' },
          { id: '2', name: 'M' },
          { id: '3', name: 'L' },
          { id: '4', name: 'XL' },
          { id: '5', name: '2XL' },
          { id: '6', name: '3XL' }
        ]);
      }
    } catch (err) {
      console.warn('Could not load attributes', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchAttributes();
  }, [selectedCategory]);

  // Inline Quick Add Category
  const handleQuickAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      return message.warning('يرجى كتابة اسم المجموعة أولاً');
    }
    setCreatingCategoryInline(true);
    try {
      const res = await api.post('/api/swm/categories', {
        category_name: newCategoryInput.trim()
      });
      if (res.data.success) {
        message.success(`تمت إضافة مجموعة "${newCategoryInput.trim()}" بنجاح!`);
        await fetchCategories();
        form.setFieldsValue({ category_id: res.data.data.id });
        setNewCategoryInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة المجموعة');
    } finally {
      setCreatingCategoryInline(false);
    }
  };

  // Inline Quick Add Color
  const handleQuickAddColor = async () => {
    if (!newColorInput.trim()) return message.warning('يرجى كتابة اسم اللون');
    setCreatingColorInline(true);
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'color',
        name: newColorInput.trim(),
        code: newColorHex
      });
      if (res.data.success) {
        message.success(`تمت إضافة اللون "${newColorInput.trim()}" بنجاح!`);
        await fetchAttributes();
        if (variantMode === 'multi') {
          setSelectedMultiColors(prev => [...prev, newColorInput.trim()]);
        } else {
          form.setFieldsValue({ color: newColorInput.trim() });
        }
        setNewColorInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة اللون');
    } finally {
      setCreatingColorInline(false);
    }
  };

  // Inline Quick Add Size
  const handleQuickAddSize = async () => {
    if (!newSizeInput.trim()) return message.warning('يرجى كتابة المقاس');
    setCreatingSizeInline(true);
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'size',
        name: newSizeInput.trim(),
        code: newSizeInput.trim()
      });
      if (res.data.success) {
        message.success(`تمت إضافة المقاس "${newSizeInput.trim()}" بنجاح!`);
        await fetchAttributes();
        if (variantMode === 'multi') {
          setSelectedMultiSizes(prev => [...prev, newSizeInput.trim()]);
        } else {
          form.setFieldsValue({ size: newSizeInput.trim() });
        }
        setNewSizeInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة المقاس');
    } finally {
      setCreatingSizeInline(false);
    }
  };

  const handleOpenCreate = () => {
    form.resetFields();
    const { code, barcode } = generateCodes();
    setAutoCode(code);
    setAutoBarcode(barcode);
    setConstructedName('');
    setGeneratedVariants([]);
    setCreateImageUrl('');
    setColorImages({});
    setVariantMode('single');
    setSelectedMultiColors([]);
    setSelectedMultiSizes([]);

    form.setFieldsValue({
      product_code: code,
      barcode: barcode,
      brand: 'Yoka Store',
      cost_price: 150,
      selling_price: 250,
      is_ecom_listed: true,
      base_name: '',
      color: colorsList[0]?.name || 'أسود',
      size: sizesList[0]?.name || 'L',
      product_name: '',
      featured_image: ''
    });

    setIsModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreate();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

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
      let activeColorsList = [];
      if (variantMode === 'multi') {
        activeColorsList = selectedMultiColors;
      } else if (values.color) {
        activeColorsList = [values.color];
      }

      const firstColorWithImg = activeColorsList.find(c => colorImages[c]);
      const defaultFeatured = (firstColorWithImg && colorImages[firstColorWithImg]) || createImageUrl || values.featured_image || null;

      let variantsPayload = [];
      if (variantMode === 'multi' && selectedMultiColors.length > 0 && selectedMultiSizes.length > 0) {
        variantsPayload = selectedMultiColors.flatMap((c, cIdx) =>
          selectedMultiSizes.map((s, sIdx) => {
            const rawCode = autoCode || values.product_code || 'PRD';
            const cClean = c.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${cIdx + 1}`;
            const sClean = s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${sIdx + 1}`;
            return {
              color: c,
              size: s,
              sku: `${rawCode}-${cClean}-${sClean}`,
              price_modifier: 0,
              image_url: colorImages[c] || defaultFeatured || null
            };
          })
        );
      } else if (values.color || values.size) {
        variantsPayload = [{
          color: values.color || null,
          size: values.size || null,
          sku: autoCode || values.product_code || 'PRD',
          price_modifier: 0,
          image_url: (values.color && colorImages[values.color]) || defaultFeatured || null
        }];
      }

      const payload = {
        product_code: autoCode || values.product_code,
        barcode: autoBarcode || values.barcode,
        product_name: finalProductName,
        category_id: values.category_id,
        brand: values.brand || 'Yoka Store',
        color: variantMode === 'multi' ? selectedMultiColors.join(' / ') : (values.color || null),
        size: variantMode === 'multi' ? selectedMultiSizes.join(' / ') : (values.size || null),
        cost_price: values.cost_price,
        selling_price: values.selling_price,
        is_ecom_listed: Boolean(values.is_ecom_listed),
        featured_image: defaultFeatured,
        color_images: colorImages,
        variants: variantsPayload
      };

      const res = await api.post('/api/swm/products', payload);
      if (res.data.success) {
        message.success('تم حفظ المنتج وتعيين صور الألوان وتوليد الأكواد بنجاح!');
        setIsModalOpen(false);
        form.resetFields();
        setGeneratedVariants([]);
        setColorImages({});
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

  const handleOpenEdit = async (record) => {
    setEditingProduct(record);
    setEditImageUrl(record.featured_image || '');

    const initialColorImages = {};
    if (record.color_variants && Array.isArray(record.color_variants)) {
      record.color_variants.forEach(cv => {
        if (cv.color && cv.image_url) {
          initialColorImages[cv.color] = cv.image_url;
        }
      });
    }

    try {
      const res = await api.get(`/api/swm/products/${record.id}`);
      if (res.data.success && Array.isArray(res.data.variants)) {
        res.data.variants.forEach(v => {
          if (v.color && v.image_url && !initialColorImages[v.color]) {
            initialColorImages[v.color] = v.image_url;
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch variants', e);
    }

    setColorImages(initialColorImages);

    editForm.setFieldsValue({
      product_name: record.product_name,
      category_id: record.category_id,
      brand: record.brand || 'Yoka Store',
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
      const activeColorsList = editingProduct.color ? editingProduct.color.split('/').map(c => c.trim()) : [];
      const firstColorWithImg = activeColorsList.find(c => colorImages[c]);
      const defaultFeatured = (firstColorWithImg && colorImages[firstColorWithImg]) || editImageUrl || values.featured_image || null;

      const payload = {
        ...values,
        featured_image: defaultFeatured,
        color_images: colorImages
      };
      const res = await api.put(`/api/swm/products/${editingProduct.id}`, payload);
      if (res.data.success) {
        message.success('تم تحديث بيانات وصور ألوان المنتج بنجاح!');
        setIsEditModalOpen(false);
        setEditingProduct(null);
        setEditImageUrl('');
        setColorImages({});
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
          src={record.featured_image || yokaLogo}
          icon={<PictureOutlined />}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', objectFit: 'contain' }}
        />
      )
    },
    {
      title: 'كود المنتج / الباركود',
      key: 'codes',
      render: (_, record) => {
        const barcodeVal = record.barcode || record.product_code;
        return (
          <div>
            <div><Text strong code>{record.product_code}</Text></div>
            {barcodeVal && (
              <Popover
                title={
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                    باركود الصنف الدولي (Barcode)
                  </div>
                }
                content={
                  <div style={{ textAlign: 'center', padding: '6px 4px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                      {record.product_name}
                    </div>
                    <BarcodeImage value={barcodeVal} height={50} width={1.7} />
                  </div>
                }
                placement="topLeft"
              >
                <div style={{ fontSize: 11, color: '#4f46e5', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <BarcodeOutlined />
                  <span style={{ textDecoration: 'underline' }}>{barcodeVal}</span>
                  <EyeOutlined style={{ fontSize: 10, color: '#6366f1' }} />
                </div>
              </Popover>
            )}
          </div>
        );
      }
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
      title: 'الألوان وصورها',
      key: 'color_variants_preview',
      width: 170,
      render: (_, record) => {
        const cvs = Array.isArray(record.color_variants) ? record.color_variants : [];
        const rawColors = cvs.length > 0
          ? cvs.map(c => c.color).filter(Boolean)
          : (record.color ? record.color.split('/').map(c => c.trim()).filter(Boolean) : []);

        if (rawColors.length === 0) return <Text type="secondary">—</Text>;

        return (
          <Space size={4} wrap>
            {rawColors.map((colName) => {
              const cv = cvs.find(v => v.color === colName);
              const img = cv?.image_url;
              return img ? (
                <Popover
                  key={colName}
                  title={<span style={{ fontSize: 12, fontWeight: 700 }}>صورة اللون: {colName}</span>}
                  content={
                    <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={img} alt={colName} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, objectFit: 'contain' }} />
                    </div>
                  }
                >
                  <Tag
                    color="blue"
                    style={{ cursor: 'pointer', margin: '2px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>{colName}</span>
                    <PictureOutlined style={{ color: '#2563eb' }} />
                  </Tag>
                </Popover>
              ) : (
                <Tag key={colName} style={{ margin: '2px' }}>
                  <span>{colName}</span>
                </Tag>
              );
            })}
          </Space>
        );
      }
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
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 15 }}
        bordered
      />

      {/* Modal: New Product */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#2563eb' }} />
            <span>إضافة صنف جديد وربطه بالمجموعة والصفات</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={820}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          onValuesChange={handleValuesChange}
          style={{ marginTop: 8 }}
        >
          {/* 1. ID & Barcode & Brand (matching user sketch top row) */}
          <Row gutter={16}>
            <Col xs={24} sm={9}>
              <Form.Item
                name="product_code"
                label="كود الصنف (Item Code)"
                rules={[{ required: true, message: 'يرجى إدخال أو توليد كود الصنف' }]}
              >
                <Input
                  placeholder="PRD-123456"
                  addonAfter={
                    <Tooltip title="توليد كود وباركود جديدين">
                      <Button
                        type="link"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleRegenerateCodes}
                        style={{ padding: 0, height: 'auto', color: '#2563eb' }}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="barcode" label="الباركود الدولي (Barcode EAN)">
                <Input
                  placeholder="622XXXXXXXXXX"
                  addonAfter={
                    <Tooltip title="توليد باركود EAN-13 حقيقي متوافق دولياً">
                      <Button
                        type="link"
                        size="small"
                        onClick={() => form.setFieldsValue({ barcode: generateValidEAN13('622') })}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, color: '#4f46e5' }}
                      >
                        توليد EAN
                      </Button>
                    </Tooltip>
                  }
                />
              </Form.Item>
              {watchedBarcode && (
                <div style={{ marginTop: -4, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <BarcodeImage value={watchedBarcode} height={38} width={1.4} />
                </div>
              )}
            </Col>
            <Col xs={24} sm={7}>
              <Form.Item name="brand" label="الماركة / البراند (Brand)">
                <Input placeholder="Yoka Store" />
              </Form.Item>
            </Col>
          </Row>

          {/* 2. Name (اسم الصنف) */}
          <Form.Item
            name="base_name"
            label="اسم الصنف الأساسي (Item Name)"
            rules={[{ required: true, message: 'يرجى إدخال اسم الصنف الأساسي' }]}
            style={{ marginBottom: 14 }}
          >
            <Input placeholder="مثال: قميص أكسفورد كلاسيك رجالي..." size="large" />
          </Form.Item>

          {/* 3. Group / Category with ON-THE-FLY Quick Add (matching Image 2) */}
          <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
            <Form.Item
              name="category_id"
              label={<Text strong style={{ color: '#5b21b6' }}>المجموعة التابع لها الصنف (Product Group / Category):</Text>}
              rules={[{ required: true, message: 'يرجى اختيار المجموعة التي يتبعها الصنف' }]}
              style={{ marginBottom: 4 }}
            >
              <Select
                placeholder="اختر المجموعة الرئيسية أو أضف مجموعة جديدة بالأسفل..."
                size="large"
                showSearch
                filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                      <Input
                        placeholder="أدخل اسم مجموعة رئيسية جديدة..."
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="middle"
                        style={{ minWidth: 240 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={creatingCategoryInline}
                        onClick={handleQuickAddCategory}
                        style={{ backgroundColor: '#5b21b6', borderColor: '#5b21b6' }}
                      >
                        إضافة كمجموعة جديدة
                      </Button>
                    </Space>
                  </>
                )}
              >
                {categories.map((c) => (
                  <Option key={c.id} value={c.id}>
                    📁 {c.category_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', color: '#6d28d9' }}>
              💡 يمكنك الاختيار من المجموعات الحالية أو كتابة اسم مجموعة جديدة تماماً وإضافتها فورياً من داخل القائمة.
            </Text>
          </div>

          {/* 4. Variant Mode Selection: Single Item vs Multi-variant */}
          <div style={{ marginBottom: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1e293b' }}>
              خيارات وتنوع الصنف (Variant Mode):
            </Text>
            <Radio.Group
              value={variantMode}
              onChange={(e) => {
                const mode = e.target.value;
                setVariantMode(mode);
                if (mode === 'multi' && selectedMultiColors.length === 0) {
                  setSelectedMultiColors(colorsList.slice(0, 2).map((c) => c.name));
                }
                if (mode === 'multi' && selectedMultiSizes.length === 0) {
                  setSelectedMultiSizes(sizesList.slice(0, 3).map((s) => s.name));
                }
              }}
              buttonStyle="solid"
              style={{ width: '100%' }}
            >
              <Radio.Button value="single" style={{ width: '50%', textAlign: 'center' }}>
                صنف بسيط (لون ومقاس واحد فقط)
              </Radio.Button>
              <Radio.Button value="multi" style={{ width: '50%', textAlign: 'center', color: '#4f46e5', fontWeight: 600 }}>
                ✨ صنف متعدد (كذا مقاس وكذا لون - Multi-Variants)
              </Radio.Button>
            </Radio.Group>
          </div>

          {/* 5. Colors & Sizes Selectors */}
          {variantMode === 'multi' ? (
            <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <TagsOutlined style={{ color: '#6d28d9', fontSize: 16 }} />
                <Text strong style={{ color: '#4c1d95', fontSize: 14 }}>
                  تحديد المقاسات والألوان المتعددة لهذا الصنف:
                </Text>
              </div>

              <Row gutter={16}>
                {/* Multi-Colors */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space>
                        <BgColorsOutlined style={{ color: '#7c3aed' }} />
                        <Text strong style={{ color: '#5b21b6' }}>الألوان المتاحة (Multiple Colors):</Text>
                      </Space>
                    }
                    required
                  >
                    <Select
                      mode="multiple"
                      placeholder="حدد ألوان الصنف..."
                      value={selectedMultiColors}
                      onChange={setSelectedMultiColors}
                      size="large"
                      style={{ width: '100%' }}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ padding: '0 8px 4px' }}>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input
                                placeholder="لون جديد..."
                                value={newColorInput}
                                onChange={(e) => setNewColorInput(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                style={{ flex: 1 }}
                              />
                              <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                style={{ width: 34, height: 32, padding: 2, cursor: 'pointer', border: '1px solid #d9d9d9' }}
                              />
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                loading={creatingColorInline}
                                onClick={handleQuickAddColor}
                                style={{ backgroundColor: '#7c3aed' }}
                              >
                                إضافة
                              </Button>
                            </Space.Compact>
                          </div>
                        </>
                      )}
                    >
                      {colorsList.map((c) => (
                        <Option key={c.id} value={c.name}>
                          <Space align="middle">
                            <span
                              style={{
                                display: 'inline-block',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                backgroundColor: c.code || '#000',
                                border: '1px solid #cbd5e1'
                              }}
                            />
                            <span>{c.name}</span>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                {/* Multi-Sizes */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space>
                        <ColumnWidthOutlined style={{ color: '#0284c7' }} />
                        <Text strong style={{ color: '#0369a1' }}>المقاسات المتاحة (Multiple Sizes):</Text>
                      </Space>
                    }
                    required
                  >
                    <Select
                      mode="multiple"
                      placeholder="حدد مقاسات الصنف..."
                      value={selectedMultiSizes}
                      onChange={setSelectedMultiSizes}
                      size="large"
                      style={{ width: '100%' }}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                            <Input
                              placeholder="مقاس جديد (مثل: 5XL)..."
                              value={newSizeInput}
                              onChange={(e) => setNewSizeInput(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{ minWidth: 140 }}
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              loading={creatingSizeInline}
                              onClick={handleQuickAddSize}
                              style={{ backgroundColor: '#0284c7' }}
                            >
                              إضافة
                            </Button>
                          </Space>
                        </>
                      )}
                    >
                      {sizesList.map((s) => (
                        <Option key={s.id} value={s.name}>
                          <Tag color="blue" style={{ fontWeight: 600 }}>{s.name}</Tag>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          ) : (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="color"
                  label={
                    <Space>
                      <BgColorsOutlined style={{ color: '#7c3aed' }} />
                      <span>اللون المختار (Color):</span>
                    </Space>
                  }
                >
                  <Select
                    placeholder="اختر اللون من قائمة الألوان..."
                    allowClear
                    showSearch
                    size="large"
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ padding: '0 8px 4px' }}>
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="لون جديد..."
                              value={newColorInput}
                              onChange={(e) => setNewColorInput(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="color"
                              value={newColorHex}
                              onChange={(e) => setNewColorHex(e.target.value)}
                              style={{ width: 34, height: 32, padding: 2, cursor: 'pointer', border: '1px solid #d9d9d9' }}
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              loading={creatingColorInline}
                              onClick={handleQuickAddColor}
                              style={{ backgroundColor: '#7c3aed' }}
                            >
                              إضافة
                            </Button>
                          </Space.Compact>
                        </div>
                      </>
                    )}
                  >
                    {colorsList.map((c) => (
                      <Option key={c.id} value={c.name}>
                        <Space align="middle">
                          <span
                            style={{
                              display: 'inline-block',
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              backgroundColor: c.code || '#000',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                          <span>{c.name}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="size"
                  label={
                    <Space>
                      <ColumnWidthOutlined style={{ color: '#0284c7' }} />
                      <span>المقاس المختار (Size):</span>
                    </Space>
                  }
                >
                  <Select
                    placeholder="اختر المقاس من قائمة المقاسات..."
                    allowClear
                    showSearch
                    size="large"
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                          <Input
                            placeholder="مقاس جديد (مثل: 5XL)..."
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            style={{ minWidth: 140 }}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={creatingSizeInline}
                            onClick={handleQuickAddSize}
                            style={{ backgroundColor: '#0284c7' }}
                          >
                            إضافة
                          </Button>
                        </Space>
                      </>
                    )}
                  >
                    {sizesList.map((s) => (
                      <Option key={s.id} value={s.name}>
                        <Tag color="blue" style={{ fontWeight: 600 }}>{s.name}</Tag>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* 6. DEDICATED IMAGE FOR EACH COLOR SECTION */}
          {activeColors.length > 0 && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space align="middle">
                  <PictureOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                  <Text strong style={{ color: '#15803d', fontSize: 14 }}>
                    صور ألوان الصنف (صورة مخصصة لكل لون):
                  </Text>
                </Space>
                <Tag color={activeColors.every((c) => colorImages[c]) ? 'green' : 'blue'}>
                  {activeColors.filter((c) => colorImages[c]).length} من {activeColors.length} ألوان تم تحديد صورها
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12, color: '#166534' }}>
                💡 يمكنك رفع صورة خاصة لكل لون من جهازك أو لصق رابط مباشر للصورة. ستظهر الصورة تلقائياً في المتجر والكتالوج عند اختيار اللون.
              </Text>

              <Row gutter={[12, 12]}>
                {activeColors.map((colName) => {
                  const colObj = colorsList.find((c) => c.name === colName);
                  const hasImg = Boolean(colorImages[colName]);
                  return (
                    <Col xs={24} sm={12} key={colName}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: hasImg ? '1.5px solid #22c55e' : '1px dashed #cbd5e1',
                          borderRadius: 8,
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          boxShadow: hasImg ? '0 2px 6px rgba(34,197,94,0.1)' : 'none'
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: 66,
                            height: 66,
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {hasImg ? (
                            <img
                              src={colorImages[colName]}
                              alt={colName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <CameraOutlined style={{ fontSize: 24, color: '#94a3b8' }} />
                          )}
                        </div>

                        {/* Details and Upload */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Space align="middle" size={6}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  backgroundColor: colObj?.code || '#000',
                                  border: '1px solid #cbd5e1'
                                }}
                              />
                              <Text strong style={{ fontSize: 13 }}>{colName}</Text>
                            </Space>
                            {hasImg ? (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  setColorImages((prev) => {
                                    const next = { ...prev };
                                    delete next[colName];
                                    return next;
                                  });
                                }}
                                style={{ padding: '0 4px', height: 20 }}
                              >
                                مسح
                              </Button>
                            ) : (
                              <Text type="secondary" style={{ fontSize: 11 }}>بدون صورة</Text>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <Upload
                              beforeUpload={(file) => {
                                handleCompressFile(file, (dataUrl) => {
                                  setColorImages((prev) => ({ ...prev, [colName]: dataUrl }));
                                  message.success(`تم رفع وتجهيز صورة اللون (${colName})!`);
                                });
                                return false;
                              }}
                              showUploadList={false}
                              accept="image/*"
                            >
                              <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 11 }}>
                                {hasImg ? 'تغيير' : 'رفع صورة'}
                              </Button>
                            </Upload>

                            <Input
                              size="small"
                              placeholder="أو رابط..."
                              value={hasImg && colorImages[colName].startsWith('data:') ? 'صورة مرفوعة' : (colorImages[colName] || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColorImages((prev) => ({ ...prev, [colName]: val }));
                              }}
                              style={{ fontSize: 11, flex: 1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          {/* Combinations Matrix Preview for Multi-Variants */}
          {variantMode === 'multi' && selectedMultiColors.length > 0 && selectedMultiSizes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                type="info"
                showIcon
                message={
                  <span>
                    سيتم توليد <strong>{selectedMultiColors.length * selectedMultiSizes.length}</strong> تركيبة صنف تلقائياً مع ربط صورة كل لون ({selectedMultiColors.length} ألوان × {selectedMultiSizes.length} مقاسات)
                  </span>
                }
                style={{ marginBottom: 8 }}
              />
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #c7d2fe', borderRadius: 6, background: '#fff' }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={selectedMultiColors.flatMap((c, cIdx) =>
                    selectedMultiSizes.map((s, sIdx) => {
                      const rawCode = currentCode || autoCode || 'PRD';
                      const cClean = c.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${cIdx + 1}`;
                      const sClean = s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${sIdx + 1}`;
                      return {
                        key: `${c}-${s}`,
                        color: c,
                        size: s,
                        sku: `${rawCode}-${cClean}-${sClean}`
                      };
                    })
                  )}
                  columns={[
                    {
                      title: 'صورة اللون',
                      key: 'img',
                      width: 70,
                      render: (_, row) => (
                        <Avatar
                          shape="square"
                          size={28}
                          src={colorImages[row.color] || yokaLogo}
                          icon={<PictureOutlined />}
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                        />
                      )
                    },
                    {
                      title: 'اللون',
                      dataIndex: 'color',
                      key: 'color',
                      render: (col) => {
                        const cObj = colorsList.find((c) => c.name === col);
                        return (
                          <Space>
                            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: cObj?.code || '#000' }} />
                            <span>{col}</span>
                          </Space>
                        );
                      }
                    },
                    {
                      title: 'المقاس',
                      dataIndex: 'size',
                      key: 'size',
                      render: (s) => <Tag color="blue">{s}</Tag>
                    },
                    {
                      title: 'كود الصنف الفرعي (SKU)',
                      dataIndex: 'sku',
                      key: 'sku',
                      render: (sku) => <code style={{ fontSize: 11 }}>{sku}</code>
                    }
                  ]}
                />
              </div>
            </div>
          )}

          {/* 7. Prices (Purchase & Sell Price - matching Image 1) */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="سعر التكلفة الافتراضي / الشراء (ج.م) *"
                name="cost_price"
                rules={[{ required: true, message: 'حدد التكلفة' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={5} prefix="ج.م " />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="سعر البيع قطاعي للجمهور (ج.م) *"
                name="selling_price"
                rules={[{ required: true, message: 'حدد سعر البيع' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={5} prefix="ج.م " />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="إتاحة في المتجر الإلكتروني (E-Commerce Sync)" name="is_ecom_listed" valuePropName="checked">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value={true}>متاح في المتجر الإلكتروني</Radio.Button>
              <Radio.Button value={false}>مخزن داخلي فقط</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#2563eb' }}>
                حفظ المنتج وصور الألوان
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
            <span>تعديل بيانات وصور ألوان المنتج ({editingProduct?.product_code})</span>
          </Space>
        }
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        footer={null}
        width={800}
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
            <Input size="large" />
          </Form.Item>

          {/* Edit Group with inline quick add */}
          <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
            <Form.Item label={<Text strong style={{ color: '#5b21b6' }}>القسم / المجموعة التابع لها:</Text>} name="category_id">
              <Select
                placeholder="اختر القسم"
                size="large"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                      <Input
                        placeholder="أدخل اسم مجموعة جديدة..."
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="middle"
                        style={{ minWidth: 240 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={creatingCategoryInline}
                        onClick={handleQuickAddCategory}
                        style={{ backgroundColor: '#5b21b6', borderColor: '#5b21b6' }}
                      >
                        إضافة كمجموعة جديدة
                      </Button>
                    </Space>
                  </>
                )}
              >
                {categories.map((c) => (
                  <Option key={c.id} value={c.id}>{c.category_name}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Color Photos in Edit Modal */}
          {editingProduct && (editingProduct.color || Object.keys(colorImages).length > 0) && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space align="middle">
                  <PictureOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                  <Text strong style={{ color: '#15803d', fontSize: 14 }}>
                    صور ألوان المنتج المخصصة:
                  </Text>
                </Space>
              </div>

              <Row gutter={[12, 12]}>
                {Array.from(new Set([
                  ...(editingProduct.color ? editingProduct.color.split('/').map((s) => s.trim()).filter(Boolean) : []),
                  ...Object.keys(colorImages)
                ])).map((colName) => {
                  const hasImg = Boolean(colorImages[colName]);
                  return (
                    <Col xs={24} sm={12} key={colName}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: hasImg ? '1.5px solid #22c55e' : '1px dashed #cbd5e1',
                          borderRadius: 8,
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}
                        >
                          {hasImg ? (
                            <img
                              src={colorImages[colName]}
                              alt={colName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <CameraOutlined style={{ fontSize: 22, color: '#94a3b8' }} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 13 }}>لون: {colName}</Text>
                            {hasImg && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  setColorImages((prev) => {
                                    const next = { ...prev };
                                    delete next[colName];
                                    return next;
                                  });
                                }}
                                style={{ padding: '0 4px', height: 20 }}
                              >
                                مسح
                              </Button>
                            )}
                          </div>
                          <Upload
                            beforeUpload={(file) => {
                              handleCompressFile(file, (dataUrl) => {
                                setColorImages((prev) => ({ ...prev, [colName]: dataUrl }));
                                message.success(`تم تحديث صورة اللون (${colName})!`);
                              });
                              return false;
                            }}
                            showUploadList={false}
                            accept="image/*"
                          >
                            <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 11 }}>
                              {hasImg ? 'تغيير الصورة' : 'رفع صورة'}
                            </Button>
                          </Upload>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="الماركة / البراند" name="brand">
                <Input />
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

          <Form.Item label="العرض في المتجر الإلكتروني (ECP Listing)" name="is_ecom_listed" valuePropName="checked">
            <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={editSubmitting} style={{ backgroundColor: '#2563eb' }}>
                حفظ التعديلات والصور
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
