import React, { useState, useEffect, useRef } from 'react';
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
  Drawer,
  Alert,
  Tabs,
  Radio,
  Tooltip,
  Checkbox,
  Spin,
  Badge,
  Upload,
  Avatar,
  Popover,
  Switch
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  RollbackOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  TagsOutlined,
  BgColorsOutlined,
  ColumnWidthOutlined,
  PictureOutlined,
  BarcodeOutlined,
  UploadOutlined,
  CameraOutlined,
  EditOutlined,
  FilterOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import api from '../api';
import SplitPayment from '../components/SplitPayment';
import BarcodePrintModal from '../components/BarcodePrintModal';
import BarcodeImage from '../components/BarcodeImage';
import { printHtmlContent } from '../utils/printUtils';
import { generateValidEAN13 } from '../utils/barcode';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Purchases({ autoOpenCreate, onResetAction }) {
  const [activeTab, setActiveTab] = useState('invoices');

  // Invoices List State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // Lookup data
  const [suppliersList, setSuppliersList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sizesList, setSizesList] = useState([]);
  const [defaultBranchId, setDefaultBranchId] = useState(null);
  const [refreshingProducts, setRefreshingProducts] = useState(false);

  // Quick Variant Modal State (Quick Add Color/Size to existing product)
  const [quickVariantModalItem, setQuickVariantModalItem] = useState(null);
  const [quickVariantForm] = Form.useForm();
  const [quickVariantSubmitting, setQuickVariantSubmitting] = useState(false);
  const [quickNewColorInput, setQuickNewColorInput] = useState('');
  const [quickNewColorCode, setQuickNewColorCode] = useState('#000000');
  const [quickNewSizeInput, setQuickNewSizeInput] = useState('');

  // Barcode Print Modal State
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeModalItems, setBarcodeModalItems] = useState([]);

  // Master Product Modal State (Full Product Add & Edit from Products & Categories)
  const [masterProductModalOpen, setMasterProductModalOpen] = useState(false);
  const [masterProductMode, setMasterProductMode] = useState('create'); // 'create' | 'edit'
  const [editingMasterProduct, setEditingMasterProduct] = useState(null);
  const [targetInvoiceItemKey, setTargetInvoiceItemKey] = useState(null);
  const [masterProductForm] = Form.useForm();
  const [masterProductSubmitting, setMasterProductSubmitting] = useState(false);
  const [masterAutoCode, setMasterAutoCode] = useState('');
  const [masterAutoBarcode, setMasterAutoBarcode] = useState('');
  const [masterConstructedName, setMasterConstructedName] = useState('');
  const [masterVariantMode, setMasterVariantMode] = useState('single'); // 'single' | 'multi'
  const [masterSelectedMultiColors, setMasterSelectedMultiColors] = useState([]);
  const [masterSelectedMultiSizes, setMasterSelectedMultiSizes] = useState([]);
  const [masterColorImages, setMasterColorImages] = useState({});
  const [masterFeaturedImageUrl, setMasterFeaturedImageUrl] = useState('');

  const watchedMasterColor = Form.useWatch('color', masterProductForm);
  const watchedMasterBarcode = Form.useWatch('barcode', masterProductForm);
  const watchedMasterCode = Form.useWatch('product_code', masterProductForm);
  const watchedMasterPrice = Form.useWatch('selling_price', masterProductForm);

  const activeMasterColors = masterVariantMode === 'multi'
    ? masterSelectedMultiColors
    : (watchedMasterColor ? [watchedMasterColor] : (editingMasterProduct?.color ? editingMasterProduct.color.split('/').map(c => c.trim()) : []));

  // Inline Quick Add state inside Master Product Modal
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [creatingCategoryInline, setCreatingCategoryInline] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [newColorHex, setNewColorHex] = useState('#1e293b');
  const [creatingColorInline, setCreatingColorInline] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [creatingSizeInline, setCreatingSizeInline] = useState(false);

  // 1. Create Purchase Invoice Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [splitPaymentBreakdown, setSplitPaymentBreakdown] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View Invoice Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 2. Returns Module State
  const [returnsList, setReturnsList] = useState([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsSearch, setReturnsSearch] = useState('');
  const [returnsPagination, setReturnsPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // 2.1 Standalone Return Invoice Drawer State (WITHOUT needing past invoice)
  const [isStandaloneReturnOpen, setIsStandaloneReturnOpen] = useState(false);
  const [standaloneSupplier, setStandaloneSupplier] = useState(null);
  const [standaloneBranch, setStandaloneBranch] = useState(null);
  const [standaloneDate, setStandaloneDate] = useState(new Date().toISOString().split('T')[0]);
  const [standaloneReason, setStandaloneReason] = useState('');
  const [standaloneItems, setStandaloneItems] = useState([]);
  const [standaloneRefundType, setStandaloneRefundType] = useState('credit'); // 'credit' | 'refund'
  const [standaloneRefundBreakdown, setStandaloneRefundBreakdown] = useState([]);
  const [standaloneRefundAmount, setStandaloneRefundAmount] = useState(0);
  const [standaloneSubmitting, setStandaloneSubmitting] = useState(false);

  // 2.2 Linked Return from Existing Invoice Modal State
  const [linkedReturnOpen, setLinkedReturnOpen] = useState(false);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const [linkedItems, setLinkedItems] = useState([]);
  const [linkedRefundType, setLinkedRefundType] = useState('credit');
  const [linkedRefundBreakdown, setLinkedRefundBreakdown] = useState([]);
  const [linkedRefundAmount, setLinkedRefundAmount] = useState(0);
  const [linkedReason, setLinkedReason] = useState('');
  const [linkedSubmitting, setLinkedSubmitting] = useState(false);

  // View Return Details Modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [returnDetailsOpen, setReturnDetailsOpen] = useState(false);
  const [returnDetailsLoading, setReturnDetailsLoading] = useState(false);

  const printAreaRef = useRef(null);
  const printReturnAreaRef = useRef(null);

  // Data Fetching
  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/purchases', {
        params: {
          page,
          limit: pagination.pageSize,
          search: search || undefined,
          supplier_id: supplierFilter || undefined,
          branch_id: branchFilter || undefined
        }
      });
      if (res.data.success) {
        setInvoices(res.data.data);
        setPagination(prev => ({
          ...prev,
          current: res.data.meta.page,
          total: res.data.meta.total
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل فواتير المشتريات');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async (page = 1) => {
    setReturnsLoading(true);
    try {
      const res = await api.get('/api/swm/purchases/returns', {
        params: {
          page,
          limit: returnsPagination.pageSize,
          search: returnsSearch || undefined,
          supplier_id: supplierFilter || undefined,
          branch_id: branchFilter || undefined
        }
      });
      if (res.data.success) {
        setReturnsList(res.data.data);
        setReturnsPagination(prev => ({
          ...prev,
          current: res.data.meta.page,
          total: res.data.meta.total
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل مرتجعات المشتريات');
    } finally {
      setReturnsLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [supRes, brRes, prodRes, catRes, colorsRes, sizesRes] = await Promise.all([
        api.get('/api/swm/suppliers', { params: { limit: 100 } }),
        api.get('/api/swm/branches'),
        api.get('/api/swm/products', { params: { limit: 500, status: 'active', has_category: 'true' } }),
        api.get('/api/swm/categories'),
        api.get('/api/swm/attributes', { params: { type: 'color' } }),
        api.get('/api/swm/attributes', { params: { type: 'size' } })
      ]);
      if (supRes.data.success) setSuppliersList(supRes.data.data);
      if (brRes.data.success) {
        const branches = brRes.data.data;
        setBranchesList(branches);
        // Requirement 2.1: Auto-select "Main Branch" by default
        const main = branches.find(b =>
          b.branch_type === 'main_warehouse' ||
          b.branch_name.includes('الرئيسي') ||
          b.branch_name.toLowerCase().includes('main') ||
          b.is_main === true
        ) || branches[0];

        if (main) {
          setDefaultBranchId(main.id);
          if (!selectedBranch) setSelectedBranch(main.id);
          if (!standaloneBranch) setStandaloneBranch(main.id);
        }
      }
      if (prodRes.data.success) {
        const registeredProds = (prodRes.data.data || []).filter(p => p.status === 'active' && p.category_id);
        setProductsList(registeredProds);
      }
      if (catRes.data.success) setCategoriesList(catRes.data.data);
      if (colorsRes.data.success) setColorsList(colorsRes.data.data);
      if (sizesRes.data.success) setSizesList(sizesRes.data.data);
    } catch (e) {
      // Lookup error
    }
  };

  const handleRefreshProductsList = async () => {
    setRefreshingProducts(true);
    try {
      const res = await api.get('/api/swm/products', { params: { limit: 500, status: 'active', has_category: 'true' } });
      if (res.data.success) {
        const registeredProds = (res.data.data || []).filter(p => p.status === 'active' && p.category_id);
        setProductsList(registeredProds);
        message.success('تم تحديث ومزامنة قائمة الأصناف بنجاح');
      }
    } catch (e) {
      message.error('فشل تحديث قائمة الأصناف');
    } finally {
      setRefreshingProducts(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1);
    fetchReturns(1);
    fetchLookups();
  }, [search, returnsSearch, supplierFilter, branchFilter]);

  // ==========================================
  // 1. PURCHASE INVOICE HANDLERS
  // ==========================================

  const calculateSubtotal = () => {
    return items.reduce((sum, it) => {
      const itTotal = (it.variantRows || []).reduce((vSum, row) => {
        if (!row.enabled || !row.quantity || row.quantity <= 0) return vSum;
        return vSum + (parseFloat(row.line_total) || 0);
      }, 0);
      return sum + itTotal;
    }, 0);
  };

  const calculateTotalPieces = () => {
    return items.reduce((sum, it) => {
      const itQty = (it.variantRows || []).reduce((vSum, row) => {
        if (!row.enabled || !row.quantity || row.quantity <= 0) return vSum;
        return vSum + (parseInt(row.quantity, 10) || 0);
      }, 0);
      return sum + itQty;
    }, 0);
  };

  const calculatedSubtotal = calculateSubtotal();
  const calculatedFinal = Math.max(
    0,
    calculatedSubtotal - (parseFloat(discountTotal) || 0) + (parseFloat(taxTotal) || 0) + (parseFloat(shippingCost) || 0)
  );

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        product_id: null,
        product_name: '',
        product_code: '',
        category_name: '',
        loadingVariants: false,
        batchQty: null,
        batchCost: null,
        batchSelling: null,
        variantRows: []
      }
    ]);
  };

  const handleSelectProduct = async (itemKey, productId) => {
    const prodMeta = productsList.find(p => p.id === productId);
    if (!prodMeta) return;

    // Set loading indicator for this item
    setItems(prev => prev.map(it => it.key === itemKey ? {
      ...it,
      product_id: productId,
      product_name: prodMeta.product_name,
      product_code: prodMeta.product_code || prodMeta.barcode || '',
      category_name: prodMeta.category_name || '',
      loadingVariants: true,
      variantRows: []
    } : it));

    try {
      const res = await api.get(`/api/swm/products/${productId}`);
      const fullProd = res.data?.data;
      const variants = fullProd?.variants || [];
      const baseCost = parseFloat(fullProd?.cost_price || prodMeta.cost_price) || 0;
      const baseSelling = parseFloat(fullProd?.selling_price || prodMeta.selling_price) || 0;

      let variantRows = [];
      if (variants.length > 0) {
        variantRows = variants.map(v => {
          const cost = parseFloat(v.cost_price) || baseCost;
          const selling = parseFloat(v.selling_price) || baseSelling;
          return {
            key: v.id,
            variant_id: v.id,
            color: v.color || '',
            size: v.size || '',
            sku: v.variant_sku || '',
            enabled: true,
            quantity: 1,
            unit_cost: cost,
            selling_price: selling,
            discount_pct: 0,
            line_total: cost
          };
        });
      } else {
        // Fallback for simple product without variants
        variantRows = [
          {
            key: 'base',
            variant_id: null,
            color: null,
            size: null,
            sku: fullProd?.product_code || prodMeta.product_code || '—',
            enabled: true,
            quantity: 1,
            unit_cost: baseCost,
            selling_price: baseSelling,
            discount_pct: 0,
            line_total: baseCost
          }
        ];
      }

      setItems(prev => prev.map(it => it.key === itemKey ? {
        ...it,
        loadingVariants: false,
        variantRows
      } : it));
    } catch (err) {
      message.error('تعذر جلب تفاصيل مقاسات وألوان الصنف');
      setItems(prev => prev.map(it => it.key === itemKey ? { ...it, loadingVariants: false } : it));
    }
  };

  const handleUpdateVariantRow = (itemKey, variantKey, field, value) => {
    setItems(prev => prev.map(it => {
      if (it.key !== itemKey) return it;
      const updatedVariantRows = it.variantRows.map(row => {
        if (row.key !== variantKey) return row;
        const updated = { ...row, [field]: value };
        const qty = parseInt(updated.quantity, 10) || 0;
        const cost = parseFloat(updated.unit_cost) || 0;
        const disc = parseFloat(updated.discount_pct) || 0;
        const discAmount = (qty * cost) * (disc / 100);
        updated.line_total = Math.max(0, (qty * cost) - discAmount);
        return updated;
      });
      return { ...it, variantRows: updatedVariantRows };
    }));
  };

  const handleBatchUpdate = (itemKey, field, val) => {
    setItems(prev => prev.map(it => {
      if (it.key !== itemKey) return it;
      return { ...it, [field]: val };
    }));
  };

  const handleApplyBatch = (itemKey, targetField, val) => {
    if (val === undefined || val === null || val === '') return;
    const numVal = parseFloat(val) || 0;
    setItems(prev => prev.map(it => {
      if (it.key !== itemKey) return it;
      const updatedRows = (it.variantRows || []).map(row => {
        const updated = { ...row, [targetField]: numVal };
        const qty = parseInt(updated.quantity, 10) || 0;
        const cost = parseFloat(updated.unit_cost) || 0;
        const disc = parseFloat(updated.discount_pct) || 0;
        const discAmount = (qty * cost) * (disc / 100);
        updated.line_total = Math.max(0, (qty * cost) - discAmount);
        return updated;
      });
      return { ...it, variantRows: updatedRows };
    }));
    message.success('تم تطبيق القيمة بنجاح على كافة المتغيرات');
  };

  const handleToggleSelectAll = (itemKey, enabled) => {
    setItems(prev => prev.map(it => {
      if (it.key !== itemKey) return it;
      const updatedVariantRows = (it.variantRows || []).map(row => ({
        ...row,
        enabled
      }));
      return { ...it, variantRows: updatedVariantRows };
    }));
  };

  const handleRemoveItem = (key) => {
    setItems(items.filter(it => it.key !== key));
  };

  // ==========================================
  // QUICK ADD VARIANT & NEW PRODUCT HANDLERS
  // ==========================================

  const handleQuickAddColorInline = async (colorName, colorCode) => {
    if (!colorName?.trim()) return null;
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'color',
        name: colorName.trim(),
        code: colorCode || '#000000'
      });
      if (res.data.success) {
        setColorsList(prev => [...prev, res.data.data]);
        return res.data.data;
      }
    } catch (err) {
      // attribute might exist or skip
    }
    return null;
  };

  const handleQuickAddSizeInline = async (sizeName) => {
    if (!sizeName?.trim()) return null;
    try {
      const res = await api.post('/api/swm/attributes', {
        attribute_type: 'size',
        name: sizeName.trim()
      });
      if (res.data.success) {
        setSizesList(prev => [...prev, res.data.data]);
        return res.data.data;
      }
    } catch (err) {
      // attribute might exist or skip
    }
    return null;
  };

  const handleQuickAddGroupInline = async () => {
    if (!newCategoryInput.trim()) return;
    setCreatingCategoryInline(true);
    try {
      const res = await api.post('/api/swm/categories', {
        category_name: newCategoryInput.trim(),
        is_ecom_visible: true
      });
      if (res.data.success) {
        setCategoriesList(prev => [...prev, res.data.data]);
        quickProductForm.setFieldsValue({ category_id: res.data.data.id });
        setNewCategoryInput('');
        message.success(`تمت إضافة المجموعة "${res.data.data.category_name}"`);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل إضافة المجموعة');
    } finally {
      setCreatingCategoryInline(false);
    }
  };

  const handleOpenQuickVariantModal = (it) => {
    setQuickVariantModalItem(it);
    setQuickNewColorInput('');
    setQuickNewSizeInput('');
    const baseCost = it.batchCost ?? it.variantRows[0]?.unit_cost ?? 0;
    const baseSelling = it.batchSelling ?? it.variantRows[0]?.selling_price ?? 0;
    quickVariantForm.resetFields();
    quickVariantForm.setFieldsValue({
      color: undefined,
      size: undefined,
      quantity: 1,
      unit_cost: baseCost,
      selling_price: baseSelling
    });
  };

  const handleSaveQuickVariant = async () => {
    try {
      const values = await quickVariantForm.validateFields();
      if (!quickVariantModalItem) return;
      setQuickVariantSubmitting(true);

      let finalColor = values.color?.trim() || (quickNewColorInput.trim() || null);
      let finalSize = values.size?.trim() || (quickNewSizeInput.trim() || null);

      if (!finalColor && !finalSize) {
        message.error('يرجى تحديد اللون أو المقاس للمتغير الجديد');
        setQuickVariantSubmitting(false);
        return;
      }

      if (quickNewColorInput.trim()) {
        await handleQuickAddColorInline(quickNewColorInput.trim(), quickNewColorCode);
        finalColor = quickNewColorInput.trim();
      }

      if (quickNewSizeInput.trim()) {
        await handleQuickAddSizeInline(quickNewSizeInput.trim());
        finalSize = quickNewSizeInput.trim();
      }

      const res = await api.post(`/api/swm/products/${quickVariantModalItem.product_id}/variants`, {
        color: finalColor,
        size: finalSize
      });

      const newVar = res.data?.data;
      const qty = parseInt(values.quantity, 10) || 1;
      const cost = parseFloat(values.unit_cost) || 0;
      const selling = parseFloat(values.selling_price) || 0;

      setItems(prev => prev.map(it => {
        if (it.key !== quickVariantModalItem.key) return it;
        const exists = (it.variantRows || []).some(
          r => (newVar?.id && r.variant_id === newVar.id) || (r.color === finalColor && r.size === finalSize)
        );
        if (exists) {
          const updatedRows = it.variantRows.map(r => {
            if ((newVar?.id && r.variant_id === newVar.id) || (r.color === finalColor && r.size === finalSize)) {
              const newQty = (parseInt(r.quantity, 10) || 0) + qty;
              return {
                ...r,
                enabled: true,
                quantity: newQty,
                unit_cost: cost || r.unit_cost,
                selling_price: selling || r.selling_price,
                line_total: newQty * (cost || r.unit_cost)
              };
            }
            return r;
          });
          return { ...it, variantRows: updatedRows };
        } else {
          const baseRows = (it.variantRows || []).filter(r => r.key !== 'base' || (r.quantity > 0 && r.enabled));
          const newRow = {
            key: newVar?.id || `var-${Date.now()}`,
            variant_id: newVar?.id || null,
            color: finalColor,
            size: finalSize,
            sku: newVar?.variant_sku || `${it.product_code || 'PRD'}-${finalColor || 'C'}-${finalSize || 'S'}`,
            enabled: true,
            quantity: qty,
            unit_cost: cost,
            selling_price: selling,
            discount_pct: 0,
            line_total: qty * cost
          };
          return { ...it, variantRows: [...baseRows, newRow] };
        }
      }));

      message.success(`تمت إضافة المتغير (${finalColor || ''} ${finalSize || ''}) بنجاح وحفظه على الصنف بالفاتورة`);
      setQuickVariantModalItem(null);
      quickVariantForm.resetFields();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'فشل حفظ المتغير على الصنف');
    } finally {
      setQuickVariantSubmitting(false);
    }
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
        const maxDim = 800; // Optimal size for e-commerce and ERP product cards

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

  // Open Full Master Product Modal in Create Mode
  const handleOpenMasterCreate = (targetItemKey = null) => {
    setTargetInvoiceItemKey(targetItemKey);
    setMasterProductMode('create');
    setEditingMasterProduct(null);
    masterProductForm.resetFields();

    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = generateValidEAN13('622');
    setMasterAutoCode(code);
    setMasterAutoBarcode(barcode);
    setMasterConstructedName('');
    setMasterVariantMode('single');
    setMasterSelectedMultiColors([]);
    setMasterSelectedMultiSizes([]);
    setMasterColorImages({});
    setMasterFeaturedImageUrl('');

    masterProductForm.setFieldsValue({
      product_code: code,
      barcode: barcode,
      brand: 'Yoka Store',
      cost_price: 0,
      selling_price: 0,
      is_ecom_listed: false,
      base_name: '',
      color: colorsList[0]?.name || 'أسود',
      size: sizesList[0]?.name || 'L',
      product_name: '',
      featured_image: '',
      category_id: categoriesList[0]?.id || undefined
    });

    setMasterProductModalOpen(true);
  };

  // Open Full Master Product Modal in Edit Mode (from invoice item or lookup)
  const handleOpenMasterEdit = async (productId, targetItemKey = null) => {
    if (!productId) return;
    setTargetInvoiceItemKey(targetItemKey);
    setMasterProductMode('edit');
    masterProductForm.resetFields();

    try {
      const res = await api.get(`/api/swm/products/${productId}`);
      if (res.data.success) {
        const prod = res.data.data;
        setEditingMasterProduct(prod);
        setMasterAutoCode(prod.product_code || '');
        setMasterAutoBarcode(prod.barcode || '');
        setMasterFeaturedImageUrl(prod.featured_image || '');

        const initialColorImages = {};
        if (prod.color_variants && Array.isArray(prod.color_variants)) {
          prod.color_variants.forEach(cv => {
            if (cv.color && cv.image_url) {
              initialColorImages[cv.color] = cv.image_url;
            }
          });
        }
        if (prod.variants && Array.isArray(prod.variants)) {
          prod.variants.forEach(v => {
            if (v.color && v.image_url && !initialColorImages[v.color]) {
              initialColorImages[v.color] = v.image_url;
            }
          });
        }
        setMasterColorImages(initialColorImages);

        // Extract distinct colors
        const rawColors = [];
        if (prod.color) {
          prod.color.split('/').forEach(c => {
            const clean = c.trim();
            if (clean && !rawColors.includes(clean)) rawColors.push(clean);
          });
        }
        if (Array.isArray(prod.variants)) {
          prod.variants.forEach(v => {
            if (v.color && v.color.trim() && !rawColors.includes(v.color.trim())) {
              rawColors.push(v.color.trim());
            }
          });
        }
        Object.keys(initialColorImages).forEach(c => {
          if (c && !rawColors.includes(c)) rawColors.push(c);
        });

        // Extract distinct sizes
        const rawSizes = [];
        if (prod.size) {
          prod.size.split('/').forEach(s => {
            const clean = s.trim();
            if (clean && !rawSizes.includes(clean)) rawSizes.push(clean);
          });
        }
        if (Array.isArray(prod.variants)) {
          prod.variants.forEach(v => {
            if (v.size && v.size.trim() && !rawSizes.includes(v.size.trim())) {
              rawSizes.push(v.size.trim());
            }
          });
        }

        const isMulti = rawColors.length > 1 || rawSizes.length > 1 || (Array.isArray(prod.variants) && prod.variants.length > 1);
        setMasterVariantMode(isMulti ? 'multi' : 'single');
        setMasterSelectedMultiColors(rawColors);
        setMasterSelectedMultiSizes(rawSizes);

        masterProductForm.setFieldsValue({
          product_code: prod.product_code,
          barcode: prod.barcode,
          product_name: prod.product_name,
          base_name: prod.product_name,
          category_id: prod.category_id,
          brand: prod.brand || 'Yoka Store',
          cost_price: prod.cost_price,
          selling_price: prod.selling_price,
          sale_price: prod.sale_price,
          status: prod.status || 'active',
          is_ecom_listed: prod.is_ecom_listed,
          featured_image: prod.featured_image || '',
          color: rawColors[0] || prod.color || '',
          size: rawSizes[0] || prod.size || ''
        });

        setMasterProductModalOpen(true);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الصنف للتعديل');
    }
  };

  const handleRegenerateMasterCodes = () => {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const code = `PRD-${randNum}`;
    const barcode = generateValidEAN13('622');
    setMasterAutoCode(code);
    setMasterAutoBarcode(barcode);
    masterProductForm.setFieldsValue({
      product_code: code,
      barcode: barcode
    });
    message.info('تم توليد كود وباركود EAN-13 جديدين تلقائياً');
  };

  const handleMasterValuesChange = (changedValues) => {
    if ('featured_image' in changedValues) {
      setMasterFeaturedImageUrl(changedValues.featured_image || '');
    }
  };

  // Inline Quick Add Category in Master Modal
  const handleQuickAddCategoryInMaster = async () => {
    if (!newCategoryInput.trim()) return message.warning('يرجى كتابة اسم المجموعة أولاً');
    setCreatingCategoryInline(true);
    try {
      const res = await api.post('/api/swm/categories', {
        category_name: newCategoryInput.trim(),
        is_ecom_visible: true
      });
      if (res.data.success) {
        message.success(`تمت إضافة مجموعة "${newCategoryInput.trim()}" بنجاح!`);
        await fetchLookups();
        masterProductForm.setFieldsValue({ category_id: res.data.data.id });
        setNewCategoryInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة المجموعة');
    } finally {
      setCreatingCategoryInline(false);
    }
  };

  // Inline Quick Add Color in Master Modal
  const handleQuickAddColorInMaster = async () => {
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
        await fetchLookups();
        if (masterVariantMode === 'multi') {
          setMasterSelectedMultiColors(prev => [...prev, newColorInput.trim()]);
        } else {
          masterProductForm.setFieldsValue({ color: newColorInput.trim() });
        }
        setNewColorInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة اللون');
    } finally {
      setCreatingColorInline(false);
    }
  };

  // Inline Quick Add Size in Master Modal
  const handleQuickAddSizeInMaster = async () => {
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
        await fetchLookups();
        if (masterVariantMode === 'multi') {
          setMasterSelectedMultiSizes(prev => [...prev, newSizeInput.trim()]);
        } else {
          masterProductForm.setFieldsValue({ size: newSizeInput.trim() });
        }
        setNewSizeInput('');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إضافة المقاس');
    } finally {
      setCreatingSizeInline(false);
    }
  };

  // Save Master Product (Create or Edit)
  const handleSaveMasterProduct = async () => {
    try {
      const values = await masterProductForm.validateFields();
      setMasterProductSubmitting(true);

      const activeColorsList = masterVariantMode === 'multi'
        ? masterSelectedMultiColors
        : (values.color ? [values.color] : (editingMasterProduct?.color ? editingMasterProduct.color.split('/').map(c => c.trim()) : []));

      const firstColorWithImg = activeColorsList.find(c => masterColorImages[c]);
      const defaultFeatured = (firstColorWithImg && masterColorImages[firstColorWithImg]) || masterFeaturedImageUrl || values.featured_image || null;

      if (masterProductMode === 'create') {
        const finalProductName = values.product_name?.trim() || values.base_name?.trim();
        if (!finalProductName) {
          message.error('يرجى إدخال اسم الصنف');
          setMasterProductSubmitting(false);
          return;
        }

        let variantsPayload = [];
        if (masterVariantMode === 'multi' && masterSelectedMultiColors.length > 0 && masterSelectedMultiSizes.length > 0) {
          variantsPayload = masterSelectedMultiColors.flatMap((c, cIdx) =>
            masterSelectedMultiSizes.map((s, sIdx) => {
              const rawCode = masterAutoCode || values.product_code || 'PRD';
              const cClean = c.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${cIdx + 1}`;
              const sClean = s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${sIdx + 1}`;
              return {
                color: c,
                size: s,
                sku: `${rawCode}-${cClean}-${sClean}`,
                price_modifier: 0,
                image_url: masterColorImages[c] || defaultFeatured || null
              };
            })
          );
        } else if (values.color || values.size) {
          variantsPayload = [{
            color: values.color || null,
            size: values.size || null,
            sku: masterAutoCode || values.product_code || 'PRD',
            price_modifier: 0,
            image_url: (values.color && masterColorImages[values.color]) || defaultFeatured || null
          }];
        }

        const payload = {
          product_code: masterAutoCode || values.product_code,
          barcode: masterAutoBarcode || values.barcode,
          product_name: finalProductName,
          category_id: values.category_id,
          brand: values.brand || 'Yoka Store',
          color: masterVariantMode === 'multi' ? masterSelectedMultiColors.join(' / ') : (values.color || null),
          size: masterVariantMode === 'multi' ? masterSelectedMultiSizes.join(' / ') : (values.size || null),
          cost_price: Number(values.cost_price || 0),
          selling_price: Number(values.selling_price || 0),
          is_ecom_listed: Boolean(values.is_ecom_listed || false),
          featured_image: defaultFeatured,
          color_images: masterColorImages,
          variants: variantsPayload
        };

        const res = await api.post('/api/swm/products', payload);
        if (res.data.success) {
          const newProd = res.data.data;
          message.success(`تم إنشاء الصنف الجديد "${newProd.product_name}" بنجاح وإدراجه في الفاتورة!`);
          await fetchLookups();

          if (targetInvoiceItemKey) {
            await handleSelectProduct(targetInvoiceItemKey, newProd.id);
          } else {
            const newKey = Date.now();
            setItems(prev => [
              ...prev,
              {
                key: newKey,
                product_id: newProd.id,
                product_name: newProd.product_name,
                product_code: newProd.product_code,
                category_name: categoriesList.find(c => c.id === newProd.category_id)?.category_name || '',
                loadingVariants: true,
                batchQty: null,
                batchCost: null,
                batchSelling: null,
                variantRows: []
              }
            ]);
            await handleSelectProduct(newKey, newProd.id);
          }

          setMasterProductModalOpen(false);
          masterProductForm.resetFields();
        }
      } else {
        // Edit mode
        let variantsPayload = [];
        if (masterVariantMode === 'multi' && masterSelectedMultiColors.length > 0 && masterSelectedMultiSizes.length > 0) {
          variantsPayload = masterSelectedMultiColors.flatMap((c, cIdx) =>
            masterSelectedMultiSizes.map((s, sIdx) => {
              const rawCode = editingMasterProduct.product_code || values.product_code || 'PRD';
              const cClean = c.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `C${cIdx + 1}`;
              const sClean = s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || `S${sIdx + 1}`;
              return {
                color: c,
                size: s,
                sku: `${rawCode}-${cClean}-${sClean}`,
                price_modifier: 0,
                image_url: masterColorImages[c] || defaultFeatured || null
              };
            })
          );
        } else if (values.color || values.size) {
          variantsPayload = [{
            color: values.color || null,
            size: values.size || null,
            sku: editingMasterProduct.product_code || values.product_code || 'PRD',
            price_modifier: 0,
            image_url: (values.color && masterColorImages[values.color]) || defaultFeatured || null
          }];
        }

        const { cost_price, selling_price, status, is_ecom_listed, ...restValues } = values;
        const payload = {
          ...restValues,
          color: masterVariantMode === 'multi' ? masterSelectedMultiColors.join(' / ') : (values.color || null),
          size: masterVariantMode === 'multi' ? masterSelectedMultiSizes.join(' / ') : (values.size || null),
          featured_image: defaultFeatured,
          color_images: masterColorImages,
          variants: variantsPayload
        };

        const res = await api.put(`/api/swm/products/${editingMasterProduct.id}`, payload);
        if (res.data.success) {
          message.success(`تم تحديث بيانات الصنف "${values.product_name || editingMasterProduct.product_name}" بالمجموعات والأصناف وفي الفاتورة بنجاح!`);
          await fetchLookups();

          // Refresh all invoice items pointing to this product
          const matchingItems = items.filter(it => it.product_id === editingMasterProduct.id);
          for (const item of matchingItems) {
            await handleSelectProduct(item.key, editingMasterProduct.id);
          }
          if (targetInvoiceItemKey && !matchingItems.some(it => it.key === targetInvoiceItemKey)) {
            await handleSelectProduct(targetInvoiceItemKey, editingMasterProduct.id);
          }

          setMasterProductModalOpen(false);
          setEditingMasterProduct(null);
        }
      }
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'فشل في حفظ بيانات الصنف');
    } finally {
      setMasterProductSubmitting(false);
    }
  };

  // Barcode Printing Helpers
  const handleOpenBarcodePrintFromCurrentDrawer = () => {
    const printItems = [];
    items.forEach(it => {
      (it.variantRows || []).forEach(row => {
        if (row.enabled && row.quantity > 0) {
          printItems.push({
            product_id: it.product_id,
            product_name: it.product_name,
            product_code: it.product_code || row.sku || '',
            barcode: row.sku || it.product_code || '',
            color: row.color || '',
            size: row.size || '',
            unit_cost: row.unit_cost,
            selling_price: row.selling_price,
            quantity: parseInt(row.quantity, 10) || 1
          });
        }
      });
    });
    if (printItems.length === 0) {
      return message.warning('لا توجد أصناف وكميات صالحة لطباعة الباركود في الفاتورة الحالية');
    }
    setBarcodeModalItems(printItems);
    setBarcodeModalOpen(true);
  };

  const handleOpenBarcodePrintFromInvoice = (invoice) => {
    if (!invoice || !invoice.items || invoice.items.length === 0) {
      return message.warning('لا توجد أصناف في هذه الفاتورة للطباعة');
    }
    const printItems = invoice.items.map(it => ({
      product_id: it.product_id,
      product_name: it.product_name,
      product_code: it.product_code || it.variant_sku || '',
      barcode: it.barcode || it.product_code || it.variant_sku || '',
      color: it.color || '',
      size: it.size || '',
      unit_cost: it.unit_cost,
      selling_price: it.selling_price,
      quantity: it.quantity || 1
    }));
    setBarcodeModalItems(printItems);
    setBarcodeModalOpen(true);
  };

  const handleOpenCreateDrawer = () => {
    fetchLookups();
    if (defaultBranchId) setSelectedBranch(defaultBranchId);
    setItems([
      {
        key: Date.now(),
        product_id: null,
        product_name: '',
        product_code: '',
        category_name: '',
        loadingVariants: false,
        batchQty: null,
        batchCost: null,
        batchSelling: null,
        variantRows: []
      }
    ]);
    setSplitPaymentBreakdown([]);
    setPaidAmount(0);
    setIsCreateOpen(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateDrawer();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleCreateInvoice = async () => {
    if (!selectedSupplier) return message.error('يرجى اختيار المورد');
    if (!selectedBranch) return message.error('يرجى اختيار مستودع الاستلام');
    if (items.length === 0) return message.error('يجب إضافة صنف واحد على الأقل في الفاتورة');

    // Flatten all selected variants across all items
    const flatItems = [];
    for (const it of items) {
      if (!it.product_id) continue;
      for (const row of (it.variantRows || [])) {
        if (!row.enabled) continue;
        const qty = parseInt(row.quantity, 10);
        if (!qty || qty <= 0) continue;
        const cost = parseFloat(row.unit_cost) || 0;
        const selling = parseFloat(row.selling_price) || 0;
        const disc = parseFloat(row.discount_pct) || 0;

        flatItems.push({
          product_id: it.product_id,
          variant_id: row.variant_id || null,
          quantity: qty,
          unit_cost: cost,
          selling_price: selling,
          discount_pct: disc
        });
      }
    }

    if (flatItems.length === 0) {
      return message.error('يرجى اختيار المنتجات وتحديد كمية أكبر من صفر لمتغير واحد على الأقل');
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: selectedSupplier,
        warehouse_branch_id: selectedBranch,
        invoice_number: invoiceNumber ? invoiceNumber.trim() : undefined,
        invoice_date: invoiceDate,
        discount_amount: parseFloat(discountTotal) || 0,
        tax_amount: parseFloat(taxTotal) || 0,
        shipping_cost: parseFloat(shippingCost) || 0,
        paid_amount: paidAmount,
        payment_method: splitPaymentBreakdown.length > 1 ? 'split' : (splitPaymentBreakdown[0]?.method || 'cash'),
        payment_breakdown: splitPaymentBreakdown,
        notes,
        items: flatItems
      };

      const res = await api.post('/api/swm/purchases', payload);
      if (res.data.success) {
        message.success('تم اعتماد فاتورة المشتريات وتحديث أسعار الأصناف والمتغيرات وأرصدة المخزون وحساب المورد بنجاح');

        // Prepare items for barcode sticker printing if user wants
        const printItemsSnapshot = [];
        items.forEach(it => {
          (it.variantRows || []).forEach(row => {
            if (row.enabled && row.quantity > 0) {
              printItemsSnapshot.push({
                product_id: it.product_id,
                product_name: it.product_name,
                product_code: it.product_code || row.sku || '',
                barcode: row.sku || it.product_code || '',
                color: row.color || '',
                size: row.size || '',
                unit_cost: row.unit_cost,
                selling_price: row.selling_price,
                quantity: parseInt(row.quantity, 10) || 1
              });
            }
          });
        });

        setIsCreateOpen(false);
        setItems([]);
        setSelectedSupplier(null);
        setNotes('');
        setPaidAmount(0);
        setSplitPaymentBreakdown([]);
        fetchInvoices(1);
        fetchLookups();

        if (printItemsSnapshot.length > 0) {
          Modal.confirm({
            title: 'تم اعتماد فاتورة الشراء وتوريد البضاعة بنجاح!',
            icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
            content: (
              <div>
                <p>تم تحديث المخزون وحسابات المورد وتكاليف الأصناف بنجاح.</p>
                <p style={{ fontWeight: 600, color: '#0f766e' }}>
                  هل ترغب في طباعة ملصقات الباركود [الموديل - اللون - المقاس - الباركود - السعر] لقطع البضاعة المستلمة الآن؟
                </p>
              </div>
            ),
            okText: '🖨️ نعم، طباعة ملصقات الباركود',
            cancelText: 'لاحقاً',
            okButtonProps: { style: { backgroundColor: '#0d9488', borderColor: '#0d9488' } },
            onOk: () => {
              setBarcodeModalItems(printItemsSnapshot);
              setBarcodeModalOpen(true);
            }
          });
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ فاتورة المشتريات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = async (invoice) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedInvoice(null);
    try {
      const res = await api.get(`/api/swm/purchases/${invoice.id}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل تفاصيل الفاتورة');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    if (printAreaRef.current) {
      printHtmlContent({
        title: `فاتورة توريد - ${selectedInvoice?.invoice_number || ''}`,
        htmlContent: printAreaRef.current.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  // ==============================================================
  // 2. STANDALONE PURCHASE RETURN (DIRECT SEARCH & ADD PRODUCTS)
  // ==============================================================

  const handleOpenStandaloneReturnDrawer = () => {
    fetchLookups();
    if (defaultBranchId) setStandaloneBranch(defaultBranchId);
    setStandaloneSupplier(null);
    setStandaloneDate(new Date().toISOString().split('T')[0]);
    setStandaloneReason('');
    setStandaloneRefundType('credit');
    setStandaloneRefundBreakdown([]);
    setStandaloneRefundAmount(0);
    setStandaloneItems([
      {
        key: Date.now(),
        product_id: null,
        variant_id: null,
        product_name: '',
        product_code: '',
        quantity: 1,
        unit_cost: 0,
        line_total: 0
      }
    ]);
    setIsStandaloneReturnOpen(true);
  };

  const handleAddStandaloneItem = () => {
    setStandaloneItems([
      ...standaloneItems,
      {
        key: Date.now() + Math.random(),
        product_id: null,
        variant_id: null,
        product_name: '',
        product_code: '',
        quantity: 1,
        unit_cost: 0,
        line_total: 0
      }
    ]);
  };

  const handleUpdateStandaloneItem = (key, field, value) => {
    setStandaloneItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };

      if (field === 'product_id') {
        const prod = productsList.find(p => p.id === value);
        if (prod) {
          updated.product_name = prod.product_name;
          updated.product_code = prod.product_code || prod.barcode || '';
          updated.unit_cost = parseFloat(prod.cost_price) || 0;
        }
      }

      const qty = parseInt(updated.quantity, 10) || 0;
      const cost = parseFloat(updated.unit_cost) || 0;
      updated.line_total = Math.max(0, qty * cost);

      return updated;
    }));
  };

  const handleRemoveStandaloneItem = (key) => {
    setStandaloneItems(standaloneItems.filter(it => it.key !== key));
  };

  const calculatedStandaloneTotal = standaloneItems.reduce((sum, it) => sum + (parseFloat(it.line_total) || 0), 0);

  const handleSubmitStandaloneReturn = async () => {
    if (!standaloneSupplier) {
      return message.error('يرجى اختيار المورد المرتجع إليه');
    }
    if (!standaloneBranch) {
      return message.error('يرجى اختيار مستودع إرجاع البضاعة');
    }
    if (standaloneItems.length === 0) {
      return message.error('يجب إضافة صنف واحد على الأقل للإرجاع');
    }

    for (const it of standaloneItems) {
      if (!it.product_id || !it.quantity || it.quantity <= 0) {
        return message.error('يرجى التأكد من اختيار المنتج وتحديد كمية أكبر من صفر لكل صنف');
      }
    }

    if (calculatedStandaloneTotal <= 0) {
      return message.error('إجمالي قيمة المرتجع يجب أن يكون أكبر من صفر');
    }

    if (standaloneRefundType === 'refund') {
      if (standaloneRefundAmount <= 0) {
        return message.error('يرجى تحديد تفاصيل وسند الاسترداد المالي أو اختيار التسوية عبر رصيد الحساب');
      }
      if (standaloneRefundAmount > calculatedStandaloneTotal) {
        return message.error('مبلغ الاسترداد المالي لا يمكن أن يتجاوز إجمالي قيمة المرتجع');
      }
    }

    setStandaloneSubmitting(true);
    try {
      const payload = {
        invoice_id: null, // Standalone return independent of previous invoices
        supplier_id: standaloneSupplier,
        warehouse_branch_id: standaloneBranch,
        return_date: standaloneDate,
        reason: standaloneReason ? standaloneReason.trim() : null,
        total_amount: calculatedStandaloneTotal,
        refund_amount: standaloneRefundType === 'refund' ? standaloneRefundAmount : 0,
        refund_method: standaloneRefundType === 'refund'
          ? (standaloneRefundBreakdown.length > 1 ? 'split' : (standaloneRefundBreakdown[0]?.method || 'cash'))
          : 'balance_credit',
        payment_breakdown: standaloneRefundType === 'refund' ? standaloneRefundBreakdown : null,
        items: standaloneItems.map(it => ({
          product_id: it.product_id,
          variant_id: it.variant_id || undefined,
          quantity: parseInt(it.quantity, 10),
          unit_cost: parseFloat(it.unit_cost),
          product_name: it.product_name,
          product_code: it.product_code
        }))
      };

      const res = await api.post('/api/swm/purchases/returns', payload);
      if (res.data.success) {
        message.success('تم إنشاء فاتورة مرتجع المشتريات المستقلة وخصم المخزون بنجاح');
        setIsStandaloneReturnOpen(false);
        fetchReturns(1);
        fetchInvoices(pagination.current);
        setActiveTab('returns');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ فاتورة مرتجع المشتريات');
    } finally {
      setStandaloneSubmitting(false);
    }
  };

  // ==============================================================
  // 3. LINKED RETURN FROM SPECIFIC INVOICE MODAL
  // ==============================================================

  const handleOpenLinkedReturnModal = async (invoice) => {
    try {
      const res = await api.get(`/api/swm/purchases/${invoice.id}`);
      if (!res.data.success) {
        return message.error('فشل في تحميل بيانات الفاتورة الأصلية للمرتجع');
      }

      const invData = res.data.data;
      setLinkedInvoice(invData);

      const mappedItems = (invData.items || []).map(it => {
        const returned = parseInt(it.returned_quantity, 10) || 0;
        const orig = parseInt(it.quantity, 10) || 0;
        const available = Math.max(0, orig - returned);
        return {
          purchase_item_id: it.id,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          product_name: it.product_name,
          product_code: it.product_code,
          quantity: orig,
          returned_quantity: returned,
          available_to_return: available,
          unit_cost: parseFloat(it.unit_cost) || 0,
          return_qty: 0
        };
      });

      const totalAvailable = mappedItems.reduce((sum, it) => sum + it.available_to_return, 0);
      if (totalAvailable <= 0) {
        return message.warning('تم إرجاع جميع أصناف هذه الفاتورة بالكامل مسبقاً، لا توجد قطع متبقية للإرجاع');
      }

      setLinkedItems(mappedItems);
      setLinkedRefundType('credit');
      setLinkedRefundBreakdown([]);
      setLinkedRefundAmount(0);
      setLinkedReason('');
      setLinkedReturnOpen(true);
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء فتح نافذة المرتجع');
    }
  };

  const calculatedLinkedTotal = linkedItems.reduce((sum, it) => {
    const qty = parseInt(it.return_qty, 10) || 0;
    const cost = parseFloat(it.unit_cost) || 0;
    return sum + (qty * cost);
  }, 0);

  const handleSubmitLinkedReturn = async () => {
    const itemsToReturn = linkedItems.filter(it => (parseInt(it.return_qty, 10) || 0) > 0);
    if (itemsToReturn.length === 0) {
      return message.error('يرجى تحديد كمية إرجاع أكبر من صفر لصنف واحد على الأقل');
    }

    if (calculatedLinkedTotal <= 0) {
      return message.error('إجمالي قيمة المرتجع يجب أن يكون أكبر من صفر');
    }

    if (linkedRefundType === 'refund') {
      if (linkedRefundAmount <= 0) {
        return message.error('يرجى تحديد تفاصيل وسند الاسترداد المالي أو اختيار التسوية عبر رصيد الحساب');
      }
      if (linkedRefundAmount > calculatedLinkedTotal) {
        return message.error('مبلغ الاسترداد المالي لا يمكن أن يتجاوز إجمالي قيمة المرتجع');
      }
    }

    setLinkedSubmitting(true);
    try {
      const payload = {
        invoice_id: linkedInvoice.id,
        supplier_id: linkedInvoice.supplier_id,
        warehouse_branch_id: linkedInvoice.warehouse_branch_id,
        return_date: new Date().toISOString().split('T')[0],
        reason: linkedReason ? linkedReason.trim() : null,
        total_amount: calculatedLinkedTotal,
        refund_amount: linkedRefundType === 'refund' ? linkedRefundAmount : 0,
        refund_method: linkedRefundType === 'refund'
          ? (linkedRefundBreakdown.length > 1 ? 'split' : (linkedRefundBreakdown[0]?.method || 'cash'))
          : 'balance_credit',
        payment_breakdown: linkedRefundType === 'refund' ? linkedRefundBreakdown : null,
        items: itemsToReturn.map(it => ({
          purchase_item_id: it.purchase_item_id,
          product_id: it.product_id,
          variant_id: it.variant_id || undefined,
          quantity: parseInt(it.return_qty, 10),
          unit_cost: parseFloat(it.unit_cost),
          product_name: it.product_name,
          product_code: it.product_code
        }))
      };

      const res = await api.post('/api/swm/purchases/returns', payload);
      if (res.data.success) {
        message.success('تم تسجيل مرتجع المشتريات، خصم المخزون، وتحديث حساب المورد بنجاح');
        setLinkedReturnOpen(false);
        fetchInvoices(pagination.current);
        fetchReturns(1);
        setActiveTab('returns');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ مرتجع المشتريات');
    } finally {
      setLinkedSubmitting(false);
    }
  };

  const handleViewReturnDetails = async (returnRecord) => {
    setReturnDetailsOpen(true);
    setReturnDetailsLoading(true);
    setSelectedReturn(null);
    try {
      const res = await api.get(`/api/swm/purchases/returns/${returnRecord.id}`);
      if (res.data.success) {
        setSelectedReturn(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل تفاصيل المرتجع');
    } finally {
      setReturnDetailsLoading(false);
    }
  };

  const handlePrintReturn = () => {
    if (printReturnAreaRef.current) {
      printHtmlContent({
        title: `إشعار مرتجع مشتريات - ${selectedReturn?.return_number || ''}`,
        htmlContent: printReturnAreaRef.current.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  // Table Columns
  const invoiceColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (num) => <Text code strong>{num}</Text>
    },
    {
      title: 'المورد',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.supplier_code}</div>
        </div>
      )
    },
    {
      title: 'المستودع المستلم',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (w) => <Tag color="blue">{w}</Tag>
    },
    {
      title: 'تاريخ الفاتورة',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (d) => new Date(d).toLocaleDateString('ar-EG')
    },
    {
      title: 'إجمالي الأصناف',
      dataIndex: 'items_count',
      key: 'items_count',
      render: (cnt, r) => `${cnt} صنف (${r.total_units} قطعة)`
    },
    {
      title: 'القيمة الإجمالية',
      dataIndex: 'final_amount',
      key: 'final_amount',
      render: (val) => <Text strong>{parseFloat(val).toLocaleString()} ج.م</Text>
    },
    {
      title: 'حالة السداد',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (st, r) => {
        const map = {
          paid: { label: 'مسدد بالكامل', color: 'green' },
          partial: { label: `مسدد جزئياً (${parseFloat(r.paid_amount || 0).toLocaleString()} ج.م)`, color: 'orange' },
          unpaid: { label: 'آجل (غير مسدد)', color: 'red' }
        };
        const item = map[st] || { label: st, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      }
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            عرض الفاتورة
          </Button>
          <Button
            size="small"
            danger
            icon={<RollbackOutlined />}
            onClick={() => handleOpenLinkedReturnModal(record)}
          >
            إرجاع للمورد
          </Button>
        </Space>
      )
    }
  ];

  const returnColumns = [
    {
      title: 'رقم إشعار المرتجع',
      dataIndex: 'return_number',
      key: 'return_number',
      render: (num) => <Text code strong style={{ color: '#dc2626' }}>{num}</Text>
    },
    {
      title: 'الفاتورة الأصلية',
      dataIndex: 'invoice_ref',
      key: 'invoice_ref',
      render: (ref) => ref ? <Tag color="geekblue">{ref}</Tag> : <Tag color="purple">مرتجع مستقل بدون فاتورة</Tag>
    },
    {
      title: 'المورد',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.supplier_code}</div>
        </div>
      )
    },
    {
      title: 'المستودع',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (w) => <Tag color="blue">{w}</Tag>
    },
    {
      title: 'تاريخ الإرجاع',
      dataIndex: 'return_date',
      key: 'return_date',
      render: (d) => new Date(d).toLocaleDateString('ar-EG')
    },
    {
      title: 'الأصناف المرتجعة',
      dataIndex: 'items_count',
      key: 'items_count',
      render: (cnt, r) => `${cnt} صنف (${r.total_units} قطعة)`
    },
    {
      title: 'إجمالي المرتجع',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (val) => <Text strong style={{ color: '#dc2626' }}>{parseFloat(val).toLocaleString()} ج.م</Text>
    },
    {
      title: 'التسوية المالية',
      key: 'refund_info',
      render: (_, r) => {
        const refAmt = parseFloat(r.refund_amount) || 0;
        if (refAmt > 0) {
          return (
            <div>
              <Tag color="green">استرداد نقدي: {refAmt.toLocaleString()} ج.م</Tag>
              {r.payment_breakdown && (
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                  {r.refund_method === 'split' ? 'مقسم (Multi-tender)' : r.refund_method}
                </div>
              )}
            </div>
          );
        }
        return <Tag color="blue">خصم من مديونية المورد</Tag>;
      }
    },
    {
      title: 'السبب',
      dataIndex: 'reason',
      key: 'reason',
      render: (rs) => rs ? <Text ellipsis={{ tooltip: rs }} style={{ maxWidth: 140 }}>{rs}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewReturnDetails(record)}
        >
          عرض الإشعار
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>المشتريات والتوريد والمرتجعات (Purchases & Returns)</Title>
          <Text type="secondary">توريد بضائع المخازن، تحديث أسعار التكلفة والبيع، إدارة السداد المقسم، وإرجاع المشتريات للموردين</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchInvoices(pagination.current); fetchReturns(returnsPagination.current); }}>
            تحديث
          </Button>
          <Button
            type="primary"
            danger
            icon={<RollbackOutlined />}
            onClick={handleOpenStandaloneReturnDrawer}
          >
            فاتورة مرتجع مشتريات جديدة
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateDrawer}
            style={{ backgroundColor: '#2563eb' }}
          >
            فاتورة مشتريات جديدة
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'invoices',
            label: (
              <span>
                <ShoppingOutlined style={{ marginLeft: 6 }} />
                فواتير المشتريات والتوريد ({pagination.total})
              </span>
            ),
            children: (
              <div>
                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Input
                        prefix={<SearchOutlined />}
                        placeholder="البحث برقم الفاتورة أو اسم المورد..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="تصفية حسب المورد"
                        value={supplierFilter || undefined}
                        onChange={(v) => setSupplierFilter(v || '')}
                        allowClear
                      >
                        {suppliersList.map(s => (
                          <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="تصفية حسب المستودع"
                        value={branchFilter || undefined}
                        onChange={(v) => setBranchFilter(v || '')}
                        allowClear
                      >
                        {branchesList.map(b => (
                          <Option key={b.id} value={b.id}>{b.branch_name}</Option>
                        ))}
                      </Select>
                    </Col>
                  </Row>
                </Card>

                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    columns={invoiceColumns}
                    dataSource={invoices}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      onChange: (p) => fetchInvoices(p),
                      showTotal: (total) => `إجمالي الفواتير: ${total}`
                    }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: 'returns',
            label: (
              <span>
                <RollbackOutlined style={{ marginLeft: 6, color: '#dc2626' }} />
                مرتجع المشتريات للموردين ({returnsPagination.total})
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Alert
                    message="يمكنك إنشاء فاتورة مرتجع مشتريات مستقلة مباشرة بالبحث عن المنتجات وإضافتها دون الحاجة لربطها بفاتورة شراء سابقة."
                    type="info"
                    showIcon
                    style={{ flex: 1, marginLeft: 12 }}
                  />
                  <Button
                    type="primary"
                    danger
                    icon={<RollbackOutlined />}
                    onClick={handleOpenStandaloneReturnDrawer}
                  >
                    فاتورة مرتجع مشتريات جديدة
                  </Button>
                </div>

                <Card style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Input
                        prefix={<SearchOutlined />}
                        placeholder="البحث برقم الإشعار أو الفاتورة أو المورد..."
                        value={returnsSearch}
                        onChange={(e) => setReturnsSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="تصفية حسب المورد"
                        value={supplierFilter || undefined}
                        onChange={(v) => setSupplierFilter(v || '')}
                        allowClear
                      >
                        {suppliersList.map(s => (
                          <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} md={8}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="تصفية حسب المستودع"
                        value={branchFilter || undefined}
                        onChange={(v) => setBranchFilter(v || '')}
                        allowClear
                      >
                        {branchesList.map(b => (
                          <Option key={b.id} value={b.id}>{b.branch_name}</Option>
                        ))}
                      </Select>
                    </Col>
                  </Row>
                </Card>

                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    columns={returnColumns}
                    dataSource={returnsList}
                    rowKey="id"
                    loading={returnsLoading}
                    pagination={{
                      current: returnsPagination.current,
                      pageSize: returnsPagination.pageSize,
                      total: returnsPagination.total,
                      onChange: (p) => fetchReturns(p),
                      showTotal: (total) => `إجمالي إشعارات المرتجع: ${total}`
                    }}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />

      {/* ========================================================= */}
      {/* 1. CREATE PURCHASE INVOICE DRAWER                         */}
      {/* ========================================================= */}
      <Drawer
        title="تسجيل فاتورة مشتريات وتوريد بضاعة"
        placement="left"
        width={1150}
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        extra={
          <Space>
            <Button
              icon={<BarcodeOutlined />}
              onClick={handleOpenBarcodePrintFromCurrentDrawer}
              style={{ color: '#0f766e', borderColor: '#0f766e' }}
              disabled={!items.some(it => (it.variantRows || []).some(r => r.enabled && r.quantity > 0))}
            >
              🖨️ طباعة ملصقات الباركود للبضاعة
            </Button>
            <Button onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleCreateInvoice}
              style={{ backgroundColor: '#16a34a' }}
            >
              اعتماد الفاتورة وتحديث الأسعار والمخزون
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="المورد" required>
                <Select
                  showSearch
                  placeholder="اختر المورد..."
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                  filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
                >
                  {suppliersList.map(s => (
                    <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="المستودع المستلم (Receiving Branch)" required>
                <Select
                  placeholder="اختر المستودع..."
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                >
                  {branchesList.map(b => (
                    <Option key={b.id} value={b.id}>
                      {b.branch_name} {b.id === defaultBranchId ? '(الرئيسي الافتراضي)' : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="تاريخ الفاتورة">
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="رقم الفاتورة اليدوي">
                <Input
                  placeholder="تلقائي إن تُرك فارغاً"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '12px 0' }}>
            أصناف الفاتورة وأسعار التكلفة والبيع (Invoice Items & Master Prices Sync)
          </Divider>
          <Alert
            message="تحديث أسعار التكلفة وسعر البيع النهائي يتم مزامنته تلقائياً على بطاقة الصنف الأصلية (Master Product) وتدوينه في سجل النشاطات."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />

          {/* Products & Multi-Variant Matrix List */}
          <div style={{ marginBottom: 16 }}>
            {items.map((it, idx) => {
              const itemTotal = (it.variantRows || []).reduce((sum, row) => {
                if (!row.enabled || !row.quantity || row.quantity <= 0) return sum;
                return sum + (parseFloat(row.line_total) || 0);
              }, 0);
              const itemPieces = (it.variantRows || []).reduce((sum, row) => {
                if (!row.enabled || !row.quantity || row.quantity <= 0) return sum;
                return sum + (parseInt(row.quantity, 10) || 0);
              }, 0);
              const allSelected = (it.variantRows || []).length > 0 && it.variantRows.every(r => r.enabled);

              return (
                <Card
                  key={it.key}
                  size="small"
                  style={{
                    marginBottom: 16,
                    border: it.product_id ? '1px solid #93c5fd' : '1px dashed #cbd5e1',
                    borderRadius: 10,
                    boxShadow: it.product_id ? '0 4px 12px rgba(37, 99, 235, 0.05)' : '0 1px 3px rgba(0,0,0,0.03)',
                    background: '#ffffff',
                    overflow: 'hidden'
                  }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '4px 0' }}>
                      <Space align="center" wrap style={{ flex: 1 }}>
                        <Badge count={idx + 1} style={{ backgroundColor: it.product_id ? '#16a34a' : '#2563eb' }} />
                        <Text strong style={{ fontSize: 13.5 }}>الصنف {idx + 1}:</Text>

                        {/* Category / Group Filter */}
                        <Select
                          allowClear
                          placeholder="📁 كل المجموعات"
                          value={it.category_filter || undefined}
                          onChange={(catId) => {
                            setItems(prev => prev.map(item => item.key === it.key ? {
                              ...item,
                              category_filter: catId,
                              product_id: null,
                              variantRows: []
                            } : item));
                          }}
                          style={{ width: 160 }}
                          options={[
                            { value: '', label: '📁 كل المجموعات' },
                            ...categoriesList.map(c => ({ value: c.id, label: `📁 ${c.category_name}` }))
                          ]}
                        />

                        {/* Product Selector filtered by category */}
                        <Select
                          showSearch
                          placeholder="🔍 ابحث بالاسم أو كود الصنف أو الباركود..."
                          value={it.product_id}
                          onChange={(val) => handleSelectProduct(it.key, val)}
                          style={{ minWidth: 320 }}
                          filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                          options={productsList
                            .filter(p => p.status === 'active' && p.category_id && (!it.category_filter || p.category_id === it.category_filter))
                            .map(p => ({
                              value: p.id,
                              label: `${p.category_name ? `[${p.category_name}] ` : ''}${p.product_name} (${p.product_code || p.barcode || 'بدون كود'})`
                            }))}
                        />

                        {/* Edit Master Product button (when product is selected) */}
                        {it.product_id && (
                          <Tooltip title="فتح نافذة تعديل الصنف بالكامل وتحديث بياناته بالمجموعات والأصناف والفاتورة">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenMasterEdit(it.product_id, it.key)}
                              style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', fontWeight: 600 }}
                            >
                              تعديل الصنف
                            </Button>
                          </Tooltip>
                        )}

                        {/* Create new product directly into this slot if product/group not found */}
                        <Tooltip title="إضافة صنف جديد تماماً إلى المجموعات والأصناف وربطه فوراً بهذه الخانة">
                          <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => handleOpenMasterCreate(it.key)}
                            style={{ color: '#7c3aed', borderColor: '#c4b5fd', background: '#f5f3ff' }}
                          >
                            + صنف جديد
                          </Button>
                        </Tooltip>

                        <Tooltip title="تحديث ومزامنة قائمة الأصناف">
                          <Button
                            type="text"
                            size="small"
                            icon={<ReloadOutlined spin={refreshingProducts} />}
                            onClick={handleRefreshProductsList}
                            style={{ color: '#4f46e5' }}
                          />
                        </Tooltip>
                      </Space>

                      <Space>
                        {it.product_id && (
                          <Tag color="cyan" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                            {itemPieces} قطعة مختارة | {itemTotal.toLocaleString()} ج.م
                          </Tag>
                        )}
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveItem(it.key)}
                          title="حذف الصنف من الفاتورة"
                        >
                          حذف الصنف
                        </Button>
                      </Space>
                    </div>
                  }
                >
                  {it.loadingVariants ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Spin />
                      <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>جاري جلب تفاصيل المقاسات والألوان وأسعار الصنف...</div>
                    </div>
                  ) : !it.product_id ? (
                    <Alert
                      message="اختر الصنف من القائمة المنسدلة أعلاه لتظهر لك جميع ألوانه ومقاساته لتحديد الكميات وأسعار التكلفة والبيع."
                      type="info"
                      showIcon
                      style={{ margin: '8px 0' }}
                    />
                  ) : (
                    <div>
                      {/* Quick Batch Apply Toolbar if more than 1 variant */}
                      {it.variantRows.length > 1 && (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '8px 12px',
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8
                        }}>
                          <Space size="middle" wrap align="middle">
                            <Button
                              size="small"
                              type={allSelected ? 'default' : 'primary'}
                              ghost={!allSelected}
                              icon={allSelected ? <BorderOutlined /> : <CheckSquareOutlined />}
                              onClick={() => handleToggleSelectAll(it.key, !allSelected)}
                            >
                              {allSelected ? 'إلغاء تحديد الكل' : 'تحديد جميع المقاسات/الألوان'}
                            </Button>

                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: 12 }}>كمية موحدة:</Text>
                              <InputNumber
                                size="small"
                                min={0}
                                placeholder="الكمية"
                                value={it.batchQty}
                                onChange={(v) => handleBatchUpdate(it.key, 'batchQty', v)}
                                style={{ width: 80 }}
                              />
                              <Button
                                size="small"
                                onClick={() => handleApplyBatch(it.key, 'quantity', it.batchQty)}
                              >
                                تطبيق
                              </Button>
                            </Space>

                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: 12 }}>سعر تكلفة موحد:</Text>
                              <InputNumber
                                size="small"
                                min={0}
                                precision={2}
                                placeholder="التكلفة"
                                value={it.batchCost}
                                onChange={(v) => handleBatchUpdate(it.key, 'batchCost', v)}
                                style={{ width: 95 }}
                              />
                              <Button
                                size="small"
                                onClick={() => handleApplyBatch(it.key, 'unit_cost', it.batchCost)}
                              >
                                تطبيق
                              </Button>
                            </Space>

                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: 12 }}>سعر بيع موحد:</Text>
                              <InputNumber
                                size="small"
                                min={0}
                                precision={2}
                                placeholder="سعر البيع"
                                value={it.batchSelling}
                                onChange={(v) => handleBatchUpdate(it.key, 'batchSelling', v)}
                                style={{ width: 95 }}
                              />
                              <Button
                                size="small"
                                onClick={() => handleApplyBatch(it.key, 'selling_price', it.batchSelling)}
                              >
                                تطبيق
                              </Button>
                            </Space>
                          </Space>
                        </div>
                      )}

                      {/* Variants Matrix Table */}
                      <Table
                        size="small"
                        dataSource={it.variantRows}
                        pagination={false}
                        rowKey="key"
                        columns={[
                          {
                            title: 'تضمين',
                            key: 'enabled',
                            width: 60,
                            align: 'center',
                            render: (_, row) => (
                              <Checkbox
                                checked={row.enabled}
                                onChange={(e) => handleUpdateVariantRow(it.key, row.key, 'enabled', e.target.checked)}
                              />
                            )
                          },
                          ...(it.variantRows.some(r => r.variant_id) ? [
                            {
                              title: 'اللون',
                              dataIndex: 'color',
                              key: 'color',
                              width: 100,
                              render: (color, row) => row.enabled ? (
                                <Tag color="geekblue" style={{ fontSize: 12 }}>{color || 'عام'}</Tag>
                              ) : <Text type="secondary">{color || '—'}</Text>
                            },
                            {
                              title: 'المقاس',
                              dataIndex: 'size',
                              key: 'size',
                              width: 90,
                              render: (size, row) => row.enabled ? (
                                <Tag color="purple" style={{ fontSize: 12, fontWeight: 600 }}>{size || 'حر'}</Tag>
                              ) : <Text type="secondary">{size || '—'}</Text>
                            },
                            {
                              title: 'كود المتغير / SKU',
                              dataIndex: 'sku',
                              key: 'sku',
                              width: 150,
                              render: (sku) => sku ? <Text code style={{ fontSize: 11 }}>{sku}</Text> : <Text type="secondary">—</Text>
                            }
                          ] : [
                            {
                              title: 'اسم الصنف الأساسي',
                              key: 'single_name',
                              render: () => <Text strong>{it.product_name} (بدون متغيرات)</Text>
                            }
                          ]),
                          {
                            title: 'الكمية المشتراة',
                            dataIndex: 'quantity',
                            key: 'quantity',
                            width: 110,
                            render: (_, row) => (
                              <InputNumber
                                min={0}
                                disabled={!row.enabled}
                                value={row.quantity}
                                onChange={(val) => handleUpdateVariantRow(it.key, row.key, 'quantity', val || 0)}
                                style={{ width: '100%', fontWeight: 600 }}
                              />
                            )
                          },
                          {
                            title: 'سعر التكلفة (Cost)',
                            dataIndex: 'unit_cost',
                            key: 'unit_cost',
                            width: 140,
                            render: (_, row) => (
                              <InputNumber
                                min={0}
                                precision={2}
                                disabled={!row.enabled}
                                value={row.unit_cost}
                                onChange={(val) => handleUpdateVariantRow(it.key, row.key, 'unit_cost', val || 0)}
                                style={{ width: '100%' }}
                                addonAfter="ج.م"
                              />
                            )
                          },
                          {
                            title: 'سعر البيع النهائي (Selling)',
                            dataIndex: 'selling_price',
                            key: 'selling_price',
                            width: 140,
                            render: (_, row) => (
                              <InputNumber
                                min={0}
                                precision={2}
                                disabled={!row.enabled}
                                value={row.selling_price}
                                onChange={(val) => handleUpdateVariantRow(it.key, row.key, 'selling_price', val || 0)}
                                style={{ width: '100%', borderColor: '#16a34a' }}
                                addonAfter="ج.م"
                              />
                            )
                          },
                          {
                            title: 'نسبة الخصم %',
                            dataIndex: 'discount_pct',
                            key: 'discount_pct',
                            width: 95,
                            render: (_, row) => (
                              <InputNumber
                                min={0}
                                max={100}
                                disabled={!row.enabled}
                                value={row.discount_pct}
                                onChange={(val) => handleUpdateVariantRow(it.key, row.key, 'discount_pct', val || 0)}
                                style={{ width: '100%' }}
                              />
                            )
                          },
                          {
                            title: 'إجمالي السطر',
                            dataIndex: 'line_total',
                            key: 'line_total',
                            width: 120,
                            render: (val, row) => row.enabled ? (
                              <Text strong style={{ color: '#15803d' }}>
                                {(parseFloat(val) || 0).toLocaleString()} ج.م
                              </Text>
                            ) : (
                              <Text type="secondary">—</Text>
                            )
                          }
                        ]}
                      />


                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Row gutter={12} style={{ marginTop: 4, marginBottom: 8 }}>
            <Col xs={24} sm={14}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddItem}
                style={{ width: '100%', height: 42, borderColor: '#2563eb', color: '#2563eb', fontWeight: 600, borderRadius: 6 }}
              >
                + اختيار صنف / منتج مسجل بالفاتورة
              </Button>
            </Col>
            <Col xs={24} sm={10}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenMasterCreate(null)}
                style={{ width: '100%', height: 42, backgroundColor: '#7c3aed', borderColor: '#7c3aed', fontWeight: 600, borderRadius: 6 }}
              >
                ✨ إضافة صنف جديد للمنظومة والفاتورة
              </Button>
            </Col>
          </Row>

          {items.length > 0 && (
            <div style={{
              margin: '14px 0',
              padding: '12px 18px',
              background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <Space size="large" wrap>
                <Text strong style={{ color: '#065f46', fontSize: 13.5 }}>
                  📦 إجمالي الأصناف بالفاتورة: {items.filter(i => i.product_id).length} منتج
                </Text>
                <Text strong style={{ color: '#065f46', fontSize: 13.5 }}>
                  🔢 إجمالي عدد القطع المشتراة: {calculateTotalPieces()} قطعة
                </Text>
                <Text strong style={{ color: '#065f46', fontSize: 15 }}>
                  💰 إجمالي بضاعة المشتريات: {calculateSubtotal().toLocaleString()} ج.م
                </Text>
              </Space>

              <Button
                icon={<BarcodeOutlined />}
                onClick={handleOpenBarcodePrintFromCurrentDrawer}
                style={{ color: '#0f766e', borderColor: '#0f766e', background: '#ffffff', fontWeight: 700 }}
                disabled={!items.some(it => (it.variantRows || []).some(r => r.enabled && r.quantity > 0))}
              >
                🖨️ طباعة ملصقات الباركود للبضاعة
              </Button>
            </div>
          )}

          <Divider orientation="left" style={{ margin: '16px 0' }}>الإجماليات والمدفوعات (Totals & Multi-Tender)</Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="ملاحظات الفاتورة">
                <Input.TextArea
                  rows={4}
                  placeholder="ملاحظات الشحن أو الاستلام..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Form.Item>
            </Col>

            <Col span={14}>
              <Card size="small" style={{ background: '#f8fafc' }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Text type="secondary">المجموع الفرعي:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'left' }}>
                    <Text strong>{calculatedSubtotal.toLocaleString()} ج.م</Text>
                  </Col>

                  <Col span={12}>
                    <Text>قيمة الخصم الإجمالي:</Text>
                  </Col>
                  <Col span={12}>
                    <InputNumber
                      min={0}
                      value={discountTotal}
                      onChange={(v) => setDiscountTotal(v || 0)}
                      style={{ width: '100%' }}
                    />
                  </Col>

                  <Col span={12}>
                    <Text>تكلفة الشحن والتوصيل:</Text>
                  </Col>
                  <Col span={12}>
                    <InputNumber
                      min={0}
                      value={shippingCost}
                      onChange={(v) => setShippingCost(v || 0)}
                      style={{ width: '100%' }}
                    />
                  </Col>

                  <Col span={12}>
                    <Text>ضريبة القيمة المضافة:</Text>
                  </Col>
                  <Col span={12}>
                    <InputNumber
                      min={0}
                      value={taxTotal}
                      onChange={(v) => setTaxTotal(v || 0)}
                      style={{ width: '100%' }}
                    />
                  </Col>

                  <Divider style={{ margin: '8px 0' }} />

                  <Col span={12}>
                    <Title level={5} style={{ margin: 0 }}>الإجمالي النهائي المستحق:</Title>
                  </Col>
                  <Col span={12} style={{ textAlign: 'left' }}>
                    <Title level={5} style={{ margin: 0, color: '#2563eb' }}>
                      {calculatedFinal.toLocaleString()} ج.م
                    </Title>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '16px 0' }}>
            سداد الفاتورة المقسم (Split / Multi-tender Payment)
          </Divider>

          <SplitPayment
            targetAmount={calculatedFinal}
            value={splitPaymentBreakdown}
            onChange={(breakdown, total) => {
              setSplitPaymentBreakdown(breakdown);
              setPaidAmount(total);
            }}
            allowZero={true}
          />
        </Form>
      </Drawer>

      {/* ========================================================= */}
      {/* 2. STANDALONE PURCHASE RETURN INVOICE DRAWER (NEW)        */}
      {/* ========================================================= */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RollbackOutlined style={{ color: '#dc2626' }} />
            <span>فاتورة مرتجع مشتريات مستقلة (Standalone Purchase Return Invoice)</span>
          </div>
        }
        placement="left"
        width={1050}
        onClose={() => setIsStandaloneReturnOpen(false)}
        open={isStandaloneReturnOpen}
        extra={
          <Space>
            <Button onClick={() => setIsStandaloneReturnOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              danger
              loading={standaloneSubmitting}
              onClick={handleSubmitStandaloneReturn}
            >
              اعتماد فاتورة المرتجع وخصم المخزون
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Alert
            message="إرجاع بضاعة مستقل إلى المورد: يمكنك اختيار المورد ومستودع البضاعة ثم إضافة أي أصناف مباشرة بالبحث دون الحاجة لربطها بفاتورة شراء محددة."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="المورد المرتجع إليه" required>
                <Select
                  showSearch
                  placeholder="اختر المورد..."
                  value={standaloneSupplier}
                  onChange={setStandaloneSupplier}
                  filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
                >
                  {suppliersList.map(s => (
                    <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="المستودع المرتجع منه (Warehouse)" required>
                <Select
                  placeholder="اختر المستودع..."
                  value={standaloneBranch}
                  onChange={setStandaloneBranch}
                >
                  {branchesList.map(b => (
                    <Option key={b.id} value={b.id}>
                      {b.branch_name} {b.id === defaultBranchId ? '(الرئيسي الافتراضي)' : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="تاريخ المرتجع">
                <Input
                  type="date"
                  value={standaloneDate}
                  onChange={(e) => setStandaloneDate(e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '12px 0' }}>
            الأصناف المراد إرجاعها (Return Items Grid)
          </Divider>

          <Table
            size="small"
            dataSource={standaloneItems}
            pagination={false}
            columns={[
              {
                title: 'الصنف / المنتج',
                dataIndex: 'product_id',
                key: 'product_id',
                width: 380,
                render: (_, record) => (
                  <Select
                    showSearch
                    placeholder="ابحث واختر الصنف المراد إرجاعه..."
                    value={record.product_id}
                    onChange={(val) => handleUpdateStandaloneItem(record.key, 'product_id', val)}
                    style={{ width: '100%' }}
                    filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                    options={productsList
                      .filter(p => p.status === 'active' && p.category_id)
                      .map(p => ({
                        value: p.id,
                        label: `${p.category_name ? `[${p.category_name}] ` : ''}${p.product_name} (${p.product_code || p.barcode || 'لا يوجد كود'})`
                      }))}
                  />
                )
              },
              {
                title: 'الكمية المرتجعة',
                dataIndex: 'quantity',
                key: 'quantity',
                width: 130,
                render: (_, record) => (
                  <InputNumber
                    min={1}
                    value={record.quantity}
                    onChange={(val) => handleUpdateStandaloneItem(record.key, 'quantity', val || 1)}
                    addonAfter="قطعة"
                    style={{ width: '100%' }}
                  />
                )
              },
              {
                title: 'سعر التكلفة المحسوب للمرتجع',
                dataIndex: 'unit_cost',
                key: 'unit_cost',
                width: 170,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.unit_cost}
                    onChange={(val) => handleUpdateStandaloneItem(record.key, 'unit_cost', val || 0)}
                    style={{ width: '100%' }}
                    addonAfter="ج.م"
                  />
                )
              },
              {
                title: 'إجمالي السطر',
                dataIndex: 'line_total',
                key: 'line_total',
                width: 140,
                render: (val) => <Text strong style={{ color: '#dc2626' }}>{(parseFloat(val) || 0).toLocaleString()} ج.م</Text>
              },
              {
                title: '',
                key: 'actions',
                width: 50,
                render: (_, record) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveStandaloneItem(record.key)}
                  />
                )
              }
            ]}
          />

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddStandaloneItem}
            style={{ width: '100%', marginTop: 8 }}
          >
            إضافة صنف آخر للمرتجع
          </Button>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={10}>
              <Form.Item label="سبب الإرجاع / ملاحظات">
                <Input.TextArea
                  rows={4}
                  placeholder="سبب إرجاع البضاعة (مثال: أصناف معيبة، فائض مخزون، تالف توريد...)"
                  value={standaloneReason}
                  onChange={(e) => setStandaloneReason(e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Card size="small" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Text type="secondary">عدد الأصناف المرتجعة:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'left' }}>
                    <Text strong>{standaloneItems.filter(i => i.product_id).length} أصناف</Text>
                  </Col>

                  <Col span={12}>
                    <Text type="secondary">إجمالي عدد القطع:</Text>
                  </Col>
                  <Col span={12} style={{ textAlign: 'left' }}>
                    <Text strong>{standaloneItems.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0)} قطعة</Text>
                  </Col>

                  <Divider style={{ margin: '8px 0' }} />

                  <Col span={12}>
                    <Title level={5} style={{ margin: 0, color: '#dc2626' }}>إجمالي قيمة المرتجع:</Title>
                  </Col>
                  <Col span={12} style={{ textAlign: 'left' }}>
                    <Title level={4} style={{ margin: 0, color: '#dc2626' }}>
                      {calculatedStandaloneTotal.toLocaleString()} ج.م
                    </Title>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '16px 0' }}>
            سند الاسترداد المالي والتسوية (Refund Receipt Mechanism)
          </Divider>

          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>طريقة تسوية قيمة المرتجع:</Text>
              <Radio.Group
                value={standaloneRefundType}
                onChange={(e) => {
                  const val = e.target.value;
                  setStandaloneRefundType(val);
                  if (val === 'refund') {
                    setStandaloneRefundAmount(calculatedStandaloneTotal);
                    setStandaloneRefundBreakdown([{ method: 'cash', method_name: 'نقداً (خزينة)', amount: calculatedStandaloneTotal }]);
                  } else {
                    setStandaloneRefundAmount(0);
                    setStandaloneRefundBreakdown([]);
                  }
                }}
              >
                <Radio.Button value="credit">
                  خصم من مديونية المورد / إضافة كرصيد دائن بالحساب
                </Radio.Button>
                <Radio.Button value="refund" style={{ color: '#16a34a' }}>
                  استرداد مالي فوري من المورد (نقداً / تحويل / محفظة)
                </Radio.Button>
              </Radio.Group>
            </div>

            {standaloneRefundType === 'refund' ? (
              <div>
                <Alert
                  message="حدد المبالغ المستردة فعلياً من المورد عبر الخزينة، التحويل البنكي، أو المحفظة الإلكترونية:"
                  type="success"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <SplitPayment
                  targetAmount={calculatedStandaloneTotal}
                  value={standaloneRefundBreakdown}
                  onChange={(breakdown, total) => {
                    setStandaloneRefundBreakdown(breakdown);
                    setStandaloneRefundAmount(total);
                  }}
                  allowZero={false}
                />
              </div>
            ) : (
              <Alert
                message="سيتم خصم كامل قيمة المرتجع تلقائياً من كشف حساب المورد وتقليل المديونية."
                type="info"
                showIcon
              />
            )}
          </Card>
        </Form>
      </Drawer>

      {/* ========================================================= */}
      {/* 3. LINKED RETURN MODAL (FROM EXISTING INVOICE)           */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RollbackOutlined style={{ color: '#ef4444' }} />
            <span>إرجاع بضاعة من فاتورة مشتريات (Purchase Return Voucher)</span>
          </div>
        }
        open={linkedReturnOpen}
        onCancel={() => setLinkedReturnOpen(false)}
        width={960}
        footer={[
          <Button key="cancel" onClick={() => setLinkedReturnOpen(false)} disabled={linkedSubmitting}>
            إلغاء
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            icon={<RollbackOutlined />}
            loading={linkedSubmitting}
            onClick={handleSubmitLinkedReturn}
          >
            تأكيد واعتماد الإرجاع
          </Button>
        ]}
      >
        {linkedInvoice && (
          <div style={{ direction: 'rtl' }}>
            <Alert
              message={`فاتورة الشراء الأصلية: #${linkedInvoice.invoice_number} | المورد: ${linkedInvoice.supplier_name} | المستودع: ${linkedInvoice.warehouse_name}`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Card size="small" title="1. تحديد الأصناف والكميات المراد إرجاعها للمورد" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                dataSource={linkedItems}
                rowKey="purchase_item_id"
                pagination={false}
                columns={[
                  {
                    title: 'اسم الصنف',
                    dataIndex: 'product_name',
                    key: 'product_name',
                    render: (name, r) => (
                      <div>
                        <Text strong>{name}</Text>
                        <div style={{ fontSize: 12, color: '#64748b' }}>كود: {r.product_code || '—'}</div>
                      </div>
                    )
                  },
                  {
                    title: 'الكمية بالفاتورة',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 100,
                    render: (qty) => `${qty} قطعة`
                  },
                  {
                    title: 'سابق إرجاعه',
                    dataIndex: 'returned_quantity',
                    key: 'returned_quantity',
                    width: 100,
                    render: (qty) => (
                      <Tag color={qty > 0 ? 'orange' : 'default'}>{qty || 0} قطعة</Tag>
                    )
                  },
                  {
                    title: 'المتاح للإرجاع',
                    dataIndex: 'available_to_return',
                    key: 'available_to_return',
                    width: 110,
                    render: (qty) => (
                      <Tag color={qty > 0 ? 'green' : 'red'}>{qty} قطعة</Tag>
                    )
                  },
                  {
                    title: 'سعر التكلفة',
                    dataIndex: 'unit_cost',
                    key: 'unit_cost',
                    width: 110,
                    render: (cost) => `${parseFloat(cost).toLocaleString()} ج.م`
                  },
                  {
                    title: 'الكمية المراد إرجاعها',
                    key: 'return_qty',
                    width: 150,
                    render: (_, r, idx) => (
                      <InputNumber
                        min={0}
                        max={r.available_to_return}
                        value={r.return_qty}
                        disabled={r.available_to_return <= 0}
                        onChange={(val) => {
                          const newItems = [...linkedItems];
                          newItems[idx].return_qty = val || 0;
                          setLinkedItems(newItems);
                        }}
                        addonAfter="قطعة"
                        style={{ width: '100%' }}
                      />
                    )
                  },
                  {
                    title: 'قيمة المرتجع',
                    key: 'line_return_total',
                    width: 120,
                    render: (_, r) => {
                      const total = (r.return_qty || 0) * (parseFloat(r.unit_cost) || 0);
                      return <Text strong style={{ color: total > 0 ? '#ef4444' : 'inherit' }}>{total.toLocaleString()} ج.م</Text>;
                    }
                  }
                ]}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <div style={{ textAlign: 'left', background: '#fef2f2', padding: '10px 16px', borderRadius: 6, border: '1px solid #fecaca' }}>
                  <Text type="secondary">إجمالي قيمة البضاعة المرتجعة: </Text>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginLeft: 8 }}>
                    {calculatedLinkedTotal.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </Card>

            <Card size="small" title="2. سند الاسترداد المالي والتسوية (Refund Receipt Mechanism)" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>طريقة تسوية قيمة المرتجع:</Text>
                <Radio.Group
                  value={linkedRefundType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedRefundType(val);
                    if (val === 'refund') {
                      setLinkedRefundAmount(calculatedLinkedTotal);
                      setLinkedRefundBreakdown([{ method: 'cash', method_name: 'نقداً (خزينة)', amount: calculatedLinkedTotal }]);
                    } else {
                      setLinkedRefundAmount(0);
                      setLinkedRefundBreakdown([]);
                    }
                  }}
                >
                  <Radio.Button value="credit">
                    خصم من مديونية المورد / إضافة كرصيد دائن بالحساب
                  </Radio.Button>
                  <Radio.Button value="refund" style={{ color: '#16a34a' }}>
                    استرداد مالي فوري من المورد (نقداً / تحويل / محفظة)
                  </Radio.Button>
                </Radio.Group>
              </div>

              {linkedRefundType === 'refund' ? (
                <div>
                  <Alert
                    message="حدد المبالغ المستردة فعلياً من المورد عبر الخزينة، التحويل البنكي، أو المحفظة الإلكترونية:"
                    type="success"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                  <SplitPayment
                    targetAmount={calculatedLinkedTotal}
                    value={linkedRefundBreakdown}
                    onChange={(breakdown, total) => {
                      setLinkedRefundBreakdown(breakdown);
                      setLinkedRefundAmount(total);
                    }}
                  />
                </div>
              ) : (
                <Alert
                  message="سيتم خصم كامل قيمة المرتجع تلقائياً من كشف حساب المورد وتقليل المديونية."
                  type="info"
                  showIcon
                />
              )}

              <div style={{ marginTop: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>سبب الإرجاع / ملاحظات:</Text>
                <Input.TextArea
                  rows={2}
                  placeholder="مثال: أصناف معيبة، خطأ في المقاسات، تالف توريد..."
                  value={linkedReason}
                  onChange={(e) => setLinkedReason(e.target.value)}
                />
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* 4. VIEW PURCHASE INVOICE DETAILS MODAL & PRINT           */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%' }}>
            <span>تفاصيل فاتورة المشتريات: {selectedInvoice?.invoice_number || ''}</span>
            <Space>
              <Button
                icon={<BarcodeOutlined />}
                onClick={() => handleOpenBarcodePrintFromInvoice(selectedInvoice)}
                style={{ color: '#0f766e', borderColor: '#0f766e' }}
              >
                طباعة باركود البضاعة
              </Button>
              <Button
                danger
                icon={<RollbackOutlined />}
                onClick={() => {
                  setDetailsOpen(false);
                  handleOpenLinkedReturnModal(selectedInvoice);
                }}
              >
                إرجاع للمورد
              </Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrintInvoice}
              >
                طباعة الفاتورة
              </Button>
            </Space>
          </div>
        }
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsOpen(false)}>إغلاق</Button>,
          <Button
            key="barcode"
            icon={<BarcodeOutlined />}
            onClick={() => handleOpenBarcodePrintFromInvoice(selectedInvoice)}
            style={{ color: '#0f766e', borderColor: '#0f766e' }}
          >
            طباعة ملصقات الباركود
          </Button>,
          <Button
            key="return"
            danger
            icon={<RollbackOutlined />}
            onClick={() => {
              setDetailsOpen(false);
              handleOpenLinkedReturnModal(selectedInvoice);
            }}
          >
            إرجاع للمورد
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintInvoice}>
            طباعة الفاتورة
          </Button>
        ]}
        width={880}
      >
        {selectedInvoice && (
          <div ref={printAreaRef} className="printable-invoice" style={{ direction: 'rtl', padding: '6px' }}>
            {/* Branded Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>إدارة المستودعات وسلاسل الإمداد • قسم المشتريات والتوريدات</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>منظومة إدارة سلاسل التوريد والمخازن (Yoka SWM)</div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  فاتورة استلام وتوريد بضاعة
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  رقم الفاتورة: <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13.5 }}>{selectedInvoice.invoice_number}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  تاريخ التوريد: {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>

            {/* Metadata Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <Row gutter={[16, 10]}>
                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>بيانات المورد:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedInvoice.supplier_name} ({selectedInvoice.supplier_code})
                  </div>
                  {selectedInvoice.supplier_phone && (
                    <div style={{ fontSize: 11, color: '#475569' }}>هاتف: {selectedInvoice.supplier_phone}</div>
                  )}
                  {selectedInvoice.supplier_address && (
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>العنوان: {selectedInvoice.supplier_address}</div>
                  )}
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>المستودع والاستلام:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedInvoice.warehouse_name || 'المستودع الرئيسي'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    المستلم / المسؤول: {selectedInvoice.created_by_name || 'مسؤول المشتريات'}
                  </div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                    الحالة: معتمدة وموردة للمخزون
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>حالة وطريقة السداد:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: selectedInvoice.payment_status === 'paid' ? '#16a34a' : (selectedInvoice.payment_status === 'partial' ? '#d97706' : '#dc2626'), marginTop: 2 }}>
                    {selectedInvoice.payment_status === 'paid' ? 'مسدد بالكامل' : (selectedInvoice.payment_status === 'partial' ? 'مسدد جزئياً' : 'آجل بالكامل')}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    طريقة السداد: {selectedInvoice.payment_method === 'split' ? 'سداد مقسم (Multi-tender)' : (selectedInvoice.payment_method || 'نقدي')}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Items Table */}
            <table
              className="print-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '11px',
                marginBottom: 12
              }}
            >
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '30px', textAlign: 'center' }}>م</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'center' }}>كود الصنف</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>اسم المنتج والمواصفات</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '75px', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '70px', textAlign: 'center' }}>مرتجع</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'left' }}>سعر التكلفة</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'left' }}>سعر البيع</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '100px', textAlign: 'left' }}>إجمالي السطر</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.items || []).map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1'
                    }}
                  >
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.product_code || item.variant_sku || '-'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', color: parseInt(item.returned_quantity, 10) > 0 ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
                      {parseInt(item.returned_quantity, 10) > 0 ? `${item.returned_quantity}` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace' }}>
                      {parseFloat(item.unit_cost).toLocaleString()} ج.م
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                      {item.selling_price ? `${parseFloat(item.selling_price).toLocaleString()} ج.م` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, fontFamily: 'monospace' }}>
                      {parseFloat(item.line_total).toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    إجمالي الكميات الموردة:
                  </td>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', color: '#16a34a' }}>
                    {(selectedInvoice.items || []).reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 0), 0)} قطعة
                  </td>
                  <td colSpan={3} style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    المجموع قبل الضرائب والخصم:
                  </td>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace' }}>
                    {parseFloat(selectedInvoice.subtotal).toLocaleString()} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Split Payment Breakdown if available */}
            {selectedInvoice.payment_breakdown && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  تفاصيل السداد المقسم (Multi-Tender Payments):
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Array.isArray(selectedInvoice.payment_breakdown)
                    ? selectedInvoice.payment_breakdown
                    : typeof selectedInvoice.payment_breakdown === 'string'
                    ? JSON.parse(selectedInvoice.payment_breakdown)
                    : []
                  ).map((b, idx) => (
                    <span key={idx} style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#15803d' }}>
                      {b.method_name || b.method}: <strong>{parseFloat(b.amount).toLocaleString()} ج.م</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary & Signatures Row */}
            <Row gutter={16}>
              <Col span={14}>
                {selectedInvoice.notes && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>ملاحظات الفاتورة:</div>
                    <div style={{ fontSize: 11.5, color: '#334155', marginTop: 2 }}>{selectedInvoice.notes}</div>
                  </div>
                )}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                  <div style={{ fontSize: 10.5, color: '#475569' }}>
                    <strong>إقرار استلام:</strong> يُقر المستلم بأن البضاعة المذكورة قد تم فحصها واستلامها وإضافتها إلى رصيد المخزن بموجب هذا السند.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 8, borderTop: '1px dashed #94a3b8' }}>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', marginBottom: 20 }}>توقيع أمين المستودع</div>
                      <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10, color: '#64748b' }}>........................</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', marginBottom: 20 }}>اعتماد إدارة المشتريات</div>
                      <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10, color: '#64748b' }}>........................</div>
                    </div>
                  </div>
                </div>
              </Col>

              <Col span={10}>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#475569' }}>
                    <span>المجموع الفرعي:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{parseFloat(selectedInvoice.subtotal).toLocaleString()} ج.م</span>
                  </div>
                  {parseFloat(selectedInvoice.discount_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#b91c1c' }}>
                      <span>الخصم الممنوح:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-{parseFloat(selectedInvoice.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {parseFloat(selectedInvoice.shipping_cost) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#475569' }}>
                      <span>مصاريف الشحن:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+{parseFloat(selectedInvoice.shipping_cost).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {parseFloat(selectedInvoice.tax_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#475569' }}>
                      <span>ضريبة القيمة المضافة:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+{parseFloat(selectedInvoice.tax_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #0f172a', marginTop: 6, paddingTop: 6, fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>
                    <span>الإجمالي النهائي:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 15 }}>{parseFloat(selectedInvoice.final_amount).toLocaleString()} ج.م</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: '#16a34a', fontWeight: 700 }}>
                    <span>المبلغ المسدد:</span>
                    <span style={{ fontFamily: 'monospace' }}>{parseFloat(selectedInvoice.paid_amount || 0).toLocaleString()} ج.م</span>
                  </div>
                  {parseFloat(selectedInvoice.final_amount) - parseFloat(selectedInvoice.paid_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: '#dc2626', fontWeight: 800 }}>
                      <span>المتبقي آجل للمورد:</span>
                      <span style={{ fontFamily: 'monospace' }}>
                        {(parseFloat(selectedInvoice.final_amount) - parseFloat(selectedInvoice.paid_amount || 0)).toLocaleString()} ج.م
                      </span>
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {/* Verification Footer */}
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>مستند رسمي صادر عن منظومة إدارة المخازن والمشتريات Yoka SWM</span>
              <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* 5. VIEW RETURN DETAILS MODAL & PRINT VOUCHER             */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%' }}>
            <span>إشعار مرتجع مشتريات للمورد: {selectedReturn?.return_number || ''}</span>
            <Button
              type="primary"
              danger
              icon={<PrinterOutlined />}
              onClick={handlePrintReturn}
            >
              طباعة إشعار المرتجع
            </Button>
          </div>
        }
        open={returnDetailsOpen}
        onCancel={() => setReturnDetailsOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReturnDetailsOpen(false)}>إغلاق</Button>,
          <Button key="print" type="primary" danger icon={<PrinterOutlined />} onClick={handlePrintReturn}>
            طباعة إشعار المرتجع
          </Button>
        ]}
        width={880}
      >
        {selectedReturn && (
          <div ref={printReturnAreaRef} className="printable-return" style={{ direction: 'rtl', padding: '6px' }}>
            {/* Branded Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dc2626', paddingBottom: 12, marginBottom: 14 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#dc2626' }}>شركة يوكا ستور — إشعار مرتجع مشتريات</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>إدارة المستودعات وسلاسل الإمداد • سند خصم من المخزون وإرجاع للمورد</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>منظومة إدارة المخازن المركزية Yoka SWM</div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  إشعار مرتجع مشتريات
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  رقم الإشعار: <strong style={{ fontFamily: 'monospace', color: '#dc2626', fontSize: 13.5 }}>{selectedReturn.return_number}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  تاريخ الإرجاع: {new Date(selectedReturn.return_date).toLocaleDateString('ar-EG')}
                </div>
                {selectedReturn.invoice_ref ? (
                  <div style={{ fontSize: 10.5, color: '#475569', marginTop: 1 }}>
                    الفاتورة الأصلية: <strong style={{ fontFamily: 'monospace' }}>#{selectedReturn.invoice_ref}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: '#7c3aed', fontWeight: 600, marginTop: 1 }}>
                    مرتجع مستقل (بدون فاتورة سابقة)
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Card */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <Row gutter={[16, 10]}>
                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#991b1b', fontWeight: 700 }}>بيانات المورد:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedReturn.supplier_name} ({selectedReturn.supplier_code})
                  </div>
                  {selectedReturn.supplier_phone && (
                    <div style={{ fontSize: 11, color: '#475569' }}>هاتف: {selectedReturn.supplier_phone}</div>
                  )}
                  {selectedReturn.supplier_address && (
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>العنوان: {selectedReturn.supplier_address}</div>
                  )}
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#991b1b', fontWeight: 700 }}>المستودع والإجراء:</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                    {selectedReturn.warehouse_name || 'المستودع الرئيسي'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    المسؤول: {selectedReturn.created_by_name || 'مسؤول المخزن'}
                  </div>
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>
                    الحالة: تم الخصم من المخزون وإرجاع البضاعة
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#991b1b', fontWeight: 700 }}>التسوية المالية:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: parseFloat(selectedReturn.refund_amount) > 0 ? '#16a34a' : '#2563eb', marginTop: 2 }}>
                    {parseFloat(selectedReturn.refund_amount) > 0 ? 'استرداد مالي مستلم' : 'خصم من مديونية المورد'}
                  </div>
                  {parseFloat(selectedReturn.refund_amount) > 0 && (
                    <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                      المبلغ المسترد: <strong>{parseFloat(selectedReturn.refund_amount).toLocaleString()} ج.م</strong>
                    </div>
                  )}
                </Col>
              </Row>
            </div>

            {/* Items Table */}
            <table
              className="print-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '11px',
                marginBottom: 12
              }}
            >
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '30px', textAlign: 'center' }}>م</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '120px', textAlign: 'center' }}>كود المنتج</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>اسم الصنف المرتجع ومواصفاته</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'center' }}>الكمية المرتجعة</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '100px', textAlign: 'left' }}>سعر التكلفة</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'left' }}>إجمالي القيمة</th>
                </tr>
              </thead>
              <tbody>
                {(selectedReturn.items || []).map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1'
                    }}
                  >
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.product_code || item.variant_sku || '-'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace', fontSize: '12px' }}>
                      {item.quantity} قطعة
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace' }}>
                      {parseFloat(item.unit_cost).toLocaleString()} ج.م
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                      {parseFloat(item.line_total).toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    إجمالي الكميات المرتجعة:
                  </td>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', color: '#dc2626' }}>
                    {(selectedReturn.items || []).reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 0), 0)} قطعة
                  </td>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    إجمالي قيمة المرتجع:
                  </td>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#dc2626' }}>
                    {parseFloat(selectedReturn.total_amount).toLocaleString()} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Refund Payment Breakdown if available */}
            {parseFloat(selectedReturn.refund_amount) > 0 && selectedReturn.payment_breakdown && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  تفاصيل المبالغ المستردة نقداً وحوالات (Refund Receipts):
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Array.isArray(selectedReturn.payment_breakdown)
                    ? selectedReturn.payment_breakdown
                    : typeof selectedReturn.payment_breakdown === 'string'
                    ? JSON.parse(selectedReturn.payment_breakdown)
                    : []
                  ).map((b, idx) => (
                    <span key={idx} style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#15803d' }}>
                      {b.method_name || b.method}: <strong>{parseFloat(b.amount).toLocaleString()} ج.م</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary & Signatures Row */}
            <Row gutter={16}>
              <Col span={14}>
                {selectedReturn.reason && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>سبب الإرجاع:</div>
                    <div style={{ fontSize: 11.5, color: '#334155', marginTop: 2 }}>{selectedReturn.reason}</div>
                  </div>
                )}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', background: '#f8fafc' }}>
                  <div style={{ fontSize: 10.5, color: '#475569' }}>
                    <strong>إقرار تسليم وإرجاع:</strong> يُقر مندوب المورد باستلام الأصناف المذكورة أعلاه بحالة مطابقة وسليمة، وتمت التسوية المالية بالخصم أو الاسترداد المالي.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 8, borderTop: '1px dashed #94a3b8' }}>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', marginBottom: 20 }}>توقيع أمين المستودع المسلِم</div>
                      <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10, color: '#64748b' }}>........................</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', marginBottom: 20 }}>توقيع مندوب المورد المستلِم</div>
                      <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10, color: '#64748b' }}>........................</div>
                    </div>
                  </div>
                </div>
              </Col>

              <Col span={10}>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px', fontWeight: 900, color: '#dc2626' }}>
                    <span>إجمالي قيمة المرتجع:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 15 }}>{parseFloat(selectedReturn.total_amount).toLocaleString()} ج.م</span>
                  </div>
                  {parseFloat(selectedReturn.refund_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: '#16a34a', fontWeight: 700 }}>
                      <span>المسترد نقداً / حوالات:</span>
                      <span style={{ fontFamily: 'monospace' }}>{parseFloat(selectedReturn.refund_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: '#2563eb', fontWeight: 800 }}>
                    <span>المخصوم من رصيد المورد:</span>
                    <span style={{ fontFamily: 'monospace' }}>
                      {(parseFloat(selectedReturn.total_amount) - parseFloat(selectedReturn.refund_amount || 0)).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Verification Footer */}
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>إشعار مرتجع رسمي صادر عن منظومة سلاسل الإمداد Yoka SWM</span>
              <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: QUICK ADD VARIANT (COLOR / SIZE) TO PRODUCT        */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <TagsOutlined style={{ color: '#0284c7' }} />
            <span>إضافة لون أو مقاس جديد للصنف: {quickVariantModalItem?.product_name}</span>
          </Space>
        }
        open={Boolean(quickVariantModalItem)}
        onCancel={() => {
          setQuickVariantModalItem(null);
          quickVariantForm.resetFields();
        }}
        onOk={handleSaveQuickVariant}
        confirmLoading={quickVariantSubmitting}
        okText="حفظ وإضافة إلى الفاتورة"
        cancelText="إلغاء"
        destroyOnHidden
        width={550}
      >
        <Alert
          type="info"
          showIcon
          message="سيتم حفظ هذا المتغير (اللون/المقاس) تلقائياً على بطاقة الصنف الأصلية (Master Product) وسيظهر متاحاً في النظام وفي الفاتورة الحالية."
          style={{ marginBottom: 16 }}
        />
        <Form form={quickVariantForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="color"
                label={
                  <Space>
                    <BgColorsOutlined style={{ color: '#7c3aed' }} />
                    <span>اللون:</span>
                  </Space>
                }
              >
                <Select
                  placeholder="اختر لوناً أو اكتب جديداً..."
                  allowClear
                  showSearch
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '0 8px 4px' }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            placeholder="لون جديد..."
                            value={quickNewColorInput}
                            onChange={(e) => setQuickNewColorInput(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="color"
                            value={quickNewColorCode}
                            onChange={(e) => setQuickNewColorCode(e.target.value)}
                            style={{ width: 34, height: 32, padding: 2, cursor: 'pointer', border: '1px solid #d9d9d9' }}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={async () => {
                              if (!quickNewColorInput.trim()) return;
                              await handleQuickAddColorInline(quickNewColorInput.trim(), quickNewColorCode);
                              quickVariantForm.setFieldsValue({ color: quickNewColorInput.trim() });
                              setQuickNewColorInput('');
                            }}
                            style={{ backgroundColor: '#7c3aed' }}
                          >
                            إضافة
                          </Button>
                        </Space.Compact>
                      </div>
                    </>
                  )}
                >
                  {colorsList.map(c => (
                    <Option key={c.id} value={c.name}>
                      <Space align="middle">
                        <span
                          style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
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
                    <span>المقاس / الحجم:</span>
                  </Space>
                }
              >
                <Select
                  placeholder="اختر مقاساً أو اكتب جديداً..."
                  allowClear
                  showSearch
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                        <Input
                          placeholder="مقاس جديد (مثل: 5XL أو 42)..."
                          value={quickNewSizeInput}
                          onChange={(e) => setQuickNewSizeInput(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{ minWidth: 140 }}
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={async () => {
                            if (!quickNewSizeInput.trim()) return;
                            await handleQuickAddSizeInline(quickNewSizeInput.trim());
                            quickVariantForm.setFieldsValue({ size: quickNewSizeInput.trim() });
                            setQuickNewSizeInput('');
                          }}
                          style={{ backgroundColor: '#0284c7' }}
                        >
                          إضافة
                        </Button>
                      </Space>
                    </>
                  )}
                >
                  {sizesList.map(s => (
                    <Option key={s.id} value={s.name}>
                      <Tag color="blue">{s.name}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="الكمية المشتراة"
                rules={[{ required: true, message: 'مطلوب' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_cost"
                label="سعر التكلفة"
                rules={[{ required: true, message: 'مطلوب' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} addonAfter="ج.م" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="selling_price"
                label="سعر البيع المقترح"
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} addonAfter="ج.م" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: BARCODE LABELS PRINT (THERMAL ROLLS & A4 SHEETS)   */}
      {/* ========================================================= */}
      <BarcodePrintModal
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        itemsData={barcodeModalItems}
      />

      {/* ========================================================= */}
      {/* MODAL: MASTER PRODUCT MANAGEMENT (CREATE & EDIT MODES)    */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '96%' }}>
            <Space>
              {masterProductMode === 'create' ? (
                <>
                  <PlusOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                    إضافة صنف جديد تماماً إلى النظام وإدراجه بالفاتورة
                  </span>
                </>
              ) : (
                <>
                  <EditOutlined style={{ color: '#2563eb', fontSize: 18 }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                    تعديل بطاقة الصنف بالمجموعات والأصناف: {editingMasterProduct?.product_name || ''}
                  </span>
                </>
              )}
            </Space>
          </div>
        }
        open={masterProductModalOpen}
        onCancel={() => {
          setMasterProductModalOpen(false);
          setEditingMasterProduct(null);
          masterProductForm.resetFields();
        }}
        onOk={handleSaveMasterProduct}
        confirmLoading={masterProductSubmitting}
        okText={masterProductMode === 'create' ? 'حفظ الصنف وإدراجه بالفاتورة' : 'حفظ وتحديث بيانات الصنف'}
        cancelText="إلغاء"
        destroyOnHidden
        width={780}
      >
        <Form
          form={masterProductForm}
          layout="vertical"
          onValuesChange={handleMasterValuesChange}
        >
          {/* 1. Barcode and Code Auto-Generation Row */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col xs={24} sm={10}>
                <Form.Item
                  name="product_code"
                  label={<Text strong style={{ fontSize: 12.5 }}>كود الصنف (Item Code)</Text>}
                  rules={[{ required: true, message: 'مطلوب' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    readOnly={masterProductMode === 'edit'}
                    addonAfter={
                      masterProductMode === 'create' ? (
                        <Tooltip title="توليد كود تلقائي">
                          <Button
                            type="link"
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={handleRegenerateMasterCodes}
                            style={{ padding: 0, height: 'auto' }}
                          />
                        </Tooltip>
                      ) : null
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item
                  name="barcode"
                  label={<Text strong style={{ fontSize: 12.5 }}>الباركود الدولي (EAN-13)</Text>}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    addonAfter={
                      masterProductMode === 'create' ? (
                        <Tooltip title="توليد باركود EAN-13 متوافق">
                          <Button
                            type="link"
                            size="small"
                            onClick={() => masterProductForm.setFieldsValue({ barcode: generateValidEAN13('622') })}
                            style={{ padding: 0, height: 'auto', fontWeight: 600 }}
                          >
                            توليد
                          </Button>
                        </Tooltip>
                      ) : null
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                <div style={{ paddingTop: 18 }}>
                  <BarcodeImage
                    barcode={watchedMasterBarcode || masterAutoBarcode || '6221234567890'}
                    height={28}
                    width={1.1}
                    displayValue={false}
                  />
                </div>
              </Col>
            </Row>
          </div>

          {/* 2. Names and Categories */}
          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="product_name"
                label="اسم الصنف (Product Name)"
                rules={[{ required: true, message: 'يرجى إدخال اسم الصنف' }]}
              >
                <Input placeholder="اسم الصنف (مثل: LV، قميص أكسفورد، كوتشي نايك...)" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item name="brand" label="الماركة / البراند">
                <Input placeholder="Yoka Store" />
              </Form.Item>
            </Col>
          </Row>

          {/* Category Selector with Inline Creation */}
          <Form.Item
            name="category_id"
            label="المجموعة / القسم التابع له الصنف"
            rules={[{ required: true, message: 'يرجى اختيار المجموعة' }]}
          >
            <Select
              placeholder="اختر المجموعة أو أنشئ مجموعة جديدة فوراً بالأسفل..."
              showSearch
              filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                    <Input
                      placeholder="اسم مجموعة جديدة..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      style={{ minWidth: 200 }}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      loading={creatingCategoryInline}
                      onClick={handleQuickAddCategoryInMaster}
                      style={{ backgroundColor: '#5b21b6' }}
                    >
                      إضافة المجموعة
                    </Button>
                  </Space>
                </>
              )}
            >
              {categoriesList.map(c => (
                <Option key={c.id} value={c.id}>📁 {c.category_name}</Option>
              ))}
            </Select>
          </Form.Item>

          {/* 3. VARIANT OPTIONS (SINGLE VS MULTI-VARIANT) - MATCHING IMAGE 1 */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text strong style={{ color: '#334155', fontSize: 13.5 }}>
                خيارات وتنوع الصنف (طريقة إدارة الألوان والمقاسات):
              </Text>
              <Tag color={masterVariantMode === 'multi' ? 'purple' : 'default'} style={{ fontWeight: 600 }}>
                {masterVariantMode === 'multi' ? 'وضع المقاسات والألوان المتعددة (Multi-Variants)' : 'صنف بسيط'}
              </Tag>
            </div>

            <Radio.Group
              value={masterVariantMode}
              onChange={(e) => setMasterVariantMode(e.target.value)}
              style={{ width: '100%' }}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      border: masterVariantMode === 'single' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      backgroundColor: masterVariantMode === 'single' ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onClick={() => setMasterVariantMode('single')}
                  >
                    <Radio value="single">
                      <Text strong style={{ color: masterVariantMode === 'single' ? '#6d28d9' : '#475569' }}>
                        1. صنف بسيط (لون ومقاس محدد فقط)
                      </Text>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                        يناسب الأصناف التي لا تحتوي على تشكيلة مقاسات أو ألوان (مثل: شنطة لون أسود مقاس موحد، أو إكسسوار محدد).
                      </div>
                    </Radio>
                  </Card>
                </Col>

                <Col xs={24} sm={12}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      border: masterVariantMode === 'multi' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      backgroundColor: masterVariantMode === 'multi' ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onClick={() => setMasterVariantMode('multi')}
                  >
                    <Radio value="multi">
                      <Text strong style={{ color: masterVariantMode === 'multi' ? '#6d28d9' : '#475569' }}>
                        2. صنف متعدد الألوان والمقاسات (Multi-Variants)
                      </Text>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                        توليد شبكة متكاملة من الألوان والمقاسات تلقائياً (مثل: قميص متوفر بـ 3 ألوان و 4 مقاسات = توليد 12 تركيبة وربط صورة لكل لون).
                      </div>
                    </Radio>
                  </Card>
                </Col>
              </Row>
            </Radio.Group>
          </div>

          {/* 4. DYNAMIC VARIANT INPUTS (SINGLE VS MULTI) - MATCHING IMAGE 1 */}
          {masterVariantMode === 'multi' ? (
            <div style={{ backgroundColor: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <Text strong style={{ color: '#5b21b6', display: 'block', marginBottom: 10, fontSize: 13.5 }}>
                <Space>
                  <TagsOutlined />
                  <span>تحديد المقاسات والألوان المتعددة لهذا الصنف:</span>
                </Space>
              </Text>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space>
                        <BgColorsOutlined style={{ color: '#7c3aed' }} />
                        <Text strong style={{ color: '#6d28d9' }}>الألوان المتاحة (Multiple Colors):</Text>
                      </Space>
                    }
                    required
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      mode="multiple"
                      placeholder="حدد ألوان الصنف..."
                      value={masterSelectedMultiColors}
                      onChange={setMasterSelectedMultiColors}
                      allowClear
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
                                onClick={handleQuickAddColorInMaster}
                                style={{ backgroundColor: '#7c3aed' }}
                              >
                                إضافة
                              </Button>
                            </Space.Compact>
                          </div>
                        </>
                      )}
                    >
                      {colorsList.map(c => (
                        <Option key={c.id} value={c.name}>
                          <Space align="middle">
                            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: c.code || '#000', border: '1px solid #cbd5e1' }} />
                            <span>{c.name}</span>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space>
                        <ColumnWidthOutlined style={{ color: '#0284c7' }} />
                        <Text strong style={{ color: '#0369a1' }}>المقاسات المتاحة (Multiple Sizes):</Text>
                      </Space>
                    }
                    required
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      mode="multiple"
                      placeholder="حدد مقاسات الصنف..."
                      value={masterSelectedMultiSizes}
                      onChange={setMasterSelectedMultiSizes}
                      allowClear
                      style={{ width: '100%' }}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                            <Input
                              placeholder="مقاس جديد (مثل: 4XL)..."
                              value={newSizeInput}
                              onChange={(e) => setNewSizeInput(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              style={{ minWidth: 140 }}
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              loading={creatingSizeInline}
                              onClick={handleQuickAddSizeInMaster}
                              style={{ backgroundColor: '#0284c7' }}
                            >
                              إضافة
                            </Button>
                          </Space>
                        </>
                      )}
                    >
                      {sizesList.map(s => (
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
                <Form.Item name="color" label="اللون (Color)">
                  <Select
                    placeholder="اختر لون الصنف..."
                    allowClear
                    showSearch
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
                              onClick={handleQuickAddColorInMaster}
                              style={{ backgroundColor: '#7c3aed' }}
                            >
                              إضافة
                            </Button>
                          </Space.Compact>
                        </div>
                      </>
                    )}
                  >
                    {colorsList.map(c => (
                      <Option key={c.id} value={c.name}>
                        <Space align="middle">
                          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: c.code || '#000', border: '1px solid #cbd5e1' }} />
                          <span>{c.name}</span>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="size" label="المقاس (Size)">
                  <Select
                    placeholder="اختر المقاس..."
                    allowClear
                    showSearch
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                          <Input
                            placeholder="مقاس جديد..."
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            style={{ minWidth: 140 }}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            loading={creatingSizeInline}
                            onClick={handleQuickAddSizeInMaster}
                            style={{ backgroundColor: '#0284c7' }}
                          >
                            إضافة
                          </Button>
                        </Space>
                      </>
                    )}
                  >
                    {sizesList.map(s => (
                      <Option key={s.id} value={s.name}>
                        <Tag color="blue" style={{ fontWeight: 600 }}>{s.name}</Tag>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* 5. DEDICATED IMAGE FOR EACH COLOR - EXACT MATCH WITH IMAGE 1 */}
          {activeMasterColors.length > 0 && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <Space align="middle">
                  <PictureOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                  <Text strong style={{ color: '#15803d', fontSize: 14 }}>
                    صور ألوان الصنف (صورة مخصصة لكل لون):
                  </Text>
                </Space>
                <Tag color={activeMasterColors.every(c => masterColorImages[c]) ? 'green' : 'blue'}>
                  {activeMasterColors.filter(c => masterColorImages[c]).length} من {activeMasterColors.length} ألوان تم تحديد صورها
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12, color: '#166534' }}>
                💡 يمكنك رفع صورة خاصة لكل لون من جهازك أو لصق رابط مباشر للصورة. ستظهر الصورة تلقائياً في المتجر والكتالوج عند اختيار اللون.
              </Text>

              <Row gutter={[12, 12]}>
                {activeMasterColors.map(colName => {
                  const colObj = colorsList.find(c => c.name === colName);
                  const hasImg = Boolean(masterColorImages[colName]);
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
                        {/* Thumbnail on Right */}
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
                              src={masterColorImages[colName]}
                              alt={colName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <CameraOutlined style={{ fontSize: 24, color: '#94a3b8' }} />
                          )}
                        </div>

                        {/* Details and Actions on Left */}
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
                                  setMasterColorImages(prev => {
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

                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Upload
                              beforeUpload={(file) => {
                                handleCompressFile(file, (dataUrl) => {
                                  setMasterColorImages(prev => ({ ...prev, [colName]: dataUrl }));
                                  message.success(`تم حفظ صورة لون "${colName}" بنجاح!`);
                                });
                                return false;
                              }}
                              showUploadList={false}
                              accept="image/*"
                            >
                              <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }}>
                                {hasImg ? 'تغيير' : 'رفع صورة'}
                              </Button>
                            </Upload>
                            {hasImg && (
                              <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                                صورة مرفوعة
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}


        </Form>
      </Modal>
    </div>
  );
}
