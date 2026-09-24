import React, { useState, useEffect, useRef } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Table,
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

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'split'
  const [cashTendered, setCashTendered] = useState(0);
  const [cardTendered, setCardTendered] = useState(0);
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

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

  useEffect(() => {
    fetchSession();
    // Auto-focus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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
        if (res.data.data.length === 1 && (res.data.data[0].barcode === val.trim() || res.data.data[0].product_code === val.trim())) {
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

    setCart(prev => {
      const itemKey = `${product.product_id}-${product.variant_id || 'base'}`;
      const existing = prev.find(item => item.key === itemKey);

      if (existing) {
        if (existing.quantity >= product.available_qty) {
          message.warning(`الكمية المتاحة في المخزون (${product.available_qty}) فقط!`);
          return prev;
        }
        return prev.map(item =>
          item.key === itemKey
            ? { ...item, quantity: item.quantity + 1, line_total: (item.quantity + 1) * item.unit_price }
            : item
        );
      }

      return [
        ...prev,
        {
          key: itemKey,
          product_id: product.product_id,
          variant_id: product.variant_id,
          product_name: product.display_name,
          product_code: product.product_code,
          barcode: product.barcode,
          unit_price: parseFloat(product.unit_price),
          available_qty: product.available_qty,
          quantity: 1,
          line_total: parseFloat(product.unit_price)
        }
      ];
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateCartQty = (key, delta) => {
    setCart(prev => prev.map(item => {
      if (item.key !== key) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > item.available_qty) {
        message.warning(`الكمية المتاحة في المخزون (${item.available_qty}) فقط!`);
        return item;
      }
      return { ...item, quantity: newQty, line_total: newQty * item.unit_price };
    }).filter(Boolean));
  };

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setCashTendered(0);
    setCardTendered(0);
    setCustomerName('عميل نقدي');
    setCustomerPhone('');
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const netTotal = Math.max(0, subtotal - parseFloat(discountAmount || 0) + parseFloat(taxAmount || 0));

  // Auto-set tender amounts when total changes
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashTendered(netTotal);
    } else {
      setCashTendered(0);
    }
  }, [netTotal, paymentMethod]);

  const changeDue = paymentMethod === 'cash' ? Math.max(0, (parseFloat(cashTendered || 0)) - netTotal) : 0;

  // Submit Fast Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      return message.error('سلة المشتريات فارغة');
    }

    if (paymentMethod === 'cash' && !sessionData?.is_open) {
      return message.error('الخزينة مغلقة! يرجى فتح الوردية أولاً لقبول المدفوعات النقدية.');
    }

    setIsSubmittingSale(true);
    try {
      const payload = {
        customer_name: customerName || 'عميل نقدي',
        customer_phone: customerPhone || undefined,
        discount_amount: parseFloat(discountAmount) || 0,
        tax_amount: parseFloat(taxAmount) || 0,
        payment_method: paymentMethod,
        payment_breakdown: {
          cash: paymentMethod === 'cash' ? netTotal : 0,
          bank_transfer: paymentMethod === 'bank_transfer' ? netTotal : 0,
          e_wallet: paymentMethod === 'e_wallet' ? netTotal : 0
        },
        notes: saleNotes || undefined,
        items: cart.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name
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
      {/* Top POS Status Bar */}
      <Card
        size="small"
        style={{
          marginBottom: 12,
          background: '#0f172a',
          borderColor: '#1e293b',
          color: '#fff'
        }}
        bodyStyle={{ padding: '8px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large">
            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>حالة الخزينة: </Text>
              {sessionData?.is_open ? (
                <Tag icon={<UnlockOutlined />} color="success" style={{ fontWeight: 'bold' }}>
                  مفتوحة للبيع
                </Tag>
              ) : (
                <Tag icon={<LockOutlined />} color="error" style={{ fontWeight: 'bold' }}>
                  مغلقة
                </Tag>
              )}
            </div>

            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>رصيد الدرج النقدي: </Text>
              <Text strong style={{ color: '#38bdf8', fontSize: 16 }}>
                {(sessionData?.current_balance || 0).toLocaleString()} ج.م
              </Text>
            </div>

            <div>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>مبيعات اليوم: </Text>
              <Text strong style={{ color: '#4ade80' }}>
                {sessionData?.today_sales_count || 0} عملية ({(sessionData?.today_sales_total || 0).toLocaleString()} ج.م)
              </Text>
            </div>
          </Space>

          <Space>
            {!sessionData?.is_open ? (
              <Button
                type="primary"
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
                  icon={<SwapOutlined />}
                  style={{ color: '#e2e8f0', borderColor: '#475569', background: '#1e293b' }}
                  onClick={() => {
                    cashMovForm.resetFields();
                    setCashMovModalVisible(true);
                  }}
                >
                  حركة نقدية (سحب/إيداع)
                </Button>
                <Button
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
              type="text"
              style={{ color: '#94a3b8' }}
              onClick={fetchSession}
            />
          </Space>
        </div>
      </Card>

      {/* Main Terminal Grid: Right = Search & Catalog, Left = Cart & Checkout */}
      <Row gutter={12} style={{ flex: 1, minHeight: 0 }}>
        {/* Right Section: Product Search & Fast Catalog */}
        <Col xs={24} lg={14} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Fast Barcode / Keyword input */}
            <div style={{ marginBottom: 12 }}>
              <Input
                ref={searchInputRef}
                size="large"
                prefix={<BarcodeOutlined style={{ fontSize: 20, color: '#2563eb' }} />}
                placeholder="امسح الباركود بجهاز المسح الضوئي أو اكتب اسم الصنف / الكود (Enter)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                autoFocus
                style={{ borderRadius: 8, fontSize: 15 }}
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
                        bodyStyle={{ padding: 10 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text code style={{ fontSize: 11 }}>{item.barcode || item.product_code}</Text>
                          <Badge
                            count={`${item.available_qty} متاح`}
                            style={{
                              backgroundColor: item.available_qty > 5 ? '#52c41a' : (item.available_qty > 0 ? '#fa8c16' : '#f5222d'),
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
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <BarcodeOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
                  <Text type="secondary" style={{ fontSize: 15 }}>
                    جاهز لمسح الباركود أو البحث عن المنتجات لإضافتها للفاتورة
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Left Section: Active Invoice Cart & Fast Checkout */}
        <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Customer Details Row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input
                size="small"
                prefix={<UserOutlined />}
                placeholder="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                size="small"
                placeholder="رقم الهاتف"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: 140 }}
              />
            </div>

            {/* Cart Items Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 6, marginBottom: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 8px' }}>الصنف</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>الكمية</th>
                    <th style={{ padding: '6px 8px' }}>السعر</th>
                    <th style={{ padding: '6px 8px' }}>الإجمالي</th>
                    <th style={{ padding: '6px 4px', width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.product_code}</Text>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <Space size={2}>
                          <Button
                            size="small"
                            type="text"
                            icon={<MinusOutlined style={{ fontSize: 10 }} />}
                            onClick={() => updateCartQty(item.key, -1)}
                          />
                          <Text strong style={{ minWidth: 20, textAlign: 'center', display: 'inline-block' }}>
                            {item.quantity}
                          </Text>
                          <Button
                            size="small"
                            type="text"
                            icon={<PlusOutlined style={{ fontSize: 10 }} />}
                            onClick={() => updateCartQty(item.key, 1)}
                          />
                        </Space>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{item.unit_price}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{item.line_total} ج.م</td>
                      <td style={{ padding: '6px 4px' }}>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeFromCart(item.key)}
                        />
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                        السلة فارغة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Payment Options */}
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">المجموع الفرعي:</Text>
                <Text strong>{subtotal.toFixed(2)} ج.م</Text>
              </div>

              <Row gutter={8} style={{ marginBottom: 6 }}>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>خصم:</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      value={discountAmount}
                      onChange={setDiscountAmount}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>ضريبة:</Text>
                    <InputNumber
                      size="small"
                      min={0}
                      value={taxAmount}
                      onChange={setTaxAmount}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1e293b',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 6,
                  marginBottom: 8
                }}
              >
                <span style={{ fontSize: 14 }}>الصافي النهائي:</span>
                <span style={{ fontSize: 22, fontWeight: 'bold', color: '#4ade80' }}>
                  {netTotal.toFixed(2)} ج.م
                </span>
              </div>

              {/* Payment Method Selector (Cash, Bank Transfer, E-Wallet, Split) */}
              <div style={{ marginBottom: 8 }}>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', display: 'flex' }}
                >
                  <Radio.Button value="cash" style={{ flex: 1, textAlign: 'center' }}>كاش (نقدي)</Radio.Button>
                  <Radio.Button value="bank_transfer" style={{ flex: 1, textAlign: 'center' }}>تحويل بنكي</Radio.Button>
                  <Radio.Button value="e_wallet" style={{ flex: 1, textAlign: 'center' }}>محفظة ذكية</Radio.Button>
                  <Radio.Button value="split" style={{ flex: 1, textAlign: 'center' }}>مقسم (Split)</Radio.Button>
                </Radio.Group>
              </div>

              {/* Tender & Change Calculator for Cash */}
              {paymentMethod === 'cash' && (
                <div style={{ marginBottom: 8, background: '#fff', padding: 6, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <Row gutter={8} align="middle">
                    <Col span={12}>
                      <Text style={{ fontSize: 12 }}>المبلغ المدفوع (Tendered):</Text>
                      <InputNumber
                        size="small"
                        min={0}
                        style={{ width: '100%' }}
                        value={cashTendered}
                        onChange={setCashTendered}
                      />
                    </Col>
                    <Col span={12}>
                      <Text style={{ fontSize: 12 }}>المتبقي للعميل (Change):</Text>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#16a34a' }}>
                        {changeDue.toFixed(2)} ج.م
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Action Buttons */}
              <Space style={{ width: '100%' }} direction="vertical" size={6}>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={isSubmittingSale}
                  disabled={cart.length === 0}
                  onClick={handleCompleteSale}
                  style={{
                    width: '100%',
                    backgroundColor: '#16a34a',
                    borderColor: '#16a34a',
                    fontWeight: 'bold',
                    fontSize: 16,
                    height: 44
                  }}
                >
                  إتمام البيع وطباعة الفاتورة (F4)
                </Button>
                <Button
                  danger
                  type="dashed"
                  size="small"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  style={{ width: '100%' }}
                >
                  إلغاء السلة (مسح)
                </Button>
              </Space>
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
        destroyOnClose
      >
        <ThermalReceipt
          invoice={lastInvoice}
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
