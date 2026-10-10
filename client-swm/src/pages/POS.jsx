import React, { useState, useEffect, useRef } from 'react';
import { Banknote, CreditCard, Smartphone, Check, AlertTriangle } from 'lucide-react';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  Radio,
  Divider,
  Badge,
  Tooltip,
  Alert,
  Segmented,
  Table,
  Switch,
  List
} from 'antd';
import { antMessage as message } from '../utils/antAppBridge';
import {
  BarcodeOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  DollarOutlined,
  LockOutlined,
  UnlockOutlined,
  SwapOutlined,
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  CreditCardOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  CheckOutlined
} from '@ant-design/icons';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';
import CustomerLookup from '../components/CustomerLookup';

const { Title, Text } = Typography;
const { Option } = Select;

export default function POS({ currentUser }) {
  // Session State
  const [sessionData, setSessionData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Active user and Role-Based Access Control
  const activeUser = currentUser || (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
  })();

  const isSupervisor = Boolean(
    activeUser && (
      activeUser.role === 'supervisor' ||
      ['super_admin', 'admin'].includes(activeUser.role) ||
      activeUser.isSupervisor === true
    )
  );

  // Transaction Mode: 'sale' (فاتورة بيع) or 'return' (مرتجع مبيعات)
  const [invoiceType, setInvoiceType] = useState('sale'); // 'sale' | 'return'

  // Staff / Salesperson State (Filtered strictly to current active branch)
  const [branchSellers, setBranchSellers] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);

  // Supervisor Dynamic Validation Settings
  const [supervisorSettings, setSupervisorSettings] = useState({
    require_customer_name: false,
    require_customer_phone: false
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Customer Loyalty & Points State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // Cart / Invoice Items State
  // Item structure: { key, product_id, variant_id, product_name, product_code, barcode, unit_price, available_qty, quantity, line_total, isManualRow }
  const [cart, setCart] = useState([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0); // Global Invoice Discount
  const [taxAmount, setTaxAmount] = useState(0);

  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Multi-Payment State (Cash, Card, Transfer) - Initialized to 0
  const [cashTendered, setCashTendered] = useState(0);
  const [cardTendered, setCardTendered] = useState(0);
  const [transferTendered, setTransferTendered] = useState(0);

  // F1 Product Search Modal State
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalProducts, setModalProducts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const modalSearchInputRef = useRef(null);

  // Refs for manual empty rows
  const manualRowInputRefs = useRef({});

  // Drawer & Cash Session Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [cashMovModalVisible, setCashMovModalVisible] = useState(false);
  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const [cashMovForm] = Form.useForm();

  // Completed Receipt Modal
  const [lastInvoice, setLastInvoice] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  // Fetch Session Info
  const fetchSession = async () => {
    setSessionLoading(true);
    try {
      const res = await api.get('/api/swm/pos/session/current');
      if (res.data.success) {
        setSessionData(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في استعلام الخزينة والوردية');
    } finally {
      setSessionLoading(false);
    }
  };

  // Fetch Sellers assigned ONLY to the current active branch
  const fetchBranchSellers = async (branchId) => {
    try {
      let bId = branchId;
      if (!bId) {
        bId = currentUser?.branch_id || currentUser?.branchId;
        if (!bId) {
          try {
            const stored = localStorage.getItem('user');
            if (stored) {
              const u = JSON.parse(stored);
              bId = u?.branch_id || u?.branchId;
            }
          } catch (e) {}
        }
      }

      const params = { status: 'active' };
      if (bId) {
        params.branch_id = bId;
      }
      const res = await api.get('/api/swm/users', { params });
      if (res.data.success) {
        const allUsers = res.data.data || [];
        // Filter strictly to staff assigned to this active branch ONLY
        const sellers = bId
          ? allUsers.filter((u) => Number(u.branch_id) === Number(bId))
          : allUsers;
        setBranchSellers(sellers);
        if (sellers.length > 0 && !selectedSalesperson) {
          setSelectedSalesperson(sellers[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch branch sellers error:', err);
    }
  };

  // Fetch Product Categories/Groups for F1 Modal Sidebar
  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/swm/categories');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  // Fetch supervisor dynamic validation rules and permissions from store settings
  const fetchSupervisorSettings = async () => {
    try {
      const res = await api.get('/api/swm/store-settings');
      if (res.data.success && Array.isArray(res.data.data)) {
        const map = {};
        res.data.data.forEach((item) => {
          map[item.key] = item.value;
        });
        setSupervisorSettings({
          require_customer_name: map['pos_require_client_name'] !== 'false',
          require_customer_phone: map['pos_require_client_phone'] !== 'false',
          pos_allow_salesperson_discount: map['pos_allow_salesperson_discount'] !== 'false',
          pos_max_salesperson_discount_pct: map['pos_max_salesperson_discount_pct'] !== undefined
            ? parseFloat(map['pos_max_salesperson_discount_pct'])
            : 5,
          pos_allow_salesperson_return: map['pos_allow_salesperson_return'] === 'true'
        });
      }
    } catch (err) {
      console.error('Fetch supervisor settings error:', err);
    }
  };

  const handleSaveSupervisorSettings = async (values) => {
    setSavingSettings(true);
    try {
      const res = await api.put('/api/swm/pos/settings', values);
      if (res.data.success) {
        message.success('تم حفظ إعدادات مشرف الفرع بنجاح');
        setSupervisorSettings(values);
        setSettingsModalVisible(false);
      }
    } catch (err) {
      message.error('فشل في حفظ إعدادات المشرف');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchLoyaltySettings = async () => {
    try {
      const res = await api.get('/api/swm/loyalty/settings');
      if (res.data?.success) {
        setLoyaltySettings(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load loyalty settings:', e);
    }
  };

  useEffect(() => {
    fetchSession().then((session) => {
      const bId = session?.register?.branch_id;
      fetchBranchSellers(bId);
    });
    fetchCategories();
    fetchSupervisorSettings();
    fetchLoyaltySettings();
  }, []);

  // Strict Keyboard Workflow:
  // Step 1: F11 => Add empty row
  // Step 2: F1  => Open Product Search Modal
  // Step 3: F4  => Execute Complete Sale / Return
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleStep1AddEmptyRow();
      } else if (e.key === 'F1') {
        e.preventDefault();
        handleStep2OpenSearchModal();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleStep3CompleteSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Step 1: Pressing F11 dynamically appends a new empty row
  const handleStep1AddEmptyRow = () => {
    const tempKey = `empty-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        key: tempKey,
        isManualRow: true,
        product_id: null,
        variant_id: null,
        product_name: '',
        product_code: '',
        barcode: '',
        unit_price: 0,
        available_qty: 0,
        quantity: 1,
        discount_amount: 0,
        line_total: 0
      }
    ]);
    message.info('خطوة 1 [F11]: تمت إضافة سطر جديد للإدخال اليدوي. اضغط F1 للبحث أو امسح الباركود.');
    setTimeout(() => {
      if (manualRowInputRefs.current[tempKey]) {
        manualRowInputRefs.current[tempKey].focus();
      }
    }, 100);
  };

  // Step 2: Pressing F1 opens the Product Search Modal
  const handleStep2OpenSearchModal = () => {
    setSearchModalVisible(true);
    fetchModalProducts(modalSearchQuery, selectedCategory);
    setTimeout(() => {
      modalSearchInputRef.current?.focus();
    }, 150);
  };

  // Fetch products inside F1 modal based on search query and category
  const fetchModalProducts = async (q = '', catId = 'all') => {
    setModalLoading(true);
    try {
      const params = {};
      if (q && q.trim()) params.query = q.trim();
      if (catId && catId !== 'all') params.category_id = catId;

      const res = await api.get('/api/swm/pos/search', { params });
      if (res.data.success) {
        setModalProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch modal products error:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Category clicked in F1 modal sidebar
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    fetchModalProducts(modalSearchQuery, catId);
  };

  // Search input changed in F1 modal
  const handleModalSearchChange = (val) => {
    setModalSearchQuery(val);
    fetchModalProducts(val, selectedCategory);
  };

  // Product selected from F1 modal: automatically appended/populated into current row
  const handleSelectProductFromModal = (product) => {
    if (invoiceType === 'sale' && product.available_qty <= 0) {
      return message.warning(`الصنف "${product.display_name}" غير متوفر في مخزون الفرع!`);
    }

    // Check if there is an empty manual row to fill
    const emptyRow = cart.find((item) => item.isManualRow);
    if (emptyRow) {
      populateProductIntoRow(emptyRow.key, product);
    } else {
      addToCart(product);
    }

    setSearchModalVisible(false);
    setModalSearchQuery('');
    message.success(`تم اختيار الصنف: ${product.display_name}`);
  };

  // Populate product into a specific row
  const populateProductIntoRow = (rowKey, product) => {
    const unitPrice = parseFloat(product.unit_price) || 0;
    const finalKey = `${product.product_id}-${product.variant_id || 'base'}`;

    setCart((prev) => {
      const existingOther = prev.find((item) => item.key === finalKey && item.key !== rowKey);
      if (existingOther) {
        const newQty = existingOther.quantity + 1;
        const lineTotal = newQty * existingOther.unit_price;
        return prev
          .filter((item) => item.key !== rowKey)
          .map((item) => (item.key === finalKey ? { ...item, quantity: newQty, line_total: lineTotal } : item));
      }

      return prev.map((item) => {
        if (item.key === rowKey) {
          return {
            key: finalKey,
            isManualRow: false,
            product_id: product.product_id,
            variant_id: product.variant_id,
            product_name: product.display_name,
            product_code: product.product_code,
            barcode: product.barcode,
            unit_price: unitPrice,
            available_qty: product.available_qty,
            quantity: 1,
            line_total: unitPrice
          };
        }
        return item;
      });
    });
  };

  // Manual barcode/code entered directly in empty row
  const handleManualRowBarcodeSubmit = async (rowKey, inputCode) => {
    if (!inputCode || !inputCode.trim()) return;

    try {
      const res = await api.get('/api/swm/pos/search', { params: { query: inputCode.trim() } });
      if (res.data.success && res.data.data.length > 0) {
        const product = res.data.data[0];
        populateProductIntoRow(rowKey, product);
        message.success(`تم إدراج: ${product.display_name}`);
      } else {
        message.warning(`لم يتم العثور على صنف بالباركود أو الكود: ${inputCode}`);
      }
    } catch (err) {
      message.error('خطأ أثناء البحث عن الصنف');
    }
  };

  // Add Item directly to cart
  const addToCart = (product) => {
    if (invoiceType === 'sale' && product.available_qty <= 0) {
      return message.warning(`عذراً، الصنف "${product.display_name}" غير متوفر في مخزون الفرع حالياً!`);
    }

    setCart((prev) => {
      const itemKey = `${product.product_id}-${product.variant_id || 'base'}`;
      const existing = prev.find((item) => item.key === itemKey);

      if (existing) {
        if (invoiceType === 'sale' && existing.quantity >= product.available_qty) {
          message.warning(`الكمية المتاحة في المخزون (${product.available_qty}) فقط!`);
          return prev;
        }
        return prev.map((item) => {
          if (item.key === itemKey) {
            const newQty = item.quantity + 1;
            const lineTotal = newQty * item.unit_price;
            return { ...item, quantity: newQty, line_total: lineTotal };
          }
          return item;
        });
      }

      const unitPrice = parseFloat(product.unit_price) || 0;
      return [
        ...prev,
        {
          key: itemKey,
          isManualRow: false,
          product_id: product.product_id,
          variant_id: product.variant_id,
          product_name: product.display_name,
          product_code: product.product_code,
          barcode: product.barcode,
          unit_price: unitPrice,
          available_qty: product.available_qty,
          quantity: 1,
          line_total: unitPrice
        }
      ];
    });
  };

  // Update item quantity
  const updateCartQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (invoiceType === 'sale' && newQty > item.available_qty) {
            message.warning(`الكمية المتاحة في المخزون (${item.available_qty}) فقط!`);
            return item;
          }
          const lineTotal = newQty * item.unit_price;
          return { ...item, quantity: newQty, line_total: lineTotal };
        })
        .filter(Boolean)
    );
  };

  // Set item quantity directly
  const setCartQtyDirect = (key, qtyVal) => {
    const val = parseInt(qtyVal, 10);
    if (isNaN(val) || val <= 0) return;

    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (invoiceType === 'sale' && val > item.available_qty) {
          message.warning(`الكمية المتاحة في المخزون (${item.available_qty}) فقط!`);
          return item;
        }
        const lineTotal = val * item.unit_price;
        return { ...item, quantity: val, line_total: lineTotal };
      })
    );
  };

  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    setCart([]);
    setInvoiceDiscount(0);
    setTaxAmount(0);
    setCashTendered(0);
    setCardTendered(0);
    setTransferTendered(0);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSaleNotes('');
    setSelectedCustomer(null);
    setRedeemPoints(0);
  };

  // Active items in invoice
  const validItems = cart.filter((item) => !item.isManualRow && item.product_id);

  // Financial calculations
  const subtotal = validItems.reduce((sum, item) => sum + item.line_total, 0);
  const pointVal = loyaltySettings?.loyalty_point_value || 0.5;
  const pointsDiscountValue = (redeemPoints > 0)
    ? Math.round(redeemPoints * pointVal * 100) / 100
    : 0;
  const netTotal = Math.max(
    0,
    subtotal - parseFloat(invoiceDiscount || 0) - pointsDiscountValue + parseFloat(taxAmount || 0)
  );

  // Multi-Payment calculations
  const totalTendered =
    parseFloat(cashTendered || 0) +
    parseFloat(cardTendered || 0) +
    parseFloat(transferTendered || 0);

  const remainingDue = Math.max(0, netTotal - totalTendered);
  const isOverpaid = totalTendered > netTotal && netTotal > 0;

  // Convenience quick-pay buttons
  const handleQuickPayCash = () => {
    setCashTendered(netTotal);
    setCardTendered(0);
    setTransferTendered(0);
  };

  const handleQuickPayCard = () => {
    setCardTendered(netTotal);
    setCashTendered(0);
    setTransferTendered(0);
  };

  const handleQuickPayTransfer = () => {
    setTransferTendered(netTotal);
    setCashTendered(0);
    setCardTendered(0);
  };

  // Step 3: Pressing F4 executes the Complete Sale / Return action
  const handleStep3CompleteSale = async () => {
    if (validItems.length === 0) {
      return message.error('الفاتورة لا تحتوي على أصناف صالحة. اضغط F11 ثم F1 لإضافة أصناف.');
    }

    // Dynamic Client Data Validation
    if (supervisorSettings.require_customer_name && (!customerName || !customerName.trim())) {
      return message.error('اسم العميل حقل إلزامي بحسب إعدادات مشرف الفرع');
    }

    if (supervisorSettings.require_customer_phone && (!customerPhone || !customerPhone.trim())) {
      return message.error('رقم هاتف العميل حقل إلزامي بحسب إعدادات مشرف الفرع');
    }

    // Multi-Payment Validation
    if (isOverpaid) {
      return message.error(
        `المبلغ المدفوع (${totalTendered.toFixed(2)} ج.م) يتجاوز إجمالي الفاتورة (${netTotal.toFixed(2)} ج.م)! يرجى ضبط المبلغ بدقة.`
      );
    }

    if (totalTendered < netTotal) {
      return message.error(
        `المبلغ المدفوع (${totalTendered.toFixed(2)} ج.م) أقل من إجمالي الفاتورة (${netTotal.toFixed(2)} ج.م). المتبقي: ${remainingDue.toFixed(2)} ج.م`
      );
    }

    setIsSubmittingSale(true);
    try {
      const payload = {
        salesperson_id: selectedSalesperson,
        customer_id: selectedCustomer?.id || undefined,
        redeem_points: redeemPoints > 0 ? redeemPoints : 0,
        customer_name: customerName.trim() || (invoiceType === 'return' ? 'عميل مرتجع' : 'عميل نقدي'),
        customer_phone: customerPhone.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
        discount_amount: parseFloat(invoiceDiscount) || 0,
        tax_amount: parseFloat(taxAmount) || 0,
        payment_method: 'multi',
        payment_breakdown: {
          cash: parseFloat(cashTendered || 0),
          card: parseFloat(cardTendered || 0),
          transfer: parseFloat(transferTendered || 0)
        },
        notes: saleNotes || (invoiceType === 'return' ? 'فاتورة مرتجع مبيعات' : undefined),
        items: validItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: 0,
          product_name: item.product_name,
          product_code: item.product_code
        }))
      };

      const endpoint = invoiceType === 'return' ? '/api/swm/pos/return' : '/api/swm/pos/sale';
      const res = await api.post(endpoint, payload);

      if (res.data.success) {
        const invNum = res.data.data.invoice_number;
        message.success(
          invoiceType === 'return'
            ? `تم حفظ فاتورة المرتجع بنجاح: ${invNum}`
            : `تم حفظ فاتورة البيع بنجاح: ${invNum}`
        );

        setLastInvoice({
          ...res.data.data,
          items: res.data.items,
          branch_name: res.data.data?.branch_name || sessionData?.branch?.branch_name || activeUser?.branchName || 'الفرع الرئيسي',
          register_name: sessionData?.register?.register_name,
          cashier_name: res.data.data?.cashier_name || activeUser?.fullName || activeUser?.username || 'كاشير الفرع',
          salesperson_name: res.data.data?.salesperson_name || activeUser?.fullName || activeUser?.username || 'كاشير الفرع',
          customer_name: selectedCustomer?.full_name || res.data.data?.customer_name || 'عميل نقدي',
          customer_phone: selectedCustomer?.phone || res.data.data?.customer_phone || null,
          customer_code: selectedCustomer?.customer_code || res.data.data?.customer_code || null,
          customer_points_balance: res.data.customer_points_balance !== undefined ? res.data.customer_points_balance : (selectedCustomer?.total_points || 0),
          isReturn: invoiceType === 'return',
          points_earned: res.data.points_earned || 0,
          points_redeemed: res.data.points_redeemed || 0,
          points_discount: res.data.points_discount || 0
        });
        setReceiptModalVisible(true);
        clearCart();
        fetchSession();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ الفاتورة');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Open Drawer Session
  const handleOpenDrawer = async (values) => {
    try {
      await api.post('/api/swm/pos/session/open', values);
      message.success('تم فتح الخزينة والوردية بنجاح');
      setOpenModalVisible(false);
      openForm.resetFields();
      fetchSession();
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في فتح الوردية');
    }
  };

  // Close Drawer Session
  const handleCloseDrawer = async (values) => {
    try {
      const res = await api.post('/api/swm/pos/session/close', values);
      if (res.data.success) {
        const disc = res.data.data.discrepancy;
        message.info(
          `تم إغلاق الوردية. النقدية المتوقعة: ${res.data.data.expected_cash} ج.م، المحسوبة: ${res.data.data.actual_cash} ج.م، الفارق: ${disc} ج.م`
        );
        setCloseModalVisible(false);
        closeForm.resetFields();
        fetchSession();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إغلاق الوردية');
    }
  };

  // Petty Cash Movement
  const handleCashMovement = async (values) => {
    try {
      await api.post('/api/swm/pos/session/cash-in-out', values);
      message.success('تم تسجيل حركة النقدية بنجاح');
      setCashMovModalVisible(false);
      cashMovForm.resetFields();
      fetchSession();
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حركة النقدية');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ========================================================= */}
      {/* 1. Top Bar: Transaction Type Toggle (Right Side Kept)     */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 16px',
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        {/* Right Side: Transaction Type Segmented Toggle (STRICTLY KEPT) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Segmented
            size="large"
            value={invoiceType}
            onChange={(val) => {
              if (val === 'return' && !isSupervisor && supervisorSettings.pos_allow_salesperson_return === false) {
                message.error('غير مصرح للبائعين بإجراء فواتير مرتجع. يتطلب تسجيل دخول أو موافقة المشرف.');
                return;
              }
              setInvoiceType(val);
            }}
            options={[
              {
                label: (
                  <span style={{ fontWeight: 700, padding: '0 12px', color: invoiceType === 'sale' ? '#16a34a' : '#475569' }}>
                    <ShoppingOutlined style={{ marginLeft: 6 }} />
                    فاتورة بيع (Sale)
                  </span>
                ),
                value: 'sale'
              },
              {
                label: (
                  <span style={{ fontWeight: 700, padding: '0 12px', color: invoiceType === 'return' ? '#dc2626' : '#475569' }}>
                    <RollbackOutlined style={{ marginLeft: 6 }} />
                    مرتجع مبيعات (Return)
                  </span>
                ),
                value: 'return'
              }
            ]}
          />

          {invoiceType === 'return' && (
            <Tag color="error" icon={<AlertTriangle size={12} />} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              وضع المرتجع: استرجاع للمخزون ورد النقدية
            </Tag>
          )}
        </div>

        {/* Left Side: Clean Workflow Shortcuts with direct, vivid colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 12.5,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid #4338CA',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
            }}
          >
            <span style={{ backgroundColor: '#312E81', color: '#DFCA95', padding: '1px 6px', borderRadius: 4, fontSize: 11.5, fontWeight: 900 }}>F11</span>
            <span>إضافة سطر</span>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 12.5,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid #0369A1',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
            }}
          >
            <span style={{ backgroundColor: '#0C4A6E', color: '#DFCA95', padding: '1px 6px', borderRadius: 4, fontSize: 11.5, fontWeight: 900 }}>F1</span>
            <span>بحث المجاميع</span>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 12.5,
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid #15803D',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)'
            }}
          >
            <span style={{ backgroundColor: '#14532D', color: '#DFCA95', padding: '1px 6px', borderRadius: 4, fontSize: 11.5, fontWeight: 900 }}>F4</span>
            <span>إتمام وحفظ</span>
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Main Work Area: 2-Column Responsive Layout             */}
      {/* Right Column: Invoice Items & Client Data                 */}
      {/* Left Column: Financials, Discount, Multi-Pay, Checkout   */}
      {/* ========================================================= */}
      <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        {/* Right Side: Seller, Client Data, Action Buttons, and Items Table */}
        <Col xs={24} lg={15} xl={16} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{
              body: {
                padding: 16,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }
            }}
          >
            {/* Customer Loyalty & Points Accrual Engine */}
            <CustomerLookup
              loyaltySettings={loyaltySettings}
              cartTotal={subtotal}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => {
                setSelectedCustomer(cust);
                setCustomerName(cust.full_name);
                setCustomerPhone(cust.phone);
              }}
              onClearCustomer={() => {
                setSelectedCustomer(null);
                setCustomerName('');
                setCustomerPhone('');
                setRedeemPoints(0);
              }}
              redeemPoints={redeemPoints}
              onChangeRedeemPoints={setRedeemPoints}
            />

            {/* Top Controls: Seller Selection (Branch-specific) & Client Details */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={24} md={8}>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <Text strong style={{ fontSize: 12, color: '#334155', display: 'block', marginBottom: 4 }}>
                    <UserOutlined style={{ marginLeft: 4, color: '#2563eb' }} />
                    البائع المسؤول (طاقم الفرع):
                  </Text>
                  <Select
                    size="middle"
                    placeholder="اختر البائع المسؤول"
                    value={selectedSalesperson}
                    onChange={setSelectedSalesperson}
                    style={{ width: '100%' }}
                  >
                    {branchSellers.map((u) => (
                      <Option key={u.id} value={u.id}>
                        {u.full_name || u.username} ({u.role === 'supervisor' ? 'مشرف فرع' : 'بائع / كاشير'})
                      </Option>
                    ))}
                  </Select>
                </div>
              </Col>

              <Col xs={24} md={16}>
                <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      اسم العميل {supervisorSettings.require_customer_name ? <span style={{ color: 'red' }}>*</span> : '(اختياري)'}:
                    </Text>
                    <Input
                      size="middle"
                      prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="اسم العميل..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      status={supervisorSettings.require_customer_name && !customerName.trim() ? 'warning' : ''}
                    />
                  </div>

                  <div style={{ width: 140 }}>
                    <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                      الهاتف {supervisorSettings.require_customer_phone ? <span style={{ color: 'red' }}>*</span> : '(اختياري)'}:
                    </Text>
                    <Input
                      size="middle"
                      prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="الهاتف..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      status={supervisorSettings.require_customer_phone && !customerPhone.trim() ? 'warning' : ''}
                    />
                  </div>

                  <div>
                    <Space size={6}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleStep1AddEmptyRow}
                        className="swm-btn-cobalt"
                        style={{ borderRadius: 6, fontWeight: 700 }}
                      >
                        سطر (F11)
                      </Button>
                      <Button
                        icon={<SearchOutlined />}
                        onClick={handleStep2OpenSearchModal}
                        className="swm-btn-cobalt-outline"
                        style={{ borderRadius: 6, fontWeight: 700 }}
                      >
                        بحث (F1)
                      </Button>
                    </Space>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Invoice Items Table (Item-level discount removed completely) */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <table style={{ minWidth: 620, width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#334155' }}>
                    <th style={{ padding: '10px 10px', width: 36, textAlign: 'center' }}>#</th>
                    <th style={{ padding: '10px 10px', width: 140 }}>كود / باركود</th>
                    <th style={{ padding: '10px 10px' }}>اسم الصنف والمواصفات</th>
                    <th style={{ padding: '10px 10px', width: 95, textAlign: 'center' }}>المخزون</th>
                    <th style={{ padding: '10px 10px', width: 130, textAlign: 'center' }}>الكمية</th>
                    <th style={{ padding: '10px 10px', width: 105, textAlign: 'center' }}>السعر</th>
                    <th style={{ padding: '10px 10px', width: 115, textAlign: 'center' }}>الإجمالي</th>
                    <th style={{ padding: '10px 6px', width: 44, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => {
                    if (item.isManualRow) {
                      return (
                        <tr key={item.key} style={{ background: '#fefce8', borderBottom: '1px dashed #fde047' }}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#ca8a04' }}>
                            {index + 1}
                          </td>
                          <td colSpan={6} style={{ padding: '8px 10px' }}>
                            <Input
                              ref={(el) => (manualRowInputRefs.current[item.key] = el)}
                              size="middle"
                              placeholder="أدخل باركود أو كود الصنف واضغط Enter، أو اضغط F1 لاختيار الصنف..."
                              prefix={<BarcodeOutlined style={{ color: '#ca8a04', fontSize: 16 }} />}
                              onPressEnter={(e) => handleManualRowBarcodeSubmit(item.key, e.target.value)}
                              style={{ width: '100%', borderRadius: 6 }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeFromCart(item.key)}
                            />
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <Text code style={{ fontSize: 11 }}>{item.barcode || item.product_code}</Text>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{item.product_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>كود: {item.product_code}</div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <Badge
                            count={`${item.available_qty}`}
                            style={{
                              backgroundColor: item.available_qty > 5 ? '#52c41a' : item.available_qty > 0 ? '#fa8c16' : '#f5222d',
                              fontSize: 11
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <Space size={2}>
                            <Button
                              size="small"
                              icon={<MinusOutlined style={{ fontSize: 10 }} />}
                              onClick={() => updateCartQty(item.key, -1)}
                            />
                            <InputNumber
                              size="small"
                              min={1}
                              max={invoiceType === 'sale' ? item.available_qty : 9999}
                              value={item.quantity}
                              onChange={(val) => setCartQtyDirect(item.key, val)}
                              style={{ width: 50, textAlign: 'center' }}
                            />
                            <Button
                              size="small"
                              icon={<PlusOutlined style={{ fontSize: 10 }} />}
                              onClick={() => updateCartQty(item.key, 1)}
                            />
                          </Space>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                          {item.unit_price.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            color: invoiceType === 'return' ? '#dc2626' : '#16a34a'
                          }}
                        >
                          {item.line_total.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeFromCart(item.key)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: 15, marginBottom: 8 }}>لا توجد أصناف في الفاتورة حالياً</div>
                        <Space size="middle">
                          <Button type="primary" icon={<PlusOutlined />} onClick={handleStep1AddEmptyRow} className="swm-btn-cobalt" style={{ borderRadius: 6, fontWeight: 700 }}>
                            إضافة سطر فارغ (F11)
                          </Button>
                          <Button icon={<SearchOutlined />} onClick={handleStep2OpenSearchModal} className="swm-btn-cobalt-outline" style={{ borderRadius: 6, fontWeight: 700 }}>
                            فتح بحث المجاميع (F1)
                          </Button>
                        </Space>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </Col>

        {/* Left Side: Relocated Financials, Global Invoice Discount, Multi-Payment, and Checkout */}
        <Col xs={24} lg={9} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarOutlined style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>الحساب والدفع (Financials & Payment)</span>
              </div>
            }
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{
              body: {
                padding: 16,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }
            }}
          >
            <div>
              {/* Single Global Invoice Discount */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12, color: '#92400e' }}>
                    خصم كامل على الفاتورة (Global Discount):
                  </Text>
                  {invoiceDiscount > 0 && (
                    <Button size="small" type="link" danger onClick={() => setInvoiceDiscount(0)} style={{ padding: 0, height: 'auto', fontSize: 11 }}>
                      إلغاء الخصم
                    </Button>
                  )}
                </div>
                <InputNumber
                  size="large"
                  min={0}
                  max={subtotal}
                  precision={2}
                  disabled={!isSupervisor && supervisorSettings.pos_allow_salesperson_discount === false}
                  value={invoiceDiscount}
                  onChange={(v) => {
                    const discountVal = v || 0;
                    const maxPct = supervisorSettings.pos_max_salesperson_discount_pct !== undefined
                      ? supervisorSettings.pos_max_salesperson_discount_pct
                      : 5;
                    const maxAllowedVal = (subtotal * maxPct) / 100;
                    if (!isSupervisor && discountVal > maxAllowedVal) {
                      message.warning(`سقف الخصم المسموح به للبائع هو ${maxPct}% (أقصى خصم: ${maxAllowedVal.toFixed(2)} ج.م).`);
                      setInvoiceDiscount(maxAllowedVal);
                      return;
                    }
                    setInvoiceDiscount(discountVal);
                  }}
                  placeholder="0.00 ج.م"
                  prefix={<DollarOutlined style={{ color: '#d97706' }} />}
                  style={{ width: '100%', borderRadius: 6 }}
                />
              </div>

              {/* Totals Breakdown Display */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>إجمالي الأصناف:</span>
                  <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} ج.م</span>
                </div>
                {invoiceDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#dc2626' }}>
                    <span>الخصم العام:</span>
                    <span style={{ fontWeight: 600 }}>-{invoiceDiscount.toFixed(2)} ج.م</span>
                  </div>
                )}
                {pointsDiscountValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#b45309' }}>
                    <span>خصم نقاط الولاء ({redeemPoints} نقطة):</span>
                    <span style={{ fontWeight: 700 }}>-{pointsDiscountValue.toFixed(2)} ج.م</span>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                    {invoiceType === 'return' ? 'إجمالي المرتجع:' : 'المطلوب سداده:'}
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: invoiceType === 'return' ? '#dc2626' : '#16a34a'
                    }}
                  >
                    {netTotal.toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Multi-Payment Controls */}
              <div style={{ background: '#fff', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12, color: '#334155' }}>الدفع المتعدد (Multi-Payment):</Text>
                  <Space size={4}>
                    <Button size="small" onClick={handleQuickPayCash} style={{ fontSize: 11, padding: '0 6px' }}>كاش</Button>
                    <Button size="small" onClick={handleQuickPayCard} style={{ fontSize: 11, padding: '0 6px' }}>فيزا</Button>
                    <Button size="small" onClick={handleQuickPayTransfer} style={{ fontSize: 11, padding: '0 6px' }}>تحويل</Button>
                  </Space>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <Text style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Banknote size={12} /> نقدًا (كاش):
                    </Text>
                    <InputNumber
                      size="middle"
                      min={0}
                      precision={2}
                      value={cashTendered}
                      onChange={(v) => setCashTendered(v || 0)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <Row gutter={8}>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <CreditCard size={12} /> فيزا / بطاقة:
                      </Text>
                      <InputNumber
                        size="middle"
                        min={0}
                        precision={2}
                        value={cardTendered}
                        onChange={(v) => setCardTendered(v || 0)}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text style={{ fontSize: 11, color: '#9333ea', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <Smartphone size={12} /> تحويل / محفظة:
                      </Text>
                      <InputNumber
                        size="middle"
                        min={0}
                        precision={2}
                        value={transferTendered}
                        onChange={(v) => setTransferTendered(v || 0)}
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                </div>

                {isOverpaid && (
                  <Alert
                    type="error"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={`المبلغ المدفوع يتجاوز الإجمالي بمقدار ${(totalTendered - netTotal).toFixed(2)} ج.م`}
                    style={{ marginTop: 8, padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                  />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <span>المدفوع: <strong>{totalTendered.toFixed(2)} ج.م</strong></span>
                  {remainingDue > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>المتبقي: {remainingDue.toFixed(2)} ج.م</span>
                  ) : isOverpaid ? (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>زيادة غير مقبولة</span>
                  ) : (
                    <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> مسدد بالكامل
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <Button
                type="primary"
                size="large"
                icon={invoiceType === 'return' ? <RollbackOutlined /> : <CheckCircleOutlined />}
                loading={isSubmittingSale}
                disabled={validItems.length === 0 || remainingDue > 0 || isOverpaid}
                onClick={handleStep3CompleteSale}
                style={{
                  backgroundColor:
                    validItems.length === 0 || remainingDue > 0 || isOverpaid
                      ? '#94a3b8'
                      : invoiceType === 'return'
                      ? '#dc2626'
                      : '#059669',
                  borderColor:
                    validItems.length === 0 || remainingDue > 0 || isOverpaid
                      ? '#94a3b8'
                      : invoiceType === 'return'
                      ? '#dc2626'
                      : '#059669',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: 16,
                  height: 48,
                  borderRadius: 8
                }}
              >
                {invoiceType === 'return'
                  ? 'إتمام المرتجع ورد المبلغ (F4)'
                  : 'إتمام البيع وطباعة الفاتورة (F4)'}
              </Button>

              <Button
                danger
                type="dashed"
                size="middle"
                onClick={clearCart}
                disabled={cart.length === 0}
                style={{ borderRadius: 6 }}
              >
                مسح الفاتورة
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* 3. Enhanced Product Search Modal with Categories Sidebar  */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SearchOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>
              نافذة البحث السريع عن الأصناف والمجاميع (F1)
            </span>
          </div>
        }
        open={searchModalVisible}
        onCancel={() => setSearchModalVisible(false)}
        footer={null}
        width={920}
        destroyOnHidden
      >
        <div style={{ display: 'flex', gap: 14, height: 480, direction: 'rtl' }}>
          {/* Right Sidebar: Product Categories / Groups (المجاميع) */}
          <div
            style={{
              width: 220,
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
              type={selectedCategory === 'all' ? 'primary' : 'text'}
              style={{
                textAlign: 'right',
                justifyContent: 'flex-start',
                marginBottom: 4,
                borderRadius: 6,
                fontWeight: selectedCategory === 'all' ? 700 : 500,
                backgroundColor: selectedCategory === 'all' ? '#2563eb' : undefined
              }}
              onClick={() => handleCategorySelect('all')}
            >
              جميع الأصناف
            </Button>

            {categories.map((cat) => (
              <Button
                key={cat.id}
                type={selectedCategory === cat.id ? 'primary' : 'text'}
                style={{
                  textAlign: 'right',
                  justifyContent: 'flex-start',
                  marginBottom: 3,
                  borderRadius: 6,
                  fontWeight: selectedCategory === cat.id ? 700 : 500,
                  backgroundColor: selectedCategory === cat.id ? '#2563eb' : undefined,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => handleCategorySelect(cat.id)}
              >
                {cat.category_name}
              </Button>
            ))}
          </div>

          {/* Left / Main Section: Search Input & Product Results */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: 10 }}>
              <Input
                ref={modalSearchInputRef}
                size="large"
                placeholder="ابحث بالاسم، كود الصنف، الموديل، أو الباركود..."
                prefix={<SearchOutlined style={{ color: '#2563eb' }} />}
                value={modalSearchQuery}
                onChange={(e) => handleModalSearchChange(e.target.value)}
                allowClear
                autoFocus
                style={{ borderRadius: 8 }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <Table
                dataSource={modalProducts}
                rowKey={(r) => `${r.product_id}-${r.variant_id || '0'}`}
                loading={modalLoading}
                pagination={false}
                size="middle"
                onRow={(record) => ({
                  onClick: () => handleSelectProductFromModal(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: 'كود / باركود',
                    dataIndex: 'barcode',
                    key: 'barcode',
                    width: 140,
                    render: (b, r) => <Text code>{b || r.product_code}</Text>
                  },
                  {
                    title: 'اسم الصنف والمواصفات',
                    dataIndex: 'display_name',
                    key: 'display_name',
                    render: (name, r) => (
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 13 }}>{name}</Text>
                        {r.category_name && <Tag color="blue" style={{ fontSize: 10 }}>{r.category_name}</Tag>}
                      </div>
                    )
                  },
                  {
                    title: 'السعر',
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    width: 110,
                    render: (p) => <Text strong style={{ color: '#16a34a', fontSize: 14 }}>{p.toFixed(2)} ج.م</Text>
                  },
                  {
                    title: 'المخزون',
                    dataIndex: 'available_qty',
                    key: 'available_qty',
                    width: 110,
                    render: (qty) => (
                      <Badge
                        count={`${qty} متاح`}
                        style={{
                          backgroundColor: qty > 5 ? '#52c41a' : qty > 0 ? '#fa8c16' : '#f5222d',
                          fontSize: 10
                        }}
                      />
                    )
                  },
                  {
                    title: '',
                    key: 'action',
                    width: 90,
                    render: (_, r) => (
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        className="swm-btn-emerald"
                        style={{ borderRadius: 6 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProductFromModal(r);
                        }}
                      >
                        اختيار
                      </Button>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Supervisor Settings Modal */}
      <Modal
        title="إعدادات مشرف الفرع لبيانات العملاء"
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        footer={null}
        width={420}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            تحكم بديناميكية الحقول المطلوبة لبيانات العميل عند تسجيل فاتورة البيع في هذا الفرع:
          </Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>إلزامية إدخال اسم العميل (Required):</span>
            <Switch
              checked={supervisorSettings.require_customer_name}
              onChange={(checked) =>
                setSupervisorSettings((prev) => ({ ...prev, require_customer_name: checked }))
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>إلزامية إدخال رقم هاتف العميل (Required):</span>
            <Switch
              checked={supervisorSettings.require_customer_phone}
              onChange={(checked) =>
                setSupervisorSettings((prev) => ({ ...prev, require_customer_phone: checked }))
              }
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ textAlign: 'left' }}>
            <Space>
              <Button onClick={() => setSettingsModalVisible(false)}>إلغاء</Button>
              <Button
                type="primary"
                loading={savingSettings}
                onClick={() => handleSaveSupervisorSettings(supervisorSettings)}
                className="swm-btn-cobalt"
              >
                حفظ الإعدادات
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      {/* Thermal Receipt Print Modal */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={null}
        width={480}
        centered
        destroyOnHidden
      >
        <ThermalReceipt
          invoice={lastInvoice}
          items={lastInvoice?.items || []}
          onClose={() => setReceiptModalVisible(false)}
        />
      </Modal>

      {/* Open Drawer Modal */}
      <Modal
        title="فتح الخزينة وبدء الوردية"
        open={openModalVisible}
        onCancel={() => setOpenModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={openForm} layout="vertical" onFinish={handleOpenDrawer}>
          <Form.Item
            name="opening_balance"
            label="العهدة النقدية الافتتاحية (ج.م)"
            rules={[{ required: true, message: 'يرجى إدخال المبلغ الافتتاحي' }]}
            initialValue={0}
          >
            <InputNumber style={{ width: '100%' }} min={0} prefix={<DollarOutlined />} />
          </Form.Item>
          <Form.Item name="notes" label="ملاحظات">
            <Input.TextArea rows={2} placeholder="أي تفاصيل عن الوردية" />
          </Form.Item>
          <div style={{ textAlign: 'left' }}>
            <Space>
              <Button onClick={() => setOpenModalVisible(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" className="swm-btn-emerald">
                تأكيد فتح الوردية
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Close Drawer Modal */}
      <Modal
        title="إغلاق الوردية والتقفيل النقدي"
        open={closeModalVisible}
        onCancel={() => setCloseModalVisible(false)}
        footer={null}
        width={450}
      >
        <Form form={closeForm} layout="vertical" onFinish={handleCloseDrawer}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <Text type="secondary">الرصيد الدفتري المتوقع في الدرج: </Text>
            <Text strong style={{ fontSize: 16, color: '#2563eb' }}>
              {(sessionData?.current_balance || 0).toLocaleString()} ج.م
            </Text>
          </div>
          <Form.Item
            name="actual_cash"
            label="النقد الفعلي المحصي في الدرج (ج.م)"
            rules={[{ required: true, message: 'يرجى إدخال المبلغ الفعلي المحسوب' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} prefix={<DollarOutlined />} />
          </Form.Item>
          <Form.Item name="notes" label="ملاحظات وتفسير أي عجز أو زيادة">
            <Input.TextArea rows={2} placeholder="ملاحظات الإغلاق" />
          </Form.Item>
          <div style={{ textAlign: 'left' }}>
            <Space>
              <Button onClick={() => setCloseModalVisible(false)}>إلغاء</Button>
              <Button danger type="primary" htmlType="submit" className="swm-btn-danger">
                تأكيد إغلاق الوردية
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Petty Cash Movement Modal */}
      <Modal
        title="حركة نقدية بالدرج (سحب / إيداع)"
        open={cashMovModalVisible}
        onCancel={() => setCashMovModalVisible(false)}
        footer={null}
        width={420}
      >
        <Form form={cashMovForm} layout="vertical" onFinish={handleCashMovement} initialValues={{ type: 'cash_in' }}>
          <Form.Item name="type" label="نوع الحركة" rules={[{ required: true }]}>
            <Radio.Group style={{ width: '100%', display: 'flex' }}>
              <Radio.Button value="cash_in" style={{ flex: 1, textAlign: 'center', color: '#16a34a' }}>
                إيداع نقدية (Cash In)
              </Radio.Button>
              <Radio.Button value="cash_out" style={{ flex: 1, textAlign: 'center', color: '#dc2626' }}>
                سحب نقدية / مصروف (Cash Out)
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="amount"
            label="المبلغ (ج.م)"
            rules={[{ required: true, message: 'يرجى إدخال المبلغ' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} prefix={<DollarOutlined />} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="السبب / البيان"
            rules={[{ required: true, message: 'يرجى إدخال سبب الحركة' }]}
          >
            <Input placeholder="مثال: إضافة فكة، مصروفات نظافة، توريد للبنك" />
          </Form.Item>
          <div style={{ textAlign: 'left' }}>
            <Space>
              <Button onClick={() => setCashMovModalVisible(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit">
                تسجيل الحركة
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
