import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
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
  Statistic,
  Drawer,
  Divider
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DollarOutlined,
  FileTextOutlined,
  SearchOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import api from '../api';
import SplitPayment from '../components/SplitPayment';
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Suppliers({ autoOpenCreate, onResetAction }) {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form] = Form.useForm();

  // Ledger Drawer
  const [ledgerDrawerOpen, setLedgerDrawerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedSupplierLedger, setSelectedSupplierLedger] = useState(null);
  const [printStatementModal, setPrintStatementModal] = useState(false);

  // Payment Modal with Split Payment
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [payForm] = Form.useForm();
  const [splitBreakdown, setSplitBreakdown] = useState([]);
  const [splitTotal, setSplitTotal] = useState(0);
  const [submittingPay, setSubmittingPay] = useState(false);

  const printAreaRef = useRef(null);

  const fetchSuppliers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/suppliers', {
        params: {
          page,
          limit: pagination.pageSize,
          search: search || undefined,
          status: statusFilter || undefined
        }
      });
      if (res.data.success) {
        setSuppliers(res.data.data);
        setPagination(prev => ({
          ...prev,
          current: res.data.meta.page,
          total: res.data.meta.total
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل الموردين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(1);
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    form.resetFields();
    form.setFieldsValue({
      opening_balance: 0
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreate();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  const handleOpenEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue({
      supplier_name: record.supplier_name,
      contact_person: record.contact_person,
      phone: record.phone,
      address: record.address,
      opening_balance: parseFloat(record.opening_balance) || 0
    });
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (values) => {
    try {
      // Restrict strictly to the exact 5 fields:
      const payload = {
        supplier_name: values.supplier_name?.trim(),
        contact_person: values.contact_person ? values.contact_person.trim() : null,
        phone: values.phone ? values.phone.trim() : null,
        address: values.address ? values.address.trim() : null,
        opening_balance: parseFloat(values.opening_balance) || 0
      };

      if (editingSupplier) {
        await api.put(`/api/swm/suppliers/${editingSupplier.id}`, payload);
        message.success('تم تحديث بيانات المورد بنجاح');
      } else {
        await api.post('/api/swm/suppliers', payload);
        message.success('تم إضافة المورد بنجاح');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchSuppliers(pagination.current);
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات المورد');
    }
  };

  const handleOpenLedger = async (supplier) => {
    setLedgerDrawerOpen(true);
    setLedgerLoading(true);
    setSelectedSupplierLedger(null);
    try {
      const res = await api.get(`/api/swm/suppliers/${supplier.id}/ledger`);
      if (res.data.success) {
        setSelectedSupplierLedger(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل كشف الحساب');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleOpenPay = (supplier) => {
    setPayingSupplier(supplier);
    payForm.resetFields();
    const currentDue = Math.max(0, parseFloat(supplier.current_balance) || 0);
    setSplitTotal(currentDue);
    setSplitBreakdown([
      { method: 'cash', method_name: 'نقداً (خزينة)', amount: currentDue }
    ]);
    setPayModalOpen(true);
  };

  const handleExecutePayment = async (values) => {
    if (splitTotal <= 0) {
      return message.error('يرجى تحديد مبلغ صحيح للسداد');
    }

    setSubmittingPay(true);
    try {
      const payload = {
        amount: splitTotal,
        payment_breakdown: splitBreakdown,
        payment_method: splitBreakdown.length > 1 ? 'split' : (splitBreakdown[0]?.method || 'cash'),
        notes: values.notes || null
      };

      await api.post(`/api/swm/suppliers/${payingSupplier.id}/pay`, payload);
      message.success('تم تسجيل الدفعة بنجاح وتحديث رصيد المورد وحركات الحساب');
      setPayModalOpen(false);
      payForm.resetFields();
      fetchSuppliers(pagination.current);
      if (ledgerDrawerOpen && selectedSupplierLedger?.supplier?.id === payingSupplier.id) {
        handleOpenLedger(payingSupplier);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل الدفعة');
    } finally {
      setSubmittingPay(false);
    }
  };

  const handlePrintStatement = () => {
    if (printAreaRef.current) {
      printHtmlContent({
        title: `كشف حساب مورد - ${selectedSupplierLedger?.supplier?.supplier_name || ''}`,
        htmlContent: printAreaRef.current.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  const columns = [
    {
      title: 'كود المورد',
      dataIndex: 'supplier_code',
      key: 'supplier_code',
      render: (code) => <Text code strong>{code}</Text>
    },
    {
      title: 'اسم المورد / الشركة',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'المسؤول والاتصال',
      key: 'contact',
      render: (_, r) => (
        <div>
          <div><Text strong>{r.contact_person || '—'}</Text></div>
          <div><Text type="secondary">{r.phone || '—'}</Text></div>
        </div>
      )
    },
    {
      title: 'الرصيد المستحق (EGP)',
      dataIndex: 'current_balance',
      key: 'current_balance',
      render: (val) => {
        const num = parseFloat(val) || 0;
        return (
          <Tag color={num > 0 ? 'red' : (num < 0 ? 'blue' : 'green')} style={{ fontSize: 13, padding: '3px 8px' }}>
            {num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
          </Tag>
        );
      }
    },
    {
      title: 'العنوان',
      dataIndex: 'address',
      key: 'address',
      render: (val) => val || '—'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        <Tag color={st === 'active' ? 'green' : 'default'}>
          {st === 'active' ? 'نشط' : (st === 'inactive' ? 'معطل' : 'محظور')}
        </Tag>
      )
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FileTextOutlined />}
            onClick={() => handleOpenLedger(record)}
          >
            كشف الحساب
          </Button>
          <Button
            size="small"
            style={{ color: '#16a34a', borderColor: '#16a34a' }}
            icon={<DollarOutlined />}
            onClick={() => handleOpenPay(record)}
          >
            سداد
          </Button>
          <Button
            size="small"
            onClick={() => handleOpenEdit(record)}
          >
            تعديل
          </Button>
        </Space>
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
          <h2>إدارة الموردين والحسابات (Suppliers & Accounts)</h2>
          <p>متابعة سجل الموردين، كشوف الحسابات الجارية، وسداد المستحقات بالدفع المقسم</p>
        </div>

        <div className="swm-page-actions">
          <Button icon={<ReloadOutlined />} onClick={() => fetchSuppliers(pagination.current)} style={{ height: 44, borderRadius: 8 }}>
            تحديث
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            className="swm-btn-primary"
            style={{ height: 44, borderRadius: 8, fontWeight: 700 }}
          >
            إضافة مورد جديد
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="البحث بالاسم، الكود، أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={10}>
            <Select
              style={{ width: '100%' }}
              placeholder="تصفية حسب الحالة"
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              allowClear
            >
              <Option value="active">نشط</Option>
              <Option value="inactive">غير نشط</Option>
              <Option value="blacklisted">محظور</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (p) => fetchSuppliers(p),
            showTotal: (total) => `إجمالي الموردين: ${total}`
          }}
        />
      </Card>

      {/* 1. Add / Edit Supplier Modal: Restricted strictly to EXACTLY 5 FIELDS */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#2563eb' }} />
            <span>{editingSupplier ? 'تعديل بيانات مورد' : 'إضافة مورد جديد (5 حقول فقط)'}</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveSupplier}>
          {/* Field 1: Supplier Name */}
          <Form.Item
            name="supplier_name"
            label="اسم المورد / الشركة (Supplier Name) *"
            rules={[{ required: true, message: 'يرجى إدخال اسم المورد' }]}
          >
            <Input placeholder="مثال: شركة النسيج العصرية" size="large" />
          </Form.Item>

          <Row gutter={16}>
            {/* Field 2: Contact Person */}
            <Col span={12}>
              <Form.Item
                name="contact_person"
                label="المسؤول المباشر (Contact Person)"
              >
                <Input placeholder="اسم مسؤول المبيعات" />
              </Form.Item>
            </Col>

            {/* Field 3: Phone Number */}
            <Col span={12}>
              <Form.Item
                name="phone"
                label="رقم الهاتف (Phone Number)"
              >
                <Input placeholder="01xxxxxxxxx" />
              </Form.Item>
            </Col>
          </Row>

          {/* Field 4: Address */}
          <Form.Item
            name="address"
            label="العنوان الجغرافي (Address)"
          >
            <Input.TextArea rows={2} placeholder="العنوان، المدينة، المنطقة" />
          </Form.Item>

          {/* Field 5: Opening Balance */}
          <Form.Item
            name="opening_balance"
            label="الرصيد الافتتاحي (Opening Balance) - ج.م"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="0.00"
              addonAfter="ج.م"
            />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 20 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" className="swm-btn-primary">
                {editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 2. Supplier Ledger Drawer with Print Statement & Detailed Breakdown */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>كشف حساب المورد: {selectedSupplierLedger?.supplier?.supplier_name || ''}</span>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => setPrintStatementModal(true)}
              className="btn-print"
              style={{ marginLeft: 16, backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}
            >
              طباعة كشف الحساب
            </Button>
          </div>
        }
        placement="left"
        width={780}
        onClose={() => setLedgerDrawerOpen(false)}
        open={ledgerDrawerOpen}
      >
        {selectedSupplierLedger && (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={12}>
                <Card size="small" style={{ background: '#f8fafc' }}>
                  <Statistic
                    title="الرصيد الافتتاحي"
                    value={selectedSupplierLedger.opening_balance}
                    precision={2}
                    suffix="ج.م"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#f8fafc' }}>
                  <Statistic
                    title="الرصيد المستحق الحالي"
                    value={selectedSupplierLedger.current_balance}
                    precision={2}
                    valueStyle={{ color: selectedSupplierLedger.current_balance > 0 ? '#cf1322' : '#16a34a' }}
                    suffix="ج.م"
                  />
                </Card>
              </Col>
            </Row>

            <Divider orientation="right">سجل المعاملات والمدفوعات المفصلة</Divider>

            <Table
              size="small"
              loading={ledgerLoading}
              dataSource={selectedSupplierLedger.ledger}
              rowKey={(r) => `${r.type}-${r.id}`}
              pagination={false}
              columns={[
                {
                  title: 'التاريخ',
                  dataIndex: 'date',
                  key: 'date',
                  width: 100,
                  render: (d) => new Date(d).toLocaleDateString('ar-EG')
                },
                {
                  title: 'النوع والبيان / تفصيل السداد',
                  key: 'type',
                  render: (_, r) => (
                    <div>
                      <Space size="small">
                        <Tag color={r.type === 'invoice' ? 'volcano' : 'green'}>
                          {r.type === 'invoice' ? 'فاتورة مشتريات' : 'سداد مالي'}
                        </Tag>
                        <Text code>{r.ref}</Text>
                      </Space>

                      {/* Display detailed breakdown of payment methods for each payment */}
                      {r.type === 'payment' && (
                        <div style={{ marginTop: 6 }}>
                          {Array.isArray(r.payment_breakdown) && r.payment_breakdown.length > 0 ? (
                            <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                                تفصيل وسائل السداد:
                              </Text>
                              <Space size={[4, 4]} wrap>
                                {r.payment_breakdown.map((item, idx) => (
                                  <Tag key={idx} color="blue" style={{ fontSize: 11, margin: 0 }}>
                                    {item.method_name || item.method}: {parseFloat(item.amount).toLocaleString()} ج.م
                                  </Tag>
                                ))}
                              </Space>
                            </div>
                          ) : (
                            <Tag color="cyan" style={{ fontSize: 11 }}>
                              طريقة الدفع: {r.payment_method === 'cash' ? 'نقداً' : r.payment_method === 'bank_transfer' ? 'تحويل بنكي' : r.payment_method}
                            </Tag>
                          )}
                        </div>
                      )}

                      {r.notes && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{r.notes}</div>
                      )}
                    </div>
                  )
                },
                {
                  title: 'مدين (فاتورة)',
                  dataIndex: 'debit',
                  key: 'debit',
                  width: 120,
                  render: (v) => v > 0 ? <Text strong style={{ color: '#cf1322' }}>+{v.toLocaleString()} ج.م</Text> : '—'
                },
                {
                  title: 'دائن (مسدد)',
                  dataIndex: 'credit',
                  key: 'credit',
                  width: 120,
                  render: (v) => v > 0 ? <Text strong style={{ color: '#16a34a' }}>-{v.toLocaleString()} ج.م</Text> : '—'
                },
                {
                  title: 'الرصيد بعد الحركة',
                  dataIndex: 'balance_after',
                  key: 'balance_after',
                  width: 130,
                  render: (v) => <Text strong>{v.toLocaleString()} ج.م</Text>
                }
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* 3. Printable Statement Modal View */}
      <Modal
        title="معاينة وطباعة كشف حساب المورد"
        open={printStatementModal}
        onCancel={() => setPrintStatementModal(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setPrintStatementModal(false)}>إغلاق</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintStatement} className="btn-print" style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}>
            طباعة المستند
          </Button>
        ]}
      >
        {selectedSupplierLedger && (
          <div ref={printAreaRef} className="printable-statement" style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
            {/* Branded Header */}
            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
              <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                  <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>الإدارة المالية والمحاسبية • قسم حسابات الموردين والدائنين</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>منظومة إدارة المخازن المركزية وسلاسل الإمداد (SWM)</div>
                </div>
              </div>
              <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                  كشف حساب مورد تفصيلي
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                  كود المورد: <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontSize: 13.5 }}>{selectedSupplierLedger.supplier.supplier_code}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>

            {/* Supplier Information Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <Row gutter={[16, 10]}>
                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>اسم المورد / الشركة:</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                    {selectedSupplierLedger.supplier.supplier_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                    المسؤول: {selectedSupplierLedger.supplier.contact_person || '—'}
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>بيانات الاتصال والعنوان:</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    هاتف: {selectedSupplierLedger.supplier.phone || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    العنوان: {selectedSupplierLedger.supplier.address || '—'}
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>الرصيد المستحق الحالي للمورد:</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#b91c1c', marginTop: 2, fontFamily: 'monospace' }}>
                    {selectedSupplierLedger.current_balance.toLocaleString()} ج.م
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                    رصيد المورد التراكمي حتى تاريخه
                  </div>
                </Col>
              </Row>
            </div>

            {/* Ledger Table */}
            <table
              className="print-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '11px',
                marginBottom: 14
              }}
            >
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'center' }}>التاريخ</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'center' }}>رقم السند / المرجع</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a' }}>البيان وتفصيل السداد</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'left' }}>مدين (فواتير)</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'left' }}>دائن (مدفوعات)</th>
                  <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '120px', textAlign: 'left' }}>الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace' }}>OPENING</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>الرصيد الافتتاحي السابق</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left' }}>—</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', fontWeight: 800 }}>
                    {selectedSupplierLedger.opening_balance.toLocaleString()} ج.م
                  </td>
                </tr>
                {selectedSupplierLedger.ledger.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #cbd5e1'
                    }}
                  >
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace' }}>
                      {new Date(row.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                      {row.ref}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                      <span style={{ fontWeight: 600 }}>{row.type === 'invoice' ? 'فاتورة مشتريات وتوريد' : 'سند صرف ودفع للمورد'}</span>
                      {row.payment_breakdown && Array.isArray(row.payment_breakdown) && row.payment_breakdown.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#2563eb', marginTop: 2 }}>
                          {row.payment_breakdown.map(b => `${b.method_name || b.method}: ${parseFloat(b.amount).toLocaleString()} ج.م`).join(' + ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: row.debit > 0 ? '#b91c1c' : '#94a3b8', fontWeight: row.debit > 0 ? 700 : 400 }}>
                      {row.debit > 0 ? `${row.debit.toLocaleString()} ج.م` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: row.credit > 0 ? '#15803d' : '#94a3b8', fontWeight: row.credit > 0 ? 700 : 400 }}>
                      {row.credit > 0 ? `${row.credit.toLocaleString()} ج.م` : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, fontFamily: 'monospace' }}>
                      {row.balance_after.toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                    صافي الرصيد المستحق النهائي:
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#b91c1c' }}>
                    {selectedSupplierLedger.ledger.reduce((acc, r) => acc + (parseFloat(r.debit) || 0), 0).toLocaleString()} ج.م
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', color: '#15803d' }}>
                    {selectedSupplierLedger.ledger.reduce((acc, r) => acc + (parseFloat(r.credit) || 0), 0).toLocaleString()} ج.م
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>
                    {selectedSupplierLedger.current_balance.toLocaleString()} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Official Signatures & Stamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 14, borderTop: '1px dashed #94a3b8' }}>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: 26 }}>المحاسب المسؤول</div>
                <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: '10.5px', color: '#64748b' }}>........................</div>
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: 26 }}>المدير المالي والاعتماد</div>
                <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: '10.5px', color: '#64748b' }}>........................</div>
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: 26 }}>ختم الإدارة المالية</div>
                <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: '10.5px', color: '#64748b' }}>[ خـتـم مـعـتـمـد ]</div>
              </div>
            </div>

            {/* Verification Footer */}
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>كشف حساب إلكتروني رسمي مستخرج من نظام Yoka SWM</span>
              <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Supplier Payment Modal: Split Payment Component, No Receipt Number */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#16a34a' }} />
            <span>تسجيل دفعة سداد: {payingSupplier?.supplier_name || ''}</span>
          </Space>
        }
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        <Form form={payForm} layout="vertical" onFinish={handleExecutePayment}>
          <div style={{ marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <Text type="secondary">الرصيد المستحق الحالي للمورد: </Text>
            <Text strong style={{ color: '#cf1322', fontSize: 16 }}>
              {parseFloat(payingSupplier?.current_balance || 0).toLocaleString()} ج.م
            </Text>
          </div>

          {/* Integrated Reusable Split Payment Component */}
          <div style={{ marginBottom: 16 }}>
            <SplitPayment
              targetAmount={Math.max(0, parseFloat(payingSupplier?.current_balance) || 0)}
              value={splitBreakdown}
              onChange={(breakdown, total) => {
                setSplitBreakdown(breakdown);
                setSplitTotal(total);
              }}
            />
          </div>

          {/* Notice: Receipt Number (reference_no) field is completely removed as requested */}

          <Form.Item name="notes" label="ملاحظات وسند الصرف">
            <Input.TextArea rows={2} placeholder="تفاصيل الصرف أو شروط السداد" />
          </Form.Item>

          <div style={{ textAlign: 'left', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setPayModalOpen(false)}>إلغاء</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingPay}
                className="swm-btn-emerald"
              >
                تأكيد وتسجيل السداد ({splitTotal.toLocaleString()} ج.م)
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
