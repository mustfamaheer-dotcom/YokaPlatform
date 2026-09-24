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

const { Title, Text } = Typography;
const { Option } = Select;

export default function Purchases() {
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
    window.print();
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
    window.print();
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

                <Card bodyStyle={{ padding: 0 }}>
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

                <Card bodyStyle={{ padding: 0 }}>
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
                      label: `${p.product_name} (${p.product_code || p.barcode || 'لا يوجد كود'})`
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
                      label: `${p.product_name} (${p.product_code || p.barcode || 'لا يوجد كود'})`
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
          <div ref={printAreaRef} className="printable-invoice" style={{ direction: 'rtl' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>منصة يوكا ستور — Yoka Store</h2>
                  <div style={{ fontSize: 13, color: '#475569' }}>سند استلام وتوريد بضاعة مخازن</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>فاتورة توريد #{selectedInvoice.invoice_number}</h3>
                  <div style={{ fontSize: 12 }}>تاريخ التوريد: {new Date(selectedInvoice.invoice_date).toLocaleDateString('ar-EG')}</div>
                </div>
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <Col span={8}>
                <div><strong>المورد:</strong> {selectedInvoice.supplier_name} ({selectedInvoice.supplier_code})</div>
                <div><strong>الهاتف:</strong> {selectedInvoice.supplier_phone || '—'}</div>
                <div><strong>العنوان:</strong> {selectedInvoice.supplier_address || '—'}</div>
              </Col>
              <Col span={8}>
                <div><strong>المستودع المستلم:</strong> {selectedInvoice.warehouse_name}</div>
                <div><strong>المسجل / المستلم:</strong> {selectedInvoice.created_by_name || 'مسؤول المشتريات'}</div>
                <div><strong>الحالة:</strong> <Tag color="green">معتمدة وموردة للمخزون</Tag></div>
              </Col>
              <Col span={8}>
                <div>
                  <strong>حالة السداد:</strong>{' '}
                  <Tag color={selectedInvoice.payment_status === 'paid' ? 'green' : selectedInvoice.payment_status === 'partial' ? 'orange' : 'red'}>
                    {selectedInvoice.payment_status === 'paid' ? 'مسدد بالكامل' : selectedInvoice.payment_status === 'partial' ? 'مسدد جزئياً' : 'آجل'}
                  </Tag>
                </div>
                <div>
                  <strong>طريقة السداد:</strong>{' '}
                  <Tag color="purple">{selectedInvoice.payment_method === 'split' ? 'دفع مقسم (Multi-tender)' : selectedInvoice.payment_method}</Tag>
                </div>
              </Col>
            </Row>

            <Table
              size="small"
              loading={detailsLoading}
              dataSource={selectedInvoice.items || []}
              rowKey="id"
              pagination={false}
              bordered
              columns={[
                { title: 'كود المنتج', dataIndex: 'product_code', key: 'product_code', width: 120 },
                { title: 'اسم الصنف', dataIndex: 'product_name', key: 'product_name' },
                { title: 'الكمية الموردة', dataIndex: 'quantity', key: 'quantity', width: 90 },
                {
                  title: 'سابق إرجاعه',
                  dataIndex: 'returned_quantity',
                  key: 'returned_quantity',
                  width: 90,
                  render: (v) => parseInt(v, 10) > 0 ? <Tag color="orange">{v} قطعة</Tag> : '0'
                },
                {
                  title: 'سعر التكلفة',
                  dataIndex: 'unit_cost',
                  key: 'unit_cost',
                  width: 110,
                  render: (v) => `${parseFloat(v).toLocaleString()} ج.م`
                },
                {
                  title: 'سعر البيع النهائي',
                  dataIndex: 'selling_price',
                  key: 'selling_price',
                  width: 120,
                  render: (v) => v ? <Text strong style={{ color: '#059669' }}>{parseFloat(v).toLocaleString()} ج.م</Text> : '—'
                },
                {
                  title: 'إجمالي السطر',
                  dataIndex: 'line_total',
                  key: 'line_total',
                  width: 110,
                  render: (v) => <Text strong>{parseFloat(v).toLocaleString()} ج.م</Text>
                }
              ]}
            />

            {selectedInvoice.payment_breakdown && (
              <Card size="small" style={{ marginTop: 14, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Text strong style={{ display: 'block', marginBottom: 6, color: '#166534' }}>
                  <DollarCircleOutlined style={{ marginLeft: 6 }} />
                  تفاصيل السداد المقسم (Multi-Tender Payment Breakdown):
                </Text>
                <Space size={[6, 6]} wrap>
                  {(Array.isArray(selectedInvoice.payment_breakdown)
                    ? selectedInvoice.payment_breakdown
                    : typeof selectedInvoice.payment_breakdown === 'string'
                    ? JSON.parse(selectedInvoice.payment_breakdown)
                    : []
                  ).map((b, idx) => (
                    <Tag key={idx} color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
                      {b.method_name || b.method}: <strong>{parseFloat(b.amount).toLocaleString()} ج.م</strong>
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16}>
              <Col span={12}>
                {selectedInvoice.notes && (
                  <div style={{ background: '#f8fafc', padding: 8, borderRadius: 4 }}>
                    <Text type="secondary">ملاحظات الفاتورة: </Text>
                    <div>{selectedInvoice.notes}</div>
                  </div>
                )}
              </Col>
              <Col span={12} style={{ textAlign: 'left' }}>
                <div>المجموع الفرعي: {parseFloat(selectedInvoice.subtotal).toLocaleString()} ج.م</div>
                {parseFloat(selectedInvoice.discount_amount) > 0 && (
                  <div>الخصم: -{parseFloat(selectedInvoice.discount_amount).toLocaleString()} ج.م</div>
                )}
                {parseFloat(selectedInvoice.shipping_cost) > 0 && (
                  <div>الشحن: +{parseFloat(selectedInvoice.shipping_cost).toLocaleString()} ج.م</div>
                )}
                {parseFloat(selectedInvoice.tax_amount) > 0 && (
                  <div>الضريبة: +{parseFloat(selectedInvoice.tax_amount).toLocaleString()} ج.م</div>
                )}
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 6 }}>
                  الإجمالي النهائي: {parseFloat(selectedInvoice.final_amount).toLocaleString()} ج.م
                </div>
                <div style={{ color: '#16a34a', marginTop: 4, fontWeight: 'bold' }}>
                  المسدد: {parseFloat(selectedInvoice.paid_amount || 0).toLocaleString()} ج.م
                </div>
                {parseFloat(selectedInvoice.final_amount) - parseFloat(selectedInvoice.paid_amount || 0) > 0 && (
                  <div style={{ color: '#dc2626', marginTop: 2, fontWeight: 'bold' }}>
                    المتبقي آجل: {(parseFloat(selectedInvoice.final_amount) - parseFloat(selectedInvoice.paid_amount || 0)).toLocaleString()} ج.م
                  </div>
                )}
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 16, borderTop: '1px dashed #94a3b8' }}>
              <div><strong>توقيع أمين المستودع:</strong> _______________________</div>
              <div><strong>اعتماد المشتريات:</strong> _______________________</div>
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
          <div ref={printReturnAreaRef} className="printable-return" style={{ direction: 'rtl' }}>
            <div style={{ borderBottom: '2px solid #dc2626', paddingBottom: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 'bold', color: '#dc2626' }}>
                    منصة يوكا ستور — إشعار مرتجع مشتريات (Purchase Return Voucher)
                  </h2>
                  <div style={{ fontSize: 13, color: '#475569' }}>سند إرجاع بضاعة موردة وخصم من المخزون</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#dc2626' }}>إشعار #{selectedReturn.return_number}</h3>
                  <div style={{ fontSize: 12 }}>تاريخ الإرجاع: {new Date(selectedReturn.return_date).toLocaleDateString('ar-EG')}</div>
                  {selectedReturn.invoice_ref ? (
                    <div style={{ fontSize: 12 }}>الفاتورة الأصلية: <strong>#{selectedReturn.invoice_ref}</strong></div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#7c3aed' }}><strong>مرتجع مشتريات مستقل (بدون فاتورة سابقة)</strong></div>
                  )}
                </div>
              </div>
            </div>

            <Row gutter={16} style={{ marginBottom: 16, background: '#fef2f2', padding: 12, borderRadius: 6, border: '1px solid #fecaca' }}>
              <Col span={8}>
                <div><strong>المورد:</strong> {selectedReturn.supplier_name} ({selectedReturn.supplier_code})</div>
                <div><strong>الهاتف:</strong> {selectedReturn.supplier_phone || '—'}</div>
                <div><strong>العنوان:</strong> {selectedReturn.supplier_address || '—'}</div>
              </Col>
              <Col span={8}>
                <div><strong>المستودع المرتجع منه:</strong> {selectedReturn.warehouse_name}</div>
                <div><strong>المسجل:</strong> {selectedReturn.created_by_name || 'مسؤول المخزن'}</div>
                <div><strong>الحالة:</strong> <Tag color="red">تم الإرجاع وتحديث المخزون</Tag></div>
              </Col>
              <Col span={8}>
                <div>
                  <strong>التسوية المالية:</strong>{' '}
                  <Tag color={parseFloat(selectedReturn.refund_amount) > 0 ? 'green' : 'blue'}>
                    {parseFloat(selectedReturn.refund_amount) > 0 ? 'استرداد مالي مستلم' : 'خصم من حساب المورد'}
                  </Tag>
                </div>
                <div>
                  <strong>المبلغ المسترد:</strong>{' '}
                  <Text strong>{parseFloat(selectedReturn.refund_amount || 0).toLocaleString()} ج.م</Text>
                </div>
              </Col>
            </Row>

            <Table
              size="small"
              loading={returnDetailsLoading}
              dataSource={selectedReturn.items || []}
              rowKey="id"
              pagination={false}
              bordered
              columns={[
                { title: 'كود المنتج', dataIndex: 'product_code', key: 'product_code', width: 130 },
                { title: 'اسم الصنف المرتجع', dataIndex: 'product_name', key: 'product_name' },
                {
                  title: 'الكمية المرتجعة',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 120,
                  render: (q) => <Text strong style={{ color: '#dc2626' }}>{q} قطعة</Text>
                },
                {
                  title: 'سعر التكلفة',
                  dataIndex: 'unit_cost',
                  key: 'unit_cost',
                  width: 130,
                  render: (v) => `${parseFloat(v).toLocaleString()} ج.م`
                },
                {
                  title: 'إجمالي القيمة',
                  dataIndex: 'line_total',
                  key: 'line_total',
                  width: 140,
                  render: (v) => <Text strong style={{ color: '#dc2626' }}>{parseFloat(v).toLocaleString()} ج.م</Text>
                }
              ]}
            />

            {parseFloat(selectedReturn.refund_amount) > 0 && selectedReturn.payment_breakdown && (
              <Card size="small" style={{ marginTop: 14, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Text strong style={{ display: 'block', marginBottom: 6, color: '#166534' }}>
                  <DollarCircleOutlined style={{ marginLeft: 6 }} />
                  تفاصيل المبالغ المستردة نقداً وحوالات (Refund Receipt Breakdown):
                </Text>
                <Space size={[6, 6]} wrap>
                  {(Array.isArray(selectedReturn.payment_breakdown)
                    ? selectedReturn.payment_breakdown
                    : typeof selectedReturn.payment_breakdown === 'string'
                    ? JSON.parse(selectedReturn.payment_breakdown)
                    : []
                  ).map((b, idx) => (
                    <Tag key={idx} color="green" style={{ fontSize: 13, padding: '4px 10px' }}>
                      {b.method_name || b.method}: <strong>{parseFloat(b.amount).toLocaleString()} ج.م</strong>
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16}>
              <Col span={12}>
                {selectedReturn.reason && (
                  <div style={{ background: '#f8fafc', padding: 8, borderRadius: 4 }}>
                    <Text type="secondary">سبب الإرجاع: </Text>
                    <div>{selectedReturn.reason}</div>
                  </div>
                )}
              </Col>
              <Col span={12} style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626' }}>
                  إجمالي قيمة المرتجع: {parseFloat(selectedReturn.total_amount).toLocaleString()} ج.م
                </div>
                {parseFloat(selectedReturn.refund_amount) > 0 && (
                  <div style={{ color: '#16a34a', fontWeight: 'bold', marginTop: 4 }}>
                    المسترد فعلياً: {parseFloat(selectedReturn.refund_amount).toLocaleString()} ج.م
                  </div>
                )}
                <div style={{ color: '#2563eb', fontWeight: 'bold', marginTop: 4 }}>
                  المخصوم من رصيد المورد: {(parseFloat(selectedReturn.total_amount) - parseFloat(selectedReturn.refund_amount || 0)).toLocaleString()} ج.م
                </div>
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 16, borderTop: '1px dashed #94a3b8' }}>
              <div><strong>توقيع أمين المستودع المسلم:</strong> _______________________</div>
              <div><strong>توقيع مندوب المورد المستلم:</strong> _______________________</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
