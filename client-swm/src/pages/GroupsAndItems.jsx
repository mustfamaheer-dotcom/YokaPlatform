import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Sparkles, X, Folder, Lightbulb } from 'lucide-react';
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
  Alert,
  Upload,
  Avatar,
  Popover
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
  CheckOutlined,
  UploadOutlined,
  PictureOutlined,
  CameraOutlined,
  EyeOutlined
} from '@ant-design/icons';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import BarcodeImage from '../components/BarcodeImage';
import { generateValidEAN13 } from '../utils/barcode';

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

export default function GroupsAndItems({ autoOpenCreate, onResetAction }) {
  const navigate = useNavigate();
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
  const [itemsPagination, setItemsPagination] = useState({ current: 1, pageSize: 5000, total: 0 });

  // Product Inspection / Review Modal State
  const [productReviewModalVisible, setProductReviewModalVisible] = useState(false);
  const [reviewedProduct, setReviewedProduct] = useState(null);

  const handleViewProductReview = (product) => {
    setReviewedProduct(product);
    setProductReviewModalVisible(true);
  };

  // Item Create/Edit Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemForm] = Form.useForm();
  const watchedItemColor = Form.useWatch('color', itemForm);
  const watchedItemBarcode = Form.useWatch('barcode', itemForm);

  // Multi-variant (Multiple colors & Multiple sizes) State
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [selectedMultiColors, setSelectedMultiColors] = useState([]);
  const [selectedMultiSizes, setSelectedMultiSizes] = useState([]);

  // Color-specific images map (colorName -> imageUrl data URI / link)
  const [colorImages, setColorImages] = useState({});
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');

  const activeColors = isMultiVariant
    ? selectedMultiColors
    : (watchedItemColor ? [watchedItemColor] : []);

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

  useEffect(() => {
    if (autoOpenCreate) {
      setActiveTab('groups');
      handleOpenCreateGroup();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

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
        message.success(res.data.message || 'تم حذف المجموعة بنجاح');
        fetchCategories();
        fetchItems(itemsPagination.current);
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
  // ITEMS HANDLERS & COLOR IMAGES
  // ==========================================
  const generateCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `ITM-${randNum}`;
    const barcode = generateValidEAN13('622');
    return { code, barcode };
  };

  // Helper to handle client-side canvas compression for color images
  const handleCompressFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Optimal size for e-commerce cards

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

        // Compress to JPEG 82% quality (typically ~40-80KB)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(optimizedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    return false; // Prevent automatic post
  };

  useEffect(() => {
    if (autoOpenCreate) {
      setActiveTab('items');
      handleOpenCreateItem();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setIsMultiVariant(false);
    setSelectedMultiColors([]);
    setSelectedMultiSizes([]);
    setColorImages({});
    setFeaturedImageUrl('');
    itemForm.resetFields();
    const { code, barcode } = generateCodes();
    itemForm.setFieldsValue({
      product_code: code,
      barcode: barcode,
      category_id: selectedCategoryFilter || (categories[0]?.id || null),
      brand: 'Yoka Store',
      material: '',
      color: colors[0]?.name || 'أسود',
      size: sizes[0]?.name || 'L'
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = async (item) => {
    setEditingItem(item);
    itemForm.resetFields();

    const initialColorImages = {};
    if (item.featured_image) {
      setFeaturedImageUrl(item.featured_image);
    } else {
      setFeaturedImageUrl('');
    }

    if (item.color_variants && Array.isArray(item.color_variants)) {
      item.color_variants.forEach(cv => {
        if (cv.color && cv.image_url) {
          initialColorImages[cv.color] = cv.image_url;
        }
      });
    }

    let variants = [];
    let fullProduct = item;
    try {
      const res = await api.get(`/api/swm/products/${item.id}`);
      if (res.data?.success && res.data?.data) {
        fullProduct = { ...item, ...res.data.data };
        variants = Array.isArray(res.data.data.variants) ? res.data.data.variants : [];
        variants.forEach(v => {
          if (v.color && v.image_url && !initialColorImages[v.color]) {
            initialColorImages[v.color] = v.image_url;
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch full variants for item', e);
    }

    setColorImages(initialColorImages);

    // Determine colors and sizes from variants first, or fallback to product item
    const loadedColors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const loadedSizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

    const fallbackColors = fullProduct.color ? fullProduct.color.split('/').map(s => s.trim()).filter(Boolean) : [];
    const fallbackSizes = fullProduct.size ? fullProduct.size.split('/').map(s => s.trim()).filter(Boolean) : [];

    const finalColors = loadedColors.length > 0 ? loadedColors : fallbackColors;
    const finalSizes = loadedSizes.length > 0 ? loadedSizes : fallbackSizes;

    const isMulti = variants.length > 1 || finalColors.length > 1 || finalSizes.length > 1;
    setIsMultiVariant(isMulti);

    if (isMulti) {
      setSelectedMultiColors(finalColors);
      setSelectedMultiSizes(finalSizes);
    } else {
      setSelectedMultiColors([]);
      setSelectedMultiSizes([]);
    }

    itemForm.setFieldsValue({
      product_name: fullProduct.product_name,
      product_code: fullProduct.product_code,
      barcode: fullProduct.barcode,
      category_id: fullProduct.category_id,
      brand: fullProduct.brand || 'Yoka Store',
      color: finalColors[0] || fullProduct.color || '',
      size: finalSizes[0] || fullProduct.size || '',
      material: fullProduct.material || '',
      cost_price: parseFloat(fullProduct.cost_price) || 0,
      selling_price: parseFloat(fullProduct.selling_price) || 0,
      wholesale_price: parseFloat(fullProduct.wholesale_price) || 0,
      status: fullProduct.status || 'active',
      is_ecom_listed: Boolean(fullProduct.is_ecom_listed),
      featured_image: fullProduct.featured_image || ''
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const values = await itemForm.validateFields();
      setItemSubmitting(true);

      // Determine active colors list
      let activeColorsList = [];
      if (isMultiVariant) {
        activeColorsList = selectedMultiColors;
      } else if (values.color) {
        activeColorsList = [values.color];
      }

      // First color image or explicit featured image becomes the product's primary photo
      const firstColorWithImg = activeColorsList.find(c => colorImages[c]);
      const defaultFeatured = (firstColorWithImg && colorImages[firstColorWithImg]) || featuredImageUrl || values.featured_image || null;

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
              price_modifier: 0,
              image_url: colorImages[c] || defaultFeatured || null
            };
          })
        );
        values.color = selectedMultiColors.join(' / ');
        values.size = selectedMultiSizes.join(' / ');
      } else if (values.color || values.size) {
        variantsPayload = [{
          color: values.color || null,
          size: values.size || null,
          sku: values.product_code,
          price_modifier: 0,
          image_url: (values.color && colorImages[values.color]) || defaultFeatured || null
        }];
      }

      const payload = {
        cost_price: editingItem ? (parseFloat(editingItem.cost_price) || 0) : 0,
        selling_price: editingItem ? (parseFloat(editingItem.selling_price) || 0) : 0,
        wholesale_price: editingItem ? (parseFloat(editingItem.wholesale_price) || 0) : 0,
        is_ecom_listed: editingItem ? Boolean(editingItem.is_ecom_listed) : false,
        ...values,
        featured_image: defaultFeatured,
        color_images: colorImages,
        variants: variantsPayload
      };

      if (editingItem) {
        const res = await api.put(`/api/swm/products/${editingItem.id}`, payload);
        if (res.data.success) {
          message.success('تم تحديث بيانات الصنف وصور الألوان بنجاح');
          setIsItemModalOpen(false);
          fetchItems(itemsPagination.current);
          fetchCategories();
        }
      } else {
        const res = await api.post('/api/swm/products', payload);
        if (res.data.success) {
          message.success(
            variantsPayload.length > 0
              ? `تمت إضافة الصنف وتعيين صور الألوان وتوليد (${variantsPayload.length}) تركيبة بنجاح!`
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
        message.success(res.data.message || 'تم حذف / تعطيل الصنف بنجاح');
        fetchItems(itemsPagination.current);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حذف الصنف');
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
            title="تأكيد حذف المجموعة"
            description={
              parseInt(record.products_count, 10) > 0
                ? `هذه المجموعة تحتوي على (${record.products_count}) صنف. هل أنت متأكد من حذفها؟ (ستبقى الأصناف محفوظة في النظام ولكن بدون مجموعة مربوطة).`
                : 'هل أنت متأكد من حذف هذه المجموعة؟'
            }
            onConfirm={() => handleDeleteGroup(record.id)}
            okText="نعم، موافق واحذف"
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
      title: 'صورة الصنف',
      key: 'photo',
      width: 75,
      render: (_, record) => (
        <Avatar
          shape="square"
          size={46}
          src={record.featured_image || yokaLogo}
          icon={<PictureOutlined />}
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', objectFit: 'contain' }}
        />
      )
    },
    {
      title: 'كود الصنف / الباركود',
      key: 'codes',
      width: 150,
      render: (_, record) => {
        const barcodeVal = record.barcode || record.product_code;
        return (
          <div>
            <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {record.product_code}
            </Tag>
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
      title: 'الألوان وصورها والمقاسات',
      key: 'color_size',
      width: 220,
      render: (_, record) => {
        const isMultiple = (record.variant_count && record.variant_count > 1) || (record.color && record.color.includes('/')) || (record.size && record.size.includes('/'));
        const colorVariants = Array.isArray(record.color_variants) ? record.color_variants : [];
        const rawColors = record.color ? record.color.split('/').map(c => c.trim()).filter(Boolean) : [];

        return (
          <Space size="small" direction="vertical" style={{ width: '100%' }}>
            {isMultiple && (
              <Tag color="purple" icon={<Sparkles size={11} />} style={{ fontWeight: 600, fontSize: 11, margin: 0 }}>
                صنف متعدد ({record.variant_count || rawColors.length || 'خيارات متعددة'})
              </Tag>
            )}
            <Space size={4} wrap>
              {rawColors.map((colName) => {
                const cv = colorVariants.find(v => v.color === colName);
                const img = cv?.image_url;
                const colObj = colors.find(c => c.name === colName);
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
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colObj?.code || '#000', display: 'inline-block' }} />
                      <span>{colName}</span>
                      <PictureOutlined style={{ color: '#2563eb' }} />
                    </Tag>
                  </Popover>
                ) : (
                  <Tag key={colName} style={{ margin: '2px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colObj?.code || '#000', display: 'inline-block' }} />
                    <span>{colName}</span>
                  </Tag>
                );
              })}
              {record.size && (
                <Tag color="cyan" style={{ margin: '2px' }}>
                  <ColumnWidthOutlined /> {record.size}
                </Tag>
              )}
              {rawColors.length === 0 && !record.size && <Text type="secondary">—</Text>}
            </Space>
          </Space>
        );
      }
    },

    {
      title: 'إجراءات',
      key: 'actions',
      width: 210,
      fixed: 'left',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="معاينة ومراجعة بطاقة الصنف">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewProductReview(record)}
              style={{ borderColor: '#6366f1', color: '#6366f1' }}
            >
              معاينة
            </Button>
          </Tooltip>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditItem(record)}
            className="swm-btn-cobalt"
          >
            تعديل
          </Button>
          <Popconfirm
            title="حذف الصنف"
            description="هل أنت متأكد من حذف هذا الصنف؟ (سيتم حذفه أو تعطيله إذا كان مرتبطاً بحركات سابقة)"
            onConfirm={() => handleDeleteItem(record.id)}
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
    <div style={{ padding: '4px 0' }}>
      {/* Header & Title */}
      <div className="swm-page-header">
        <button
          type="button"
          className="swm-back-home-btn"
          onClick={() => navigate('/dashboard/home')}
          aria-label="العودة إلى الصفحة الرئيسية"
        >
          <HomeIcon size={15} />
          <span>الرئيسية</span>
        </button>

        <div className="swm-page-title-area">
          <h2>المجموعات، المقاسات، والأصناف (Groups, Attributes & Items Master)</h2>
          <p>إدارة التصنيفات الرئيسية وقوائم المقاسات والألوان وربط الأصناف بها لتوحيد استخدامها في فواتير المشتريات والتوريد والمرتجعات (Purchases & Returns)</p>
        </div>

        <div className="swm-page-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { fetchCategories(); fetchAttributes(); fetchItems(itemsPagination.current); }}
            style={{ height: 44, borderRadius: 8 }}
          >
            تحديث
          </Button>
          {activeTab === 'groups' && (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateGroup}
              className="swm-btn-primary"
              style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
            >
              إضافة مجموعة رئيسية جديدة
            </Button>
          )}
          {activeTab === 'attributes' && (
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateAttr('size')}
                className="swm-btn-cobalt"
                style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
              >
                إضافة مقاس جديد
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateAttr('color')}
                className="swm-btn-cobalt"
                style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
              >
                إضافة لون جديد
              </Button>
            </Space>
          )}
          {activeTab === 'items' && (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateItem}
              className="swm-btn-primary"
              style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
            >
              إضافة صنف جديد وربطه بالمجموعة والصفات
            </Button>
          )}
        </div>
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
                  pagination={false}
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
                        pagination={false}
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
                        pagination={false}
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
                    <Col xs={24} md={10}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="ابحث باسم الصنف، الكود، الباركود، أو الماركة..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        allowClear
                        size="large"
                      />
                    </Col>
                    <Col xs={24} md={10}>
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
                    <Col xs={24} md={4} style={{ textAlign: 'left' }}>
                      {selectedCategoryFilter && (
                        <Button
                          type="link"
                          onClick={() => setSelectedCategoryFilter(undefined)}
                          icon={<X size={12} />}
                          style={{ padding: 0 }}
                        >
                          إلغاء فلتر المجموعة
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
                  scroll={{ x: 'max-content' }}
                  pagination={false}
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
        destroyOnHidden
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
        destroyOnHidden
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
        destroyOnHidden
        width={820}
      >
        <Form form={itemForm} layout="vertical" style={{ marginTop: 12 }}>
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
                        onClick={() => {
                          const { code, barcode } = generateCodes();
                          itemForm.setFieldsValue({ product_code: code, barcode: barcode });
                          message.info('تم توليد كود وباركود جديدين');
                        }}
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
                        onClick={() => itemForm.setFieldsValue({ barcode: generateValidEAN13('622') })}
                        style={{ padding: 0, height: 'auto', fontWeight: 600, color: '#4f46e5' }}
                      >
                        توليد EAN
                      </Button>
                    </Tooltip>
                  }
                />
              </Form.Item>
              {watchedItemBarcode && (
                <div style={{ marginTop: -4, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <BarcodeImage value={watchedItemBarcode} height={38} width={1.4} />
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
            name="product_name"
            label="اسم الصنف الأساسي (Item Name)"
            rules={[{ required: true, message: 'يرجى إدخال اسم الصنف' }]}
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
                optionFilterProp="label"
                filterOption={(input, opt) => String(opt?.label || opt?.children || '').toLowerCase().includes(input.toLowerCase())}
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
                  <Option key={c.id} value={c.id} label={`${c.category_name} ${c.parent_name ? `(تابع لـ: ${c.parent_name})` : ''}`}>
                    <Space size={6} align="middle">
                      <Folder size={14} style={{ color: '#7c3aed' }} />
                      <span>{c.category_name} {c.parent_name ? `(تابع لـ: ${c.parent_name})` : ''}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#6d28d9' }}>
              <Lightbulb size={13} style={{ color: '#7c3aed', flexShrink: 0 }} /> يمكنك الاختيار من المجموعات الحالية أو كتابة اسم مجموعة جديدة تماماً وإضافتها فورياً من داخل القائمة.
            </Text>
          </div>

          {/* 4. Variant Mode Selection: Single Item vs Multi-variant */}
          <div style={{ marginBottom: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text strong style={{ color: '#1e293b', fontSize: 13 }}>
                خيارات وتنوع الصنف (طريقة إدارة الألوان والمقاسات):
              </Text>
              <Tag color={isMultiVariant ? 'purple' : 'blue'} style={{ fontWeight: 600 }}>
                {isMultiVariant ? 'وضع المقاسات والألوان المتعددة (Multi-Variants)' : 'وضع الصنف البسيط (Single)'}
              </Tag>
            </div>

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
              style={{ width: '100%' }}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <div
                    onClick={() => setIsMultiVariant(false)}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: !isMultiVariant ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: !isMultiVariant ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.2s',
                      height: '100%'
                    }}
                  >
                    <Radio value="single">
                      <Text strong style={{ color: !isMultiVariant ? '#1d4ed8' : '#334155', fontSize: 13 }}>
                        1. صنف بسيط (لون ومقاس محدد فقط)
                      </Text>
                    </Radio>
                    <div style={{ paddingRight: 24, marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.5 }}>
                        يناسب الأصناف التي لا تحتوي على تشكيلة مقاسات أو ألوان (مثل: شنطة لون أسود مقاس موحد، أو إكسسوار محدد).
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div
                    onClick={() => {
                      setIsMultiVariant(true);
                      if (selectedMultiColors.length === 0) setSelectedMultiColors(colors.slice(0, 2).map(c => c.name));
                      if (selectedMultiSizes.length === 0) setSelectedMultiSizes(sizes.slice(0, 3).map(s => s.name));
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: isMultiVariant ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      background: isMultiVariant ? '#f5f3ff' : '#ffffff',
                      transition: 'all 0.2s',
                      height: '100%'
                    }}
                  >
                    <Radio value="multi">
                      <Text strong style={{ color: isMultiVariant ? '#6d28d9' : '#334155', fontSize: 13 }}>
                        2. صنف متعدد الألوان والمقاسات (Multi-Variants)
                      </Text>
                    </Radio>
                    <div style={{ paddingRight: 24, marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.5 }}>
                        توليد شبكة متكاملة من الألوان والمقاسات تلقائياً (مثل: قميص متوفر بـ 3 ألوان و 4 مقاسات = توليد 12 تركيبة وربط صورة لكل لون).
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </Radio.Group>
          </div>

          {/* 5. Colors & Sizes Selectors */}
          {isMultiVariant ? (
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
                <Tag color={activeColors.every(c => colorImages[c]) ? 'green' : 'blue'}>
                  {activeColors.filter(c => colorImages[c]).length} من {activeColors.length} ألوان تم تحديد صورها
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#166534' }}>
                <Lightbulb size={13} style={{ color: '#16a34a', flexShrink: 0 }} /> يمكنك رفع صورة خاصة لكل لون من جهازك أو لصق رابط مباشر للصورة. ستظهر الصورة تلقائياً في المتجر والكتالوج عند اختيار اللون.
              </Text>

              <Row gutter={[12, 12]}>
                {activeColors.map((colName) => {
                  const colObj = colors.find(c => c.name === colName);
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
                          height: '100%',
                          minHeight: 88,
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
                                  setColorImages(prev => {
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
                                  setColorImages(prev => ({ ...prev, [colName]: dataUrl }));
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
                                setColorImages(prev => ({ ...prev, [colName]: val }));
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
          {isMultiVariant && selectedMultiColors.length > 0 && selectedMultiSizes.length > 0 && (
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
                    selectedMultiSizes.map((s, sIdx) => ({
                      key: `${c}-${s}`,
                      color: c,
                      size: s,
                      sku: buildVariantSku(itemForm.getFieldValue('product_code'), c, s, cIdx, sIdx)
                    }))
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


        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* PRODUCT CARD REVIEW & INSPECTION MODAL */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOutlined style={{ color: '#6366f1', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              معاينة وتدقيق بطاقة الصنف: {reviewedProduct?.product_name}
            </span>
          </div>
        }
        open={productReviewModalVisible}
        onCancel={() => setProductReviewModalVisible(false)}
        footer={<Button type="primary" onClick={() => setProductReviewModalVisible(false)}>إغلاق [Esc]</Button>}
        width={700}
        destroyOnHidden
      >
        {reviewedProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header info */}
            <div style={{ display: 'flex', gap: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 85, height: 85, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {reviewedProduct.featured_image ? (
                  <img src={reviewedProduct.featured_image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <TagsOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: 16, color: '#0f172a' }}>{reviewedProduct.product_name}</div>
                <Space size={6} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {reviewedProduct.category_name && <Tag color="purple">{reviewedProduct.category_name}</Tag>}
                  {reviewedProduct.brand && <Tag color="blue">{reviewedProduct.brand}</Tag>}
                  <Tag color={reviewedProduct.status === 'active' ? 'green' : 'orange'}>
                    {reviewedProduct.status === 'active' ? 'نشط' : 'معطل'}
                  </Tag>
                </Space>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  كود الصنف: <code style={{ fontWeight: 600 }}>{reviewedProduct.product_code}</code> | باركود: <code style={{ fontWeight: 600 }}>{reviewedProduct.barcode || '—'}</code>
                </div>
              </div>
            </div>

            {/* Financials & Stock */}
            <Card size="small" style={{ borderRadius: 8 }}>
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>سعر تكلفة الشراء:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#0f172a', marginTop: 2 }}>
                    {parseFloat(reviewedProduct.cost_price || 0).toLocaleString()} ج.م
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>سعر البيع للجمهور:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#2563eb', marginTop: 2 }}>
                    {parseFloat(reviewedProduct.selling_price || 0).toLocaleString()} ج.م
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>سعر الجملة:</Text>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#7c3aed', marginTop: 2 }}>
                    {parseFloat(reviewedProduct.wholesale_price || 0).toLocaleString()} ج.م
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>إجمالي الرصيد بالمخازن:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 2 }}>
                    <Tag color={parseInt(reviewedProduct.total_stock || 0, 10) > 0 ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 'bold', padding: '2px 8px' }}>
                      {reviewedProduct.total_stock || 0} قطعة
                    </Tag>
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>هامش الربح التقديري:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#16a34a', marginTop: 2 }}>
                    {(parseFloat(reviewedProduct.selling_price || 0) - parseFloat(reviewedProduct.cost_price || 0)).toLocaleString()} ج.م
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>عدد المتغيرات المعرفة:</Text>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                    <Tag color="cyan">{reviewedProduct.variant_count || 0} متغير</Tag>
                  </div>
                </Col>

                {reviewedProduct.description && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 12 }}>وصف الصنف:</Text>
                    <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6, marginTop: 2, fontSize: 13 }}>
                      {reviewedProduct.description}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
