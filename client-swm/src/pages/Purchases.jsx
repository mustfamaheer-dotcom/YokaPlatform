import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home as HomeIcon,
  Keyboard,
  Search,
  Zap,
  Building2,
  Package,
  Hash,
  Coins,
  Folder,
  Lightbulb,
  Sparkles,
  Plus
} from 'lucide-react';
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
  CheckOutlined,
  MinusOutlined,
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invoices');

  // Invoices List State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 });

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
  const [returnsPagination, setReturnsPagination] = useState({ current: 1, pageSize: 1000, total: 0 });

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

  // 3. F1 Product Search & Picker Modal State (POS-Style)
  const [f1ModalOpen, setF1ModalOpen] = useState(false);
  const [f1SearchTarget, setF1SearchTarget] = useState('invoice'); // 'invoice' | 'return'
  const [f1TargetItemKey, setF1TargetItemKey] = useState(null);
  const [f1SearchQuery, setF1SearchQuery] = useState('');
  const [f1CategoryFilter, setF1CategoryFilter] = useState('all');
  const [f1SearchResults, setF1SearchResults] = useState([]);
  const [f1Loading, setF1Loading] = useState(false);
  const f1SearchInputRef = useRef(null);

  // POS Direct Barcode Station & Row Input Refs
  const [topBarcodeInput, setTopBarcodeInput] = useState('');
  const topBarcodeInputRef = useRef(null);
  const manualRowInputRefs = useRef({});
  const manualReturnRowInputRefs = useRef({});

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
        api.get('/api/swm/suppliers', { params: { limit: 200 } }),
        api.get('/api/swm/branches'),
        api.get('/api/swm/products', { params: { limit: 5000, status: 'active', has_category: 'true' } }),
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
      const res = await api.get('/api/swm/products', { params: { limit: 5000, status: 'active', has_category: 'true' } });
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
    return items.filter(it => !it.isManualRow).reduce((sum, it) => {
      return sum + (parseFloat(it.line_total) || 0);
    }, 0);
  };

  const calculateTotalPieces = () => {
    return items.filter(it => !it.isManualRow).reduce((sum, it) => {
      return sum + (parseInt(it.quantity, 10) || 0);
    }, 0);
  };

  const calculatedSubtotal = calculateSubtotal();
  const calculatedFinal = Math.max(
    0,
    calculatedSubtotal - (parseFloat(discountTotal) || 0) + (parseFloat(taxTotal) || 0) + (parseFloat(shippingCost) || 0)
  );

  // Step 1 [F11]: Add empty row for manual typing or barcode scan
  const handleAddItem = () => {
    const newKey = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setItems(prev => [
      ...prev,
      {
        key: newKey,
        isManualRow: true,
        product_id: null,
        variant_id: null,
        product_name: '',
        product_code: '',
        barcode: '',
        color: null,
        size: null,
        display_name: '',
        category_name: '',
        quantity: 1,
        unit_cost: 0,
        selling_price: 0,
        discount_pct: 0,
        line_total: 0
      }
    ]);
    message.info('سطر جديد [F11]: اكتب الباركود واضغط Enter، أو اضغط F1 للبحث بالمجاميع');
    setTimeout(() => {
      manualRowInputRefs.current[newKey]?.focus();
    }, 100);
  };

  // Populate product / variant into specified row
  const populateProductIntoRow = (rowKey, prod) => {
    const cost = parseFloat(prod.cost_price) || 0;
    const selling = parseFloat(prod.selling_price || prod.unit_price) || 0;
    const finalKey = `${prod.product_id || prod.id}-${prod.variant_id || `${prod.color || 'c'}-${prod.size || 's'}`}`;

    setItems(prev => {
      const existing = prev.find(it => it.key === finalKey && it.key !== rowKey);
      if (existing) {
        const newQty = (parseInt(existing.quantity, 10) || 0) + 1;
        const lineTotal = newQty * (parseFloat(existing.unit_cost) || 0);
        return prev
          .filter(it => it.key !== rowKey)
          .map(it => it.key === finalKey ? { ...it, quantity: newQty, line_total: lineTotal } : it);
      }

      return prev.map(it => {
        if (it.key === rowKey) {
          const qty = it.quantity > 0 ? it.quantity : 1;
          return {
            key: finalKey,
            isManualRow: false,
            product_id: prod.product_id || prod.id,
            variant_id: prod.variant_id || null,
            product_name: prod.product_name,
            product_code: prod.product_code || '',
            barcode: prod.variant_sku || prod.barcode || '',
            color: prod.color || prod.variant_color || (prod.display_name && prod.display_name.match(/\(([^)]+)\)/) ? prod.display_name.match(/\(([^)]+)\)/)[1].split('/')[0]?.trim() : null) || null,
            size: prod.size || prod.variant_size || (prod.display_name && prod.display_name.match(/\(([^)]+)\)/) && prod.display_name.match(/\(([^)]+)\)/)[1].includes('/') ? prod.display_name.match(/\(([^)]+)\)/)[1].split('/')[1]?.trim() : null) || null,
            display_name: prod.display_name || (prod.variant_sku ? `${prod.product_name} (${prod.color || ''} / ${prod.size || ''})` : prod.product_name),
            category_name: prod.category_name || '',
            quantity: qty,
            unit_cost: cost,
            selling_price: selling,
            discount_pct: 0,
            line_total: qty * cost
          };
        }
        return it;
      });
    });
  };

  // Add Product directly into invoice (auto targets empty manual row or appends new)
  const addProductToInvoice = (prod) => {
    const emptyRow = items.find(it => it.isManualRow);
    if (emptyRow) {
      populateProductIntoRow(emptyRow.key, prod);
    } else {
      const tempKey = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setItems(prev => [
        ...prev,
        {
          key: tempKey,
          isManualRow: true,
          product_id: null,
          variant_id: null,
          product_name: '',
          product_code: '',
          barcode: '',
          quantity: 1,
          unit_cost: 0,
          selling_price: 0,
          discount_pct: 0,
          line_total: 0
        }
      ]);
      populateProductIntoRow(tempKey, prod);
    }
  };

  // Update item fields in table
  const handleUpdateItemRow = (rowKey, field, val) => {
    setItems(prev => prev.map(it => {
      if (it.key !== rowKey) return it;
      const updated = { ...it, [field]: val };
      const qty = parseInt(updated.quantity, 10) || 0;
      const cost = parseFloat(updated.unit_cost) || 0;
      const disc = parseFloat(updated.discount_pct) || 0;
      const discAmount = (qty * cost) * (disc / 100);
      updated.line_total = Math.max(0, (qty * cost) - discAmount);
      return updated;
    }));
  };

  // Plus / Minus Quantity Buttons
  const updateItemQty = (key, delta) => {
    setItems(prev => prev.map(it => {
      if (it.key !== key) return it;
      const newQty = Math.max(1, (parseInt(it.quantity, 10) || 0) + delta);
      const cost = parseFloat(it.unit_cost) || 0;
      const disc = parseFloat(it.discount_pct) || 0;
      const discAmount = (newQty * cost) * (disc / 100);
      return {
        ...it,
        quantity: newQty,
        line_total: Math.max(0, (newQty * cost) - discAmount)
      };
    }));
  };

  const handleRemoveItem = (key) => {
    setItems(prev => prev.filter(it => it.key !== key));
  };

  // Barcode scanned / typed in row input
  const handleManualRowBarcodeSubmit = async (rowKey, inputCode) => {
    if (!inputCode || !inputCode.trim()) return;
    const clean = inputCode.trim();

    try {
      const effectiveBranch = selectedBranch || defaultBranchId || 1;
      const res = await api.get('/api/swm/pos/search', {
        params: { query: clean, branch_id: effectiveBranch }
      });

      if (res.data.success && res.data.data.length > 0) {
        const results = res.data.data;
        if (results.length === 1) {
          populateProductIntoRow(rowKey, results[0]);
          message.success(`تم إدراج الصنف: ${results[0].display_name}`);
        } else {
          handleOpenF1SearchModal('invoice', rowKey, clean);
        }
      } else {
        const localMatches = productsList.filter(p =>
          (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) ||
          (p.product_code && p.product_code.toLowerCase() === clean.toLowerCase()) ||
          (p.product_name && p.product_name.toLowerCase().includes(clean.toLowerCase()))
        );

        if (localMatches.length === 1) {
          const prodRes = await api.get(`/api/swm/products/${localMatches[0].id}`);
          const fullProd = prodRes.data?.data;
          const variants = fullProd?.variants || [];
          if (variants.length <= 1) {
            populateProductIntoRow(rowKey, {
              product_id: fullProd.id,
              variant_id: variants[0]?.id || null,
              product_name: fullProd.product_name,
              product_code: fullProd.product_code,
              barcode: variants[0]?.variant_sku || fullProd.barcode,
              color: variants[0]?.color || fullProd.color || null,
              size: variants[0]?.size || fullProd.size || null,
              category_name: fullProd.category_name,
              cost_price: parseFloat(variants[0]?.cost_price || fullProd.cost_price) || 0,
              selling_price: parseFloat(variants[0]?.selling_price || fullProd.selling_price) || 0
            });
            message.success(`تم إدراج: ${fullProd.product_name}`);
          } else {
            handleOpenF1SearchModal('invoice', rowKey, clean);
          }
        } else {
          handleOpenF1SearchModal('invoice', rowKey, clean);
          message.warning(`لم يتم العثور على صنف مطابق للكود "${clean}". تم فتح نافذة البحث الموسع (F1)...`);
        }
      }
    } catch (err) {
      handleOpenF1SearchModal('invoice', rowKey, clean);
    }
  };

  // Barcode scanned / typed in Top POS Barcode Station
  const handleTopBarcodeScan = async (inputVal) => {
    if (!inputVal || !inputVal.trim()) return;
    const clean = inputVal.trim();
    setTopBarcodeInput('');

    try {
      const effectiveBranch = selectedBranch || defaultBranchId || 1;
      const res = await api.get('/api/swm/pos/search', {
        params: { query: clean, branch_id: effectiveBranch }
      });

      if (res.data.success && res.data.data.length > 0) {
        const results = res.data.data;
        if (results.length === 1) {
          addProductToInvoice(results[0]);
          message.success(`تم إدراج: ${results[0].display_name}`);
        } else {
          handleOpenF1SearchModal('invoice', null, clean);
        }
      } else {
        const localMatches = productsList.filter(p =>
          (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) ||
          (p.product_code && p.product_code.toLowerCase() === clean.toLowerCase()) ||
          (p.product_name && p.product_name.toLowerCase().includes(clean.toLowerCase()))
        );

        if (localMatches.length === 1) {
          const prodRes = await api.get(`/api/swm/products/${localMatches[0].id}`);
          const fullProd = prodRes.data?.data;
          const variants = fullProd?.variants || [];
          if (variants.length <= 1) {
            addProductToInvoice({
              product_id: fullProd.id,
              variant_id: variants[0]?.id || null,
              product_name: fullProd.product_name,
              product_code: fullProd.product_code,
              barcode: variants[0]?.variant_sku || fullProd.barcode,
              color: variants[0]?.color || fullProd.color || null,
              size: variants[0]?.size || fullProd.size || null,
              display_name: fullProd.product_name,
              category_name: fullProd.category_name,
              cost_price: parseFloat(variants[0]?.cost_price || fullProd.cost_price) || 0,
              selling_price: parseFloat(variants[0]?.selling_price || fullProd.selling_price) || 0
            });
            message.success(`تم إدراج: ${fullProd.product_name}`);
          } else {
            handleOpenF1SearchModal('invoice', null, clean);
          }
        } else {
          handleOpenF1SearchModal('invoice', null, clean);
          message.warning(`لم يتم العثور على تطابق فوري للكود "${clean}". تم فتح نافذة البحث الموسع (F1)...`);
        }
      }
    } catch (e) {
      handleOpenF1SearchModal('invoice', null, clean);
    }
  };

  // ==========================================
  // F1 PRODUCT SEARCH & SELECT MODAL (POS-Style)
  // ==========================================

  const fetchF1ModalCatalog = async (q = '', catId = 'all') => {
    setF1Loading(true);
    try {
      const effectiveBranch = selectedBranch || defaultBranchId || 1;
      const res = await api.get('/api/swm/pos/search', {
        params: {
          query: q?.trim() || undefined,
          category_id: catId !== 'all' ? catId : undefined,
          branch_id: effectiveBranch,
          limit: 1000
        }
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setF1SearchResults(res.data.data);
        setF1Loading(false);
        return;
      }
    } catch (err) {
      console.warn('POS search fallback:', err);
    }

    const qLower = (q || '').trim().toLowerCase();
    const exploded = [];

    productsList.forEach(p => {
      if (catId !== 'all' && p.category_id !== catId) return;

      const colors = (p.color && p.color.includes('/'))
        ? p.color.split('/').map(c => c.trim()).filter(Boolean)
        : (p.color ? [p.color.trim()] : [null]);

      const sizes = (p.size && p.size.includes('/'))
        ? p.size.split('/').map(s => s.trim()).filter(Boolean)
        : (p.size ? [p.size.trim()] : [null]);

      colors.forEach(col => {
        sizes.forEach(siz => {
          const varParts = [col, siz].filter(Boolean);
          const varLabel = varParts.length > 0 ? varParts.join(' / ') : '';
          const displayName = varLabel ? `${p.product_name} (${varLabel})` : p.product_name;

          if (qLower) {
            const matchName = displayName.toLowerCase().includes(qLower);
            const matchCode = (p.product_code || '').toLowerCase().includes(qLower);
            const matchBarcode = (p.barcode || '').toLowerCase().includes(qLower);
            if (!matchName && !matchCode && !matchBarcode) return;
          }

          exploded.push({
            product_id: p.id,
            variant_id: null,
            product_code: p.product_code,
            barcode: p.barcode,
            product_name: p.product_name,
            display_name: displayName,
            color: col,
            size: siz,
            category_id: p.category_id,
            category_name: p.category_name,
            unit_price: parseFloat(p.selling_price) || 0,
            cost_price: parseFloat(p.cost_price) || 0,
            available_qty: parseInt(p.total_stock, 10) || 0
          });
        });
      });
    });

    setF1SearchResults(exploded);
    setF1Loading(false);
  };

  const handleOpenF1SearchModal = (target = 'invoice', itemKey = null, initialQuery = '') => {
    setF1SearchTarget(target);
    setF1TargetItemKey(itemKey);
    setF1SearchQuery(initialQuery);
    setF1CategoryFilter('all');
    setF1ModalOpen(true);
    fetchF1ModalCatalog(initialQuery, 'all');
    setTimeout(() => {
      f1SearchInputRef.current?.focus();
    }, 150);
  };

  const handleF1CategoryChange = (catId) => {
    setF1CategoryFilter(catId);
    fetchF1ModalCatalog(f1SearchQuery, catId);
  };

  const handleF1SearchQueryChange = (val) => {
    setF1SearchQuery(val);
    fetchF1ModalCatalog(val, f1CategoryFilter);
  };

  const handleSelectProductFromF1Modal = async (prod) => {
    if (!prod) return;

    if (f1SearchTarget === 'invoice') {
      let targetKey = f1TargetItemKey;
      if (targetKey) {
        populateProductIntoRow(targetKey, prod);
      } else {
        addProductToInvoice(prod);
      }
      setF1ModalOpen(false);
      message.success(`تم اختيار الصنف "${prod.display_name || prod.product_name}" للفاتورة بنجاح [F1]`);
    } else if (f1SearchTarget === 'return') {
      let targetKey = f1TargetItemKey;
      if (!targetKey) {
        const emptyItem = standaloneItems.find(it => it.isManualRow || !it.product_id);
        if (emptyItem) {
          targetKey = emptyItem.key;
        } else {
          targetKey = `ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          setStandaloneItems(prev => [
            ...prev,
            {
              key: targetKey,
              isManualRow: false,
              product_id: null,
              variant_id: null,
              product_name: '',
              product_code: '',
              barcode: '',
              quantity: 1,
              unit_cost: 0,
              line_total: 0
            }
          ]);
        }
      }
      populateProductIntoReturnRow(targetKey, prod);
      setF1ModalOpen(false);
      message.success(`تم اختيار الصنف "${prod.display_name || prod.product_name}" للمرتجع بنجاح [F1]`);
    }
  };

  // Add all variants of a product into the invoice at once
  const handleAddAllVariantsOfProduct = async (productId) => {
    try {
      const res = await api.get(`/api/swm/products/${productId}`);
      const fullProd = res.data?.data;
      const variants = fullProd?.variants || [];
      const baseCost = parseFloat(fullProd?.cost_price) || 0;
      const baseSelling = parseFloat(fullProd?.selling_price) || 0;

      if (variants.length > 0) {
        variants.forEach(v => {
          addProductToInvoice({
            product_id: fullProd.id,
            variant_id: v.id,
            product_name: fullProd.product_name,
            product_code: fullProd.product_code,
            barcode: v.variant_sku || fullProd.barcode,
            color: v.color,
            size: v.size,
            display_name: `${fullProd.product_name} (${v.color || ''} / ${v.size || ''})`,
            category_name: fullProd.category_name,
            cost_price: parseFloat(v.cost_price) || baseCost,
            selling_price: parseFloat(v.selling_price) || baseSelling
          });
        });
        message.success(`تم إدراج جميع مقاسات وألوان "${fullProd.product_name}" (${variants.length} صنف/متغير) بالفاتورة`);
      } else {
        addProductToInvoice({
          product_id: fullProd.id,
          variant_id: null,
          product_name: fullProd.product_name,
          product_code: fullProd.product_code,
          barcode: fullProd.barcode,
          color: fullProd.color || null,
          size: fullProd.size || null,
          display_name: (fullProd.color || fullProd.size) ? `${fullProd.product_name} (${[fullProd.color, fullProd.size].filter(Boolean).join(' / ')})` : fullProd.product_name,
          category_name: fullProd.category_name,
          cost_price: baseCost,
          selling_price: baseSelling
        });
        message.success(`تم إدراج الصنف "${fullProd.product_name}" بالفاتورة`);
      }
      setF1ModalOpen(false);
    } catch (e) {
      message.error('فشل في جلب متغيرات الصنف');
    }
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
          await fetchProductsList();
          fetchF1ModalCatalog(f1CategoryFilter, f1SearchQuery);

          if (targetInvoiceItemKey) {
            populateProductIntoRow(targetInvoiceItemKey, {
              product_id: newProd.id,
              variant_id: null,
              product_name: newProd.product_name,
              product_code: newProd.product_code,
              barcode: newProd.barcode,
              color: values.color || null,
              size: values.size || null,
              category_name: categoriesList.find(c => c.id === newProd.category_id)?.category_name || '',
              cost_price: Number(values.cost_price || 0),
              selling_price: Number(values.selling_price || 0)
            });
          } else {
            addProductToInvoice({
              product_id: newProd.id,
              variant_id: null,
              product_name: newProd.product_name,
              product_code: newProd.product_code,
              barcode: newProd.barcode,
              color: values.color || null,
              size: values.size || null,
              category_name: categoriesList.find(c => c.id === newProd.category_id)?.category_name || '',
              cost_price: Number(values.cost_price || 0),
              selling_price: Number(values.selling_price || 0)
            });
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
          setItems(prev => prev.map(it => {
            if (it.product_id !== editingMasterProduct.id) return it;
            const cost = Number(values.cost_price ?? it.unit_cost);
            const disc = parseFloat(it.discount_pct) || 0;
            const qty = parseInt(it.quantity, 10) || 1;
            const discAmount = (qty * cost) * (disc / 100);
            return {
              ...it,
              product_name: values.product_name || it.product_name,
              product_code: values.product_code || it.product_code,
              barcode: values.barcode || it.barcode,
              unit_cost: cost,
              selling_price: Number(values.selling_price ?? it.selling_price),
              line_total: Math.max(0, (qty * cost) - discAmount)
            };
          }));

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
    const validItems = items.filter(it => !it.isManualRow && it.product_id && (parseInt(it.quantity, 10) || 0) > 0);
    if (validItems.length === 0) {
      return message.warning('لا توجد أصناف وكميات صالحة لطباعة الباركود في الفاتورة الحالية');
    }
    const printItems = validItems.map(it => ({
      product_id: it.product_id,
      product_name: it.product_name,
      product_code: it.product_code || '',
      barcode: it.barcode || it.product_code || '',
      color: it.color || '',
      size: it.size || '',
      unit_cost: it.unit_cost,
      selling_price: it.selling_price,
      quantity: parseInt(it.quantity, 10) || 1
    }));
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
    const main = branchesList.find(b =>
      b.branch_type === 'main_warehouse' ||
      b.branch_name.includes('الرئيسي') ||
      b.branch_name.toLowerCase().includes('main') ||
      b.is_main === true
    ) || branchesList[0];
    if (main) {
      setSelectedBranch(main.id);
    } else if (defaultBranchId) {
      setSelectedBranch(defaultBranchId);
    }
    setItems([]); // Starts completely empty as requested
    setSplitPaymentBreakdown([]);
    setPaidAmount(0);
    setTopBarcodeInput('');
    setIsCreateOpen(true);
    setTimeout(() => {
      topBarcodeInputRef.current?.focus();
    }, 200);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateDrawer();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleCreateInvoice = async () => {
    const mainBranchObj = branchesList.find(b =>
      b.branch_type === 'main_warehouse' ||
      (b.branch_name && b.branch_name.includes('الرئيسي')) ||
      (b.branch_name && b.branch_name.toLowerCase().includes('main')) ||
      b.is_main === true
    ) || branchesList[0];
    const effectiveBranchId = mainBranchObj?.id || selectedBranch || defaultBranchId;

    if (!selectedSupplier) return message.error('يرجى اختيار المورد');
    if (!effectiveBranchId) return message.error('يرجى اختيار مستودع الاستلام');

    const validItems = items.filter(it => !it.isManualRow && it.product_id);
    if (validItems.length === 0) return message.error('يجب إضافة صنف واحد على الأقل في الفاتورة');

    const flatItems = [];
    for (const it of validItems) {
      const qty = parseInt(it.quantity, 10);
      if (!qty || qty <= 0) continue;
      const cost = parseFloat(it.unit_cost) || 0;
      const selling = parseFloat(it.selling_price) || 0;
      const disc = parseFloat(it.discount_pct) || 0;

      flatItems.push({
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        color: it.color || null,
        size: it.size || null,
        quantity: qty,
        unit_cost: cost,
        selling_price: selling,
        discount_pct: disc
      });
    }

    if (flatItems.length === 0) {
      return message.error('يرجى تحديد كمية أكبر من صفر لصنف واحد على الأقل');
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: selectedSupplier,
        warehouse_branch_id: effectiveBranchId,
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

        const printItemsSnapshot = validItems.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_code: it.product_code || '',
          barcode: it.barcode || it.product_code || '',
          color: it.color || '',
          size: it.size || '',
          unit_cost: it.unit_cost,
          selling_price: it.selling_price,
          quantity: parseInt(it.quantity, 10) || 1
        }));

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
            okText: 'نعم، طباعة ملصقات الباركود',
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

  const populateProductIntoReturnRow = (rowKey, prod) => {
    setStandaloneItems(prev => prev.map(it => {
      if (it.key === rowKey) {
        const qty = it.quantity || 1;
        const cost = parseFloat(prod.cost_price) || 0;
        return {
          ...it,
          isManualRow: false,
          product_id: prod.product_id || prod.id,
          variant_id: prod.variant_id || null,
          product_name: prod.product_name,
          product_code: prod.product_code || '',
          barcode: prod.variant_sku || prod.barcode || '',
          color: prod.color || null,
          size: prod.size || null,
          display_name: prod.display_name || prod.product_name,
          category_name: prod.category_name || '',
          quantity: qty,
          unit_cost: cost,
          line_total: qty * cost
        };
      }
      return it;
    }));
  };

  const handleReturnManualRowBarcodeSubmit = async (rowKey, inputCode) => {
    if (!inputCode || !inputCode.trim()) return;
    const clean = inputCode.trim();

    try {
      const effectiveBranch = standaloneBranch || defaultBranchId || 1;
      const res = await api.get('/api/swm/pos/search', {
        params: { query: clean, branch_id: effectiveBranch }
      });

      if (res.data.success && res.data.data.length > 0) {
        const results = res.data.data;
        if (results.length === 1) {
          populateProductIntoReturnRow(rowKey, results[0]);
          message.success(`تم إدراج الصنف للمرتجع: ${results[0].display_name}`);
        } else {
          handleOpenF1SearchModal('return', rowKey, clean);
        }
      } else {
        const localMatches = productsList.filter(p =>
          (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) ||
          (p.product_code && p.product_code.toLowerCase() === clean.toLowerCase()) ||
          (p.product_name && p.product_name.toLowerCase().includes(clean.toLowerCase()))
        );

        if (localMatches.length === 1) {
          const prodRes = await api.get(`/api/swm/products/${localMatches[0].id}`);
          const fullProd = prodRes.data?.data;
          const variants = fullProd?.variants || [];
          if (variants.length <= 1) {
            populateProductIntoReturnRow(rowKey, {
              product_id: fullProd.id,
              variant_id: variants[0]?.id || null,
              product_name: fullProd.product_name,
              product_code: fullProd.product_code,
              barcode: variants[0]?.variant_sku || fullProd.barcode,
              color: variants[0]?.color || null,
              size: variants[0]?.size || null,
              category_name: fullProd.category_name,
              cost_price: parseFloat(variants[0]?.cost_price || fullProd.cost_price) || 0
            });
            message.success(`تم إدراج للمرتجع: ${fullProd.product_name}`);
          } else {
            handleOpenF1SearchModal('return', rowKey, clean);
          }
        } else {
          handleOpenF1SearchModal('return', rowKey, clean);
          message.warning(`لم يتم العثور على صنف مطابق للكود "${clean}". تم فتح نافذة البحث الموسع (F1)...`);
        }
      }
    } catch (err) {
      handleOpenF1SearchModal('return', rowKey, clean);
    }
  };

  const updateReturnItemQty = (key, delta) => {
    setStandaloneItems(prev => prev.map(it => {
      if (it.key !== key) return it;
      const newQty = Math.max(1, (parseInt(it.quantity, 10) || 0) + delta);
      const cost = parseFloat(it.unit_cost) || 0;
      return {
        ...it,
        quantity: newQty,
        line_total: Math.max(0, newQty * cost)
      };
    }));
  };

  const handleOpenStandaloneReturnDrawer = () => {
    fetchLookups();
    const mainBranch = branchesList.find(b =>
      b.branch_type === 'main_warehouse' ||
      b.branch_name.includes('الرئيسي') ||
      b.is_main === true
    ) || branchesList[0];
    setStandaloneBranch(mainBranch?.id || defaultBranchId || 1);
    setStandaloneSupplier(null);
    setStandaloneDate(new Date().toISOString().split('T')[0]);
    setStandaloneReason('');
    setStandaloneRefundType('credit');
    setStandaloneRefundBreakdown([]);
    setStandaloneRefundAmount(0);
    setStandaloneItems([]);
    setIsStandaloneReturnOpen(true);
  };

  const handleAddStandaloneItem = () => {
    const tempKey = `ret-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setStandaloneItems(prev => [
      ...prev,
      {
        key: tempKey,
        isManualRow: true,
        product_id: null,
        variant_id: null,
        product_name: '',
        product_code: '',
        barcode: '',
        color: null,
        size: null,
        category_name: '',
        quantity: 1,
        unit_cost: 0,
        line_total: 0
      }
    ]);
    setTimeout(() => {
      manualReturnRowInputRefs.current[tempKey]?.focus();
    }, 100);
  };

  const handleUpdateStandaloneItem = (key, field, value) => {
    setStandaloneItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };

      if (field === 'product_id') {
        const prod = productsList.find(p => p.id === value);
        if (prod) {
          updated.isManualRow = false;
          updated.product_name = prod.product_name;
          updated.product_code = prod.product_code || prod.barcode || '';
          updated.barcode = prod.barcode || '';
          updated.category_name = prod.category_name || '';
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
    const effectiveBranch = standaloneBranch || defaultBranchId || 1;
    const validItems = standaloneItems.filter(it => !it.isManualRow && it.product_id);
    if (validItems.length === 0) {
      return message.error('يجب إضافة صنف واحد على الأقل للإرجاع');
    }

    for (const it of validItems) {
      if (!it.quantity || it.quantity <= 0) {
        return message.error('يرجى التأكد من تحديد كمية أكبر من صفر لكل صنف');
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

  // --- Strict Keyboard Workflow: F11 (Add Row), F1 (Search Product), F4 (Submit Invoice / Return) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If F1 modal is open
      if (f1ModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setF1ModalOpen(false);
        }
        return;
      }

      if (isCreateOpen) {
        if (e.key === 'F11') {
          e.preventDefault();
          handleAddItem();
          message.info('سطر جديد [F11]: تم إضافة صنف جديد، اضغط F1 للبحث أو اختر الصنف');
        } else if (e.key === 'F1') {
          e.preventDefault();
          handleOpenF1SearchModal('invoice');
        } else if (e.key === 'F4') {
          e.preventDefault();
          handleCreateInvoice();
        }
      } else if (isStandaloneReturnOpen) {
        if (e.key === 'F11') {
          e.preventDefault();
          handleAddStandaloneItem();
          message.info('سطر مرتجع جديد [F11]: اضغط F1 للبحث واختيار الصنف');
        } else if (e.key === 'F1') {
          e.preventDefault();
          handleOpenF1SearchModal('return');
        } else if (e.key === 'F4') {
          e.preventDefault();
          handleSubmitStandaloneReturn();
        }
      } else if (linkedReturnOpen) {
        if (e.key === 'F4') {
          e.preventDefault();
          handleSubmitLinkedReturn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCreateOpen,
    isStandaloneReturnOpen,
    linkedReturnOpen,
    f1ModalOpen,
    items,
    standaloneItems,
    linkedItems,
    selectedSupplier,
    selectedBranch,
    standaloneSupplier,
    standaloneBranch,
    submitting,
    standaloneSubmitting,
    linkedSubmitting
  ]);

  // Table Columns
  const invoiceColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (num) => (
        <span
          style={{
            backgroundColor: '#0F172A',
            color: '#DFCA95',
            border: '1px solid #C8A45C',
            padding: '3px 8px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: 12.5,
            display: 'inline-block'
          }}
        >
          {num}
        </span>
      )
    },
    {
      title: 'المورد',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name, r) => (
        <div>
          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 13.5 }}>{name}</div>
          {r.supplier_code && (
            <Tag color="cyan" style={{ fontSize: 10.5, borderRadius: 4, margin: '3px 0 0', fontWeight: 600 }}>
              {r.supplier_code}
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'المستودع المستلم',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (w) => (
        <Tag color="blue" style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
          {w || 'الفرع الرئيسي'}
        </Tag>
      )
    },
    {
      title: 'تاريخ الفاتورة',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (d) => (
        <span style={{ color: '#334155', fontWeight: 600, fontSize: 12.5 }}>
          {new Date(d).toLocaleDateString('ar-EG')}
        </span>
      )
    },
    {
      title: 'إجمالي الأصناف',
      dataIndex: 'items_count',
      key: 'items_count',
      render: (cnt, r) => (
        <Tag color="purple" style={{ fontSize: 12, borderRadius: 6, fontWeight: 700, padding: '2px 8px' }}>
          {cnt} صنف ({r.total_units} قطعة)
        </Tag>
      )
    },
    {
      title: 'القيمة الإجمالية',
      dataIndex: 'final_amount',
      key: 'final_amount',
      render: (val) => (
        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>
          {parseFloat(val).toLocaleString()} ج.م
        </span>
      )
    },
    {
      title: 'حالة السداد',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (st, r) => {
        const map = {
          paid: { label: 'مسدد بالكامل', color: 'success' },
          partial: { label: `مسدد جزئياً (${parseFloat(r.paid_amount || 0).toLocaleString()} ج.م)`, color: 'warning' },
          unpaid: { label: 'آجل (غير مسدد)', color: 'error' }
        };
        const item = map[st] || { label: st, color: 'default' };
        return (
          <Tag color={item.color} style={{ fontSize: 12, borderRadius: 6, fontWeight: 700, padding: '3px 10px' }}>
            {item.label}
          </Tag>
        );
      }
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="middle"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            style={{ borderRadius: 6, fontWeight: 600 }}
          >
            عرض الفاتورة
          </Button>
          <Button
            size="middle"
            danger
            icon={<RollbackOutlined />}
            onClick={() => handleOpenLinkedReturnModal(record)}
            style={{ borderRadius: 6, fontWeight: 600 }}
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
          size="middle"
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
          <h2>المشتريات والتوريد والمرتجعات (Purchases & Returns)</h2>
          <p>توريد بضائع المخازن، تحديث أسعار التكلفة والبيع، إدارة السداد المقسم، وإرجاع المشتريات للموردين</p>
        </div>

        <div className="swm-page-actions">
          <Button icon={<ReloadOutlined />} onClick={() => { fetchInvoices(pagination.current); fetchReturns(returnsPagination.current); }} style={{ height: 44, borderRadius: 8 }}>
            تحديث
          </Button>
          <Button
            type="primary"
            danger
            icon={<RollbackOutlined />}
            onClick={handleOpenStandaloneReturnDrawer}
            style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
          >
            فاتورة مرتجع مشتريات جديدة
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateDrawer}
            className="swm-btn-primary"
            style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
          >
            فاتورة مشتريات جديدة
          </Button>
        </div>
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
                    className="swm-separated-table"
                    columns={invoiceColumns}
                    dataSource={invoices}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
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
                    className="swm-separated-table"
                    columns={returnColumns}
                    dataSource={returnsList}
                    rowKey="id"
                    loading={returnsLoading}
                    pagination={false}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />

      {/* ========================================================= */}
      {/* 1. EXPANSIVE CREATE PURCHASE INVOICE MODAL (Full Desk)    */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#ecfdf5', color: '#16a34a', padding: '8px 12px', borderRadius: 10, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(22,163,74,0.15)' }}>
                <ShoppingOutlined />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>تسجيل فاتورة مشتريات وتوريد بضاعة</span>
                  <Tag color="green" style={{ fontSize: 12, fontWeight: 600 }}>توريد مخزني ومزامنة أسعار</Tag>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 'normal' }}>
                  إدخال بضائع الموردين وتحديث التكلفة وسعر البيع تلقائياً على بطاقة الصنف
                </div>
              </div>
            </div>

            {/* Keyboard shortcuts ribbon */}
            <Space size={8} style={{ direction: 'ltr' }}>
              <Tag color="blue" icon={<Keyboard size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={handleAddItem}>
                <strong style={{ color: '#1d4ed8' }}>F11</strong> إضافة صنف جديد
              </Tag>
              <Tag color="purple" icon={<Search size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => handleOpenF1SearchModal('invoice')}>
                <strong style={{ color: '#6d28d9' }}>F1</strong> بحث عن صنف
              </Tag>
              <Tag color="success" icon={<Zap size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={handleCreateInvoice}>
                <strong style={{ color: '#15803d' }}>F4</strong> اعتماد الفاتورة
              </Tag>
            </Space>
          </div>
        }
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        width="100vw"
        style={{ top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{ body: { height: 'calc(100vh - 75px)', overflowY: 'auto', padding: '16px 24px' } }}
        destroyOnHidden={false}
      >
        <Form layout="vertical">
          <Card
            size="small"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: 14
            }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={<strong>المورد (Supplier) *</strong>} required style={{ marginBottom: 0 }}>
                  <Select
                    showSearch
                    size="large"
                    placeholder="اختر المورد..."
                    value={selectedSupplier}
                    onChange={setSelectedSupplier}
                    filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
                    style={{ width: '100%' }}
                  >
                    {suppliersList.map(s => (
                      <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={<strong>المستودع المستلم (Receiving Branch) *</strong>} required style={{ marginBottom: 0 }}>
                  <Select
                    size="large"
                    value={selectedBranch || defaultBranchId}
                    disabled
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    {(() => {
                      const main = branchesList.find(b =>
                        b.id === (selectedBranch || defaultBranchId) ||
                        b.branch_type === 'main_warehouse' ||
                        b.branch_name.includes('الرئيسي') ||
                        b.is_main === true
                      ) || branchesList[0];

                      return main ? (
                        <Option key={main.id} value={main.id}>
                          <Space size={6}><Building2 size={13} style={{ verticalAlign: 'middle' }} /><span>{main.branch_name} (المستودع الرئيسي المعتمد فقط)</span></Space>
                        </Option>
                      ) : (
                        <Option value={defaultBranchId || 1}>
                          <Space size={6}><Building2 size={13} style={{ verticalAlign: 'middle' }} /><span>الفرع الرئيسي (المستودع الرئيسي المعتمد فقط)</span></Space>
                        </Option>
                      );
                    })()}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Form.Item label={<strong>تاريخ الفاتورة</strong>} style={{ marginBottom: 0 }}>
                  <Input
                    size="large"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Form.Item label={<strong>رقم الفاتورة اليدوي</strong>} style={{ marginBottom: 0 }}>
                  <Input
                    size="large"
                    placeholder="تلقائي إن تُرك فارغاً"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Items Section Header & Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Package size={15} /> أصناف الفاتورة وأسعار التكلفة والبيع (Invoice Items & Master Prices Sync)
            </div>
            <Space wrap>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddItem}
                style={{ borderColor: '#2563eb', color: '#2563eb', fontWeight: 700, borderRadius: 6 }}
              >
                + إضافة صنف [F11]
              </Button>
              <Button
                icon={<SearchOutlined />}
                onClick={() => handleOpenF1SearchModal('invoice')}
                style={{ borderColor: '#7c3aed', color: '#7c3aed', background: '#f5f3ff', fontWeight: 700, borderRadius: 6 }}
              >
                بحث سريع عن الأصناف [F1]
              </Button>
              <Tooltip title="تحديث ومزامنة الأصناف من قاعدة البيانات">
                <Button
                  icon={<ReloadOutlined spin={refreshingProducts} />}
                  onClick={handleRefreshProductsList}
                  style={{ borderRadius: 6 }}
                >
                  تحديث
                </Button>
              </Tooltip>
            </Space>
          </div>

          {/* Products & Variants Tabular Grid (POS Cart Table Style) */}
          <div style={{ marginBottom: 16 }}>
            {items.length === 0 ? (
              <Card
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '2px dashed #cbd5e1',
                  borderRadius: 12,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  boxShadow: '0 4px 12px rgba(67, 56, 202, 0.15)'
                }}>
                  <ShoppingOutlined />
                </div>
                <Title level={4} style={{ margin: '0 0 6px 0', color: '#1e293b' }}>
                  قائمة أصناف الفاتورة فارغة حالياً
                </Title>
                <Text type="secondary" style={{ fontSize: 14, display: 'block', maxWidth: 620, margin: '0 auto 20px' }}>
                  ابدأ بإضافة سطر يدوي، أو استخدام اختصارات الكيبورد السريعة لتسريع إدخال فاتورة الشراء والتوريد:
                </Text>

                {/* Keyboard Shortcuts Visual Banner */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '10px 24px',
                  borderRadius: 30,
                  marginBottom: 24,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  flexWrap: 'wrap'
                }}>
                  <Space size={6}>
                    <Tag color="blue" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F11</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>إضافة سطر إدخال يدوي</Text>
                  </Space>
                  <Divider type="vertical" style={{ height: 20 }} />
                  <Space size={6}>
                    <Tag color="purple" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F1</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>بحث واختيار من المجاميع والأصناف</Text>
                  </Space>
                  <Divider type="vertical" style={{ height: 20 }} />
                  <Space size={6}>
                    <Tag color="green" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F4</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>اعتماد الفاتورة وتوريد المخزون</Text>
                  </Space>
                </div>

                {/* Action Buttons for Empty State */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={handleAddItem}
                    style={{
                      height: 44,
                      padding: '0 28px',
                      backgroundColor: '#2563eb',
                      borderColor: '#2563eb',
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: '0 4px 10px rgba(37,99,235,0.25)'
                    }}
                  >
                    + إضافة سطر صنف جديد [F11]
                  </Button>
                  <Button
                    size="large"
                    icon={<SearchOutlined />}
                    onClick={() => handleOpenF1SearchModal('invoice')}
                    style={{
                      height: 44,
                      padding: '0 28px',
                      color: '#7c3aed',
                      borderColor: '#c4b5fd',
                      background: '#f5f3ff',
                      fontWeight: 700,
                      borderRadius: 8
                    }}
                  >
                    بحث واختيار من الأصناف والمجاميع [F1]
                  </Button>
                </div>
              </Card>
            ) : (
              <div>
                {/* Clean Top Action Header above table */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  padding: '8px 14px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <Space size="middle">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddItem}
                      className="swm-btn-cobalt"
                      style={{ fontWeight: 700, borderRadius: 6 }}
                    >
                      + إضافة سطر صنف جديد [F11]
                    </Button>
                    <Button
                      icon={<SearchOutlined />}
                      onClick={() => handleOpenF1SearchModal('invoice')}
                      style={{ borderColor: '#7c3aed', color: '#7c3aed', background: '#f5f3ff', fontWeight: 700, borderRadius: 6 }}
                    >
                      بحث واختيار من الأصناف والمجاميع [F1]
                    </Button>
                  </Space>
                  <Space size={8}>
                    <Tag color="blue" style={{ fontWeight: 600 }}>[F11] سطر جديد</Tag>
                    <Tag color="purple" style={{ fontWeight: 600 }}>[F1] بحث الأصناف</Tag>
                    <Tag color="green" style={{ fontWeight: 600 }}>[F4] اعتماد وتوريد</Tag>
                  </Space>
                </div>

                <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 10, overflowX: 'auto', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                    <thead style={{ background: '#f1f5f9', borderBottom: '2.5px solid #cbd5e1' }}>
                      <tr style={{ color: '#1e293b' }}>
                        <th style={{ padding: '12px 10px', width: 44, textAlign: 'center', fontWeight: 700 }}>#</th>
                        <th style={{ padding: '12px 10px', width: 140, fontWeight: 700 }}>كود / باركود</th>
                        <th style={{ padding: '12px 10px', fontWeight: 700 }}>اسم الصنف والمواصفات</th>
                        <th style={{ padding: '12px 10px', width: 100, textAlign: 'center', fontWeight: 700 }}>المجموعة</th>
                        <th style={{ padding: '12px 10px', width: 130, textAlign: 'center', fontWeight: 700 }}>الكمية المشتراة</th>
                        <th style={{ padding: '12px 10px', width: 130, textAlign: 'center', fontWeight: 700 }}>سعر التكلفة (ج.م)</th>
                        <th style={{ padding: '12px 10px', width: 130, textAlign: 'center', fontWeight: 700 }}>سعر البيع النهائي (ج.م)</th>
                        <th style={{ padding: '12px 10px', width: 95, textAlign: 'center', fontWeight: 700 }}>خصم %</th>
                        <th style={{ padding: '12px 10px', width: 120, textAlign: 'center', fontWeight: 700 }}>إجمالي السطر</th>
                        <th style={{ padding: '12px 6px', width: 70, textAlign: 'center', fontWeight: 700 }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        if (item.isManualRow) {
                          return (
                            <tr
                              key={item.key}
                              style={{
                                background: '#fffbeb',
                                borderBottom: '3px solid #fde047',
                                borderTop: index > 0 ? '1px dashed #fde047' : undefined,
                                boxShadow: 'inset 0 1px 3px rgba(234, 179, 8, 0.06)'
                              }}
                            >
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ca8a04', padding: '12px 10px' }}>
                                <Badge count={index + 1} style={{ backgroundColor: '#eab308', color: '#ffffff', fontWeight: 'bold' }} />
                              </td>
                              <td colSpan={7} style={{ padding: '10px 12px' }}>
                                <Input
                                  ref={(el) => (manualRowInputRefs.current[item.key] = el)}
                                  size="middle"
                                  placeholder="أدخل باركود أو كود الصنف واضغط Enter، أو اضغط [F1] لاختيار الصنف من القائمة..."
                                  prefix={<BarcodeOutlined style={{ color: '#d97706', fontSize: 18 }} />}
                                  onPressEnter={(e) => handleManualRowBarcodeSubmit(item.key, e.target.value)}
                                  style={{
                                    width: '100%',
                                    borderRadius: 6,
                                    borderColor: '#facc15',
                                    boxShadow: '0 1px 3px rgba(234, 179, 8, 0.1)',
                                    fontSize: 13.5
                                  }}
                                  autoFocus
                                />
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                <Button
                                  size="middle"
                                  icon={<SearchOutlined />}
                                  onClick={() => handleOpenF1SearchModal('invoice', item.key)}
                                  style={{
                                    color: '#7c3aed',
                                    borderColor: '#c4b5fd',
                                    background: '#f5f3ff',
                                    fontWeight: 700,
                                    borderRadius: 6
                                  }}
                                >
                                  بحث F1
                                </Button>
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                                  onClick={() => handleRemoveItem(item.key)}
                                  title="حذف هذا السطر"
                                />
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={item.key}
                            style={{
                              borderBottom: '2.5px solid #e2e8f0',
                              background: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            <td style={{ textAlign: 'center', color: '#475569', fontSize: 13, fontWeight: 700, padding: '12px 10px' }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <Text code style={{ fontSize: 12, fontWeight: 600 }}>{item.barcode || item.product_code || '—'}</Text>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{item.product_name}</div>
                              <Space size={6} wrap style={{ marginTop: 4 }}>
                                <Tag color="purple" style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 4, margin: 0 }}>
                                  المقاس: <strong style={{ color: item.size ? '#6b21a8' : '#94a3b8' }}>{item.size || '—'}</strong>
                                </Tag>
                                <Tag color="geekblue" style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 4, margin: 0 }}>
                                  اللون: <strong style={{ color: item.color ? '#1e40af' : '#94a3b8' }}>{item.color || '—'}</strong>
                                </Tag>
                                {item.product_code && <Text type="secondary" style={{ fontSize: 11 }}>كود: {item.product_code}</Text>}
                              </Space>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <Tag color="cyan" style={{ fontSize: 11, fontWeight: 600 }}>{item.category_name || 'عام'}</Tag>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <Space size={2}>
                                <Button
                                  size="small"
                                  icon={<MinusOutlined style={{ fontSize: 10 }} />}
                                  onClick={() => updateItemQty(item.key, -1)}
                                />
                                <InputNumber
                                  size="small"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(val) => handleUpdateItemRow(item.key, 'quantity', val || 1)}
                                  style={{ width: 60, textAlign: 'center', fontWeight: 'bold' }}
                                />
                                <Button
                                  size="small"
                                  icon={<PlusOutlined style={{ fontSize: 10 }} />}
                                  onClick={() => updateItemQty(item.key, 1)}
                                />
                              </Space>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <InputNumber
                                size="small"
                                min={0}
                                precision={2}
                                value={item.unit_cost}
                                onChange={(val) => handleUpdateItemRow(item.key, 'unit_cost', val || 0)}
                                style={{ width: 95 }}
                              />
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <InputNumber
                                size="small"
                                min={0}
                                precision={2}
                                value={item.selling_price}
                                onChange={(val) => handleUpdateItemRow(item.key, 'selling_price', val || 0)}
                                style={{ width: 95, borderColor: '#16a34a' }}
                              />
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <InputNumber
                                size="small"
                                min={0}
                                max={100}
                                value={item.discount_pct}
                                onChange={(val) => handleUpdateItemRow(item.key, 'discount_pct', val || 0)}
                                style={{ width: 65 }}
                              />
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, fontSize: 13.5, color: '#15803d' }}>
                              {(parseFloat(item.line_total) || 0).toLocaleString()} ج.م
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px 6px' }}>
                              <Space size={2}>
                                {item.product_id && (
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined style={{ color: '#2563eb' }} />}
                                    onClick={() => handleOpenMasterEdit(item.product_id, item.key)}
                                    title="تعديل بطاقة الصنف"
                                  />
                                )}
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleRemoveItem(item.key)}
                                  title="حذف هذا السطر"
                                />
                              </Space>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

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
                <Text strong style={{ color: '#065f46', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Package size={14} /> إجمالي الأصناف بالفاتورة: {items.filter(i => !i.isManualRow && i.product_id).length} منتج
                </Text>
                <Text strong style={{ color: '#065f46', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Hash size={14} /> إجمالي عدد القطع المشتراة: {calculateTotalPieces()} قطعة
                </Text>
                <Text strong style={{ color: '#065f46', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Coins size={15} /> إجمالي بضاعة المشتريات: {calculateSubtotal().toLocaleString()} ج.م
                </Text>
              </Space>

              <Button
                icon={<BarcodeOutlined />}
                onClick={handleOpenBarcodePrintFromCurrentDrawer}
                style={{ color: '#0f766e', borderColor: '#0f766e', background: '#ffffff', fontWeight: 700 }}
                disabled={!items.some(it => !it.isManualRow && it.product_id && it.quantity > 0)}
              >
                طباعة ملصقات الباركود للبضاعة
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

        {/* Sticky / Prominent Bottom Action Bar */}
        <div style={{
          position: 'sticky',
          bottom: -24,
          margin: '24px -24px -24px -24px',
          padding: '16px 24px',
          background: '#ffffff',
          borderTop: '2px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          <Space size="large" wrap>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي الأصناف</Text>
              <Text strong style={{ fontSize: 16 }}>{items.filter(i => i.product_id).length} صنف</Text>
            </div>
            <Divider type="vertical" style={{ height: 32 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي القطع المشتراة</Text>
              <Text strong style={{ fontSize: 16, color: '#2563eb' }}>{calculateTotalPieces()} قطعة</Text>
            </div>
            <Divider type="vertical" style={{ height: 32 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>الإجمالي النهائي المستحق</Text>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#16a34a' }}>
                {calculatedFinal.toLocaleString()} ج.م
              </span>
            </div>
          </Space>

          <Space size="middle">
            <Button
              icon={<BarcodeOutlined />}
              onClick={handleOpenBarcodePrintFromCurrentDrawer}
              style={{ color: '#0f766e', borderColor: '#0f766e', height: 42, fontWeight: 600 }}
              disabled={!items.some(it => !it.isManualRow && it.product_id && it.quantity > 0)}
            >
              طباعة باركود البضاعة
            </Button>
            <Button
              size="large"
              onClick={() => setIsCreateOpen(false)}
              style={{ height: 42 }}
            >
              إلغاء
            </Button>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleCreateInvoice}
              className="swm-btn-sale swm-btn-lg"
              style={{ minHeight: 48, padding: '0 32px', fontWeight: 'bold', fontSize: 15 }}
            >
              اعتماد الفاتورة وتحديث الأسعار والمخزون [F4]
            </Button>
          </Space>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* 2. EXPANSIVE STANDALONE PURCHASE RETURN MODAL (Full Desk) */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 10, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(220,38,38,0.15)' }}>
                <RollbackOutlined />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>فاتورة مرتجع مشتريات مستقلة إلى المورد</span>
                  <Tag color="error" style={{ fontSize: 12, fontWeight: 600 }}>إرجاع وخصم مخزني</Tag>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 'normal' }}>
                  إرجاع بضائع مباشرة للمورد مع تسوية الحساب المالي (خصم مديونية أو استرداد نقدي)
                </div>
              </div>
            </div>

            {/* Keyboard shortcuts ribbon */}
            <Space size={8} style={{ direction: 'ltr' }}>
              <Tag color="blue" icon={<Keyboard size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={handleAddStandaloneItem}>
                <strong style={{ color: '#1d4ed8' }}>F11</strong> إضافة صنف مرتجع
              </Tag>
              <Tag color="purple" icon={<Search size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={() => handleOpenF1SearchModal('return')}>
                <strong style={{ color: '#6d28d9' }}>F1</strong> بحث عن صنف
              </Tag>
              <Tag color="error" icon={<Zap size={13} />} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }} onClick={handleSubmitStandaloneReturn}>
                <strong style={{ color: '#b91c1c' }}>F4</strong> اعتماد المرتجع
              </Tag>
            </Space>
          </div>
        }
        open={isStandaloneReturnOpen}
        onCancel={() => setIsStandaloneReturnOpen(false)}
        footer={null}
        width="100vw"
        style={{ top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 }}
        styles={{ body: { height: 'calc(100vh - 75px)', overflowY: 'auto', padding: '16px 24px' } }}
        destroyOnHidden={false}
      >
        <Form layout="vertical">
          <Card
            size="small"
            style={{
              background: '#fff',
              border: '1px solid #fee2e2',
              borderRadius: 8,
              marginBottom: 14
            }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={<strong>المورد المرتجع إليه (Supplier) *</strong>} required style={{ marginBottom: 0 }}>
                  <Select
                    showSearch
                    size="large"
                    placeholder="اختر المورد..."
                    value={standaloneSupplier}
                    onChange={setStandaloneSupplier}
                    filterOption={(input, opt) => (opt?.children || '').toLowerCase().includes(input.toLowerCase())}
                    style={{ width: '100%' }}
                  >
                    {suppliersList.map(s => (
                      <Option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_code})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={<strong>المستودع المرتجع منه (Warehouse) *</strong>} required style={{ marginBottom: 0 }}>
                  <Select
                    size="large"
                    value={standaloneBranch || defaultBranchId}
                    disabled
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    {(() => {
                      const main = branchesList.find(b =>
                        b.id === (standaloneBranch || defaultBranchId) ||
                        b.branch_type === 'main_warehouse' ||
                        b.branch_name.includes('الرئيسي') ||
                        b.is_main === true
                      ) || branchesList[0];

                      return main ? (
                        <Option key={main.id} value={main.id}>
                          <Space size={6}><Building2 size={13} style={{ verticalAlign: 'middle' }} /><span>{main.branch_name} (المستودع الرئيسي المعتمد فقط)</span></Space>
                        </Option>
                      ) : (
                        <Option value={defaultBranchId || 1}>
                          <Space size={6}><Building2 size={13} style={{ verticalAlign: 'middle' }} /><span>الفرع الرئيسي (المستودع الرئيسي المعتمد فقط)</span></Space>
                        </Option>
                      );
                    })()}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={<strong>تاريخ المرتجع</strong>} style={{ marginBottom: 0 }}>
                  <Input
                    size="large"
                    type="date"
                    value={standaloneDate}
                    onChange={(e) => setStandaloneDate(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Return Items Section Header & Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Package size={15} /> الأصناف المراد إرجاعها للمورد (Return Items Grid)
            </div>
            <Space wrap>
              <Button
                type="dashed"
                danger
                icon={<PlusOutlined />}
                onClick={handleAddStandaloneItem}
                style={{ fontWeight: 700, borderRadius: 6 }}
              >
                + إضافة سطر مرتجع [F11]
              </Button>
              <Button
                icon={<SearchOutlined />}
                onClick={() => handleOpenF1SearchModal('return')}
                style={{ borderColor: '#dc2626', color: '#dc2626', background: '#fff', fontWeight: 700, borderRadius: 6 }}
              >
                بحث سريع عن الأصناف [F1]
              </Button>
              <Tooltip title="تحديث ومزامنة الأصناف من قاعدة البيانات">
                <Button
                  icon={<ReloadOutlined spin={refreshingProducts} />}
                  onClick={handleRefreshProductsList}
                  style={{ borderRadius: 6 }}
                >
                  تحديث
                </Button>
              </Tooltip>
            </Space>
          </div>

          {/* Return Items Tabular Grid */}
          <div style={{ marginBottom: 16 }}>
            {standaloneItems.length === 0 ? (
              <Card
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: 'linear-gradient(180deg, #fff5f5 0%, #fef2f2 100%)',
                  border: '2px dashed #fca5a5',
                  borderRadius: 12,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 16px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
                }}>
                  <RollbackOutlined />
                </div>
                <Title level={4} style={{ margin: '0 0 6px 0', color: '#1e293b' }}>
                  قائمة أصناف المرتجع فارغة حالياً
                </Title>
                <Text type="secondary" style={{ fontSize: 14, display: 'block', maxWidth: 620, margin: '0 auto 20px' }}>
                  ابدأ بإضافة سطر يدوي، أو استخدام اختصارات الكيبورد السريعة لتسريع إدخال مرتجع المشتريات:
                </Text>

                {/* Keyboard Shortcuts Visual Banner */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  background: '#ffffff',
                  border: '1px solid #fecaca',
                  padding: '10px 24px',
                  borderRadius: 30,
                  marginBottom: 24,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  flexWrap: 'wrap'
                }}>
                  <Space size={6}>
                    <Tag color="error" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F11</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>إضافة سطر إدخال يدوي</Text>
                  </Space>
                  <Divider type="vertical" style={{ height: 20 }} />
                  <Space size={6}>
                    <Tag color="purple" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F1</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>بحث واختيار من المجاميع والأصناف</Text>
                  </Space>
                  <Divider type="vertical" style={{ height: 20 }} />
                  <Space size={6}>
                    <Tag color="red" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4 }}>F4</Tag>
                    <Text strong style={{ fontSize: 13, color: '#334155' }}>اعتماد المرتجع وخصم المخزون</Text>
                  </Space>
                </div>

                {/* Action Buttons for Empty State */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Button
                    type="primary"
                    danger
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={handleAddStandaloneItem}
                    style={{
                      height: 44,
                      padding: '0 28px',
                      fontWeight: 700,
                      borderRadius: 8,
                      boxShadow: '0 4px 10px rgba(220,38,38,0.25)'
                    }}
                  >
                    + إضافة سطر صنف مرتجع جديد [F11]
                  </Button>
                  <Button
                    size="large"
                    icon={<SearchOutlined />}
                    onClick={() => handleOpenF1SearchModal('return')}
                    style={{
                      height: 44,
                      padding: '0 28px',
                      color: '#7c3aed',
                      borderColor: '#c4b5fd',
                      background: '#f5f3ff',
                      fontWeight: 700,
                      borderRadius: 8
                    }}
                  >
                    بحث واختيار من الأصناف والمجاميع [F1]
                  </Button>
                </div>
              </Card>
            ) : (
              <div>
                {/* Clean Top Action Header above table */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  padding: '8px 14px',
                  background: '#fef2f2',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <Space size="middle">
                    <Button
                      type="primary"
                      danger
                      icon={<PlusOutlined />}
                      onClick={handleAddStandaloneItem}
                      style={{ fontWeight: 700, borderRadius: 6 }}
                    >
                      + إضافة سطر صنف مرتجع جديد [F11]
                    </Button>
                    <Button
                      icon={<SearchOutlined />}
                      onClick={() => handleOpenF1SearchModal('return')}
                      style={{ borderColor: '#7c3aed', color: '#7c3aed', background: '#f5f3ff', fontWeight: 700, borderRadius: 6 }}
                    >
                      بحث واختيار من الأصناف والمجاميع [F1]
                    </Button>
                  </Space>
                  <Space size={8}>
                    <Tag color="error" style={{ fontWeight: 600 }}>[F11] سطر مرتجع</Tag>
                    <Tag color="purple" style={{ fontWeight: 600 }}>[F1] بحث الأصناف</Tag>
                    <Tag color="red" style={{ fontWeight: 600 }}>[F4] اعتماد المرتجع</Tag>
                  </Space>
                </div>

                <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 10, overflowX: 'auto', background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                    <thead style={{ background: '#fef2f2', borderBottom: '2.5px solid #fecaca' }}>
                      <tr style={{ color: '#991b1b' }}>
                        <th style={{ padding: '12px 10px', width: 44, textAlign: 'center', fontWeight: 700 }}>#</th>
                        <th style={{ padding: '12px 10px', width: 140, fontWeight: 700 }}>كود / باركود</th>
                        <th style={{ padding: '12px 10px', fontWeight: 700 }}>اسم الصنف والمواصفات</th>
                        <th style={{ padding: '12px 10px', width: 110, textAlign: 'center', fontWeight: 700 }}>المجموعة</th>
                        <th style={{ padding: '12px 10px', width: 140, textAlign: 'center', fontWeight: 700 }}>الكمية المرتجعة</th>
                        <th style={{ padding: '12px 10px', width: 160, textAlign: 'center', fontWeight: 700 }}>سعر التكلفة المحسوب (ج.م)</th>
                        <th style={{ padding: '12px 10px', width: 140, textAlign: 'center', fontWeight: 700 }}>إجمالي السطر</th>
                        <th style={{ padding: '12px 6px', width: 70, textAlign: 'center', fontWeight: 700 }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standaloneItems.map((item, index) => {
                        if (item.isManualRow || !item.product_id) {
                          return (
                            <tr
                              key={item.key}
                              style={{
                                background: '#fffbeb',
                                borderBottom: '3px solid #fde047',
                                borderTop: index > 0 ? '1px dashed #fde047' : undefined,
                                boxShadow: 'inset 0 1px 3px rgba(234, 179, 8, 0.06)'
                              }}
                            >
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ca8a04', padding: '12px 10px' }}>
                                <Badge count={index + 1} style={{ backgroundColor: '#eab308', color: '#ffffff', fontWeight: 'bold' }} />
                              </td>
                              <td colSpan={5} style={{ padding: '10px 12px' }}>
                                <Input
                                  ref={(el) => (manualReturnRowInputRefs.current[item.key] = el)}
                                  size="middle"
                                  placeholder="أدخل باركود أو كود الصنف واضغط Enter، أو اضغط [F1] لاختيار الصنف من القائمة..."
                                  prefix={<BarcodeOutlined style={{ color: '#d97706', fontSize: 18 }} />}
                                  onPressEnter={(e) => handleReturnManualRowBarcodeSubmit(item.key, e.target.value)}
                                  style={{
                                    width: '100%',
                                    borderRadius: 6,
                                    borderColor: '#facc15',
                                    boxShadow: '0 1px 3px rgba(234, 179, 8, 0.1)',
                                    fontSize: 13.5
                                  }}
                                  autoFocus
                                />
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                                <Button
                                  size="middle"
                                  icon={<SearchOutlined />}
                                  onClick={() => handleOpenF1SearchModal('return', item.key)}
                                  style={{
                                    color: '#7c3aed',
                                    borderColor: '#c4b5fd',
                                    background: '#f5f3ff',
                                    fontWeight: 700,
                                    borderRadius: 6
                                  }}
                                >
                                  بحث F1
                                </Button>
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined style={{ fontSize: 16 }} />}
                                  onClick={() => handleRemoveStandaloneItem(item.key)}
                                  title="حذف هذا السطر"
                                />
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={item.key}
                            style={{
                              borderBottom: '2.5px solid #e2e8f0',
                              background: index % 2 === 0 ? '#ffffff' : '#fef2f2',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            <td style={{ textAlign: 'center', color: '#475569', fontSize: 13, fontWeight: 700, padding: '12px 10px' }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <Text code style={{ fontSize: 12, fontWeight: 600 }}>{item.barcode || item.product_code || '—'}</Text>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{item.product_name}</div>
                              <Space size={6} wrap style={{ marginTop: 4 }}>
                                <Tag color="purple" style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 4, margin: 0 }}>
                                  المقاس: <strong style={{ color: item.size ? '#6b21a8' : '#94a3b8' }}>{item.size || '—'}</strong>
                                </Tag>
                                <Tag color="geekblue" style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 4, margin: 0 }}>
                                  اللون: <strong style={{ color: item.color ? '#1e40af' : '#94a3b8' }}>{item.color || '—'}</strong>
                                </Tag>
                                {item.product_code && <Text type="secondary" style={{ fontSize: 11 }}>كود: {item.product_code}</Text>}
                              </Space>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <Tag color="cyan" style={{ fontSize: 11, fontWeight: 600 }}>{item.category_name || 'عام'}</Tag>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <Space size={2}>
                                <Button
                                  size="small"
                                  icon={<MinusOutlined style={{ fontSize: 10 }} />}
                                  onClick={() => updateReturnItemQty(item.key, -1)}
                                />
                                <InputNumber
                                  size="small"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(val) => handleUpdateStandaloneItem(item.key, 'quantity', val || 1)}
                                  style={{ width: 60, textAlign: 'center', fontWeight: 'bold' }}
                                />
                                <Button
                                  size="small"
                                  icon={<PlusOutlined style={{ fontSize: 10 }} />}
                                  onClick={() => updateReturnItemQty(item.key, 1)}
                                />
                              </Space>
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <InputNumber
                                size="small"
                                min={0}
                                precision={2}
                                value={item.unit_cost}
                                onChange={(val) => handleUpdateStandaloneItem(item.key, 'unit_cost', val || 0)}
                                style={{ width: 105 }}
                              />
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, fontSize: 13.5, color: '#dc2626' }}>
                              {(parseFloat(item.line_total) || 0).toLocaleString()} ج.م
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px 6px' }}>
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveStandaloneItem(item.key)}
                                title="حذف هذا السطر"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

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

        {/* Sticky / Prominent Bottom Action Bar */}
        <div style={{
          position: 'sticky',
          bottom: -24,
          margin: '24px -24px -24px -24px',
          padding: '16px 24px',
          background: '#ffffff',
          borderTop: '2px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          <Space size="large" wrap>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>الأصناف المرتجعة</Text>
              <Text strong style={{ fontSize: 16 }}>{standaloneItems.filter(i => i.product_id).length} صنف</Text>
            </div>
            <Divider type="vertical" style={{ height: 32 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي القطع</Text>
              <Text strong style={{ fontSize: 16, color: '#dc2626' }}>
                {standaloneItems.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0)} قطعة
              </Text>
            </div>
            <Divider type="vertical" style={{ height: 32 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي قيمة المرتجع</Text>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#dc2626' }}>
                {calculatedStandaloneTotal.toLocaleString()} ج.م
              </span>
            </div>
          </Space>

          <Space size="middle">
            <Button
              size="large"
              onClick={() => setIsStandaloneReturnOpen(false)}
              style={{ height: 42 }}
            >
              إلغاء
            </Button>
            <Button
              type="primary"
              danger
              size="large"
              loading={standaloneSubmitting}
              onClick={handleSubmitStandaloneReturn}
              className="swm-btn-danger swm-btn-lg"
              style={{ minHeight: 48, padding: '0 32px', fontWeight: 'bold', fontSize: 15 }}
            >
              اعتماد فاتورة المرتجع وخصم المخزون [F4]
            </Button>
          </Space>
        </div>
      </Modal>

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
        width="95vw"
        style={{ top: 12, maxWidth: 1380, paddingBottom: 0 }}
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
                    title: 'اسم الصنف والمواصفات',
                    dataIndex: 'product_name',
                    key: 'product_name',
                    render: (name, r) => (
                      <div>
                        <Text strong>{name}</Text>
                        <Space size={4} wrap style={{ marginTop: 2, display: 'flex' }}>
                          {r.size && <Tag color="purple" style={{ fontSize: 10.5, fontWeight: 700, margin: 0 }}>المقاس: {r.size}</Tag>}
                          {r.color && <Tag color="geekblue" style={{ fontSize: 10.5, fontWeight: 700, margin: 0 }}>اللون: {r.color}</Tag>}
                          {r.product_code && <Text type="secondary" style={{ fontSize: 11 }}>كود: {r.product_code}</Text>}
                        </Space>
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
                className="btn-print"
                style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}
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
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintInvoice} className="btn-print" style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}>
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
                      <div style={{ marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.size && (
                          <span style={{ background: '#f3e8ff', color: '#6b21a8', fontSize: 10.5, padding: '1px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #d8b4fe' }}>
                            المقاس: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span style={{ background: '#eff6ff', color: '#1e40af', fontSize: 10.5, padding: '1px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #bfdbfe' }}>
                            اللون: {item.color}
                          </span>
                        )}
                      </div>
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
              icon={<PrinterOutlined />}
              onClick={handlePrintReturn}
              className="btn-print"
              style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}
            >
              طباعة إشعار المرتجع
            </Button>
          </div>
        }
        open={returnDetailsOpen}
        onCancel={() => setReturnDetailsOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReturnDetailsOpen(false)}>إغلاق</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintReturn} className="btn-print" style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}>
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
                      <div style={{ marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.size && (
                          <span style={{ background: '#f3e8ff', color: '#6b21a8', fontSize: 10.5, padding: '1px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #d8b4fe' }}>
                            المقاس: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span style={{ background: '#eff6ff', color: '#1e40af', fontSize: 10.5, padding: '1px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #bfdbfe' }}>
                            اللون: {item.color}
                          </span>
                        )}
                      </div>
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
                            className="swm-btn-cobalt"
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
                          className="swm-btn-cobalt"
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
              optionFilterProp="label"
              filterOption={(input, opt) => (String(opt?.label || opt?.children || '')).toLowerCase().includes(input.toLowerCase())}
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
                <Option key={c.id} value={c.id} label={c.category_name}>
                  <Space size={6}><Folder size={13} style={{ verticalAlign: 'middle', color: '#64748b' }} /><span>{c.category_name}</span></Space>
                </Option>
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
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#166534' }}>
                <Lightbulb size={13} style={{ color: '#16a34a', flexShrink: 0 }} /> يمكنك رفع صورة خاصة لكل لون من جهازك أو لصق رابط مباشر للصورة. ستظهر الصورة تلقائياً في المتجر والكتالوج عند اختيار اللون.
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

      {/* ========================================================================= */}
      {/* POS-STYLE PRODUCT SEARCH & PICKER MODAL (F1)                              */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#ede9fe', color: '#7c3aed', padding: '6px 10px', borderRadius: 8, fontSize: 18 }}>
                <SearchOutlined />
              </div>
              <div>
                <span style={{ fontSize: 17, fontWeight: 'bold' }}>
                  نافذة البحث السريع عن الأصناف والمجاميع (F1)
                </span>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {f1SearchTarget === 'invoice' ? 'اختيار صنف وتضمينه في فاتورة المشتريات' : 'اختيار صنف وتضمينه في فاتورة المرتجع'} | مسجل بالنظام: {productsList.length} صنف
                </div>
              </div>
            </div>

            <Space size="middle">
              <Button
                type="primary"
                icon={<Sparkles size={14} />}
                onClick={() => handleOpenMasterCreate(f1TargetItemKey)}
                style={{
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  fontWeight: 700,
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(5,150,105,0.25)'
                }}
              >
                إضافة صنف جديد للمنظومة
              </Button>
              <Tag color="purple" style={{ fontSize: 12 }}>
                اضغط <strong>[Enter]</strong> أو انقر نقراً مزدوجاً على الصنف لاختياره فوراً
              </Tag>
            </Space>
          </div>
        }
        open={f1ModalOpen}
        onCancel={() => setF1ModalOpen(false)}
        footer={null}
        width={1050}
        style={{ top: 25 }}
        destroyOnHidden
      >
        <div style={{ display: 'flex', gap: 14, height: 500, direction: 'rtl' }}>
          {/* Right Sidebar: Categories / Groups (المجاميع والتصنيفات) */}
          <div
            style={{
              width: 230,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', padding: '6px 8px', borderBottom: '1px solid #cbd5e1', marginBottom: 6 }}>
              <AppstoreOutlined style={{ marginLeft: 6, color: '#2563eb' }} />
              المجاميع والتصنيفات
            </div>

            <Button
              type={f1CategoryFilter === 'all' ? 'primary' : 'text'}
              style={{
                textAlign: 'right',
                justifyContent: 'flex-start',
                marginBottom: 4,
                borderRadius: 6,
                fontWeight: f1CategoryFilter === 'all' ? 700 : 500,
                backgroundColor: f1CategoryFilter === 'all' ? '#2563eb' : undefined
              }}
              onClick={() => handleF1CategoryChange('all')}
            >
              جميع الأصناف ({productsList.length})
            </Button>

            {categoriesList.map((cat) => {
              const count = productsList.filter((p) => p.category_id === cat.id).length;
              return (
                <Button
                  key={cat.id}
                  type={f1CategoryFilter === cat.id ? 'primary' : 'text'}
                  style={{
                    textAlign: 'right',
                    justifyContent: 'space-between',
                    marginBottom: 3,
                    borderRadius: 6,
                    fontWeight: f1CategoryFilter === cat.id ? 700 : 500,
                    backgroundColor: f1CategoryFilter === cat.id ? '#2563eb' : undefined,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => handleF1CategoryChange(cat.id)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.category_name}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>({count})</span>
                </Button>
              );
            })}
          </div>

          {/* Left / Main Section: Search Input & Product Results Table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Input
                ref={f1SearchInputRef}
                size="large"
                placeholder="ابحث بالاسم، كود الصنف، الموديل، أو الباركود..."
                prefix={<SearchOutlined style={{ color: '#2563eb' }} />}
                value={f1SearchQuery}
                onChange={(e) => handleF1SearchQueryChange(e.target.value)}
                allowClear
                autoFocus
                style={{ borderRadius: 8, flex: 1 }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff' }}>
              <Table
                dataSource={f1SearchResults}
                rowKey={(r) => `${r.product_id || r.id}-${r.variant_id || `${r.color || ''}-${r.size || ''}` || '0'}`}
                loading={f1Loading}
                pagination={false}
                size="middle"
                onRow={(record) => ({
                  onDoubleClick: () => handleSelectProductFromF1Modal(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: 'كود / باركود',
                    dataIndex: 'barcode',
                    key: 'barcode',
                    width: 140,
                    render: (b, r) => <Text code copyable={{ text: b || r.product_code || '' }}>{b || r.product_code || '—'}</Text>
                  },
                  {
                    title: 'اسم الصنف والمواصفات',
                    dataIndex: 'display_name',
                    key: 'display_name',
                    render: (name, r) => {
                      const isAlreadyAdded = f1SearchTarget === 'invoice'
                        ? items.some(it => (it.product_id === r.product_id || it.product_id === r.id) && (!r.variant_id || it.variant_id === r.variant_id))
                        : standaloneItems.some(it => (it.product_id === r.product_id || it.product_id === r.id));

                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Text strong style={{ fontSize: 13, color: '#0f172a' }}>{name || r.product_name}</Text>
                            {isAlreadyAdded && (
                              <Tag color="success" style={{ fontSize: 10, margin: 0 }}>مضاف بالفاتورة</Tag>
                            )}
                          </div>
                          <Space size={4} style={{ marginTop: 2 }}>
                            {r.color && <Tag color="geekblue" style={{ fontSize: 10 }}>اللون: {r.color}</Tag>}
                            {r.size && <Tag color="purple" style={{ fontSize: 10 }}>المقاس: {r.size}</Tag>}
                            {r.category_name && <Tag color="cyan" icon={<Folder size={10} />} style={{ fontSize: 10 }}>{r.category_name}</Tag>}
                          </Space>
                        </div>
                      );
                    }
                  },
                  {
                    title: 'سعر التكلفة',
                    dataIndex: 'cost_price',
                    key: 'cost_price',
                    width: 110,
                    align: 'center',
                    render: (c) => <Text strong style={{ color: '#0f766e', fontSize: 13 }}>{(parseFloat(c) || 0).toLocaleString()} ج.م</Text>
                  },
                  {
                    title: 'سعر البيع',
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    width: 110,
                    align: 'center',
                    render: (p, r) => <Text strong style={{ color: '#16a34a', fontSize: 13 }}>{(parseFloat(p || r.selling_price) || 0).toLocaleString()} ج.م</Text>
                  },
                  {
                    title: 'المخزون الحالي',
                    dataIndex: 'available_qty',
                    key: 'available_qty',
                    width: 110,
                    align: 'center',
                    render: (qty) => (
                      <Badge
                        count={`${qty ?? 0} متاح`}
                        style={{
                          backgroundColor: (qty ?? 0) > 5 ? '#52c41a' : (qty ?? 0) > 0 ? '#fa8c16' : '#94a3b8',
                          fontSize: 10
                        }}
                      />
                    )
                  },
                  {
                    title: 'إجراء',
                    key: 'action',
                    width: 170,
                    align: 'center',
                    render: (_, r) => (
                      <Space size={4}>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          className="swm-btn-emerald"
                          style={{ borderRadius: 6, fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProductFromF1Modal(r);
                          }}
                        >
                          اختيار
                        </Button>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff', borderRadius: 6, fontSize: 11 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddAllVariantsOfProduct(r.product_id || r.id);
                          }}
                          title="إضافة كل المقاسات والألوان المتاحة لهذا الصنف دفعة واحدة"
                        >
                          كل المقاسات
                        </Button>
                      </Space>
                    )
                  }
                ]}
              />
            </div>

            {/* Footer inside F1 modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={13} style={{ color: '#d97706', flexShrink: 0 }} /> تلميح: انقر نقراً مزدوجاً (Double Click) على أي سطر لاختيار الصنف فوراً، أو اضغط زر [كل المقاسات] لإدراج كافة المتغيرات.
              </Text>
              <Button onClick={() => setF1ModalOpen(false)}>
                إغلاق [Esc]
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
