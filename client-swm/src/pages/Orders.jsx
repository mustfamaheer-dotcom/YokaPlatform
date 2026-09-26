import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  App as AntdApp,
  Card,
  Row,
  Col,
  Modal,
  Descriptions,
  Divider,
  Popconfirm,
  Tabs,
  Form,
  InputNumber,
  Switch,
  Spin
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CarOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BarcodeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  ShopOutlined,
  PhoneOutlined,
  LinkOutlined,
  WalletOutlined,
  PaperClipOutlined,
  CopyOutlined,
  PictureOutlined,
  CreditCardOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Orders() {
  const { message } = AntdApp.useApp();
  const [activeTab, setActiveTab] = useState('orders');

  // ==========================================
  // TAB 1: ORDERS STATE & HANDLERS
  // ==========================================
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Ship Order Modal
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shippingOrderId, setShippingOrderId] = useState(null);
  const [shippingOrderNumber, setShippingOrderNumber] = useState('');
  const [shippingSubmitting, setShippingSubmitting] = useState(false);
  const [shipForm] = Form.useForm();

  // ==========================================
  // SHIPPING RATES & CARRIERS STATE
  // ==========================================

  // Rates State
  const [shippingRates, setShippingRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateSubmitting, setRateSubmitting] = useState(false);
  const [rateForm] = Form.useForm();

  // Carriers State
  const [shippingCarriers, setShippingCarriers] = useState([]);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [isCarrierModalOpen, setIsCarrierModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [carrierSubmitting, setCarrierSubmitting] = useState(false);
  const [carrierForm] = Form.useForm();

  // ==========================================
  // PAYMENT METHODS & RECEIPTS STATE
  // ==========================================
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentForm] = Form.useForm();

  // Receipt Preview Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState('');
  const [previewReceiptTitle, setPreviewReceiptTitle] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchShippingRates();
    fetchShippingCarriers();
    fetchPaymentMethods();
  }, [statusFilter]);

  // Fetch orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/api/swm/orders', { params });
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل قائمة طلبات المتجر');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch shipping rates
  const fetchShippingRates = async () => {
    setLoadingRates(true);
    try {
      const res = await api.get('/api/swm/orders/shipping-rates');
      if (res.data.success) {
        setShippingRates(res.data.data);
      }
    } catch (err) {
      message.error('فشل في تحميل تكاليف الشحن');
    } finally {
      setLoadingRates(false);
    }
  };

  // Fetch shipping carriers
  const fetchShippingCarriers = async () => {
    setLoadingCarriers(true);
    try {
      const res = await api.get('/api/swm/orders/shipping-carriers');
      if (res.data.success) {
        setShippingCarriers(res.data.data);
      }
    } catch (err) {
      message.error('فشل في تحميل شركات الشحن');
    } finally {
      setLoadingCarriers(false);
    }
  };

  // Open Details Modal
  const handleOpenDetail = async (orderId) => {
    setDetailLoading(true);
    setIsDetailModalOpen(true);
    try {
      const res = await api.get(`/api/swm/orders/${orderId}`);
      if (res.data.success) {
        setSelectedOrder(res.data.data);
      } else {
        message.error('تعذر جلب تفاصيل هذا الطلب');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في جلب تفاصيل الطلب');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Ship Modal
  const handleOpenShipModal = (record) => {
    setShippingOrderId(record.id);
    setShippingOrderNumber(record.order_number);
    shipForm.resetFields();
    
    // Choose default carrier from available carriers list
    const defaultCarrier = shippingCarriers.length > 0
      ? shippingCarriers[0].carrier_name
      : 'بوسطة (Bosta)';

    shipForm.setFieldsValue({
      tracking_number: `WAYBILL-${Date.now().toString().slice(-6)}`,
      parcel_count: 1,
      shipping_carrier: defaultCarrier,
      shipping_notes: ''
    });
    setIsShipModalOpen(true);
  };

  // Submit Ship Order
  const handleExecuteShip = async (values) => {
    if (!shippingOrderId) return;
    setShippingSubmitting(true);
    try {
      const res = await api.put(`/api/swm/orders/${shippingOrderId}/ship`, values);
      if (res.data.success) {
        message.success('تم شحن الأوردر بنجاح وتسجيل بوليصة الشحن وعدد الطرود');
        setIsShipModalOpen(false);
        fetchOrders();
        if (selectedOrder && selectedOrder.id === shippingOrderId) {
          handleOpenDetail(shippingOrderId);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تنفيذ عملية الشحن');
    } finally {
      setShippingSubmitting(false);
    }
  };

  // Quick Status update (delivered, cancelled)
  const handleUpdateStatus = async (orderId, newOrderStatus, newPaymentStatus) => {
    try {
      const payload = {};
      if (newOrderStatus) payload.order_status = newOrderStatus;
      if (newPaymentStatus) payload.payment_status = newPaymentStatus;

      const res = await api.put(`/api/swm/orders/${orderId}/status`, payload);
      if (res.data.success) {
        message.success('تم تحديث حالة الطلب بنجاح');
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          handleOpenDetail(orderId);
        }
      }
    } catch (err) {
      message.error('فشل تحديث حالة الطلب');
    }
  };

  // ==========================================
  // SHIPPING RATES HANDLERS
  // ==========================================
  const handleOpenAddRate = () => {
    setEditingRate(null);
    rateForm.resetFields();
    rateForm.setFieldsValue({
      city_name: '',
      city_code: '',
      shipping_fee: 55,
      estimated_days: '2-4 أيام عمل',
      is_active: true
    });
    setIsRateModalOpen(true);
  };

  const handleOpenEditRate = (rate) => {
    setEditingRate(rate);
    rateForm.setFieldsValue({
      city_name: rate.city_name,
      city_code: rate.city_code,
      shipping_fee: parseFloat(rate.shipping_fee),
      estimated_days: rate.estimated_days,
      is_active: rate.is_active
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (values) => {
    setRateSubmitting(true);
    try {
      if (editingRate) {
        const res = await api.put(`/api/swm/orders/shipping-rates/${editingRate.id}`, values);
        if (res.data.success) {
          message.success('تم تعديل سعر التوصيل بنجاح');
          setIsRateModalOpen(false);
          fetchShippingRates();
        }
      } else {
        const res = await api.post('/api/swm/orders/shipping-rates', values);
        if (res.data.success) {
          message.success('تمت إضافة المدينة وسعر الشحن بنجاح');
          setIsRateModalOpen(false);
          fetchShippingRates();
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حفظ سعر التوصيل');
    } finally {
      setRateSubmitting(false);
    }
  };

  const handleDeleteRate = async (id) => {
    try {
      const res = await api.delete(`/api/swm/orders/shipping-rates/${id}`);
      if (res.data.success) {
        message.success('تم حذف المدينة بنجاح');
        fetchShippingRates();
      }
    } catch (err) {
      message.error('فشل حذف المدينة');
    }
  };

  // ==========================================
  // SHIPPING CARRIERS HANDLERS
  // ==========================================
  const handleOpenAddCarrier = () => {
    setEditingCarrier(null);
    carrierForm.resetFields();
    carrierForm.setFieldsValue({
      carrier_name: '',
      contact_phone: '',
      tracking_url_template: '',
      is_active: true
    });
    setIsCarrierModalOpen(true);
  };

  const handleOpenEditCarrier = (carrier) => {
    setEditingCarrier(carrier);
    carrierForm.setFieldsValue({
      carrier_name: carrier.carrier_name,
      contact_phone: carrier.contact_phone,
      tracking_url_template: carrier.tracking_url_template,
      is_active: carrier.is_active
    });
    setIsCarrierModalOpen(true);
  };

  const handleSaveCarrier = async (values) => {
    setCarrierSubmitting(true);
    try {
      if (editingCarrier) {
        const res = await api.put(`/api/swm/orders/shipping-carriers/${editingCarrier.id}`, values);
        if (res.data.success) {
          message.success('تم تعديل بيانات شركة الشحن بنجاح');
          setIsCarrierModalOpen(false);
          fetchShippingCarriers();
        }
      } else {
        const res = await api.post('/api/swm/orders/shipping-carriers', values);
        if (res.data.success) {
          message.success('تمت إضافة شركة الشحن بنجاح');
          setIsCarrierModalOpen(false);
          fetchShippingCarriers();
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حفظ شركة الشحن');
    } finally {
      setCarrierSubmitting(false);
    }
  };

  const handleDeleteCarrier = async (id) => {
    try {
      const res = await api.delete(`/api/swm/orders/shipping-carriers/${id}`);
      if (res.data.success) {
        message.success('تم حذف شركة الشحن بنجاح');
        fetchShippingCarriers();
      }
    } catch (err) {
      message.error('فشل حذف شركة الشحن');
    }
  };

  // ==========================================
  // PAYMENT METHODS HANDLERS
  // ==========================================
  const fetchPaymentMethods = async () => {
    setLoadingPayments(true);
    try {
      const res = await api.get('/api/swm/orders/payment-methods');
      if (res.data.success) {
        setPaymentMethods(res.data.data);
      }
    } catch (err) {
      message.error('فشل في تحميل طرق الدفع');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleTogglePaymentActive = async (id, isActive) => {
    try {
      const res = await api.put(`/api/swm/orders/payment-methods/${id}`, { is_active: isActive });
      if (res.data.success) {
        message.success('تم تحديث حالة تفعيل طريقة الدفع');
        fetchPaymentMethods();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل التحديث');
    }
  };

  const handleOpenAddPayment = () => {
    setEditingPayment(null);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      name_ar: '',
      method_key: '',
      provider: 'instapay',
      account_number: '',
      account_name: '',
      instructions: '',
      requires_receipt: true,
      is_active: true,
      display_order: paymentMethods.length + 1
    });
    setIsPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (record) => {
    setEditingPayment(record);
    paymentForm.setFieldsValue({
      name_ar: record.name_ar,
      method_key: record.method_key,
      provider: record.provider || 'other',
      account_number: record.account_number || '',
      account_name: record.account_name || '',
      instructions: record.instructions || '',
      requires_receipt: Boolean(record.requires_receipt),
      is_active: Boolean(record.is_active),
      display_order: record.display_order || 0
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (values) => {
    setPaymentSubmitting(true);
    try {
      if (editingPayment) {
        const res = await api.put(`/api/swm/orders/payment-methods/${editingPayment.id}`, values);
        if (res.data.success) {
          message.success('تم تحديث بيانات طريقة الدفع بنجاح');
          setIsPaymentModalOpen(false);
          fetchPaymentMethods();
        }
      } else {
        const res = await api.post('/api/swm/orders/payment-methods', values);
        if (res.data.success) {
          message.success('تمت إضافة طريقة الدفع بنجاح');
          setIsPaymentModalOpen(false);
          fetchPaymentMethods();
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حفظ طريقة الدفع');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      const res = await api.delete(`/api/swm/orders/payment-methods/${id}`);
      if (res.data.success) {
        message.success('تم حذف طريقة الدفع بنجاح');
        fetchPaymentMethods();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حذف طريقة الدفع');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    try {
      const res = await api.put(`/api/swm/orders/${orderId}/verify-payment`);
      if (res.data.success) {
        message.success(res.data.message || 'تم تأكيد استلام التحويل');
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, payment_status: 'paid' }));
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل تأكيد التحويل');
    }
  };

  const handleViewReceipt = (url, orderNumber) => {
    setPreviewReceiptUrl(url);
    setPreviewReceiptTitle(`إشعار تحويل الطلب #${orderNumber}`);
    setIsReceiptModalOpen(true);
  };

  // Payment Methods Table Columns
  const paymentColumns = [
    {
      title: 'طريقة الدفع',
      dataIndex: 'name_ar',
      key: 'name_ar',
      render: (name, r) => (
        <Space>
          {r.provider === 'instapay' ? (
            <QrcodeOutlined style={{ fontSize: 18, color: '#9333ea' }} />
          ) : r.provider === 'cash' ? (
            <WalletOutlined style={{ fontSize: 18, color: '#eab308' }} />
          ) : (
            <CreditCardOutlined style={{ fontSize: 18, color: '#2563eb' }} />
          )}
          <div>
            <Text strong>{name}</Text>
            <div style={{ fontSize: 11, color: '#64748b' }}>كود: {r.method_key}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'مزود الخدمة',
      dataIndex: 'provider',
      key: 'provider',
      render: (p) => {
        const colorMap = {
          instapay: 'purple',
          vodafone: 'red',
          orange: 'orange',
          etisalat: 'green',
          we: 'magenta',
          bank: 'blue',
          cash: 'gold'
        };
        return <Tag color={colorMap[p] || 'default'}>{p ? p.toUpperCase() : 'OTHER'}</Tag>;
      }
    },
    {
      title: 'بيانات الحساب / رقم المحفظة / عنوان إنستاباي',
      dataIndex: 'account_number',
      key: 'account_number',
      render: (acc, r) => (
        <div>
          {acc ? (
            <Space>
              <strong style={{ color: '#0f172a', fontSize: 14 }}>{acc}</strong>
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(acc);
                  message.success('تم نسخ البيانات للحافظة');
                }}
              />
            </Space>
          ) : (
            <Text type="secondary">لا ينطبق (دفع نقدي)</Text>
          )}
          {r.account_name && (
            <div style={{ fontSize: 12, color: '#64748b' }}>اسم الحساب: {r.account_name}</div>
          )}
        </div>
      )
    },
    {
      title: 'إلزام إرفاق سكرين شوت التحويل',
      dataIndex: 'requires_receipt',
      key: 'requires_receipt',
      align: 'center',
      render: (req) => (
        <Tag color={req ? 'red' : 'default'}>
          {req ? 'مطلوب إرفاق إشعار (IPN/Wallet)' : 'غير مطلوب'}
        </Tag>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      render: (active, r) => (
        <Switch
          checked={active}
          checkedChildren="مفعل"
          unCheckedChildren="معطل"
          onChange={(checked) => handleTogglePaymentActive(r.id, checked)}
        />
      )
    },
    {
      title: 'الترتيب',
      dataIndex: 'display_order',
      key: 'display_order',
      align: 'center',
      width: 70
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditPayment(r)}
          >
            تعديل
          </Button>

          {r.method_key !== 'cod' && (
            <Popconfirm
              title="حذف طريقة الدفع؟"
              description="هل أنت متأكد من حذف طريقة الدفع هذه؟"
              onConfirm={() => handleDeletePayment(r.id)}
              okText="نعم، حذف"
              cancelText="إلغاء"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                حذف
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const getStatusTag = (status) => {
    switch (status) {
      case 'processing':
        return <Tag icon={<ClockCircleOutlined />} color="orange">قيد التجهيز</Tag>;
      case 'shipped':
        return <Tag icon={<CarOutlined />} color="blue">تم الشحن مع المندوب</Tag>;
      case 'delivered':
        return <Tag icon={<CheckCircleOutlined />} color="green">تم التسليم والتحصيل</Tag>;
      case 'cancelled':
        return <Tag icon={<CloseCircleOutlined />} color="red">ملغي</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // ==========================================
  // ORDERS TABLE COLUMNS
  // ==========================================
  const orderColumns = [
    {
      title: 'رقم الطلب',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (num, r) => (
        <div>
          <Text strong style={{ color: '#2563eb' }}>{num}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {new Date(r.created_at).toLocaleString('ar-EG')}
          </div>
          {r.tracking_number && (
            <div style={{ fontSize: 11, color: '#0891b2', marginTop: 2 }}>
              <BarcodeOutlined style={{ marginLeft: 4 }} />
              بوليصة: <strong>{r.tracking_number}</strong> ({r.parcel_count || 1} طرد)
            </div>
          )}
        </div>
      )
    },
    {
      title: 'بيانات العميل',
      key: 'customer',
      render: (_, r) => {
        const addr = typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address || '{}') : (r.shipping_address || {});
        return (
          <div>
            <Text strong>{addr.recipient_name || 'عميل المتجر'}</Text>
            <div style={{ fontSize: 12, color: '#059669', direction: 'ltr', textAlign: 'right' }}>
              {addr.phone || '-'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'عنوان التوصيل',
      key: 'address',
      render: (_, r) => {
        const addr = typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address || '{}') : (r.shipping_address || {});
        return (
          <div style={{ fontSize: 12 }}>
            <Tag color="geekblue">{addr.governorate || 'القاهرة'}</Tag>
            <span>{addr.city} — {addr.street_address}</span>
          </div>
        );
      }
    },
    {
      title: 'الإجمالي المطلوب',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (val) => (
        <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>
          {parseFloat(val).toLocaleString()} ج.م
        </span>
      )
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method, r) => (
        <div>
          <Tag color={method === 'cod' ? 'gold' : (method === 'instapay' ? 'purple' : (method === 'vodafone_cash' ? 'red' : 'blue'))}>
            {method === 'cod' ? 'دفع عند الاستلام' : (method === 'instapay' ? 'إنستاباي' : (method === 'vodafone_cash' ? 'فودافون كاش' : (method === 'card' ? 'بطاقة بنكية' : 'محفظة إلكترونية')))}
          </Tag>
          {r.transfer_receipt_url && (
            <div style={{ marginTop: 4 }}>
              <Button
                size="small"
                type="dashed"
                icon={<PaperClipOutlined style={{ color: '#059669' }} />}
                onClick={() => handleViewReceipt(r.transfer_receipt_url, r.order_number)}
                style={{ fontSize: 11, height: 24, padding: '0 8px', color: '#059669', borderColor: '#059669' }}
              >
                إشعار التحويل 📎
              </Button>
            </div>
          )}
          <div style={{ fontSize: 11, marginTop: 2 }}>
            {r.payment_status === 'paid' ? (
              <span style={{ color: '#16a34a', fontWeight: 700 }}>محصل بالكامل</span>
            ) : (
              <span style={{ color: '#d97706' }}>في انتظار التحصيل</span>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'حالة الطلب',
      dataIndex: 'order_status',
      key: 'order_status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r.id)}
            style={{ backgroundColor: '#2563eb' }}
          >
            التفاصيل
          </Button>

          {r.order_status === 'processing' && (
            <Button
              size="small"
              type="primary"
              icon={<CarOutlined />}
              onClick={() => handleOpenShipModal(r)}
              style={{ backgroundColor: '#0284c7' }}
            >
              شحن
            </Button>
          )}

          {r.order_status === 'shipped' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleUpdateStatus(r.id, 'delivered', 'paid')}
              style={{ backgroundColor: '#16a34a' }}
            >
              تم التسليم
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Item Columns for Detail Modal
  const itemColumns = [
    {
      title: 'اسم الصنف والمواصفات',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          {r.variant_desc && <div style={{ fontSize: 12, color: '#64748b' }}>{r.variant_desc}</div>}
        </div>
      )
    },
    {
      title: 'الكمية',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (q) => <Tag color="blue">{q} قطعة</Tag>
    },
    {
      title: 'سعر الوحدة',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (v) => `${parseFloat(v).toLocaleString()} ج.م`
    },
    {
      title: 'الإجمالي',
      dataIndex: 'line_total',
      key: 'line_total',
      render: (v) => `${parseFloat(v).toLocaleString()} ج.م`
    }
  ];

  // ==========================================
  // SHIPPING RATES TABLE COLUMNS
  // ==========================================
  const rateColumns = [
    {
      title: 'المدينة / المحافظة',
      dataIndex: 'city_name',
      key: 'city_name',
      render: (name, r) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#2563eb' }} />
          <Text strong>{name}</Text>
          <Tag>{r.city_code}</Tag>
        </Space>
      )
    },
    {
      title: 'تكلفة التوصيل (ج.م)',
      dataIndex: 'shipping_fee',
      key: 'shipping_fee',
      render: (fee) => (
        <span style={{ fontWeight: 800, color: '#059669', fontSize: 15 }}>
          {parseFloat(fee).toLocaleString()} ج.م
        </span>
      )
    },
    {
      title: 'المدة المقدرة للتسليم',
      dataIndex: 'estimated_days',
      key: 'estimated_days',
      render: (days) => <Tag color="cyan">{days || '2-4 أيام عمل'}</Tag>
    },
    {
      title: 'حالة التوصيل',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'متاح للشحن' : 'معطل'}
        </Tag>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditRate(r)}
          >
            تعديل السعر
          </Button>

          <Popconfirm
            title="حذف المدينة؟"
            description="هل أنت متأكد من حذف هذه المدينة من قائمة الشحن؟"
            onConfirm={() => handleDeleteRate(r.id)}
            okText="نعم، حذف"
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

  // ==========================================
  // SHIPPING CARRIERS TABLE COLUMNS
  // ==========================================
  const carrierColumns = [
    {
      title: 'شركة / جهة الشحن',
      dataIndex: 'carrier_name',
      key: 'carrier_name',
      render: (name) => (
        <Space>
          <ShopOutlined style={{ color: '#0284c7' }} />
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
        </Space>
      )
    },
    {
      title: 'هاتف التواصل / الخط الساخن',
      dataIndex: 'contact_phone',
      key: 'contact_phone',
      render: (phone) => phone ? (
        <Space>
          <PhoneOutlined style={{ color: '#059669' }} />
          <span>{phone}</span>
        </Space>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'رابط تتبع الشحنات',
      dataIndex: 'tracking_url_template',
      key: 'tracking_url_template',
      render: (url) => url ? (
        <Space>
          <LinkOutlined style={{ color: '#2563eb' }} />
          <Text ellipsis style={{ maxWidth: 200 }}>{url}</Text>
        </Space>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'الحالة',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'نشط' : 'معطل'}
        </Tag>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditCarrier(r)}
          >
            تعديل
          </Button>

          <Popconfirm
            title="حذف شركة الشحن؟"
            description="هل أنت متأكد من حذف هذه الشركة من قائمة شركات الشحن؟"
            onConfirm={() => handleDeleteCarrier(r.id)}
            okText="نعم، حذف"
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

  const selectedAddr = selectedOrder
    ? (typeof selectedOrder.shipping_address === 'string' ? JSON.parse(selectedOrder.shipping_address || '{}') : selectedOrder.shipping_address)
    : {};

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>إدارة المتجر الإلكتروني (ECP Store Management)</Title>
          <Text type="secondary">متابعة طلبات العملاء، تجهيز الشحنات بالبوليصة والطرود، وضبط أسعار وشركات الشحن والتوصيل</Text>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        items={[
          {
            key: 'orders',
            label: (
              <span>
                <InboxOutlined style={{ marginLeft: 6 }} />
                طلبات العملاء (Orders)
              </span>
            ),
            children: (
              <div>
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8fafc' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={10}>
                      <Input
                        placeholder="البحث برقم الطلب، هاتف العميل، أو الاسم..."
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={fetchOrders}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      >
                        <Option value="all">جميع الحالات</Option>
                        <Option value="processing">قيد التجهيز (Processing)</Option>
                        <Option value="shipped">تم الشحن مع المندوب (Shipped)</Option>
                        <Option value="delivered">تم التسليم والتحصيل (Delivered)</Option>
                        <Option value="cancelled">ملغي (Cancelled)</Option>
                      </Select>
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                      <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
                        تحديث الطلبات
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Table
                  columns={orderColumns}
                  dataSource={orders}
                  rowKey="id"
                  loading={loadingOrders}
                  pagination={{ pageSize: 15 }}
                  bordered
                />
              </div>
            )
          },
          {
            key: 'rates',
            label: (
              <span>
                <EnvironmentOutlined style={{ marginLeft: 6 }} />
                تكاليف شحن المحافظات والمدن
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    قائمة أسعار الشحن والتوصيل للمحافظات والمدن المصرية:
                  </Text>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchShippingRates}>
                      تحديث
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenAddRate}
                      style={{ backgroundColor: '#2563eb' }}
                    >
                      إضافة مدينة / منطقة جديدة
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={rateColumns}
                  dataSource={shippingRates}
                  rowKey="id"
                  loading={loadingRates}
                  pagination={{ pageSize: 30 }}
                  bordered
                />
              </div>
            )
          },
          {
            key: 'carriers',
            label: (
              <span>
                <CarOutlined style={{ marginLeft: 6 }} />
                شركات وجهات الشحن
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    إدارة شركات الشحن ومناديب التوصيل المعتمدة للنظام:
                  </Text>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchShippingCarriers}>
                      تحديث
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenAddCarrier}
                      style={{ backgroundColor: '#0284c7' }}
                    >
                      إضافة شركة شحن جديدة
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={carrierColumns}
                  dataSource={shippingCarriers}
                  rowKey="id"
                  loading={loadingCarriers}
                  pagination={{ pageSize: 15 }}
                  bordered
                />
              </div>
            )
          },
          {
            key: 'payments',
            label: (
              <span>
                <WalletOutlined style={{ marginLeft: 6 }} />
                طرق الدفع والتحويل الإلكتروني (Payment Methods)
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    إدارة طرق الدفع والمحافظ الإلكترونية وحسابات إنستاباي للمتجر:
                  </Text>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchPaymentMethods}>
                      تحديث
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenAddPayment}
                      style={{ backgroundColor: '#9333ea' }}
                    >
                      إضافة طريقة دفع / محفظة جديدة
                    </Button>
                  </Space>
                </div>

                <Table
                  columns={paymentColumns}
                  dataSource={paymentMethods}
                  rowKey="id"
                  loading={loadingPayments}
                  pagination={{ pageSize: 15 }}
                  bordered
                />
              </div>
            )
          }
        ]}
      />

      {/* ========================================================= */}
      {/* 1. ORDER DETAIL MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
            <Space>
              <Text strong style={{ fontSize: 16 }}>تفاصيل الطلب: {selectedOrder?.order_number}</Text>
              {selectedOrder && getStatusTag(selectedOrder.order_status)}
            </Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>طباعة بوليصة الشحن</Button>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedOrder(null);
        }}
        footer={null}
        width={750}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="جارٍ تحميل تفاصيل الطلب..." />
          </div>
        ) : selectedOrder ? (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="اسم المستلم">{selectedAddr.recipient_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="رقم الهاتف">{selectedAddr.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="عنوان الشحن" span={2}>
                {selectedAddr.governorate} — {selectedAddr.city} — {selectedAddr.street_address} {selectedAddr.building_apartment}
              </Descriptions.Item>
              <Descriptions.Item label="طريقة السداد">
                {selectedOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}
              </Descriptions.Item>
              <Descriptions.Item label="حالة السداد">
                <span style={{ fontWeight: 700, color: selectedOrder.payment_status === 'paid' ? '#16a34a' : '#d97706' }}>
                  {selectedOrder.payment_status === 'paid' ? 'تم السداد' : 'في انتظار التحصيل'}
                </span>
              </Descriptions.Item>

              {/* Waybill & Carrier Info if shipped */}
              {selectedOrder.tracking_number && (
                <>
                  <Descriptions.Item label="رقم بوليصة الشحن">
                    <strong style={{ color: '#0284c7', fontSize: 14 }}>{selectedOrder.tracking_number}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="عدد الطرود المسلمة">
                    <Tag color="cyan">{selectedOrder.parcel_count || 1} طرد</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="شركة الشحن" span={2}>
                    <Tag color="blue">{selectedOrder.shipping_carrier || 'مندوب التوصيل'}</Tag>
                  </Descriptions.Item>
                </>
              )}

              {selectedOrder.customer_notes && (
                <Descriptions.Item label="ملاحظات العميل" span={2}>
                  {selectedOrder.customer_notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ marginBottom: 10 }}>الأصناف المطلوبة:</Title>
            <Table
              columns={itemColumns}
              dataSource={selectedOrder.items || []}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
            />

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">إجمالي المنتجات:</Text>
                <Text strong>{parseFloat(selectedOrder.subtotal).toLocaleString()} ج.م</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">تكلفة الشحن:</Text>
                <Text strong>{parseFloat(selectedOrder.shipping_cost) === 0 ? 'مجاناً' : `${parseFloat(selectedOrder.shipping_cost).toLocaleString()} ج.م`}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                <Text strong>الإجمالي النهائي المطلوب تحصيله:</Text>
                <Text strong style={{ color: '#059669', fontSize: 20 }}>{parseFloat(selectedOrder.total_amount).toLocaleString()} ج.م</Text>
              </div>
            </div>

            {/* Transfer Receipt Card */}
            {selectedOrder.transfer_receipt_url && (
              <Card
                size="small"
                title={
                  <Space>
                    <PaperClipOutlined style={{ color: '#059669' }} />
                    <span style={{ fontWeight: 700 }}>إشعار تحويل الأموال المرفق من العميل (IPN / Wallet Receipt)</span>
                  </Space>
                }
                style={{ marginTop: 16, borderColor: '#a7f3d0', backgroundColor: '#f0fdf4' }}
                extra={
                  selectedOrder.payment_status !== 'paid' && (
                    <Popconfirm
                      title="تأكيد استلام التحويل؟"
                      description="هل تم التحقق من استلام المبلغ في حسابك؟ سيتم تحديث حالة الدفع إلى مدفوع."
                      onConfirm={() => handleVerifyPayment(selectedOrder.id)}
                      okText="نعم، تم الاستلام"
                      cancelText="إلغاء"
                    >
                      <Button type="primary" size="small" style={{ backgroundColor: '#059669' }} icon={<CheckCircleOutlined />}>
                        تأكيد استلام التحويل (Mark as Paid)
                      </Button>
                    </Popconfirm>
                  )
                }
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <img
                    src={selectedOrder.transfer_receipt_url}
                    alt="إشعار التحويل"
                    style={{ width: 130, height: 130, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={() => handleViewReceipt(selectedOrder.transfer_receipt_url, selectedOrder.order_number)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 6 }}>
                      <Text strong>طريقة الدفع: </Text>
                      <Tag color="purple">{selectedOrder.payment_method}</Tag>
                      <Tag color={selectedOrder.payment_status === 'paid' ? 'green' : 'orange'}>
                        {selectedOrder.payment_status === 'paid' ? 'مدفوع ومؤكد' : 'في انتظار المراجعة'}
                      </Tag>
                    </div>
                    {selectedOrder.transfer_reference && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>رقم العملية / هاتف المحول: </Text>
                        <Tag color="blue">{selectedOrder.transfer_reference}</Tag>
                      </div>
                    )}
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewReceipt(selectedOrder.transfer_receipt_url, selectedOrder.order_number)}
                    >
                      معاينة صورة الإشعار بالحجم الكامل
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <Space>
                {selectedOrder.order_status === 'processing' && (
                  <Button
                    type="primary"
                    icon={<CarOutlined />}
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenShipModal(selectedOrder);
                    }}
                    style={{ backgroundColor: '#0284c7' }}
                  >
                    تسليم الطلب للشحن (إضافة البوليصة والطرود)
                  </Button>
                )}
                {selectedOrder.order_status === 'shipped' && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered', 'paid')}
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    تأكيد التسليم والتحصيل
                  </Button>
                )}
                {selectedOrder.order_status !== 'cancelled' && selectedOrder.order_status !== 'delivered' && (
                  <Popconfirm
                    title="إلغاء الطلب؟"
                    description="هل أنت متأكد من إلغاء هذا الطلب؟"
                    onConfirm={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    okText="نعم، إلغاء"
                    cancelText="تراجع"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<CloseCircleOutlined />}>إلغاء الطلب</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">لم يتم العثور على بيانات الطلب</Text>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* 2. SHIP ORDER MODAL (بوليصة الشحن - عدد الطرود) */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: '#0284c7' }} />
            <span>شحن الطلب ({shippingOrderNumber}) — تسجيل بوليصة الشحن والطرود</span>
          </Space>
        }
        open={isShipModalOpen}
        onCancel={() => setIsShipModalOpen(false)}
        footer={null}
        width={560}
      >
        <Form
          form={shipForm}
          layout="vertical"
          onFinish={handleExecuteShip}
        >
          <Form.Item
            label="رقم بوليصة الشحن (Waybill / Tracking No.) *"
            name="tracking_number"
            rules={[{ required: true, message: 'يرجى إدخال رقم بوليصة الشحن' }]}
          >
            <Input prefix={<BarcodeOutlined />} placeholder="مثال: BST-889312 / ARAMEX-0021" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="عدد الطرود (Number of Parcels) *"
                name="parcel_count"
                rules={[{ required: true, message: 'يرجى تحديد عدد الطرود' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} max={50} addonAfter="طرد" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="شركة الشحن / جهة التوصيل"
                name="shipping_carrier"
              >
                <Select placeholder="اختر شركة الشحن">
                  {shippingCarriers.filter((c) => c.is_active).map((c) => (
                    <Option key={c.id} value={c.carrier_name}>
                      {c.carrier_name}
                    </Option>
                  ))}
                  <Option value="مندوب المتجر الخاص">مندوب المتجر الخاص</Option>
                  <Option value="أخرى">أخرى (إدخال يدوي)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="ملاحظات الشحن ومتابعة المندوب" name="shipping_notes">
            <Input.TextArea rows={2} placeholder="أي تعليمات أو ملاحظات خاصة بشركة الشحن..." />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsShipModalOpen(false)}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={shippingSubmitting}
                icon={<CarOutlined />}
                style={{ backgroundColor: '#0284c7' }}
              >
                تأكيد الشحن وتسليم الطرود
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* 3. ADD / EDIT SHIPPING RATE MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined style={{ color: '#2563eb' }} />
            <span>{editingRate ? `تعديل سعر شحن: ${editingRate.city_name}` : 'إضافة مدينة أو منطقة شحن جديدة'}</span>
          </Space>
        }
        open={isRateModalOpen}
        onCancel={() => setIsRateModalOpen(false)}
        footer={null}
      >
        <Form
          form={rateForm}
          layout="vertical"
          onFinish={handleSaveRate}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="اسم المدينة / المحافظة *"
                name="city_name"
                rules={[{ required: true, message: 'يرجى إدخال اسم المدينة' }]}
              >
                <Input placeholder="مثال: القاهرة / الإسكندرية / الغردقة" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="كود المنطقة" name="city_code">
                <Input placeholder="مثال: CAI / ALY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="سعر التوصيل (ج.م) *"
                name="shipping_fee"
                rules={[{ required: true, message: 'يرجى تحديد تكلفة التوصيل' }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={5} prefix="ج.م " />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="المدة المقدرة للتسليم" name="estimated_days">
                <Input placeholder="مثال: 1-2 أيام عمل" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="إتاحة الشحن لهذه المدينة" name="is_active" valuePropName="checked">
            <Switch checkedChildren="متاح" unCheckedChildren="معطل" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsRateModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={rateSubmitting} style={{ backgroundColor: '#2563eb' }}>
                حفظ سعر التوصيل
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* 4. ADD / EDIT SHIPPING CARRIER MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <ShopOutlined style={{ color: '#0284c7' }} />
            <span>{editingCarrier ? `تعديل شركة شحن: ${editingCarrier.carrier_name}` : 'إضافة شركة أو جهة شحن جديدة'}</span>
          </Space>
        }
        open={isCarrierModalOpen}
        onCancel={() => setIsCarrierModalOpen(false)}
        footer={null}
      >
        <Form
          form={carrierForm}
          layout="vertical"
          onFinish={handleSaveCarrier}
        >
          <Form.Item
            label="اسم شركة أو جهة الشحن *"
            name="carrier_name"
            rules={[{ required: true, message: 'يرجى إدخال اسم شركة الشحن' }]}
          >
            <Input placeholder="مثال: بوسطة (Bosta) / أرامكس / مندوب المتجر الخاص" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="رقم التواصل / الخط الساخن" name="contact_phone">
                <Input placeholder="مثال: 19000" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="رابط تتبع الشحنات (اختياري)" name="tracking_url_template">
                <Input placeholder="https://bosta.co/tracking" prefix={<LinkOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="تفعيل شركة الشحن" name="is_active" valuePropName="checked">
            <Switch checkedChildren="نشط" unCheckedChildren="معطل" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsCarrierModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={carrierSubmitting} style={{ backgroundColor: '#0284c7' }}>
                حفظ شركة الشحن
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* 5. ADD / EDIT PAYMENT METHOD MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <WalletOutlined style={{ color: '#9333ea' }} />
            <span>{editingPayment ? `تعديل طريقة الدفع: ${editingPayment.name_ar}` : 'إضافة طريقة دفع / محفظة جديدة'}</span>
          </Space>
        }
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleSavePayment}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="اسم طريقة الدفع بالعربية *"
                name="name_ar"
                rules={[{ required: true, message: 'يرجى إدخال اسم طريقة الدفع' }]}
              >
                <Input placeholder="مثال: إنستاباي - InstaPay أو فودافون كاش" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="كود التعريف الفريد (Key) *"
                name="method_key"
                rules={[{ required: true, message: 'يرجى إدخال كود التعريف' }]}
              >
                <Input placeholder="مثال: instapay_2" disabled={Boolean(editingPayment)} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="نوع المزود" name="provider">
                <Select>
                  <Option value="instapay">إنستاباي (InstaPay IPN)</Option>
                  <Option value="vodafone">فودافون كاش (Vodafone Cash)</Option>
                  <Option value="orange">أورنج كاش (Orange Cash)</Option>
                  <Option value="etisalat">اتصالات كاش (Etisalat Cash)</Option>
                  <Option value="we">وي باي (WE Pay)</Option>
                  <Option value="bank">تحويل بنكي (Bank Account)</Option>
                  <Option value="cash">دفع نقدي عند الاستلام (COD)</Option>
                  <Option value="other">أخرى (Other)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ترتيب الظهور في صفحة الدفع" name="display_order">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="رقم المحفظة / عنوان إنستاباي / رقم الحساب" name="account_number">
                <Input placeholder="مثال: username@instapay أو 010xxxxxxxx" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="اسم صاحب الحساب / المحفظة" name="account_name">
                <Input placeholder="مثال: Yoka Store" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="تعليمات الدفع الموجهة للعميل (تظهر في صفحة إتمام الطلب)" name="instructions">
            <Input.TextArea rows={3} placeholder="مثال: قم بالتحويل إلى عنوان إنستاباي أعلاه، ثم التقط سكرين شوت لإشعار نجاح التحويل وارفعه لتأكيد الطلب." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="إلزام العميل برفع صورة إشعار التحويل" name="requires_receipt" valuePropName="checked">
                <Switch checkedChildren="إلزامي" unCheckedChildren="اختياري" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="تفعيل طريقة الدفع في المتجر" name="is_active" valuePropName="checked">
                <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'left', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsPaymentModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={paymentSubmitting} style={{ backgroundColor: '#9333ea' }}>
                حفظ طريقة الدفع
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================= */}
      {/* 6. RECEIPT PREVIEW MODAL */}
      {/* ========================================================= */}
      <Modal
        title={
          <Space>
            <PictureOutlined style={{ color: '#059669' }} />
            <span>{previewReceiptTitle || 'معاينة إشعار التحويل'}</span>
          </Space>
        }
        open={isReceiptModalOpen}
        onCancel={() => setIsReceiptModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsReceiptModalOpen(false)}>إغلاق</Button>,
          <Button
            key="openNew"
            type="primary"
            onClick={() => {
              const win = window.open();
              win.document.write(`<img src="${previewReceiptUrl}" style="max-width:100%" />`);
            }}
          >
            فتح في نافذة مستقلة
          </Button>
        ]}
        width={650}
      >
        <div style={{ textAlign: 'center', background: '#0f172a', padding: 16, borderRadius: 8 }}>
          <img
            src={previewReceiptUrl}
            alt="إشعار التحويل"
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 4 }}
          />
        </div>
      </Modal>
    </div>
  );
}
