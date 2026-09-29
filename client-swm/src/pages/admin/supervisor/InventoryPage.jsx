import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Table,
  Input,
  InputNumber,
  Space,
  App,
  Spin,
  Alert,
  Tabs,
  Badge,
  Popconfirm
} from 'antd';
import {
  Boxes,
  Search,
  ClipboardList,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  FileCheck2,
  Save,
  Barcode
} from 'lucide-react';
import SupervisorPageLayout from './SupervisorPageLayout';
import api from '../../../api';

const { Title, Text, Paragraph } = Typography;

export default function InventoryPage({ currentUser }) {
  const { message } = App.useApp();
  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stocktake');

  // Search & Products State
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [countsMap, setCountsMap] = useState({}); // { [productId_variantId]: actualQty }
  const [submitting, setSubmitting] = useState(false);

  // Past Sessions & Adjustments
  const [sessions, setSessions] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  // Load Branch Products & Balances
  const loadBranchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/stock-audit', {
        params: { branch_id: branchId, search: searchTerm, limit: 150 }
      });
      if (res.data.success && res.data.data) {
        const items = res.data.data.items || [];
        setProducts(items);

        // Initialize countsMap with system quantities if not already set
        setCountsMap((prev) => {
          const next = { ...prev };
          items.forEach((it) => {
            const key = `${it.product_id}_${it.variant_id || 0}`;
            if (next[key] === undefined) {
              next[key] = parseInt(it.system_qty || 0, 10);
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load inventory products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPastData = async () => {
    try {
      const [sessRes, adjRes] = await Promise.all([
        api.get('/api/swm/stock-audit/counts', { params: { branch_id: branchId } }),
        api.get('/api/swm/stock-adjustments', { params: { branch_id: branchId, limit: 15 } })
      ]);
      if (sessRes.data.success) setSessions(sessRes.data.data || []);
      if (adjRes.data.success) setAdjustments(adjRes.data.data || []);
    } catch (err) {
      console.error('Failed to load past sessions/adjustments:', err);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadBranchProducts();
      loadPastData();
    }
  }, [branchId]);

  // Update physical count for a product
  const handleCountChange = (productId, variantId, qty) => {
    const key = `${productId}_${variantId || 0}`;
    setCountsMap((prev) => ({
      ...prev,
      [key]: qty !== null && qty !== undefined ? parseInt(qty, 10) : 0
    }));
  };

  // Find all items with discrepancies
  const discrepancies = products
    .map((p) => {
      const key = `${p.product_id}_${p.variant_id || 0}`;
      const actual = countsMap[key] !== undefined ? countsMap[key] : parseInt(p.system_qty || 0, 10);
      const system = parseInt(p.system_qty || 0, 10);
      const diff = actual - system;
      return { ...p, actual_qty: actual, system_qty: system, diff };
    })
    .filter((p) => p.diff !== 0);

  // Generate & Approve Adjustment Voucher from Current Stock-Take
  const handleGenerateAdjustment = async () => {
    if (discrepancies.length === 0) {
      return message.info('لا توجد أي فروقات بين الجرد الفعلي ورصيد النظام. جميع الأصناف مطابقة 100%.');
    }

    setSubmitting(true);
    try {
      const sessionCode = `STK-B${branchId}-${Date.now().toString().slice(-6)}`;

      // 1. Save count session
      await api.post('/api/swm/stock-audit/counts', {
        branch_id: branchId,
        count_session: sessionCode,
        items: discrepancies.map((d) => ({
          product_id: d.product_id,
          variant_id: d.variant_id,
          system_qty: d.system_qty,
          actual_qty: d.actual_qty,
          notes: d.diff > 0 ? `فائض بالجرد (${d.diff})` : `عجز بالجرد (${d.diff})`
        }))
      });

      // 2. Convert to approved adjustment voucher
      const res = await api.post(`/api/swm/stock-audit/counts/${sessionCode}/convert-to-adjustment`, {
        branch_id: branchId
      });

      if (res.data.success) {
        message.success(res.data.message || 'تم إنشاء واعتماد سند التسوية بنجاح وتحديث أرصدة المخزون وحركاته');
        loadBranchProducts();
        loadPastData();
      } else {
        message.error(res.data.message || 'فشل في إنشاء سند التسوية');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إنشاء واعتماد سند التسوية');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SupervisorPageLayout
      currentUser={currentUser}
      pageTitle="المخزون والجرد الفعلي للفرع"
      pageIcon={<Boxes size={20} />}
      pageSubtitle="حصر أرصدة الأصناف، إدخال الجرد الفعلي، واعتماد سندات تسوية الكميات فورياً"
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'stocktake',
              label: (
                <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} />
                  جلسة الجرد الفعلي وتوليد سند التسوية
                </span>
              ),
              children: (
                <div>
                  {/* Top Bar with Search & Settle Action */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: '18px 22px',
                      marginBottom: 20,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 500 }}>
                      <Input
                        size="large"
                        placeholder="ابحث باسم الصنف، الباركود، الكود..."
                        prefix={<Search size={16} color="#94a3b8" />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onPressEnter={loadBranchProducts}
                        allowClear
                        style={{ borderRadius: 8 }}
                      />
                      <Button size="large" onClick={loadBranchProducts} icon={<RotateCw size={14} />}>
                        بحث
                      </Button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Tag
                        color={discrepancies.length > 0 ? 'volcano' : 'green'}
                        style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, fontWeight: 700 }}
                      >
                        {discrepancies.length > 0
                          ? `يوجد ${discrepancies.length} صنف به فارق جرد`
                          : 'كافة الأصناف مطابقة حالياً'}
                      </Tag>

                      <Popconfirm
                        title="إنشاء واعتماد سند تسوية كميات"
                        description={`هل تريد اعتماد سند تسوية وتحديث أرصدة ${discrepancies.length} أصناف في دفتر المخزون؟`}
                        onConfirm={handleGenerateAdjustment}
                        okText="نعم، اعتمد التسوية"
                        cancelText="إلغاء"
                        disabled={discrepancies.length === 0}
                      >
                        <Button
                          type="primary"
                          size="large"
                          icon={<FileCheck2 size={18} style={{ marginLeft: 6 }} />}
                          loading={submitting}
                          disabled={discrepancies.length === 0}
                          style={{
                            backgroundColor: '#0284c7',
                            borderColor: '#0284c7',
                            borderRadius: 8,
                            fontWeight: 800,
                            height: 44,
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          إنشاء واعتماد سند تسوية ({discrepancies.length} فارق)
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>

                  {/* Stock-Take Interactive Table */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: '16px 20px'
                    }}
                  >
                    <Table
                      dataSource={products}
                      rowKey={(r) => `${r.product_id}_${r.variant_id || 0}`}
                      pagination={{ pageSize: 12 }}
                      columns={[
                        {
                          title: 'الباركود / الكود',
                          dataIndex: 'barcode',
                          key: 'barcode',
                          width: 170,
                          render: (v, r) => (
                            <div>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                                {v || r.product_code}
                              </span>
                              {r.variant_sku && (
                                <div style={{ fontSize: 11, color: '#64748b' }}>{r.variant_sku}</div>
                              )}
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
                          width: 120,
                          render: (v) => `${parseFloat(v || 0).toLocaleString()} ج.م`
                        },
                        {
                          title: 'رصيد النظام (System Qty)',
                          dataIndex: 'system_qty',
                          key: 'system_qty',
                          align: 'center',
                          width: 150,
                          render: (v) => (
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>
                              {parseInt(v || 0, 10)} قطعة
                            </span>
                          )
                        },
                        {
                          title: 'العدد الفعلي بالجرد (Actual Count)',
                          key: 'actual_count',
                          align: 'center',
                          width: 170,
                          render: (_, r) => {
                            const key = `${r.product_id}_${r.variant_id || 0}`;
                            const val = countsMap[key] !== undefined ? countsMap[key] : parseInt(r.system_qty || 0, 10);
                            return (
                              <InputNumber
                                min={0}
                                value={val}
                                onChange={(num) => handleCountChange(r.product_id, r.variant_id, num)}
                                style={{ width: 100, borderRadius: 6, fontWeight: 800, textAlign: 'center' }}
                              />
                            );
                          }
                        },
                        {
                          title: 'الفارق (Variance)',
                          key: 'variance',
                          align: 'center',
                          width: 150,
                          render: (_, r) => {
                            const key = `${r.product_id}_${r.variant_id || 0}`;
                            const actual = countsMap[key] !== undefined ? countsMap[key] : parseInt(r.system_qty || 0, 10);
                            const system = parseInt(r.system_qty || 0, 10);
                            const diff = actual - system;

                            if (diff === 0) return <Tag color="green">مطابق (0)</Tag>;
                            if (diff > 0) return <Tag color="blue">فائض (+{diff})</Tag>;
                            return <Tag color="red">عجز ({diff})</Tag>;
                          }
                        }
                      ]}
                    />
                  </div>
                </div>
              )
            },
            {
              key: 'vouchers',
              label: (
                <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={16} />
                  سجل سندات التسوية المعتمدة (Vouchers History)
                </span>
              ),
              children: (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px' }}>
                  <Table
                    dataSource={adjustments}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'لا توجد سندات تسوية سابقة' }}
                    columns={[
                      {
                        title: 'رقم السند',
                        dataIndex: 'adjustment_number',
                        key: 'adjustment_number',
                        render: (v) => <strong style={{ color: '#0284c7' }}>{v}</strong>
                      },
                      {
                        title: 'سبب التسوية',
                        dataIndex: 'reason',
                        key: 'reason'
                      },
                      {
                        title: 'عدد الأصناف',
                        dataIndex: 'total_items',
                        key: 'total_items',
                        align: 'center',
                        render: (v) => <Tag color="blue">{v} صنف</Tag>
                      },
                      {
                        title: 'صافي التغير',
                        dataIndex: 'net_qty_change',
                        key: 'net_qty_change',
                        align: 'center',
                        render: (v) => {
                          const q = parseInt(v || 0, 10);
                          return q >= 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 800 }}>+{q}</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 800 }}>{q}</span>
                          );
                        }
                      },
                      {
                        title: 'القيمة المالية',
                        dataIndex: 'total_variance_cost',
                        key: 'total_variance_cost',
                        render: (v) => `${parseFloat(v || 0).toLocaleString()} ج.م`
                      },
                      {
                        title: 'الحالة',
                        dataIndex: 'status',
                        key: 'status',
                        align: 'center',
                        render: (v) => (v === 'approved' ? <Tag color="success">معتمد ومطبق</Tag> : <Tag>{v}</Tag>)
                      },
                      {
                        title: 'تاريخ الاعتماد',
                        dataIndex: 'approved_at',
                        key: 'approved_at',
                        render: (v) => (v ? new Date(v).toLocaleString('ar-EG') : '—')
                      }
                    ]}
                  />
                </div>
              )
            }
          ]}
        />
      </Spin>
    </SupervisorPageLayout>
  );
}
