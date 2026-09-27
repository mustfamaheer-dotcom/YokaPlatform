import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Typography,
  Space,
  Statistic,
  message,
  Divider,
  Badge,
  Tooltip
} from 'antd';
import {
  SwapOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  ShopOutlined,
  SearchOutlined,
  DeleteOutlined,
  CarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import DispatchNoteA4 from '../components/DispatchNoteA4';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Transfers({ currentUser, autoOpenCreate, onResetAction }) {
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [branches, setBranches] = useState([]);

  // Filters
  const [filterFrom, setFilterFrom] = useState(null);
  const [filterTo, setFilterTo] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const selectedFromBranch = Form.useWatch('from_branch_id', createForm);
  const selectedToBranch = Form.useWatch('to_branch_id', createForm);

  // Available stock in sending branch
  const [availableStock, setAvailableStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Selected items to transfer
  const [transferItems, setTransferItems] = useState([]);

  // Single Transfer Printable Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // Fetch branches list
  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const res = await api.get('/api/swm/transfers/metrics');
      if (res.data.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Fetch metrics error:', err);
    }
  };

  // Fetch transfers list
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = {
        from_branch_id: filterFrom || undefined,
        to_branch_id: filterTo || undefined,
        date: filterDate ? filterDate.format('YYYY-MM-DD') : undefined,
        search: filterSearch ? filterSearch.trim() : undefined
      };
      const res = await api.get('/api/swm/transfers', { params });
      if (res.data.success) {
        setTransfers(res.data.data || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل أذون الصرف');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available stock in selected from_branch
  const fetchBranchStock = async (branchId) => {
    if (!branchId) {
      setAvailableStock([]);
      return;
    }
    setStockLoading(true);
    try {
      const res = await api.get(`/api/swm/transfers/branch-stock/${branchId}`);
      if (res.data.success) {
        setAvailableStock(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch branch stock error:', err);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchMetrics();
    fetchTransfers();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [filterFrom, filterTo, filterDate]);

  useEffect(() => {
    if (selectedFromBranch) {
      fetchBranchStock(selectedFromBranch);
      setTransferItems([]); // Reset items if sending branch changes
    } else {
      setAvailableStock([]);
      setTransferItems([]);
    }
  }, [selectedFromBranch]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    createForm.resetFields();
    // Default from_branch to main warehouse if available
    const mainBranch = branches.find((b) => b.branch_type === 'main_warehouse');
    createForm.setFieldsValue({
      from_branch_id: mainBranch ? mainBranch.id : undefined,
      transfer_date: dayjs()
    });
    setTransferItems([]);
    setCreateModalVisible(true);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateModal();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  // Add Item to Transfer
  const handleAddItem = (productId) => {
    if (!productId) return;
    const stockRow = availableStock.find((s) => s.product_id === productId);
    if (!stockRow) return;

    const existing = transferItems.find((i) => i.product_id === productId && i.variant_id === stockRow.variant_id);
    if (existing) {
      message.warning('هذا الصنف مضاف بالفعل في قائمة التحويل');
      return;
    }

    setTransferItems((prev) => [
      ...prev,
      {
        product_id: stockRow.product_id,
        variant_id: stockRow.variant_id || null,
        product_name: stockRow.display_name || stockRow.product_name,
        product_code: stockRow.product_code,
        barcode: stockRow.variant_sku || stockRow.barcode,
        available_qty: stockRow.available_qty,
        quantity: 1,
        notes: ''
      }
    ]);
  };

  const handleUpdateItemQty = (idx, qty) => {
    setTransferItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const validQty = Math.max(1, Math.min(item.available_qty, parseInt(qty, 10) || 1));
        return { ...item, quantity: validQty };
      })
    );
  };

  const handleUpdateItemNotes = (idx, notes) => {
    setTransferItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, notes } : item))
    );
  };

  const handleRemoveItem = (idx) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Total units to transfer
  const totalUnits = transferItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Submit Stock Transfer
  const handleCreateTransfer = async (values) => {
    if (transferItems.length === 0) {
      return message.error('يرجى إضافة صنف واحد على الأقل لإذن الصرف');
    }

    setSubmitting(true);
    try {
      const payload = {
        from_branch_id: values.from_branch_id,
        to_branch_id: values.to_branch_id,
        transfer_date: values.transfer_date ? values.transfer_date.format('YYYY-MM-DD') : undefined,
        driver_name: values.driver_name,
        vehicle_number: values.vehicle_number,
        notes: values.notes,
        items: transferItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          product_name: item.product_name,
          product_code: item.product_code,
          notes: item.notes
        }))
      };

      const res = await api.post('/api/swm/transfers', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم تنفيذ إذن الصرف ونقل المخزون بنجاح');
        setCreateModalVisible(false);
        fetchMetrics();
        fetchTransfers();

        // Auto-open printable A4 note
        handleViewPrint(res.data.data.id);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء إذن الصرف');
    } finally {
      setSubmitting(false);
    }
  };

  // View & Print Transfer Note
  const handleViewPrint = async (transferId) => {
    try {
      const res = await api.get(`/api/swm/transfers/${transferId}`);
      if (res.data.success) {
        setSelectedTransfer(res.data.data);
        setPrintModalVisible(true);
      }
    } catch (err) {
      message.error('فشل في جلب بيانات إذن الصرف');
    }
  };

  const columns = [
    {
      title: 'رقم إذن الصرف',
      dataIndex: 'transfer_number',
      key: 'transfer_number',
      width: 150,
      render: (num) => <Text strong code style={{ fontSize: 13 }}>{num}</Text>
    },
    {
      title: 'تاريخ الصرف',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      width: 110,
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'المخزن المُرسِل (من)',
      dataIndex: 'from_branch_name',
      key: 'from_branch_name',
      render: (name, row) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{row.from_branch_code}</div>
        </div>
      )
    },
    {
      title: 'جهة الاستلام (إلى)',
      dataIndex: 'to_branch_name',
      key: 'to_branch_name',
      render: (name, row) => (
        <div>
          <Text strong style={{ color: '#16a34a' }}>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{row.to_branch_code}</div>
        </div>
      )
    },
    {
      title: 'الأصناف والوحدات',
      key: 'items_units',
      width: 140,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{row.total_items} أصناف مختلفة</Tag>
          <Tag color="green">{row.total_units} قطعة إجمالية</Tag>
        </Space>
      )
    },
    {
      title: 'مسؤول النقل / السائق',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 140,
      render: (driver, row) => driver ? (
        <div>
          <span>{driver}</span>
          {row.vehicle_number && <div style={{ fontSize: 11, color: '#64748b' }}>سيارة: {row.vehicle_number}</div>}
        </div>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'المنشئ (الأدمن)',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 130,
      render: (name, row) => name || row.created_by_username || 'الإدارة'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          مكتمل ومُرحّل
        </Tag>
      )
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 120,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => handleViewPrint(row.id)}
          style={{ backgroundColor: '#1e293b' }}
        >
          طباعة / PDF
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SwapOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            إذن الصرف (توزيع المنتجات بين المخازن والفروع)
          </Title>
          <Text type="secondary">
            نقل البضائع والأصناف من المستودع الرئيسي إلى الفروع أو بين الفروع، مع خصم وإضافة الكميات تلقائياً وإصدار إذن صرف رسمي A4
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchMetrics(); fetchTransfers(); }} loading={loading}>
            تحديث
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#2563eb', fontWeight: 'bold' }}
          >
            إنشاء إذن صرف جديد
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #2563eb' }}>
            <Statistic
              title="إجمالي أذون الصرف المنفذة"
              value={metrics?.total_transfers || 0}
              valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #16a34a' }}>
            <Statistic
              title="إجمالي القطع المنقولة والموزعة"
              value={metrics?.total_units_dispatched || 0}
              suffix="قطعة"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #9333ea' }}>
            <Statistic
              title="المخازن والفروع المغذية"
              value={branches.length}
              suffix="مخزن / فرع"
              valueStyle={{ color: '#9333ea', fontWeight: 'bold' }}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter and Table Card */}
      <Card
        size="small"
        style={{ borderRadius: 8 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '4px 0' }}>
            <span>تصفية أذون الصرف:</span>
            <Select
              placeholder="من مخزن..."
              value={filterFrom}
              onChange={setFilterFrom}
              allowClear
              style={{ width: 170 }}
            >
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>{b.branch_name}</Option>
              ))}
            </Select>

            <ArrowRightOutlined style={{ color: '#94a3b8' }} />

            <Select
              placeholder="إلى مخزن/فرع..."
              value={filterTo}
              onChange={setFilterTo}
              allowClear
              style={{ width: 170 }}
            >
              {branches.map((b) => (
                <Option key={b.id} value={b.id}>{b.branch_name}</Option>
              ))}
            </Select>

            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="التاريخ"
              allowClear
              style={{ width: 140 }}
            />

            <Input
              placeholder="بحث برقم الإذن أو السائق..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              onPressEnter={fetchTransfers}
              style={{ width: 200 }}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
            />
          </div>
        }
      >
        <Table
          dataSource={transfers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="middle"
        />
      </Card>

      {/* Create Stock Transfer Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span style={{ fontSize: 17 }}>إنشاء إذن صرف وتوزيع منتجات جديد</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={850}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTransfer}
        >
          {/* Branch Selectors: From & To */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="from_branch_id"
                label="المخزن / الفرع المُرسِل (الجهة الصارفة)"
                rules={[{ required: true, message: 'يرجى تحديد الجهة الصارفة' }]}
              >
                <Select
                  size="large"
                  placeholder="اختر المخزن المُرسِل"
                  style={{ width: '100%' }}
                >
                  {branches.map((b) => (
                    <Option key={b.id} value={b.id} disabled={b.id === selectedToBranch}>
                      {b.branch_name} ({b.branch_code}) - {b.branch_type === 'main_warehouse' ? 'مستودع رئيسي' : 'فرع'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="to_branch_id"
                label="المخزن / الفرع المُستقبِل (الجهة المستلمة)"
                rules={[{ required: true, message: 'يرجى تحديد الجهة المستلمة' }]}
              >
                <Select
                  size="large"
                  placeholder="اختر جهة الاستلام"
                  style={{ width: '100%' }}
                >
                  {branches.map((b) => (
                    <Option key={b.id} value={b.id} disabled={b.id === selectedFromBranch}>
                      {b.branch_name} ({b.branch_code}) - {b.branch_type === 'main_warehouse' ? 'مستودع رئيسي' : 'فرع'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Transfer Date, Driver, Vehicle */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="transfer_date"
                label="تاريخ إذن الصرف"
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
              >
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="driver_name" label="اسم السائق / مندوب النقل">
                <Input size="large" prefix={<CarOutlined />} placeholder="مثال: محمد السيد" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="vehicle_number" label="رقم السيارة / وسيلة النقل">
                <Input size="large" placeholder="مثال: أ ب ج 123" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }}>الأصناف المراد نقلها وصرفها</Divider>

          {/* Product Search & Picker from Available Stock */}
          <div style={{ marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Row gutter={8} align="middle">
              <Col span={18}>
                <Select
                  size="large"
                  showSearch
                  placeholder={
                    selectedFromBranch
                      ? 'ابحث باسم الصنف أو الكود أو الباركود لإضافته للإذن...'
                      : 'يرجى تحديد المخزن المُرسِل أولاً لجلب الأصناف المتاحة'
                  }
                  disabled={!selectedFromBranch}
                  loading={stockLoading}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(val) => handleAddItem(val)}
                  value={null}
                  style={{ width: '100%' }}
                  options={availableStock.map((s) => ({
                    value: s.product_id,
                    label: `${s.display_name} | كود: ${s.product_code} (المتاح: ${s.available_qty} قطعة)`
                  }))}
                />
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                  الأصناف المتوفرة بالمخزن: <strong>{availableStock.length}</strong>
                </div>
              </Col>
            </Row>
          </div>

          {/* Items Table in Modal */}
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 10px' }}>الصنف والكود</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>الرصيد المتاح</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 120 }}>الكمية المنصرفة</th>
                  <th style={{ padding: '8px 10px' }}>ملاحظات الصنف</th>
                  <th style={{ padding: '8px 4px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {transferItems.map((item, idx) => (
                  <tr key={`${item.product_id}-${item.variant_id || '0'}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                      <Text code style={{ fontSize: 11 }}>{item.product_code}</Text>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <Tag color="cyan">{item.available_qty} قطعة</Tag>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <InputNumber
                        min={1}
                        max={item.available_qty}
                        value={item.quantity}
                        onChange={(qty) => handleUpdateItemQty(idx, qty)}
                        style={{ width: 85 }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <Input
                        size="small"
                        placeholder="ملاحظات"
                        value={item.notes}
                        onChange={(e) => handleUpdateItemNotes(idx, e.target.value)}
                      />
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(idx)}
                      />
                    </td>
                  </tr>
                ))}
                {transferItems.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                      لم يتم إضافة أصناف بعد. اختر المخزن وابحث عن المنتجات لإضافتها.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Transfer Summary Row */}
          {transferItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', color: '#fff', padding: '8px 16px', borderRadius: 6, marginBottom: 12 }}>
              <span>إجمالي الأصناف: <strong>{transferItems.length}</strong></span>
              <span style={{ fontSize: 16 }}>إجمالي القطع المنقولة: <strong style={{ color: '#4ade80' }}>{totalUnits} قطعة</strong></span>
            </div>
          )}

          <Form.Item name="notes" label="ملاحظات عامة على إذن الصرف">
            <TextArea rows={2} placeholder="أي تعليمات خاصة بالاستلام أو النقل..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateModalVisible(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              disabled={transferItems.length === 0}
              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 'bold' }}
            >
              تأكيد وتنفيذ إذن الصرف (خصم وإضافة فورية)
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Printable A4 Modal */}
      <Modal
        open={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        footer={null}
        width={850}
        destroyOnHidden
      >
        <DispatchNoteA4
          transfer={selectedTransfer}
          onClose={() => setPrintModalVisible(false)}
        />
      </Modal>
    </div>
  );
}
