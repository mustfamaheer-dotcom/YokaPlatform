import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Table,
  Tabs,
  Input,
  Modal,
  Form,
  InputNumber,
  Select,
  App,
  Spin,
  Alert,
  Space,
  Popconfirm
} from 'antd';
import {
  Boxes,
  ClipboardList,
  Sliders,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Barcode,
  PackageCheck,
  FileCheck2,
  ArrowRightLeft
} from 'lucide-react';
import api from '../../../api';

const { Title, Text } = Typography;

export default function InventoryStockCard({ branchId, currentUser }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('balances');

  // Tab 1: Balances Data
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stockKpi, setStockKpi] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Tab 2: Stock-Take Sessions Data
  const [countSessions, setCountSessions] = useState([]);
  const [isStockTakeModalOpen, setIsStockTakeModalOpen] = useState(false);
  const [stockTakeItems, setStockTakeItems] = useState([]);
  const [submittingCount, setSubmittingCount] = useState(false);
  const [convertingSession, setConvertingSession] = useState(null);

  // Tab 3: Adjustment Vouchers Data
  const [adjustments, setAdjustments] = useState([]);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjForm] = Form.useForm();
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // Load Inventory Balances
  const loadBalances = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/stock-audit', {
        params: { branch_id: branchId, search: searchTerm, limit: 100 }
      });
      if (res.data.success && res.data.data) {
        setInventoryItems(res.data.data.items || []);
        setStockKpi(res.data.data.kpi || {});
      }
    } catch (err) {
      console.error('Failed to load balances:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Stock Take Sessions
  const loadCountSessions = async () => {
    try {
      const res = await api.get('/api/swm/stock-audit/counts', {
        params: { branch_id: branchId }
      });
      if (res.data.success) {
        setCountSessions(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load count sessions:', err);
    }
  };

  // Load Stock Adjustments
  const loadAdjustments = async () => {
    try {
      const res = await api.get('/api/swm/stock-adjustments', {
        params: { branch_id: branchId, limit: 20 }
      });
      if (res.data.success) {
        setAdjustments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load adjustments:', err);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadBalances();
      loadCountSessions();
      loadAdjustments();
    }
  }, [branchId]);

  // Start New Stock Take Session Setup
  const handleOpenStockTakeModal = () => {
    // Populate top items for quick count
    const initialList = inventoryItems.slice(0, 30).map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id,
      product_name: it.product_name,
      product_code: it.product_code,
      barcode: it.barcode,
      system_qty: parseInt(it.system_qty || 0, 10),
      actual_qty: parseInt(it.system_qty || 0, 10),
      notes: ''
    }));
    setStockTakeItems(initialList);
    setIsStockTakeModalOpen(true);
  };

  // Update Counted Quantity in Stock Take Session
  const handleUpdateCountQty = (productId, variantId, qty) => {
    setStockTakeItems((prev) =>
      prev.map((item) => {
        if (item.product_id === productId && item.variant_id === variantId) {
          return { ...item, actual_qty: parseInt(qty || 0, 10) };
        }
        return item;
      })
    );
  };

  // Submit Stock Take Session
  const handleSubmitStockTake = async () => {
    setSubmittingCount(true);
    try {
      const sessionCode = `STK-B${branchId}-${Date.now().toString().slice(-6)}`;
      const payload = {
        branch_id: branchId,
        count_session: sessionCode,
        items: stockTakeItems
      };

      const res = await api.post('/api/swm/stock-audit/counts', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم حفظ جلسة الجرد بنجاح');
        setIsStockTakeModalOpen(false);
        loadCountSessions();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ جلسة الجرد');
    } finally {
      setSubmittingCount(false);
    }
  };

  // Convert Stock Take Discrepancies to Approved Adjustment Voucher
  const handleConvertToAdjustment = async (sessionCode) => {
    setConvertingSession(sessionCode);
    try {
      const res = await api.post(`/api/swm/stock-audit/counts/${sessionCode}/convert-to-adjustment`, {
        branch_id: branchId
      });
      if (res.data.success) {
        message.success(res.data.message || 'تم تحويل الجرد إلى سند تسوية معتمد بنجاح');
        loadBalances();
        loadCountSessions();
        loadAdjustments();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحويل الجرد لسند تسوية');
    } finally {
      setConvertingSession(null);
    }
  };

  // Directly Approve an existing Draft Adjustment Voucher (Supervisor Scoped Permission)
  const handleApproveAdjustment = async (adjId) => {
    try {
      const res = await api.put(`/api/swm/stock-adjustments/${adjId}/approve`);
      if (res.data.success) {
        message.success(res.data.message || 'تم اعتماد سند التسوية وتطبيق الكميات على المخزون');
        loadBalances();
        loadAdjustments();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في اعتماد سند التسوية');
    }
  };

  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: 24,
        background: '#ffffff',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* ─── Card Header ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Boxes size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                3. بطاقة المخزون والجرد (Inventory & Stock-Take)
              </Title>
              <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                صلاحية كاملة مقيدة بالفرع
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              متابعة أرصدة الفرع، إطلاق جلسات الجرد الفعلي، واعتماد سندات تسوية الكميات
            </Text>
          </div>
        </div>

        {/* Action Buttons */}
        <Space>
          <Button
            type="primary"
            icon={<ClipboardList size={15} style={{ marginLeft: 6 }} />}
            onClick={handleOpenStockTakeModal}
            style={{
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            بدء جلسة جرد مجمع (Stock-Take)
          </Button>
        </Space>
      </div>

      {/* ─── Inventory KPI Summary Badges ─── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, color: '#0369a1', fontWeight: 700 }}>أصناف الفرع المسجلة</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0c4a6e', marginTop: 4 }}>
              {stockKpi.totalItems || 0} صنف
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700 }}>إجمالي القطع المتوفرة</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginTop: 4 }}>
              {(stockKpi.totalUnits || 0).toLocaleString()} قطعة
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, color: '#86198f', fontWeight: 700 }}>قيمة المخزون المقدرة</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#701a75', marginTop: 4 }}>
              {(stockKpi.totalStockValue || 0).toLocaleString()} ج.م
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 11.5, color: '#be123c', fontWeight: 700 }}>أصناف منخفضة / قاربت النفاد</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#9f1239', marginTop: 4 }}>
              {stockKpi.lowStockCount || 0} صنف
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── 3 Sub-Tabs for Inventory Actions ─── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'balances',
            label: (
              <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Boxes size={16} />
                أرصدة المخزون بالفرع (Inventory Balances)
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                  <Input
                    placeholder="بحث باسم الصنف، الباركود، الكود، أو المقاس..."
                    prefix={<Search size={15} color="#94a3b8" />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onPressEnter={loadBalances}
                    style={{ maxWidth: 380, borderRadius: 8 }}
                  />
                  <Button onClick={loadBalances} icon={<RotateCw size={14} />}>
                    تحديث الأرصدة
                  </Button>
                </div>

                <Table
                  size="small"
                  loading={loading}
                  dataSource={inventoryItems}
                  rowKey={(r) => r.product_id + '-' + (r.variant_id || 0)}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'كود / باركود',
                      dataIndex: 'barcode',
                      key: 'barcode',
                      render: (v, r) => (
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                            {v || r.product_code}
                          </span>
                          {r.variant_sku && <div style={{ fontSize: 11, color: '#64748b' }}>{r.variant_sku}</div>}
                        </div>
                      )
                    },
                    {
                      title: 'اسم الصنف',
                      dataIndex: 'product_name',
                      key: 'product_name',
                      render: (v, r) => (
                        <div>
                          <strong style={{ color: '#0f172a' }}>{v}</strong>
                          {(r.color || r.size) && (
                            <span style={{ fontSize: 11, color: '#64748b', marginRight: 6 }}>
                              [{r.color} - {r.size}]
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      title: 'سعر البيع',
                      dataIndex: 'selling_price',
                      key: 'selling_price',
                      render: (v) => `${parseFloat(v || 0).toLocaleString()} ج.م`
                    },
                    {
                      title: 'الرصيد المتاح بالنظام',
                      dataIndex: 'system_qty',
                      key: 'system_qty',
                      align: 'center',
                      render: (v, r) => {
                        const q = parseInt(v || 0, 10);
                        const min = parseInt(r.reorder_level || 5, 10);
                        if (q <= 0) return <Tag color="error">نافد (0)</Tag>;
                        if (q <= min) return <Tag color="warning">{q} قطعة (منخفض)</Tag>;
                        return <Tag color="success">{q} قطعة</Tag>;
                      }
                    },
                    {
                      title: 'إجمالي القيمة',
                      dataIndex: 'stock_value',
                      key: 'stock_value',
                      render: (v) => `${parseFloat(v || 0).toLocaleString()} ج.م`
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'stock_take',
            label: (
              <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClipboardList size={16} />
                جلسات الجرد المجمع (Stock-Take Sessions)
              </span>
            ),
            children: (
              <div>
                <Table
                  size="small"
                  dataSource={countSessions}
                  rowKey="count_session"
                  pagination={{ pageSize: 6 }}
                  locale={{ emptyText: 'لا توجد جلسات جرد سابقة مسجلة' }}
                  columns={[
                    {
                      title: 'رمز جلسة الجرد',
                      dataIndex: 'count_session',
                      key: 'count_session',
                      render: (v) => <strong style={{ color: '#0369a1' }}>{v}</strong>
                    },
                    {
                      title: 'تاريخ الجرد',
                      dataIndex: 'count_date',
                      key: 'count_date',
                      render: (v) => (v ? new Date(v).toLocaleDateString('ar-EG') : '—')
                    },
                    {
                      title: 'الأصناف المجرودة',
                      dataIndex: 'items_counted',
                      key: 'items_counted',
                      align: 'center',
                      render: (v) => <Tag color="blue">{v} صنف</Tag>
                    },
                    {
                      title: 'الفروقات (عجز / زيادة)',
                      dataIndex: 'discrepancies_count',
                      key: 'discrepancies_count',
                      align: 'center',
                      render: (v) => {
                        const d = parseInt(v || 0, 10);
                        return d > 0 ? (
                          <Tag color="red">{d} صنف به فارق</Tag>
                        ) : (
                          <Tag color="green">مطابق 100%</Tag>
                        );
                      }
                    },
                    {
                      title: 'حالة الجرد',
                      dataIndex: 'status',
                      key: 'status',
                      align: 'center',
                      render: (v) => {
                        if (v === 'adjusted') return <Tag color="success">تمت التسوية وتطبيقها</Tag>;
                        if (v === 'verified') return <Tag color="green">مؤكد ومطابق</Tag>;
                        return <Tag color="gold">مسجل بانتظار التسوية</Tag>;
                      }
                    },
                    {
                      title: 'الإجراء',
                      key: 'action',
                      render: (_, r) => {
                        const d = parseInt(r.discrepancies_count || 0, 10);
                        if (r.status === 'adjusted') {
                          return <span style={{ color: '#059669', fontSize: 12, fontWeight: 700 }}>سند التسوية معتمد</span>;
                        }
                        if (d === 0) {
                          return <span style={{ color: '#64748b', fontSize: 12 }}>لا يتطلب تسوية</span>;
                        }
                        return (
                          <Button
                            type="primary"
                            size="small"
                            loading={convertingSession === r.count_session}
                            onClick={() => handleConvertToAdjustment(r.count_session)}
                            style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', fontWeight: 600, fontSize: 12 }}
                          >
                            إنشاء واعتماد سند تسوية
                          </Button>
                        );
                      }
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'adjustments',
            label: (
              <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sliders size={16} />
                سندات تسوية الكميات (Settlement Vouchers)
              </span>
            ),
            children: (
              <div>
                <Table
                  size="small"
                  dataSource={adjustments}
                  rowKey="id"
                  pagination={{ pageSize: 6 }}
                  locale={{ emptyText: 'لا توجد سندات تسوية مسجلة لهذا الفرع' }}
                  columns={[
                    {
                      title: 'رقم السند',
                      dataIndex: 'adjustment_number',
                      key: 'adjustment_number',
                      render: (v) => <strong style={{ color: '#0369a1' }}>{v}</strong>
                    },
                    {
                      title: 'السبب والملاحظات',
                      dataIndex: 'reason',
                      key: 'reason'
                    },
                    {
                      title: 'صافي التغير بالكميات',
                      dataIndex: 'net_qty_change',
                      key: 'net_qty_change',
                      align: 'center',
                      render: (v) => {
                        const q = parseInt(v || 0, 10);
                        return q >= 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>+{q}</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>{q}</span>
                        );
                      }
                    },
                    {
                      title: 'قيمة الفارق المالي',
                      dataIndex: 'total_variance_cost',
                      key: 'total_variance_cost',
                      render: (v) => `${parseFloat(v || 0).toLocaleString()} ج.م`
                    },
                    {
                      title: 'الحالة',
                      dataIndex: 'status',
                      key: 'status',
                      align: 'center',
                      render: (v) => (v === 'approved' ? <Tag color="success">معتمد ومطبق</Tag> : <Tag color="warning">مسودة</Tag>)
                    },
                    {
                      title: 'اعتماد المشرف',
                      key: 'approve',
                      align: 'center',
                      render: (_, r) => {
                        if (r.status === 'approved') {
                          return (
                            <span style={{ color: '#059669', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={13} />
                              معتمد ({r.approved_by_name || 'المشرف'})
                            </span>
                          );
                        }
                        return (
                          <Popconfirm
                            title="هل تريد اعتماد سند التسوية وتطبيق الكميات فوراً على المخزون؟"
                            onConfirm={() => handleApproveAdjustment(r.id)}
                            okText="نعم، اعتمد"
                            cancelText="إلغاء"
                          >
                            <Button size="small" type="primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 700 }}>
                              اعتماد السند
                            </Button>
                          </Popconfirm>
                        );
                      }
                    }
                  ]}
                />
              </div>
            )
          }
        ]}
      />

      {/* ─── Modal: Stock-Take Execution Sheet ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#0284c7" />
            <span style={{ fontWeight: 800 }}>تسجيل جلسة جرد مجمع لأصناف الفرع</span>
          </div>
        }
        open={isStockTakeModalOpen}
        onCancel={() => setIsStockTakeModalOpen(false)}
        width={850}
        footer={[
          <Button key="cancel" onClick={() => setIsStockTakeModalOpen(false)}>
            إلغاء
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submittingCount}
            onClick={handleSubmitStockTake}
            style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', fontWeight: 700 }}
          >
            حفظ جلسة الجرد والتحقق
          </Button>
        ]}
      >
        <Alert
          type="info"
          message="أدخل الكمية الفعلية المحصورة يدوياً في الفرع. سيقوم النظام بحساب الفوارق (عجز أو فائض) تلقائياً ويتيح لك تحويلها لسند تسوية بضغطة زر واحدة."
          style={{ marginBottom: 16 }}
        />

        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <Table
            size="small"
            dataSource={stockTakeItems}
            rowKey={(r) => r.product_id + '-' + (r.variant_id || 0)}
            pagination={false}
            columns={[
              {
                title: 'الصنف / الباركود',
                dataIndex: 'product_name',
                key: 'product_name',
                render: (v, r) => (
                  <div>
                    <strong>{v}</strong>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.barcode || r.product_code}</div>
                  </div>
                )
              },
              {
                title: 'رصيد النظام',
                dataIndex: 'system_qty',
                key: 'system_qty',
                align: 'center',
                render: (v) => <span style={{ fontWeight: 700 }}>{v}</span>
              },
              {
                title: 'العدد الفعلي بالجرد',
                key: 'actual_qty',
                align: 'center',
                render: (_, r) => (
                  <InputNumber
                    min={0}
                    value={r.actual_qty}
                    onChange={(val) => handleUpdateCountQty(r.product_id, r.variant_id, val)}
                    style={{ width: 90, borderRadius: 6, fontWeight: 700 }}
                  />
                )
              },
              {
                title: 'الفارق',
                key: 'diff',
                align: 'center',
                render: (_, r) => {
                  const diff = r.actual_qty - r.system_qty;
                  if (diff === 0) return <Tag color="green">مطابق</Tag>;
                  if (diff > 0) return <Tag color="blue">+{diff} (فائض)</Tag>;
                  return <Tag color="red">{diff} (عجز)</Tag>;
                }
              }
            ]}
          />
        </div>
      </Modal>
    </Card>
  );
}
