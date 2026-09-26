import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  Typography,
  message,
  Card,
  Row,
  Col,
  Divider,
  Tabs,
  Popconfirm,
  Tooltip,
  Badge,
  Statistic,
  Radio,
  Alert
} from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  ShoppingOutlined,
  DollarOutlined,
  FilterOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  FolderOpenOutlined,
  BgColorsOutlined,
  ColumnWidthOutlined,
  CheckOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ARABIC_COLOR_CODES = {
  'أسود': 'BLK', 'اسود': 'BLK', 'أبيض': 'WHT', 'ابيض': 'WHT',
  'كحلي': 'NVY', 'أزرق': 'BLU', 'ازرق': 'BLU', 'رمادي': 'GRY',
  'رمادي فاتح': 'LGY', 'رمادي غامق': 'DGY', 'بيج': 'BEI',
  'بني': 'BRN', 'جملي': 'CAM', 'أحمر': 'RED', 'احمر': 'RED',
  'نبيتي': 'BUR', 'أخضر': 'GRN', 'اخضر': 'GRN', 'زيتي': 'OLV',
  'أصفر': 'YLW', 'اصفر': 'YLW', 'برتقالي': 'ORG', 'وردي': 'PNK',
  'بينك': 'PNK', 'فوشيا': 'FUS', 'بنفسجي': 'PUR', 'موف': 'MAU',
  'سماوي': 'SKY', 'تركواز': 'TRQ', 'ذهبي': 'GLD', 'فضي': 'SLV',
  'مستردة': 'MUS', 'كشمير': 'CSH'
};

function getSafeColorCode(colorName, colorIndex = 0) {
  if (!colorName) return `C${colorIndex + 1}`;
  const trimmed = colorName.trim();
  if (ARABIC_COLOR_CODES[trimmed]) {
    return ARABIC_COLOR_CODES[trimmed];
  }
  const latinOnly = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (latinOnly.length >= 2) {
    return latinOnly.slice(0, 3).toUpperCase();
  }
  return `C${colorIndex + 1}`;
}

function getSafeSizeCode(sizeName, sizeIndex = 0) {
  if (!sizeName) return `S${sizeIndex + 1}`;
  const trimmed = sizeName.trim();
  const latinOrNum = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (latinOrNum.length > 0) {
    return latinOrNum.toUpperCase();
  }
  return `SZ${sizeIndex + 1}`;
}

function buildVariantSku(productCode, colorName, sizeName, colorIndex = 0, sizeIndex = 0) {
  const code = (productCode || 'PRD').trim().toUpperCase().replace(/[^a-zA-Z0-9-_]/g, '') || 'PRD';
  const cCode = getSafeColorCode(colorName, colorIndex);
  const sCode = getSafeSizeCode(sizeName, sizeIndex);
  return `${code}-${cCode}-${sCode}`;
}

export default function GroupsAndItems() {
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'attributes' | 'items'

  // ==========================================
  // 1. GROUPS (CATEGORIES) STATE
  // ==========================================
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Group Create/Edit Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupForm] = Form.useForm();

  // On-the-fly group add state (inside Item Modal)
  const [newGroupInput, setNewGroupInput] = useState('');
  const [creatingGroupInline, setCreatingGroupInline] = useState(false);

  // ==========================================
  // 2. ATTRIBUTES (SIZES & COLORS) STATE
  // ==========================================
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [attributesLoading, setAttributesLoading] = useState(false);

  // Attribute Modal State (Size or Color)
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [attrModalType, setAttrModalType] = useState('size'); // 'size' | 'color'
  const [editingAttr, setEditingAttr] = useState(null);
  const [attrSubmitting, setAttrSubmitting] = useState(false);
  const [attrForm] = Form.useForm();

  // On-the-fly attribute add state (inside Item Modal)
  const [newSizeInput, setNewSizeInput] = useState('');
  const [creatingSizeInline, setCreatingSizeInline] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [newColorCode, setNewColorCode] = useState('#1e293b');
  const [creatingColorInline, setCreatingColorInline] = useState(false);

  // ==========================================
  // 3. ITEMS (PRODUCTS MASTER) STATE
  // ==========================================
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(undefined);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(undefined);
  const [itemsPagination, setItemsPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // Item Create/Edit Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemForm] = Form.useForm();

  // Multi-variant (Multiple colors & Multiple sizes) State
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [selectedMultiColors, setSelectedMultiColors] = useState([]);
  const [selectedMultiSizes, setSelectedMultiSizes] = useState([]);

  // ==========================================
  // FETCHING DATA
  // ==========================================
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await api.get('/api/swm/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل المجموعات والتصنيفات');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchAttributes = async () => {
    setAttributesLoading(true);
    try {
      const [sizesRes, colorsRes] = await Promise.all([
        api.get('/api/swm/attributes', { params: { type: 'size' } }),
        api.get('/api/swm/attributes', { params: { type: 'color' } })
      ]);
      if (sizesRes.data.success) setSizes(sizesRes.data.data);
      if (colorsRes.data.success) setColors(colorsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch attributes:', err);
    } finally {
      setAttributesLoading(false);
    }
  };

  const fetchItems = async (page = 1) => {
    setItemsLoading(true);
    try {
      const res = await api.get('/api/swm/products', {
        params: {
          page,
          limit: itemsPagination.pageSize,
          search: itemSearch || undefined,
          category_id: selectedCategoryFilter || undefined,
          status: selectedStatusFilter || undefined
        }
      });
      if (res.data.success) {
        setItems(res.data.data);
        setItemsPagination(prev => ({
          ...prev,
          current: res.data.meta?.page || 1,
          total: res.data.meta?.total || 0
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل الأصناف');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAttributes();
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [itemSearch, selectedCategoryFilter, selectedStatusFilter]);

  // ==========================================
  // GROUPS HANDLERS
  // ==========================================
  const handleOpenCreateGroup = () => {
    setEditingCategory(null);
    groupForm.resetFields();
    groupForm.setFieldsValue({
      category_name: '',
      parent_id: null,
      description: '',
      display_order: categories.length + 1,
      is_ecom_visible: true
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (cat) => {
    setEditingCategory(cat);
    groupForm.resetFields();
    groupForm.setFieldsValue({
      category_name: cat.category_name,
      slug: cat.slug,
      parent_id: cat.parent_id || null,
      description: cat.description || '',
      display_order: cat.display_order || 0,
      is_ecom_visible: cat.is_ecom_visible !== false
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSubmitting(true);

      if (editingCategory) {
        const res = await api.put(`/api/swm/categories/${editingCategory.id}`, values);
        if (res.data.success) {
          message.success('تم تحديث المجموعة بنجاح');
          setIsGroupModalOpen(false);
          fetchCategories();
          fetchItems(itemsPagination.current);
        }
      } else {
        const res = await api.post('/api/swm/categories', values);
        if (res.data.success) {
          message.success('تمت إضافة المجموعة الجديدة بنجاح');
          setIsGroupModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'فشل حفظ المجموعة');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleDeleteGroup = async (catId) => {
    try {
      const res = await api.delete(`/api/swm/categories/${catId}`);
      if (res.data.success) {
        message.success('تم حذف المجموعة بنجاح');
        fetchCategories();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حذف المجموعة');
    }
  };

  const handleFilterItemsByGroup = (catId) => {
    setSelectedCategoryFilter(catId);
    setActiveTab('items');
  };

  // Quick inline add group from item modal dropdown
  const handleQuickAddGroup = async (e) => {
    e?.preventDefault();
    if (!newGroupInput.trim()) return;
    setCreatingGroupInline(true);
    try {
      const res = await api.post('/api/swm/categories', {
        category_name: newGroupInput.trim(),
        display_order: categories.length + 1,
        is_ecom_visible: true
      });
      if (res.data.success) {
        message.success(`تمت إضافة مجموعة "${newGroupInput.trim()}" بنجاح!`);
        const createdCat = res.data.data;
        await fetchCategories();
        itemForm.setFieldsValue({ category_id: createdCat.id });
        setNewGroupInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل إضافة المجموعة السريعة');
    } finally {
      setCreatingGroupInline(false);
    }
  };

  // ==========================================
  // ATTRIBUTES (SIZES & COLORS) HANDLERS
  // ==========================================
  const handleOpenCreateAttr = (type) => {
    setAttrModalType(type);
    setEditingAttr(null);
    attrForm.resetFields();
    attrForm.setFieldsValue({
      name: '',
      code: type === 'color' ? '#1E3A8A' : '',
      display_order: (type === 'size' ? sizes.length : colors.length) + 1
    });
    setIsAttrModalOpen(true);
  };

  const handleOpenEditAttr = (attr) => {
    setAttrModalType(attr.attribute_type);
    setEditingAttr(attr);
    attrForm.resetFields();
    attrForm.setFieldsValue({
      name: attr.name,
      code: attr.code || '',
      display_order: attr.display_order || 0
    });
    setIsAttrModalOpen(true);
  };

  const handleSaveAttr = async () => {
    try {
      const values = await attrForm.validateFields();
      setAttrSubmitting(true);

      if (editingAttr) {
        const res = await api.put(`/api/swm/attributes/${editingAttr.id}`, values);
        if (res.data.success) {
          message.success('تم التحديث بنجاح');
          setIsAttrModalOpen(false);
          fetchAttributes();
        }
      } else {
        const res = await api.post('/api/swm/attributes', {
          ...values,
          attribute_type: attrModalType
        });
        if (res.data.success) {
          message.success(`تمت إضافة ${attrModalType === 'size' ? 'المقاس' : 'اللون'} بنجاح`);
          setIsAttrModalOpen(false);
          fetchAttributes();
        }
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'فشل حفظ الخاصية');
    } finally {
      setAttrSubmitting(false);
    }
  };

  const handleDeleteAttr = async (attrId) => {
    try {
      const res = await api.delete(`/api/swm/attributes/${attrId}`);
      if (res.data.success) {
        message.success('تم الحذف بنجاح');
        fetchAttributes();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  // Quick inline add size from item modal
  const handleQuickAddSize = async (e) => {
    e?.preventDefault();
    if (!newSizeInput.trim()) return;
    setCreatingSizeInline(true);
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'size',
        name: newSizeInput.trim(),
        code: newSizeInput.trim().toUpperCase(),
        display_order: sizes.length + 1
      });
      if (res.data.success) {
        message.success(`تمت إضافة المقاس "${newSizeInput.trim()}" بنجاح!`);
        await fetchAttributes();
        itemForm.setFieldsValue({ size: newSizeInput.trim() });
        setNewSizeInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل إضافة المقاس');
    } finally {
      setCreatingSizeInline(false);
    }
  };

  // Quick inline add color from item modal
  const handleQuickAddColor = async (e) => {
    e?.preventDefault();
    if (!newColorInput.trim()) return;
    setCreatingColorInline(true);
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'color',
        name: newColorInput.trim(),
        code: newColorCode || '#1e293b',
        display_order: colors.length + 1
      });
      if (res.data.success) {
        message.success(`تمت إضافة اللون "${newColorInput.trim()}" بنجاح!`);
        await fetchAttributes();
        itemForm.setFieldsValue({ color: newColorInput.trim() });
        setNewColorInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل إضافة اللون');
    } finally {
      setCreatingColorInline(false);
    }
  };

  // ==========================================
  // ITEMS HANDLERS
  // ==========================================
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `ITM-${randNum}`;
    const barcode = `622${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
    return { code, barcode };
  };

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setIsMultiVariant(false);
    setSelectedMultiColors([]);
    setSelectedMultiSizes([]);
    itemForm.resetFields();
    const { code, barcode } = generateCodes();
    itemForm.setFieldsValue({
      product_code: code,
      barcode: barcode,
      category_id: selectedCategoryFilter || (categories[0]?.id || null),
      brand: 'Yoka Store',
      cost_price: 100,
      selling_price: 180,
      material: '',
      color: colors[0]?.name || 'أسود',
      size: sizes[0]?.name || 'L',
      is_ecom_listed: false
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setIsMultiVariant(false);
    setSelectedMultiColors([]);
    setSelectedMultiSizes([]);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      product_name: item.product_name,
      product_code: item.product_code,
      barcode: item.barcode,
      category_id: item.category_id,
      brand: item.brand || '',
      color: item.color || '',
      size: item.size || '',
      material: item.material || '',
      cost_price: parseFloat(item.cost_price) || 0,
      selling_price: parseFloat(item.selling_price) || 0,
      wholesale_price: parseFloat(item.wholesale_price) || 0,
      status: item.status || 'active'
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const values = await itemForm.validateFields();
      setItemSubmitting(true);

      let variantsPayload = [];
      if (isMultiVariant && selectedMultiColors.length > 0 && selectedMultiSizes.length > 0) {
        const usedSkus = new Set();
        variantsPayload = selectedMultiColors.flatMap((c, cIdx) =>
          selectedMultiSizes.map((s, sIdx) => {
            const baseSku = buildVariantSku(values.product_code, c, s, cIdx, sIdx);
            let finalSku = baseSku;
            let counter = 2;
            while (usedSkus.has(finalSku)) {
              finalSku = `${baseSku}-${counter++}`;
            }
            usedSkus.add(finalSku);
            return {
              color: c,
              size: s,
              sku: finalSku,
              price_modifier: 0
            };
          })
        );
        values.color = selectedMultiColors.join(' / ');
        values.size = selectedMultiSizes.join(' / ');
      }

      if (editingItem) {
        const res = await api.put(`/api/swm/products/${editingItem.id}`, values);
        if (res.data.success) {
          message.success('تم تحديث بيانات الصنف بنجاح');
          setIsItemModalOpen(false);
          fetchItems(itemsPagination.current);
          fetchCategories();
        }
      } else {
        const res = await api.post('/api/swm/products', {
          ...values,
          variants: variantsPayload
        });
        if (res.data.success) {
          message.success(
            variantsPayload.length > 0
              ? `تمت إضافة الصنف وتوليد (${variantsPayload.length}) تركيبة مقاس ولون بنجاح!`
              : 'تمت إضافة الصنف وربطه بالمجموعة والصفات بنجاح'
          );
          setIsItemModalOpen(false);
          fetchItems(1);
          fetchCategories();
        }
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'فشل حفظ بيانات الصنف');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await api.delete(`/api/swm/products/${itemId}`);
      if (res.data.success) {
        message.success('تم تعطيل الصنف');
        fetchItems(itemsPagination.current);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تعطيل الصنف');
    }
  };

  // Filtered categories for search
  const filteredCategories = categories.filter(c => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      (c.category_name && c.category_name.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  // Calculate quick stats
  const totalCategoriesCount = categories.length;
  const totalItemsCount = itemsPagination.total;
  const totalSizesCount = sizes.length;
  const totalColorsCount = colors.length;

  // ==========================================
  // TABLE COLUMNS
  // ==========================================

  // 1. Groups Table Columns
  const groupColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id) => <Text type="secondary">#{id}</Text>
    },
    {
      title: 'اسم المجموعة / التصنيف الرئيسي',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (name, record) => (
        <Space>
          <FolderOpenOutlined style={{ color: '#4f46e5', fontSize: 16 }} />
          <div>
            <Text strong style={{ fontSize: 14 }}>{name}</Text>
            {record.slug && (
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                رمز برمجي: <code>{record.slug}</code>
              </div>
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'المجموعة الأب (Parent)',
      dataIndex: 'parent_name',
      key: 'parent_name',
      render: (pName) => pName ? <Tag color="blue">{pName}</Tag> : <Tag color="default">مجموعة رئيسية</Tag>
    },
    {
      title: 'الأصناف المرتبطة',
      dataIndex: 'products_count',
      key: 'products_count',
      width: 140,
      render: (cnt, record) => {
        const count = parseInt(cnt, 10) || 0;
        return (
          <Tooltip title="انقر لعرض وفلترة كافة أصناف هذه المجموعة">
            <Button
              size="small"
              type="dashed"
              onClick={() => handleFilterItemsByGroup(record.id)}
              style={{
                borderColor: count > 0 ? '#4f46e5' : '#d1d5db',
                color: count > 0 ? '#4f46e5' : '#6b7280',
                fontWeight: 600
              }}
            >
              <TagsOutlined /> {count} صنف
            </Button>
          </Tooltip>
        );
      }
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || <Text type="secondary">—</Text>
    },
    {
      title: 'المتجر الإلكتروني',
      dataIndex: 'is_ecom_visible',
      key: 'is_ecom_visible',
      width: 130,
      render: (vis) => vis ? <Tag color="green">ظاهر بالمتجر</Tag> : <Tag color="orange">مخزن فقط</Tag>
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditGroup(record)}
          >
            تعديل
          </Button>
          <Popconfirm
            title="حذف المجموعة"
            description="هل أنت متأكد من حذف هذه المجموعة؟ لا يمكن الحذف إذا كانت تحتوي على أصناف."
            onConfirm={() => handleDeleteGroup(record.id)}
            okText="نعم، حذف"
            cancelText="إلغاء"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 2. Sizes Table Columns
  const sizeColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      render: (id) => <Text type="secondary">#{id}</Text>
    },
    {
      title: 'المقاس (Size)',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Tag color="blue" style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px' }}>{name}</Tag>
    },
    {
      title: 'الرمز (Code)',
      dataIndex: 'code',
      key: 'code',
      render: (code) => code ? <code>{code}</code> : <Text type="secondary">—</Text>
    },
    {
      title: 'الترتيب',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditAttr(record)} />
          <Popconfirm
            title="حذف المقاس"
            description="هل أنت متأكد من حذف هذا المقاس من القائمة؟"
            onConfirm={() => handleDeleteAttr(record.id)}
            okText="نعم"
            cancelText="إلغاء"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 3. Colors Table Columns
  const colorColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      render: (id) => <Text type="secondary">#{id}</Text>
    },
    {
      title: 'اللون (Color)',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space align="middle">
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: record.code || '#000',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          />
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      )
    },
    {
      title: 'الكود اللوني (Hex)',
      dataIndex: 'code',
      key: 'code',
      render: (code) => code ? <code style={{ color: code }}>{code}</code> : <Text type="secondary">—</Text>
    },
    {
      title: 'الترتيب',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 80
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditAttr(record)} />
          <Popconfirm
            title="حذف اللون"
            description="هل أنت متأكد من حذف هذا اللون من القائمة؟"
            onConfirm={() => handleDeleteAttr(record.id)}
            okText="نعم"
            cancelText="إلغاء"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 4. Items Table Columns
  const itemColumns = [
    {
      title: 'كود الصنف / الباركود',
      key: 'codes',
      width: 150,
      render: (_, record) => (
        <div>
          <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {record.product_code}
          </Tag>
          {record.barcode && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              <BarcodeOutlined /> {record.barcode}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'اسم الصنف والماركة',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (name, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          {record.brand && (
            <div style={{ fontSize: 11, color: '#4f46e5' }}>
              الماركة: {record.brand}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'المجموعة المربوط بها (Group)',
      key: 'category_link',
      width: 160,
      render: (_, record) => {
        const cat = categories.find(c => c.id === record.category_id);
        const catName = record.category_name || cat?.category_name;
        return catName ? (
          <Tooltip title={`انقر لفلترة جميع أصناف مجموعة ${catName}`}>
            <Tag
              color="purple"
              style={{ fontSize: 13, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setSelectedCategoryFilter(record.category_id)}
            >
              <FolderOpenOutlined style={{ marginLeft: 4 }} />
              {catName}
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="red">غير محدد</Tag>
        );
      }
    },
    {
      title: 'اللون والمقاس',
      key: 'color_size',
      width: 170,
      render: (_, record) => {
        const isMultiple = (record.variant_count && record.variant_count > 1) || (record.color && record.color.includes('/')) || (record.size && record.size.includes('/'));
        return (
          <Space size="small" direction="vertical" style={{ width: '100%' }}>
            {isMultiple && (
              <Tag color="purple" style={{ fontWeight: 600, fontSize: 11, margin: 0 }}>
                ✨ متعدد ({record.variant_count || 'عدة خيارات'})
              </Tag>
            )}
            <Space size="small" wrap>
              {record.color && (
                <Tag color="geekblue" style={{ margin: 0 }}>
                  <BgColorsOutlined /> {record.color}
                </Tag>
              )}
              {record.size && (
                <Tag color="cyan" style={{ margin: 0 }}>
                  <ColumnWidthOutlined /> {record.size}
                </Tag>
              )}
              {!record.color && !record.size && <Text type="secondary">—</Text>}
            </Space>
          </Space>
        );
      }
    },
    {
      title: 'سعر التكلفة (للمشتريات)',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 130,
      render: (cost) => (
        <Text strong style={{ color: '#047857' }}>
          {parseFloat(cost || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'سعر البيع',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 110,
      render: (price) => (
        <Text strong style={{ color: '#0284c7' }}>
          {parseFloat(price || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'المخزون',
      dataIndex: 'total_stock',
      key: 'total_stock',
      width: 90,
      render: (stk) => {
        const stock = parseInt(stk, 10) || 0;
        return (
          <Tag color={stock > 0 ? 'cyan' : 'default'} style={{ fontWeight: 600 }}>
            {stock}
          </Tag>
        );
      }
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (st) => st === 'active'
        ? <Tag color="success">نشط</Tag>
        : <Tag color="default">معطل</Tag>
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditItem(record)}
          >
            تعديل
          </Button>
          <Popconfirm
            title="تعطيل الصنف"
            description="هل أنت متأكد من تعطيل هذا الصنف؟"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="نعم"
            cancelText="إلغاء"
          >
            <Button size="small" danger icon={<StopOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            المجموعات، المقاسات، والأصناف (Groups, Attributes & Items Master)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            إدارة التصنيفات الرئيسية وقوائم المقاسات والألوان وربط الأصناف بها لتوحيد استخدامها في فواتير المشتريات والتوريد والمرتجعات (Purchases & Returns)
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { fetchCategories(); fetchAttributes(); fetchItems(itemsPagination.current); }}
          >
            تحديث
          </Button>
          {activeTab === 'groups' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateGroup}
              style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
            >
              إضافة مجموعة رئيسية جديدة
            </Button>
          )}
          {activeTab === 'attributes' && (
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateAttr('size')}
                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              >
                إضافة مقاس جديد
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateAttr('color')}
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              >
                إضافة لون جديد
              </Button>
            </Space>
          )}
          {activeTab === 'items' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateItem}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              إضافة صنف جديد وربطه بالمجموعة والصفات
            </Button>
          )}
        </Space>
      </div>

      {/* Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>المجموعات الرئيسية</span>}
              value={totalCategoriesCount}
              prefix={<FolderOpenOutlined style={{ color: '#4f46e5' }} />}
              suffix="مجموعة"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: '#4f46e5' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>قائمة المقاسات المعرفة</span>}
              value={totalSizesCount}
              prefix={<ColumnWidthOutlined style={{ color: '#0284c7' }} />}
              suffix="مقاس"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: '#0284c7' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>قائمة الألوان المعرفة</span>}
              value={totalColorsCount}
              prefix={<BgColorsOutlined style={{ color: '#7c3aed' }} />}
              suffix="لون"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>إجمالي الأصناف المسجلة</span>}
              value={totalItemsCount}
              prefix={<ShoppingOutlined style={{ color: '#059669' }} />}
              suffix="صنف"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: '#059669' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'groups',
            label: (
              <Space>
                <FolderOpenOutlined style={{ color: '#4f46e5' }} />
                <span>المجموعات والتصنيفات ({categories.length})</span>
              </Space>
            ),
            children: (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={16} align="middle">
                    <Col xs={24} md={10}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="البحث باسم المجموعة أو الرمز البرمجي..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        allowClear
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={14} style={{ textAlign: 'left' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        المجموعات تُستخدم لتصنيف الأصناف بشكل قياسي، ويمكنك إضافة مجموعة جديدة مباشرة عند إدخال الصنف أيضاً
                      </Text>
                    </Col>
                  </Row>
                </Card>

                <Table
                  dataSource={filteredCategories}
                  columns={groupColumns}
                  rowKey="id"
                  loading={categoriesLoading}
                  pagination={{ pageSize: 10 }}
                  bordered
                  size="middle"
                />
              </div>
            )
          },
          {
            key: 'attributes',
            label: (
              <Space>
                <BgColorsOutlined style={{ color: '#7c3aed' }} />
                <span>المقاسات والألوان ({sizes.length} مقاس / {colors.length} لون)</span>
              </Space>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  {/* Sizes Card */}
                  <Col xs={24} md={12}>
                    <Card
                      title={
                        <Space>
                          <ColumnWidthOutlined style={{ color: '#0284c7' }} />
                          <span>قائمة المقاسات المعرفة ({sizes.length})</span>
                        </Space>
                      }
                      extra={
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleOpenCreateAttr('size')}
                          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                        >
                          إضافة مقاس
                        </Button>
                      }
                      style={{ height: '100%' }}
                    >
                      <Table
                        dataSource={sizes}
                        columns={sizeColumns}
                        rowKey="id"
                        loading={attributesLoading}
                        pagination={{ pageSize: 8 }}
                        size="small"
                        bordered
                      />
                    </Card>
                  </Col>

                  {/* Colors Card */}
                  <Col xs={24} md={12}>
                    <Card
                      title={
                        <Space>
                          <BgColorsOutlined style={{ color: '#7c3aed' }} />
                          <span>قائمة الألوان المعرفة ({colors.length})</span>
                        </Space>
                      }
                      extra={
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => handleOpenCreateAttr('color')}
                          style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                        >
                          إضافة لون
                        </Button>
                      }
                      style={{ height: '100%' }}
                    >
                      <Table
                        dataSource={colors}
                        columns={colorColumns}
                        rowKey="id"
                        loading={attributesLoading}
                        pagination={{ pageSize: 8 }}
                        size="small"
                        bordered
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'items',
            label: (
              <Space>
                <TagsOutlined style={{ color: '#059669' }} />
                <span>الأصناف وربطها بالمجموعات والصفات ({itemsPagination.total})</span>
              </Space>
            ),
            children: (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="ابحث باسم الصنف، الكود، الباركود، أو الماركة..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        allowClear
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        placeholder="تصفية حسب المجموعة (Category Filter)..."
                        value={selectedCategoryFilter}
                        onChange={setSelectedCategoryFilter}
                        allowClear
                        size="large"
                        style={{ width: '100%' }}
                      >
                        {categories.map(c => (
                          <Option key={c.id} value={c.id}>
                            <FolderOpenOutlined style={{ marginLeft: 6, color: '#4f46e5' }} />
                            {c.category_name} ({parseInt(c.products_count, 10) || 0} صنف)
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} md={4}>
                      <Select
                        placeholder="الحالة"
                        value={selectedStatusFilter}
                        onChange={setSelectedStatusFilter}
                        allowClear
                        size="large"
                        style={{ width: '100%' }}
                      >
                        <Option value="active">نشط فقط</Option>
                        <Option value="discontinued">معطل</Option>
                      </Select>
                    </Col>
                    <Col xs={24} md={4} style={{ textAlign: 'left' }}>
                      {selectedCategoryFilter && (
                        <Button
                          type="link"
                          onClick={() => setSelectedCategoryFilter(undefined)}
                          style={{ padding: 0 }}
                        >
                          إلغاء فلتر المجموعة ✕
                        </Button>
                      )}
                    </Col>
                  </Row>
                </Card>

                <Table
                  dataSource={items}
                  columns={itemColumns}
                  rowKey="id"
                  loading={itemsLoading}
                  pagination={{
                    current: itemsPagination.current,
                    pageSize: itemsPagination.pageSize,
                    total: itemsPagination.total,
                    onChange: (page) => fetchItems(page)
                  }}
                  bordered
                  size="middle"
                />
              </div>
            )
          }
        ]}
      />

      {/* ==========================================
          MODAL 1: CREATE / EDIT GROUP
          ========================================== */}
      <Modal
        title={editingCategory ? 'تعديل بيانات المجموعة' : 'إضافة مجموعة رئيسية جديدة'}
        open={isGroupModalOpen}
        onOk={handleSaveGroup}
        onCancel={() => setIsGroupModalOpen(false)}
        confirmLoading={groupSubmitting}
        okText={editingCategory ? 'تحديث المجموعة' : 'إضافة المجموعة'}
        cancelText="إلغاء"
        destroyOnClose
        width={560}
      >
        <Form form={groupForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="category_name"
            label="اسم المجموعة / التصنيف"
            rules={[{ required: true, message: 'يرجى إدخال اسم المجموعة' }]}
          >
            <Input placeholder="مثال: ملابس رجالي، أحذية، قمصان، إكسسوارات..." size="large" />
          </Form.Item>

          <Form.Item
            name="parent_id"
            label="المجموعة الرئيسية الأب (اختياري للتصنيفات الفرعية)"
          >
            <Select placeholder="اختر المجموعة الأب إذا كان تصنيفاً فرعياً..." allowClear size="large">
              {categories
                .filter(c => !editingCategory || c.id !== editingCategory.id)
                .map(c => (
                  <Option key={c.id} value={c.id}>{c.category_name}</Option>
                ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="slug" label="الرابط البرمجي / الرمز (Slug)">
                <Input placeholder="تلقائي إن تُرِك فارغاً" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="display_order" label="ترتيب العرض">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="وصف المجموعة">
            <Input.TextArea rows={3} placeholder="وصف محتوى هذه المجموعة ونوعية الأصناف التي تنتمي إليها..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL 2: CREATE / EDIT ATTRIBUTE (SIZE/COLOR)
          ========================================== */}
      <Modal
        title={editingAttr ? `تعديل ${attrModalType === 'size' ? 'المقاس' : 'اللون'}` : `إضافة ${attrModalType === 'size' ? 'مقاس جديد' : 'لون جديد'}`}
        open={isAttrModalOpen}
        onOk={handleSaveAttr}
        onCancel={() => setIsAttrModalOpen(false)}
        confirmLoading={attrSubmitting}
        okText="حفظ"
        cancelText="إلغاء"
        destroyOnClose
        width={460}
      >
        <Form form={attrForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={attrModalType === 'size' ? 'اسم المقاس (مثل: S, M, L, XL, 38, 42...)' : 'اسم اللون (مثل: أسود, أبيض, كحلي, بيج...)'}
            rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}
          >
            <Input placeholder={attrModalType === 'size' ? 'مثال: 5XL أو 46' : 'مثال: بترولي أو هافان'} size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="code"
                label={attrModalType === 'size' ? 'رمز المقاس المختصر' : 'الكود اللوني (Hex Code)'}
              >
                {attrModalType === 'color' ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="code" noStyle>
                      <Input placeholder="#1E3A8A" />
                    </Form.Item>
                    <input
                      type="color"
                      value={attrForm.getFieldValue('code') || '#1E3A8A'}
                      onChange={(e) => attrForm.setFieldsValue({ code: e.target.value })}
                      style={{ width: 40, height: 32, padding: 2, cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px 0 0 4px' }}
                    />
                  </Space.Compact>
                ) : (
                  <Input placeholder="كود اختياري" />
                )}
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="display_order" label="ترتيب العرض">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL 3: CREATE / EDIT ITEM & LINK GROUP + ATTRIBUTES
          ========================================== */}
      <Modal
        title={editingItem ? 'تعديل بيانات الصنف وربط المجموعة' : 'إضافة صنف جديد وربطه بالمجموعة والصفات'}
        open={isItemModalOpen}
        onOk={handleSaveItem}
        onCancel={() => setIsItemModalOpen(false)}
        confirmLoading={itemSubmitting}
        okText={editingItem ? 'تحديث الصنف' : 'إضافة الصنف'}
        cancelText="إلغاء"
        destroyOnClose
        width={720}
      >
        <Form form={itemForm} layout="vertical" style={{ marginTop: 16 }}>
          {/* Group Linking with ON-THE-FLY Quick Add */}
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
                        value={newGroupInput}
                        onChange={(e) => setNewGroupInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        size="middle"
                        style={{ minWidth: 240 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        loading={creatingGroupInline}
                        onClick={handleQuickAddGroup}
                        style={{ backgroundColor: '#5b21b6', borderColor: '#5b21b6' }}
                      >
                        إضافة كمجموعة جديدة
                      </Button>
                    </Space>
                  </>
                )}
              >
                {categories.map(c => (
                  <Option key={c.id} value={c.id}>
                    📁 {c.category_name} {c.parent_name ? `(تابع لـ: ${c.parent_name})` : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', color: '#6d28d9' }}>
              💡 يمكنك الاختيار من المجموعات الحالية أو كتابة اسم مجموعة جديدة تماماً وإضافتها فورياً من داخل القائمة.
            </Text>
          </div>

          <Form.Item
            name="product_name"
            label="اسم الصنف"
            rules={[{ required: true, message: 'يرجى إدخال اسم الصنف' }]}
          >
            <Input placeholder="مثال: قميص أكسفورد كلاسيك أبيض..." size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="product_code"
                label="كود الصنف (Item Code)"
                rules={[{ required: true, message: 'يرجى إدخال كود الصنف' }]}
              >
                <Input placeholder="PRD-123456" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barcode" label="الباركود (Barcode)">
                <Input placeholder="6220000000000" />
              </Form.Item>
            </Col>
          </Row>

          {/* Variant Mode Selection: Single Item vs Multi-variant */}
          {!editingItem && (
            <div style={{ marginBottom: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: '#1e293b' }}>
                خيارات وتنوع الصنف (Variant Mode):
              </Text>
              <Radio.Group
                value={isMultiVariant ? 'multi' : 'single'}
                onChange={(e) => {
                  const isMulti = e.target.value === 'multi';
                  setIsMultiVariant(isMulti);
                  if (isMulti && selectedMultiColors.length === 0) {
                    setSelectedMultiColors(colors.slice(0, 2).map(c => c.name));
                  }
                  if (isMulti && selectedMultiSizes.length === 0) {
                    setSelectedMultiSizes(sizes.slice(0, 3).map(s => s.name));
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
          )}

          {isMultiVariant ? (
            /* ==========================================
               MULTI-VARIANT SECTION (Multiple Colors & Sizes)
               ========================================== */
            <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <TagsOutlined style={{ color: '#6d28d9', fontSize: 16 }} />
                <Text strong style={{ color: '#4c1d95', fontSize: 14 }}>
                  تحديد المقاسات والألوان المتعددة لهذا الصنف:
                </Text>
              </div>

              <Row gutter={16}>
                {/* Multi-Colors */}
                <Col span={12}>
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
                                value={newColorCode}
                                onChange={(e) => setNewColorCode(e.target.value)}
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
                      {colors.map(c => (
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
                <Col span={12}>
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
                      {sizes.map(s => (
                        <Option key={s.id} value={s.name}>
                          <Tag color="blue" style={{ fontWeight: 600 }}>{s.name}</Tag>
                          {s.code && s.code !== s.name ? <Text type="secondary" style={{ fontSize: 11 }}>({s.code})</Text> : null}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Combinations Matrix Preview */}
              {selectedMultiColors.length > 0 && selectedMultiSizes.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <span>
                        سيتم توليد <strong>{selectedMultiColors.length * selectedMultiSizes.length}</strong> تركيبة صنف تلقائياً ({selectedMultiColors.length} ألوان × {selectedMultiSizes.length} مقاسات)
                      </span>
                    }
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #c7d2fe', borderRadius: 6, background: '#fff' }}>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={selectedMultiColors.flatMap((c, cIdx) =>
                        selectedMultiSizes.map((s, sIdx) => ({
                          key: `${c}-${s}`,
                          color: c,
                          size: s,
                          sku: buildVariantSku(itemForm.getFieldValue('product_code'), c, s, cIdx, sIdx)
                        }))
                      )}
                      columns={[
                        {
                          title: 'اللون',
                          dataIndex: 'color',
                          key: 'color',
                          render: (col) => {
                            const cObj = colors.find(c => c.name === col);
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
            </div>
          ) : (
            /* ==========================================
               SINGLE-VARIANT SECTION (Single Color & Size)
               ========================================== */
            <Row gutter={16}>
              <Col span={12}>
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
                              value={newColorCode}
                              onChange={(e) => setNewColorCode(e.target.value)}
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
                    {colors.map(c => (
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

              <Col span={12}>
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
                    {sizes.map(s => (
                      <Option key={s.id} value={s.name}>
                        <Tag color="blue" style={{ fontWeight: 600 }}>{s.name}</Tag>
                        {s.code && s.code !== s.name ? <Text type="secondary" style={{ fontSize: 11 }}>({s.code})</Text> : null}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="cost_price"
                label="سعر التكلفة الافتراضي"
                rules={[{ required: true, message: 'مطلوب' }]}
                tooltip="سعر التكلفة الأساسي الذي يُعتمد افتراضياً عند إنشاء أوامر التوريد والمشتريات"
              >
                <InputNumber
                  min={0}
                  step={5}
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="ج.م"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="selling_price"
                label="سعر البيع (قطاعي)"
                rules={[{ required: true, message: 'مطلوب' }]}
              >
                <InputNumber
                  min={0}
                  step={5}
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  addonAfter="ج.م"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="brand" label="الماركة / البراند">
                <Input placeholder="Yoka Store" />
              </Form.Item>
            </Col>
          </Row>

          {editingItem && (
            <Form.Item name="status" label="حالة الصنف">
              <Select>
                <Option value="active">نشط (Active)</Option>
                <Option value="discontinued">معطل (Discontinued)</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
