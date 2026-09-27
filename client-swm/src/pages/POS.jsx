import React, { useState, useEffect, useRef } from 'react';
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
  message,
  Divider,
  Badge,
  Tooltip
} from 'antd';
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
  QrcodeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';

const { Title, Text } = Typography;
const { Option } = Select;

export default function POS() {
  // Session State
  const [sessionData, setSessionData] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Staff / Salesperson State
  const [staff, setStaff] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);

  // Cart State
  const [cart, setCart] = useState([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  // Customer Information
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Multi-Payment State (Cash, Card, Transfer)
  const [cashTendered, setCashTendered] = useState(0);
  const [cardTendered, setCardTendered] = useState(0);
  const [transferTendered, setTransferTendered] = useState(0);

  // Product Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  // Drawer Modals
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
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في استعلام الخزينة والوردية');
    } finally {
      setSessionLoading(false);
    }
  };

  // Fetch Staff for Salesperson selector
  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/swm/users');
      if (res.data.success) {
        const staffList = res.data.data || [];
        setStaff(staffList);
        if (staffList.length > 0 && !selectedSalesperson) {
          // Default to first salesperson or user
          setSelectedSalesperson(staffList[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchStaff();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Keyboard Shortcuts: F1 (Search), F11 (Add Line / Search Focus), F4 (Submit)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        message.info('F1: تم التركيز على حقل البحث عن صنف');
      } else if (e.key === 'F11') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select?.();
        message.info('F11: إضافة سطر جديد / مسح الباركود');
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleCompleteSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Live Barcode / Catalog Search
  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get('/api/swm/pos/search', { params: { query: val.trim() } });
      if (res.data.success) {
        setSearchResults(res.data.data);

        // If exact barcode match with 1 item, auto add to cart!
        if (
          res.data.data.length === 1 &&
          (res.data.data[0].barcode === val.trim() || res.data.data[0].product_code === val.trim())
        ) {
          addToCart(res.data.data[0]);
          setSearchQuery('');
          setSearchResults([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add Item to Cart
  const addToCart = (product) => {
    if (product.available_qty <= 0) {
      return message.warning(`عذراً، الصنف "${product.display_name}" غير متوفر في مخزون الفرع حالياً!`);
    }

    setCart((prev) => {
      const itemKey = `${product.product_id}-${product.variant_id || 'base'}`;
      const existing = prev.find((item) => item.key === itemKey);

      if (existing) {
        if (existing.quantity >= product.available_qty) {
          message.warning(`الكمية المتاحة في المخزون (${product.available_qty}) فقط!`);
          return prev;
        }
        return prev.map((item) => {
          if (item.key === itemKey) {
            const newQty = item.quantity + 1;
            const lineTotal = Math.max(0, newQty * item.unit_price - (item.discount_amount || 0));
            return { ...item, quantity: newQty, line_total: lineTotal };
          }
          return item;
        });
      }

      const unitPrice = parseFloat(product.unit_price);
      return [
        ...prev,
        {
          key: itemKey,
          product_id: product.product_id,
          variant_id: product.variant_id,
          product_name: product.display_name,
          product_code: product.product_code,
          barcode: product.barcode,
          unit_price: unitPrice,
          available_qty: product.available_qty,
          quantity: 1,
          discount_amount: 0,
          line_total: unitPrice
        }
      ];
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Update item quantity
  const updateCartQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.available_qty) {
            message.warning(`الكمية المتاحة في المخزون (${item.available_qty}) فقط!`);
            return item;
          }
          const lineTotal = Math.max(0, newQty * item.unit_price - (item.discount_amount || 0));
          return { ...item, quantity: newQty, line_total: lineTotal };
        })
        .filter(Boolean)
    );
  };

  // Update item line discount
  const updateLineDiscount = (key, discountVal) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const discount = Math.max(0, parseFloat(discountVal || 0));
        const lineTotal = Math.max(0, item.quantity * item.unit_price - discount);
        return { ...item, discount_amount: discount, line_total: lineTotal };
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
    setCustomerName('عميل نقدي');
    setCustomerPhone('');
    setCustomerAddress('');
    setSaleNotes('');
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const netTotal = Math.max(
    0,
    subtotal - parseFloat(invoiceDiscount || 0) + parseFloat(taxAmount || 0)
  );

  // Multi-Payment calculations
  const totalTendered =
    parseFloat(cashTendered || 0) +
    parseFloat(cardTendered || 0) +
    parseFloat(transferTendered || 0);

  const remainingDue = Math.max(0, netTotal - totalTendered);
  const changeDue = Math.max(0, totalTendered - netTotal);

  // Quick payment presets
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

  // Auto-fill cash when cart updates if no payment has been typed yet
  useEffect(() => {
    if (netTotal > 0 && totalTendered === 0) {
      setCashTendered(netTotal);
    } else if (netTotal === 0) {
      setCashTendered(0);
      setCardTendered(0);
      setTransferTendered(0);
    }
  }, [netTotal]);

  // Submit Fast Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      return message.error('سلة المشتريات فارغة');
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
        customer_name: customerName || 'عميل نقدي',
        customer_phone: customerPhone || undefined,
        customer_address: customerAddress || undefined,
        discount_amount: parseFloat(invoiceDiscount) || 0,
        tax_amount: parseFloat(taxAmount) || 0,
        payment_method: 'multi',
        payment_breakdown: {
          cash: parseFloat(cashTendered || 0),
          card: parseFloat(cardTendered || 0),
          transfer: parseFloat(transferTendered || 0)
        },
        notes: saleNotes || undefined,
        items: cart.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          product_name: item.product_name,
          product_code: item.product_code
        }))
      };

      const res = await api.post('/api/swm/pos/sale', payload);
      if (res.data.success) {
        message.success(`تم حفظ الفاتورة بنجاح: ${res.data.data.invoice_number}`);
        setLastInvoice({
          ...res.data.data,
          items: res.data.items,
          branch_name: sessionData?.register?.register_name
        });
        setReceiptModalVisible(true);
        clearCart();
        fetchSession();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إتمام عملية البيع');
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
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top POS Status Bar & Shortcuts Badges */}
      <Card
        size="small"
        style={{
          marginBottom: 8,
          background: '#0f172a',
          borderColor: '#1e293b',
          color: '#fff'
        }}
        styles={{ body: { padding: '8px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space size="middle" wrap>
            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>حالة الخزينة: </Text>
              {sessionData?.is_open ? (
                <Tag icon={<UnlockOutlined />} color="success" style={{ fontWeight: 'bold' }}>
                  مفتوحة
                </Tag>
              ) : (
                <Tag icon={<LockOutlined />} color="error" style={{ fontWeight: 'bold' }}>
                  مغلقة
                </Tag>
              )}
            </div>

            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>رصيد الدرج: </Text>
              <Text strong style={{ color: '#38bdf8', fontSize: 15 }}>
                {(sessionData?.current_balance || 0).toLocaleString()} ج.م
              </Text>
            </div>

            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>مبيعات اليوم: </Text>
              <Text strong style={{ color: '#4ade80' }}>
                {sessionData?.today_sales_count || 0} عملية ({(sessionData?.today_sales_total || 0).toLocaleString()} ج.م)
              </Text>
            </div>

            {/* Keyboard Shortcuts Visual Guide */}
            <Space size={4}>
              <Tag color="#1e3a8a" style={{ border: '1px solid #3b82f6', color: '#93c5fd' }}>
                F1: بحث عن صنف
              </Tag>
              <Tag color="#4c1d95" style={{ border: '1px solid #8b5cf6', color: '#c4b5fd' }}>
                F11: إضافة سطر جديد
              </Tag>
              <Tag color="#064e3b" style={{ border: '1px solid #10b981', color: '#6ee7b7' }}>
                F4: إتمام البيع
              </Tag>
            </Space>
          </Space>

          <Space size="small">
            {!sessionData?.is_open ? (
              <Button
                type="primary"
                size="small"
                icon={<UnlockOutlined />}
                style={{ backgroundColor: '#16a34a' }}
                onClick={() => {
                  openForm.resetFields();
                  setOpenModalVisible(true);
                }}
              >
                فتح الوردية
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  style={{ color: '#e2e8f0', borderColor: '#475569', background: '#1e293b' }}
                  onClick={() => {
                    cashMovForm.resetFields();
                    setCashMovModalVisible(true);
                  }}
                >
                  حركة نقدية
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<LockOutlined />}
                  onClick={() => {
                    closeForm.resetFields();
                    setCloseModalVisible(true);
                  }}
                >
                  إغلاق الوردية
                </Button>
              </>
            )}
            <Button
              icon={<ReloadOutlined />}
              shape="circle"
              size="small"
              type="text"
              style={{ color: '#94a3b8' }}
              onClick={fetchSession}
            />
          </Space>
        </div>
      </Card>

      {/* Main Terminal Grid: Right = Search & Catalog, Left = Active Invoice & Multi-Payment */}
      <Row gutter={10} style={{ flex: 1, minHeight: 0 }}>
        {/* Right Section: Product Search & Quick Catalog */}
        <Col xs={24} lg={13} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { padding: 10, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
          >
            {/* Fast Barcode / Keyword input */}
            <div style={{ marginBottom: 10 }}>
              <Input
                ref={searchInputRef}
                size="large"
                prefix={<BarcodeOutlined style={{ fontSize: 20, color: '#2563eb' }} />}
                suffix={
                  <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => searchInputRef.current?.focus()}>
                    F1 / F11
                  </Tag>
                }
                placeholder="امسح الباركود أو ابحث باسم الصنف / الكود (اضغط F1 للبحث أو F11 لإضافة سطر)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                autoFocus
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </div>

            {/* Search Results list / Grid */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.length > 0 ? (
                <Row gutter={[8, 8]}>
                  {searchResults.map((item) => (
                    <Col xs={12} sm={8} key={`${item.product_id}-${item.variant_id || '0'}`}>
                      <Card
                        hoverable
                        size="small"
                        onClick={() => addToCart(item)}
                        style={{
                          borderRadius: 8,
                          cursor: 'pointer',
                          borderColor: item.available_qty > 0 ? '#e2e8f0' : '#fecaca',
                          background: item.available_qty > 0 ? '#fff' : '#fff1f2'
                        }}
                        styles={{ body: { padding: 10 } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text code style={{ fontSize: 11 }}>{item.barcode || item.product_code}</Text>
                          <Badge
                            count={`${item.available_qty} متاح`}
                            style={{
                              backgroundColor:
                                item.available_qty > 5
                                  ? '#52c41a'
                                  : item.available_qty > 0
                                  ? '#fa8c16'
                                  : '#f5222d',
                              fontSize: 10
                            }}
                          />
                        </div>
                        <Text strong ellipsis style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                          {item.display_name}
                        </Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
                            {item.unit_price} ج.م
                          </Text>
                          <Button size="small" type="primary" shape="circle" icon={<PlusOutlined />} />
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                  <BarcodeOutlined style={{ fontSize: 44, marginBottom: 10, display: 'block', color: '#cbd5e1' }} />
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    جاهز لمسح الباركود أو البحث لإضافة المنتجات للفاتورة (اضغط F1 للبحث أو F11 لإضافة سطر)
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Left Section: Active Invoice Header, Item Details Table & Multi-Payment */}
        <Col xs={24} lg={11} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { padding: 10, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
          >
            {/* Salesperson Selector */}
            <div style={{ marginBottom: 8, background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <Row gutter={8} align="middle">
                <Col span={7}>
                  <Text strong style={{ fontSize: 12, color: '#334155' }}>
                    <UserOutlined style={{ marginLeft: 4, color: '#2563eb' }} />
                    البائع المسؤول:
                  </Text>
                </Col>
                <Col span={17}>
                  <Select
                    size="small"
                    placeholder="اختر البائع صاحب الفاتورة"
                    value={selectedSalesperson}
                    onChange={setSelectedSalesperson}
                    style={{ width: '100%' }}
                  >
                    {staff.map((u) => (
                      <Option key={u.id} value={u.id}>
                        {u.full_name || u.username} ({u.role === 'supervisor' ? 'مشرف' : 'بائع / كاشير'})
                      </Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </div>

            {/* Customer Details Row: Name, Phone, Address */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Input
                size="small"
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                size="small"
                prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                placeholder="رقم الهاتف"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: 120 }}
              />
              <Input
                size="small"
                prefix={<HomeOutlined style={{ color: '#94a3b8' }} />}
                placeholder="العنوان (اختياري)"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            {/* Cart Items Table (كود، كمية، سعر تلقائي، خصم، سعر نهائي) */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 6, marginBottom: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 12 }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '6px 8px' }}>كود / اسم الصنف</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center' }}>السعر</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: 75 }}>الخصم</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>النهائي</th>
                    <th style={{ padding: '6px 4px', width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{item.product_name}</div>
                        <Text code style={{ fontSize: 10 }}>{item.product_code}</Text>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <Space size={1}>
                          <Button
                            size="small"
                            type="text"
                            icon={<MinusOutlined style={{ fontSize: 9 }} />}
                            onClick={() => updateCartQty(item.key, -1)}
                          />
                          <Text strong style={{ minWidth: 18, textAlign: 'center', display: 'inline-block' }}>
                            {item.quantity}
                          </Text>
                          <Button
                            size="small"
                            type="text"
                            icon={<PlusOutlined style={{ fontSize: 9 }} />}
                            onClick={() => updateCartQty(item.key, 1)}
                          />
                        </Space>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: '#334155' }}>
                        {item.unit_price}
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <InputNumber
                          size="small"
                          min={0}
                          max={item.quantity * item.unit_price}
                          value={item.discount_amount || 0}
                          onChange={(v) => updateLineDiscount(item.key, v)}
                          style={{ width: 65, fontSize: 11 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>
                        {item.line_total.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                          onClick={() => removeFromCart(item.key)}
                        />
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '25px 0', color: '#94a3b8' }}>
                        الفاتورة فارغة - استخدم الباركود أو اضغط F1/F11 للإضافة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Multi-Payment Section */}
            <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              {/* Totals Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 6,
                  marginBottom: 8
                }}
              >
                <div>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>إجمالي الفاتورة: </span>
                  <span style={{ fontSize: 20, fontWeight: 'bold', color: '#4ade80' }}>
                    {netTotal.toFixed(2)} ج.م
                  </span>
                </div>

                <Space size="small">
                  <Button size="small" type="dashed" ghost onClick={handleQuickPayCash}>
                    كاش كامل
                  </Button>
                  <Button size="small" type="dashed" ghost onClick={handleQuickPayCard}>
                    فيزا كاملة
                  </Button>
                  <Button size="small" type="dashed" ghost onClick={handleQuickPayTransfer}>
                    تحويل كامل
                  </Button>
                </Space>
              </div>

              {/* Multi-Payment Inputs Row (Cash, Visa, Transfers) */}
              <div style={{ marginBottom: 8, background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', color: '#475569', marginBottom: 6 }}>
                  الدفع المتعدد (Multi-Payment) - حدد المبالغ المدفوعة:
                </div>
                <Row gutter={6}>
                  <Col span={8}>
                    <Text style={{ fontSize: 11, color: '#16a34a', display: 'block', marginBottom: 2 }}>
                      💵 نقدًا (كاش):
                    </Text>
                    <InputNumber
                      size="middle"
                      min={0}
                      precision={2}
                      value={cashTendered}
                      onChange={(v) => setCashTendered(v || 0)}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ fontSize: 11, color: '#2563eb', display: 'block', marginBottom: 2 }}>
                      💳 فيزا / بطاقة:
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
                  <Col span={8}>
                    <Text style={{ fontSize: 11, color: '#9333ea', display: 'block', marginBottom: 2 }}>
                      📱 تحويل / محفظة:
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

                {/* Tender Balance Indicators */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px dashed #e2e8f0',
                    fontSize: 12
                  }}
                >
                  <span>
                    المدفوع: <strong>{totalTendered.toFixed(2)} ج.م</strong>
                  </span>
                  {remainingDue > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      المتبقي: {remainingDue.toFixed(2)} ج.م
                    </span>
                  ) : (
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>
                      الباقي للعميل: {changeDue.toFixed(2)} ج.م
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <Row gutter={6}>
                <Col span={18}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircleOutlined />}
                    loading={isSubmittingSale}
                    disabled={cart.length === 0 || remainingDue > 0}
                    onClick={handleCompleteSale}
                    style={{
                      width: '100%',
                      backgroundColor: remainingDue > 0 ? '#94a3b8' : '#16a34a',
                      borderColor: remainingDue > 0 ? '#94a3b8' : '#16a34a',
                      fontWeight: 'bold',
                      fontSize: 15,
                      height: 42
                    }}
                  >
                    إتمام البيع وطباعة الفاتورة (F4)
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    danger
                    type="dashed"
                    size="large"
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    style={{ width: '100%', height: 42 }}
                  >
                    مسح
                  </Button>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Thermal Receipt Print Modal */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={null}
        width={380}
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
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#16a34a' }}>
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
              <Button danger type="primary" htmlType="submit">
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
