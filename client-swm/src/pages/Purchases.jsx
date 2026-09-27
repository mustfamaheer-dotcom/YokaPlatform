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
  Tooltip
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
  ShoppingOutlined
} from '@ant-design/icons';
import api from '../api';
import SplitPayment from '../components/SplitPayment';
import { printHtmlContent } from '../utils/printUtils';
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
  const [defaultBranchId, setDefaultBranchId] = useState(null);

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
      const [supRes, brRes, prodRes] = await Promise.all([
        api.get('/api/swm/suppliers', { params: { limit: 100 } }),
        api.get('/api/swm/branches'),
        api.get('/api/swm/products', { params: { limit: 250 } })
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
      if (prodRes.data.success) setProductsList(prodRes.data.data);
    } catch (e) {
      // Lookup error
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
    return items.reduce((sum, it) => sum + (parseFloat(it.line_total) || 0), 0);
  };

  const calculatedSubtotal = calculateSubtotal();
  const calculatedFinal = Math.max(
    0,
    calculatedSubtotal - (parseFloat(discountTotal) || 0) + (parseFloat(taxTotal) || 0) + (parseFloat(shippingCost) || 0)
  );

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        key: Date.now() + Math.random(),
        product_id: null,
        variant_id: null,
        product_name: '',
        quantity: 1,
        unit_cost: 0,
        selling_price: 0,
        discount_pct: 0,
        line_total: 0
      }
    ]);
  };

  const handleUpdateItem = (key, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };

      if (field === 'product_id') {
        const prod = productsList.find(p => p.id === value);
        if (prod) {
          updated.product_name = prod.product_name;
          updated.unit_cost = parseFloat(prod.cost_price) || 0;
          updated.selling_price = parseFloat(prod.selling_price) || 0;
        }
      }

      const qty = parseInt(updated.quantity, 10) || 0;
      const cost = parseFloat(updated.unit_cost) || 0;
      const disc = parseFloat(updated.discount_pct) || 0;
      const discAmount = (qty * cost) * (disc / 100);
      updated.line_total = Math.max(0, (qty * cost) - discAmount);

      return updated;
    }));
  };

  const handleRemoveItem = (key) => {
    setItems(items.filter(it => it.key !== key));
  };

  const handleOpenCreateDrawer = () => {
    if (defaultBranchId) setSelectedBranch(defaultBranchId);
    setItems([
      {
        key: Date.now(),
        product_id: null,
        variant_id: null,
        product_name: '',
        quantity: 1,
        unit_cost: 0,
        selling_price: 0,
        discount_pct: 0,
        line_total: 0
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

    for (const it of items) {
      if (!it.product_id || !it.quantity || it.quantity <= 0) {
        return message.error('يرجى التأكد من اختيار الصنف وإدخال كمية صحيحة');
      }
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
        items: items.map(it => ({
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          unit_cost: parseFloat(it.unit_cost) || 0,
          selling_price: it.selling_price !== undefined && it.selling_price !== null ? parseFloat(it.selling_price) : 0,
          discount_pct: parseFloat(it.discount_pct) || 0
        }))
      };

      const res = await api.post('/api/swm/purchases', payload);
      if (res.data.success) {
        message.success('تم اعتماد فاتورة المشتريات وتحديث أسعار الأصناف وأرصدة المخزون وحساب المورد بنجاح');
        setIsCreateOpen(false);
        setItems([]);
        setSelectedSupplier(null);
        setNotes('');
        setPaidAmount(0);
        setSplitPaymentBreakdown([]);
        fetchInvoices(1);
        fetchLookups();
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
        width={1050}
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        extra={
          <Space>
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

          <Table
            size="small"
            dataSource={items}
            pagination={false}
            columns={[
              {
                title: 'الصنف / المنتج',
                dataIndex: 'product_id',
                key: 'product_id',
                width: 280,
                render: (_, record) => (
                  <Select
                    showSearch
                    placeholder="اختر الصنف..."
                    value={record.product_id}
                    onChange={(val) => handleUpdateItem(record.key, 'product_id', val)}
                    style={{ width: '100%' }}
                    filterOption={(input, opt) => (opt?.label || '').toLowerCase().includes(input.toLowerCase())}
                    options={productsList.map(p => ({
                      value: p.id,
                      label: `${p.category_name ? `[${p.category_name}] ` : ''}${p.product_name} (${p.product_code || p.barcode || 'لا يوجد كود'})`
                    }))}
                  />
                )
              },
              {
                title: 'الكمية',
                dataIndex: 'quantity',
                key: 'quantity',
                width: 90,
                render: (_, record) => (
                  <InputNumber
                    min={1}
                    value={record.quantity}
                    onChange={(val) => handleUpdateItem(record.key, 'quantity', val || 1)}
                    style={{ width: '100%' }}
                  />
                )
              },
              {
                title: 'سعر التكلفة (Cost Price)',
                dataIndex: 'unit_cost',
                key: 'unit_cost',
                width: 140,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.unit_cost}
                    onChange={(val) => handleUpdateItem(record.key, 'unit_cost', val || 0)}
                    style={{ width: '100%' }}
                    addonAfter="ج.م"
                  />
                )
              },
              {
                title: 'سعر البيع النهائي (Selling Price)',
                dataIndex: 'selling_price',
                key: 'selling_price',
                width: 140,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    precision={2}
                    value={record.selling_price}
                    onChange={(val) => handleUpdateItem(record.key, 'selling_price', val || 0)}
                    style={{ width: '100%', borderColor: '#16a34a' }}
                    addonAfter="ج.م"
                  />
                )
              },
              {
                title: 'نسبة الخصم %',
                dataIndex: 'discount_pct',
                key: 'discount_pct',
                width: 100,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    max={100}
                    value={record.discount_pct}
                    onChange={(val) => handleUpdateItem(record.key, 'discount_pct', val || 0)}
                    style={{ width: '100%' }}
                  />
                )
              },
              {
                title: 'إجمالي السطر',
                dataIndex: 'line_total',
                key: 'line_total',
                width: 120,
                render: (val) => <Text strong>{(parseFloat(val) || 0).toLocaleString()} ج.م</Text>
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
                    onClick={() => handleRemoveItem(record.key)}
                  />
                )
              }
            ]}
          />

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddItem}
            style={{ width: '100%', marginTop: 8 }}
          >
            إضافة صنف للفاتورة
          </Button>

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
                    options={productsList.map(p => ({
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
    </div>
  );
}
