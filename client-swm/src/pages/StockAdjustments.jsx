import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Drawer,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Typography,
  Space,
  Statistic,
  message,
  Popconfirm,
  Divider,
  Alert,
  Tooltip,
  Badge,
  Spin
} from 'antd';
import {
  DiffOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function StockAdjustments({ currentUser }) {
  const isRetailBranch = Boolean(
    currentUser &&
    (currentUser.branchType === 'retail_branch' || currentUser.isBranchAccount) &&
    !['super_admin', 'admin'].includes(currentUser.role)
  );

  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Lookups
  const [branchesList, setBranchesList] = useState([]);

  // List Filters
  const [filterBranch, setFilterBranch] = useState(
    isRetailBranch && currentUser?.branchId ? currentUser.branchId : 'all'
  );
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 1. Create New Voucher Drawer State
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [loadingBranchItems, setLoadingBranchItems] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState(
    isRetailBranch && currentUser?.branchId ? currentUser.branchId : null
  );
  const [adjustmentDate, setAdjustmentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [adjustmentReason, setAdjustmentReason] = useState('جرد دوري ربع سنوي');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [voucherItems, setVoucherItems] = useState([]);

  // Single Item Search in Drawer
  const [singleSearchLoading, setSingleSearchLoading] = useState(false);
  const [singleSearchResults, setSingleSearchResults] = useState([]);

  // 2. View/Print Voucher Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const printAreaRef = useRef(null);

  // Fetch Branches
  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data.success) {
        setBranchesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
    }
  };

  // Fetch Vouchers List
  const fetchVouchers = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        branch_id: filterBranch !== 'all' ? filterBranch : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchKeyword.trim() || undefined,
        page,
        limit: pagination.pageSize
      };
      const res = await api.get('/api/swm/stock-adjustments', { params });
      if (res.data.success) {
        setVouchers(res.data.data || []);
        setPagination(prev => ({
          ...prev,
          current: res.data.pagination?.page || 1,
          total: res.data.pagination?.total || 0
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل سندات التسوية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (isRetailBranch && currentUser?.branchId) {
      setFilterBranch(currentUser.branchId);
      setSelectedBranchId(currentUser.branchId);
    }
  }, [isRetailBranch, currentUser?.branchId]);

  useEffect(() => {
    fetchVouchers(1);
  }, [filterBranch, filterStatus]);

  // Open Create Drawer
  const handleOpenCreateDrawer = () => {
    const defaultBranch = isRetailBranch && currentUser?.branchId ? currentUser.branchId : (branchesList[0]?.id || 1);
    setSelectedBranchId(defaultBranch);
    setAdjustmentDate(dayjs().format('YYYY-MM-DD'));
    setAdjustmentReason('جرد دوري ربع سنوي');
    setAdjustmentNotes('');
    setVoucherItems([]);
    setCreateDrawerOpen(true);
  };

  // Load items of the selected branch (either only in-stock or all items)
  const handleLoadBranchItems = async (onlyInStock = true) => {
    if (!selectedBranchId) return message.warning('يرجى اختيار الفرع أولاً');
    setLoadingBranchItems(true);
    try {
      const params = {
        branch_id: selectedBranchId,
        limit: 'all'
      };
      if (onlyInStock) {
        params.status_filter = 'in_stock';
      }
      const res = await api.get('/api/swm/stock-audit', { params });
      if (res.data.success) {
        const auditItems = res.data.data?.items || [];
        const existingMap = new Map(voucherItems.map(it => [it.key, it]));

        const mapped = auditItems.map((it) => {
          const key = `${it.product_id}-${it.variant_id || 'base'}`;
          const existing = existingMap.get(key);
          const sys = parseInt(it.system_qty || 0, 10);
          const actual = existing ? existing.actual_qty : sys;
          const variance = actual - sys;
          const cost = parseFloat(it.cost_price || 0);

          return {
            key,
            product_id: it.product_id,
            variant_id: it.variant_id || null,
            product_name: it.product_name,
            product_code: it.product_code,
            variant_sku: it.variant_sku || null,
            color: it.color || null,
            size: it.size || null,
            category_name: it.category_name,
            system_qty: sys,
            actual_qty: actual,
            variance_qty: variance,
            unit_cost: cost,
            variance_cost: variance * cost,
            item_notes: existing ? existing.item_notes : ''
          };
        });

        // Preserve any manually added items that might not be in the loaded list
        const loadedKeys = new Set(mapped.map(m => m.key));
        const customItems = voucherItems.filter(v => !loadedKeys.has(v.key));

        setVoucherItems([...customItems, ...mapped]);
        message.success(
          onlyInStock
            ? `تم بنجاح تحميل (${mapped.length}) صنف متوفر بالرصيد (> 0)`
            : `تم بنجاح تحميل كافة أصناف الفرع (${mapped.length} صنف)`
        );
      }
    } catch (e) {
      message.error('فشل في تحميل أصناف الفرع');
    } finally {
      setLoadingBranchItems(false);
    }
  };

  // Search single item for selected branch
  const handleSearchSingleItem = async (queryText) => {
    if (!queryText || !queryText.trim()) {
      setSingleSearchResults([]);
      return;
    }
    if (!selectedBranchId) {
      message.warning('يرجى اختيار الفرع أولاً للبحث في أرصدته');
      return;
    }
    setSingleSearchLoading(true);
    try {
      const res = await api.get('/api/swm/stock-audit', {
        params: {
          branch_id: selectedBranchId,
          search: queryText.trim(),
          limit: 30
        }
      });
      if (res.data.success) {
        setSingleSearchResults(res.data.data?.items || []);
      }
    } catch (err) {
      console.error('Search single item error:', err);
    } finally {
      setSingleSearchLoading(false);
    }
  };

  // Add selected single item to voucher
  const handleAddSingleItem = (it) => {
    if (!it) return;
    const itemKey = `${it.product_id}-${it.variant_id || 'base'}`;
    const exists = voucherItems.some(x => x.key === itemKey);
    if (exists) {
      message.warning(`الصنف "${it.product_name}" موجود بالفعل في كشف التسوية`);
      return;
    }

    const sys = parseInt(it.system_qty || 0, 10);
    const cost = parseFloat(it.cost_price || 0);
    const newItem = {
      key: itemKey,
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      product_name: it.product_name,
      product_code: it.product_code,
      variant_sku: it.variant_sku || null,
      color: it.color || null,
      size: it.size || null,
      category_name: it.category_name,
      system_qty: sys,
      actual_qty: sys,
      variance_qty: 0,
      unit_cost: cost,
      variance_cost: 0,
      item_notes: ''
    };

    setVoucherItems(prev => [newItem, ...prev]);
    message.success(`تمت إضافة الصنف "${it.product_name}"`);
    setSingleSearchResults([]);
  };

  // Update actual count in the drawer grid
  const handleUpdateItemActual = (key, val) => {
    const actual = parseInt(val, 10);
    if (isNaN(actual) || actual < 0) return;

    setVoucherItems(prev => prev.map(it => {
      if (it.key !== key) return it;
      const variance = actual - it.system_qty;
      const cost = parseFloat(it.unit_cost || 0);
      return {
        ...it,
        actual_qty: actual,
        variance_qty: variance,
        variance_cost: variance * cost
      };
    }));
  };

  // Update item note in the grid
  const handleUpdateItemNote = (key, text) => {
    setVoucherItems(prev => prev.map(it => it.key === key ? { ...it, item_notes: text } : it));
  };

  // Remove item from draft grid
  const handleRemoveItem = (key) => {
    setVoucherItems(prev => prev.filter(it => it.key !== key));
  };

  // Calculate Running Totals in Drawer
  const totalSurplusQty = voucherItems.reduce((sum, it) => sum + (it.variance_qty > 0 ? it.variance_qty : 0), 0);
  const totalDeficitQty = voucherItems.reduce((sum, it) => sum + (it.variance_qty < 0 ? Math.abs(it.variance_qty) : 0), 0);
  const totalVarianceCost = voucherItems.reduce((sum, it) => sum + (it.variance_cost || 0), 0);
  const itemsWithVariances = voucherItems.filter(it => it.variance_qty !== 0);

  // Submit Voucher (Approved or Draft)
  const handleSubmitVoucher = async (targetStatus = 'approved') => {
    if (!selectedBranchId) return message.error('يرجى تحديد الفرع أو المستودع');
    if (!adjustmentReason.trim()) return message.error('يرجى تحديد سبب التسوية');
    if (voucherItems.length === 0) return message.error('يجب إضافة صنف واحد على الأقل في السند');

    setCreateSubmitting(true);
    try {
      const payload = {
        branch_id: selectedBranchId,
        adjustment_date: adjustmentDate,
        reason: adjustmentReason,
        notes: adjustmentNotes,
        status: targetStatus,
        items: voucherItems.map(it => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          system_qty: it.system_qty,
          actual_qty: it.actual_qty,
          unit_cost: it.unit_cost,
          product_name: it.product_name,
          product_code: it.product_code,
          variant_sku: it.variant_sku,
          item_notes: it.item_notes
        }))
      };

      const res = await api.post('/api/swm/stock-adjustments', payload);
      if (res.data.success) {
        message.success(
          targetStatus === 'approved'
            ? `تم اعتماد سند التسوية #${res.data.data?.adjustment_number} وتحديث المخزون بنجاح!`
            : `تم حفظ مسودة سند التسوية #${res.data.data?.adjustment_number} بنجاح`
        );
        setCreateDrawerOpen(false);
        fetchVouchers(1);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل حفظ سند التسوية');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // View Voucher Details & Print Modal
  const handleViewVoucher = async (id) => {
    setViewLoading(true);
    setViewModalOpen(true);
    try {
      const res = await api.get(`/api/swm/stock-adjustments/${id}`);
      if (res.data.success) {
        setSelectedVoucher(res.data.data);
      }
    } catch (e) {
      message.error('فشل في تحميل بيانات السند');
      setViewModalOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  // Approve a Draft Voucher from list
  const handleApproveDraft = async (id) => {
    try {
      const res = await api.put(`/api/swm/stock-adjustments/${id}/approve`);
      if (res.data.success) {
        message.success('تم اعتماد وتطبيق سند التسوية في المخزون بنجاح');
        fetchVouchers(pagination.current);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل اعتماد السند');
    }
  };

  // Print Voucher
  const handleExecutePrintVoucher = () => {
    if (printAreaRef.current) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>سند تسوية مخزنية ${selectedVoucher?.adjustment_number}</title>
            <style>
              body { font-family: sans-serif; padding: 25px; direction: rtl; font-size: 13px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #94a3b8; padding: 8px 10px; text-align: right; }
              th { background: #f1f5f9; font-weight: bold; }
              .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
              .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 15px; }
              .deficit { color: #dc2626; font-weight: bold; }
              .surplus { color: #16a34a; font-weight: bold; }
              .signatures { margin-top: 45px; display: flex; justify-content: space-between; }
              .sign-box { width: 28%; text-align: center; border-top: 1px solid #475569; padding-top: 8px; font-weight: bold; }
              @media print {
                @page { size: A4; margin: 12mm; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printAreaRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Columns for Vouchers Table
  const voucherColumns = [
    {
      title: 'رقم السند',
      dataIndex: 'adjustment_number',
      key: 'adjustment_number',
      width: 150,
      render: (num) => (
        <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>
          {num}
        </Tag>
      )
    },
    {
      title: 'الفرع / المستودع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      width: 160,
      render: (name, r) => (
        <div>
          <Tag color="purple" style={{ fontWeight: 600 }}>
            <ShopOutlined /> {name}
          </Tag>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.branch_code}</div>
        </div>
      )
    },
    {
      title: 'التاريخ',
      dataIndex: 'adjustment_date',
      key: 'adjustment_date',
      width: 120,
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'سبب التسوية',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason, r) => (
        <div>
          <Text strong>{reason}</Text>
          {r.notes && <div style={{ fontSize: 11, color: '#64748b' }}>{r.notes}</div>}
        </div>
      )
    },
    {
      title: 'عدد الأصناف',
      dataIndex: 'total_items',
      key: 'total_items',
      width: 100,
      align: 'center',
      render: (cnt) => <Tag color="blue">{cnt} صنف</Tag>
    },
    {
      title: 'العجز والزيادة',
      key: 'variances',
      width: 170,
      render: (_, r) => (
        <Space size="small">
          {parseInt(r.total_deficit_qty || 0, 10) > 0 && (
            <Tag color="red">عجز: -{r.total_deficit_qty}</Tag>
          )}
          {parseInt(r.total_surplus_qty || 0, 10) > 0 && (
            <Tag color="green">زيادة: +{r.total_surplus_qty}</Tag>
          )}
          {parseInt(r.total_deficit_qty || 0, 10) === 0 && parseInt(r.total_surplus_qty || 0, 10) === 0 && (
            <Tag color="default">لا توجد فروق</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'صافي الأثر المالي',
      dataIndex: 'total_variance_cost',
      key: 'total_variance_cost',
      width: 140,
      align: 'right',
      render: (val) => {
        const n = parseFloat(val || 0);
        return (
          <Text strong style={{ color: n < 0 ? '#dc2626' : (n > 0 ? '#16a34a' : '#475569'), fontSize: 14 }}>
            {n > 0 ? '+' : ''}{n.toLocaleString()} ج.م
          </Text>
        );
      }
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (st) => {
        if (st === 'approved') return <Tag color="green"><CheckCircleOutlined /> معتمد ومطبق</Tag>;
        if (st === 'draft') return <Tag color="orange"><ExclamationCircleOutlined /> مسودة مؤقتة</Tag>;
        return <Tag color="default">{st}</Tag>;
      }
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 140,
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewVoucher(r.id)}
          >
            عرض
          </Button>
          {r.status === 'draft' && (
            <Popconfirm
              title="اعتماد سند التسوية"
              description="هل أنت متأكد من اعتماد السند وتطبيق الفروقات على أرصدة المخزون فورياً؟"
              onConfirm={() => handleApproveDraft(r.id)}
              okText="نعم، اعتماد"
              cancelText="إلغاء"
            >
              <Button size="small" type="primary" style={{ backgroundColor: '#16a34a' }}>
                اعتماد
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // Columns for the comparison grid inside Create Drawer
  const drawerItemColumns = [
    {
      title: 'الصنف / الكود',
      key: 'prod',
      width: 220,
      render: (_, r) => (
        <div>
          <Text strong>{r.product_name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {r.variant_sku || r.product_code}
          </div>
          {r.category_name && (
            <Tag color="purple" style={{ fontSize: 10, marginTop: 2 }}>{r.category_name}</Tag>
          )}
        </div>
      )
    },
    {
      title: 'المقاس واللون',
      key: 'attrs',
      width: 120,
      render: (_, r) => (
        <Space size="small" wrap>
          {r.color && <Tag color="blue">{r.color}</Tag>}
          {r.size && <Tag color="cyan">{r.size}</Tag>}
          {!r.color && !r.size && <Text type="secondary">—</Text>}
        </Space>
      )
    },
    {
      title: 'الرصيد بالنظام',
      dataIndex: 'system_qty',
      key: 'system_qty',
      width: 100,
      align: 'center',
      render: (qty) => <Tag color="geekblue" style={{ fontWeight: 700 }}>{qty}</Tag>
    },
    {
      title: 'الرصيد الفعلي (المحصي)',
      key: 'actual_qty',
      width: 130,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.actual_qty}
          onChange={(val) => handleUpdateItemActual(r.key, val)}
          style={{ width: '100%', borderColor: r.variance_qty !== 0 ? '#f59e0b' : undefined }}
        />
      )
    },
    {
      title: 'الفارق المحسوب',
      key: 'variance',
      width: 120,
      align: 'center',
      render: (_, r) => {
        const diff = r.variance_qty;
        if (diff < 0) {
          return <Tag color="red" style={{ fontWeight: 800 }}>عجز ({diff})</Tag>;
        } else if (diff > 0) {
          return <Tag color="green" style={{ fontWeight: 800 }}>زيادة (+{diff})</Tag>;
        }
        return <Tag color="blue">متطابق (0)</Tag>;
      }
    },
    {
      title: 'التكلفة والأثر المالي',
      key: 'cost',
      width: 130,
      align: 'right',
      render: (_, r) => {
        const cost = r.variance_cost;
        return (
          <div>
            <Text strong style={{ color: cost < 0 ? '#dc2626' : (cost > 0 ? '#16a34a' : '#475569') }}>
              {cost > 0 ? '+' : ''}{cost.toLocaleString()} ج.م
            </Text>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>سعر التكلفة: {r.unit_cost} ج.م</div>
          </div>
        );
      }
    },
    {
      title: 'ملاحظة',
      key: 'note',
      width: 140,
      render: (_, r) => (
        <Input
          placeholder="سبب الفارق..."
          size="small"
          value={r.item_notes}
          onChange={(e) => handleUpdateItemNote(r.key, e.target.value)}
        />
      )
    },
    {
      title: '',
      key: 'del',
      width: 50,
      render: (_, r) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(r.key)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>
            <DiffOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            سند التسوية (Stock Reconciliation & Adjustments)
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            مقارنة الرصيد المسجل في النظام مع الرصيد الفعلي، وإظهار الفروق (عجز / زيادة)، واعتماد التسويات المخزنية والمالية
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => fetchVouchers(pagination.current)}>
            تحديث
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateDrawer}
            style={{ backgroundColor: '#4f46e5' }}
          >
            إنشاء سند تسوية جديد
          </Button>
        </Space>
      </div>

      {/* 2. Filters Card */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={7}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <ShopOutlined /> الفرع:
            </Text>
            {isRetailBranch ? (
              <div style={{ display: 'flex', alignItems: 'center', height: 32 }}>
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
                  <ShopOutlined style={{ marginLeft: 4 }} />
                  {currentUser?.branchName || 'فرع التجزئة الحالي'}
                </Tag>
              </div>
            ) : (
              <Select
                style={{ width: '100%' }}
                value={filterBranch}
                onChange={(val) => setFilterBranch(val)}
              >
                <Option value="all">كافة الفروع والمستودعات</Option>
                {branchesList.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.branch_name} ({b.branch_code})
                  </Option>
                ))}
              </Select>
            )}
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              حالة السند:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
            >
              <Option value="all">كافة الحالات</Option>
              <Option value="approved">معتمد ومطبق في المخزون</Option>
              <Option value="draft">مسودة مؤقتة</Option>
            </Select>
          </Col>

          <Col xs={24} sm={24} lg={11}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              بحث برقم السند أو السبب:
            </Text>
            <Input.Search
              placeholder="ابحث برقم السند (ADJ-...) أو سبب التسوية..."
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={() => fetchVouchers(1)}
              enterButton={<SearchOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 3. Vouchers Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <FileDoneOutlined style={{ color: '#4f46e5' }} />
              <span>سجل سندات التسوية المخزنية السابقة</span>
              <Tag color="geekblue">{pagination.total} سند مسجل</Tag>
            </Space>
          </div>
        }
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={vouchers}
          columns={voucherColumns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (p) => fetchVouchers(p),
            showTotal: (total) => `إجمالي السندات: ${total}`
          }}
          size="middle"
        />
      </Card>

      {/* 4. Create New Adjustment Voucher Drawer */}
      <Drawer
        title="إنشاء سند تسوية مخزنية جديد ومقارنة الأرصدة"
        width={1050}
        placement="left"
        onClose={() => setCreateDrawerOpen(false)}
        open={createDrawerOpen}
        extra={
          <Space>
            <Button onClick={() => setCreateDrawerOpen(false)}>إلغاء</Button>
            {isRetailBranch ? (
              <Button
                type="primary"
                onClick={() => handleSubmitVoucher('draft')}
                loading={createSubmitting}
                style={{ backgroundColor: '#4f46e5' }}
              >
                حفظ مسودة السند للإدارة
              </Button>
            ) : (
              <>
                <Button
                  type="dashed"
                  onClick={() => handleSubmitVoucher('draft')}
                  loading={createSubmitting}
                >
                  حفظ كمسودة
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleSubmitVoucher('approved')}
                  loading={createSubmitting}
                  style={{ backgroundColor: '#16a34a' }}
                >
                  اعتماد وتنفيذ التسوية فوراً بالمخزون
                </Button>
              </>
            )}
          </Space>
        }
      >
        <div>
          {isRetailBranch && (
            <Alert
              type="info"
              showIcon
              message="سيتم حفظ السند كمسودة مؤقتة لمراجعته واعتماده من مدير المستودع الرئيسي."
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {/* Header Controls */}
          <Card style={{ marginBottom: 16, backgroundColor: '#f8fafc' }} size="small">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  الفرع أو المستودع المراد تسويته:
                </Text>
                {isRetailBranch ? (
                  <div style={{ display: 'flex', alignItems: 'center', height: 32 }}>
                    <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
                      <ShopOutlined style={{ marginLeft: 4 }} />
                      {currentUser?.branchName || 'فرع التجزئة الحالي'}
                    </Tag>
                  </div>
                ) : (
                  <Select
                    style={{ width: '100%' }}
                    value={selectedBranchId}
                    onChange={(val) => {
                      setSelectedBranchId(val);
                      setVoucherItems([]);
                    }}
                    disabled={voucherItems.length > 0}
                  >
                    {branchesList.map((b) => (
                      <Option key={b.id} value={b.id}>
                        {b.branch_name} ({b.branch_code})
                      </Option>
                    ))}
                  </Select>
                )}
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  سبب التسوية:
                </Text>
                <Select
                  style={{ width: '100%' }}
                  value={adjustmentReason}
                  onChange={(val) => setAdjustmentReason(val)}
                >
                  <Option value="جرد دوري ربع سنوي">جرد دوري ربع سنوي</Option>
                  <Option value="جرد سنوي شامل">جرد سنوي شامل</Option>
                  <Option value="تسوية عجز جرد">تسوية عجز جرد</Option>
                  <Option value="تسوية فائض بضاعة">تسوية فائض بضاعة</Option>
                  <Option value="تلفيات ومخزون هالك">تلفيات ومخزون هالك</Option>
                  <Option value="أخطاء إدخال نظام سابقة">أخطاء إدخال نظام سابقة</Option>
                </Select>
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  تاريخ التسوية:
                </Text>
                <Input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Col>

              <Col span={24}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  ملاحظات السند / محضر الجرد:
                </Text>
                <Input
                  placeholder="اكتب أية ملاحظات تفصيلية أو رقم محضر الجرد اليدوي..."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                />
              </Col>
            </Row>
          </Card>

          {/* Item Add & Load Control Toolbar */}
          <Card
            style={{ marginBottom: 14, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}
            styles={{ body: { padding: '14px 16px' } }}
          >
            <Row gutter={[16, 12]} align="middle">
              {/* Option B: Search & Add Single Item */}
              <Col xs={24} lg={12}>
                <Text strong style={{ display: 'block', marginBottom: 6, color: '#1e293b' }}>
                  <SearchOutlined style={{ color: '#4f46e5', marginLeft: 4 }} />
                  بحث وإضافة صنف فردي محدد:
                </Text>
                <Select
                  showSearch
                  allowClear
                  placeholder="ابحث بالاسم، كود الصنف، الباركود، أو SKU..."
                  style={{ width: '100%' }}
                  filterOption={false}
                  onSearch={handleSearchSingleItem}
                  onChange={(val, opt) => {
                    if (opt?.itemData) {
                      handleAddSingleItem(opt.itemData);
                    }
                  }}
                  value={null}
                  notFoundContent={
                    singleSearchLoading ? (
                      <div style={{ textAlign: 'center', padding: '10px' }}>
                        <Spin size="small" /> جارٍ البحث...
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '8px', color: '#94a3b8' }}>
                        اكتب حرفين أو أكثر للبحث في رصيد هذا الفرع
                      </div>
                    )
                  }
                >
                  {singleSearchResults.map((it) => (
                    <Option
                      key={`${it.product_id}-${it.variant_id || 'base'}`}
                      value={`${it.product_id}-${it.variant_id || 'base'}`}
                      itemData={it}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                        <div>
                          <Text strong>{it.product_name}</Text>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            <Tag color="geekblue" style={{ fontSize: 10, padding: '0 4px' }}>
                              {it.variant_sku || it.product_code}
                            </Tag>
                            {it.barcode && <span style={{ marginRight: 6 }}>باركود: {it.barcode}</span>}
                            {(it.color || it.size) && (
                              <span style={{ marginRight: 6 }}>
                                {[it.color, it.size].filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', minWidth: 90 }}>
                          <Tag
                            color={parseInt(it.system_qty || 0, 10) > 0 ? 'green' : 'red'}
                            style={{ fontWeight: 800 }}
                          >
                            رصيد: {it.system_qty || 0}
                          </Tag>
                          <div style={{ fontSize: 10, color: '#047857' }}>
                            {parseFloat(it.cost_price || 0).toLocaleString()} ج.م
                          </div>
                        </div>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Col>

              {/* Option A: Batch Load Buttons */}
              <Col xs={24} lg={12}>
                <Text strong style={{ display: 'block', marginBottom: 6, color: '#1e293b' }}>
                  <DiffOutlined style={{ color: '#0284c7', marginLeft: 4 }} />
                  تحميل أصناف الفرع دفعة واحدة:
                </Text>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleLoadBranchItems(true)}
                    loading={loadingBranchItems}
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    إضافة الأصناف المتاح منها رصيد (&gt; 0)
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleLoadBranchItems(false)}
                    loading={loadingBranchItems}
                  >
                    تحميل كافة الأصناف (شامل)
                  </Button>
                  {voucherItems.length > 0 && (
                    <Button danger onClick={() => setVoucherItems([])}>
                      تفريغ القائمة
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Items Counter Bar */}
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              جدول مقارنة الأرصدة واحتساب الفروقات (عجز / زيادة):
            </Text>
            <div>
              <Tag color="purple" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
                المعروض: {voucherItems.length} صنف | منها ({itemsWithVariances.length}) صنف به فروق
              </Tag>
            </div>
          </div>

          {/* Comparison Table */}
          <Table
            size="small"
            dataSource={voucherItems}
            columns={drawerItemColumns}
            rowKey="key"
            pagination={{ pageSize: 50 }}
            scroll={{ y: 380 }}
            locale={{ emptyText: 'لم تتم إضافة أية أصناف بعد. ابحث عن صنف لإضافته، أو انقر على "إضافة الأصناف المتاح منها رصيد"' }}
          />

          {/* Summary Financial Bar */}
          <Card
            style={{
              marginTop: 16,
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Row gutter={[16, 8]} align="middle">
              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text strong style={{ color: '#475569', fontSize: 12 }}>إجمالي الأصناف المسواة</Text>}
                  value={voucherItems.length}
                  suffix="صنف"
                  valueStyle={{ fontSize: 18, fontWeight: 700 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text strong style={{ color: '#dc2626', fontSize: 12 }}>إجمالي قطع العجز (-)</Text>}
                  value={totalDeficitQty}
                  prefix={<ArrowDownOutlined style={{ color: '#dc2626' }} />}
                  suffix="قطعة"
                  valueStyle={{ color: '#dc2626', fontSize: 18, fontWeight: 700 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text strong style={{ color: '#16a34a', fontSize: 12 }}>إجمالي قطع الزيادة (+)</Text>}
                  value={totalSurplusQty}
                  prefix={<ArrowUpOutlined style={{ color: '#16a34a' }} />}
                  suffix="قطعة"
                  valueStyle={{ color: '#16a34a', fontSize: 18, fontWeight: 700 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text strong style={{ color: '#0f172a', fontSize: 12 }}>صافي الأثر المالي للتسوية</Text>}
                  value={totalVarianceCost}
                  precision={2}
                  suffix="ج.م"
                  valueStyle={{
                    color: totalVarianceCost < 0 ? '#dc2626' : (totalVarianceCost > 0 ? '#16a34a' : '#1e293b'),
                    fontSize: 18,
                    fontWeight: 800
                  }}
                />
              </Col>
            </Row>
          </Card>
        </div>
      </Drawer>

      {/* 5. View & Print Voucher Modal */}
      <Modal
        title={
          <Space>
            <DiffOutlined style={{ color: '#4f46e5' }} />
            <span>سند تسوية مخزنية: {selectedVoucher?.adjustment_number}</span>
          </Space>
        }
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            إغلاق
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleExecutePrintVoucher}
            style={{ backgroundColor: '#16a34a' }}
          >
            طباعة السند الرسمي (A4)
          </Button>
        ]}
      >
        {viewLoading || !selectedVoucher ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div ref={printAreaRef} style={{ padding: '10px' }}>
            {/* Voucher Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a' }}>Yoka Store — سند تسوية مخزنية معتمد</h2>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                    الفرع / المستودع: <strong>{selectedVoucher.branch_name} ({selectedVoucher.branch_code})</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: 12, color: '#475569' }}>
                  <div>رقم السند: <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>{selectedVoucher.adjustment_number}</strong></div>
                  <div>التاريخ: <strong>{dayjs(selectedVoucher.adjustment_date).format('YYYY-MM-DD')}</strong></div>
                  <div>الحالة: <strong style={{ color: selectedVoucher.status === 'approved' ? '#16a34a' : '#d97706' }}>
                    {selectedVoucher.status === 'approved' ? 'معتمد ومطبق' : 'مسودة'}
                  </strong></div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13 }}>
                سبب التسوية: <strong>{selectedVoucher.reason}</strong>
                {selectedVoucher.notes && <span style={{ marginRight: 16 }}>• الملاحظات: {selectedVoucher.notes}</span>}
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '130px' }}>كود الصنف</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px' }}>اسم المنتج / الصنف</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '90px' }}>المقاس / اللون</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '80px', textAlign: 'center' }}>رصيد النظام</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '80px', textAlign: 'center' }}>الرصيد الفعلي</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '80px', textAlign: 'center' }}>الفارق</th>
                  <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '90px', textAlign: 'right' }}>الأثر المالي</th>
                </tr>
              </thead>
              <tbody>
                {(selectedVoucher.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontFamily: 'monospace' }}>
                      {it.variant_sku || it.product_code}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 'bold' }}>
                      {it.product_name}
                      {it.item_notes && <div style={{ fontSize: 10, color: '#64748b' }}>{it.item_notes}</div>}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                      {[it.size, it.color].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>
                      {it.system_qty}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                      {it.actual_qty}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                      <span style={{ color: it.variance_qty < 0 ? '#dc2626' : (it.variance_qty > 0 ? '#16a34a' : '#475569') }}>
                        {it.variance_qty > 0 ? '+' : ''}{it.variance_qty}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      <span style={{ color: parseFloat(it.variance_cost || 0) < 0 ? '#dc2626' : (parseFloat(it.variance_cost || 0) > 0 ? '#16a34a' : '#475569') }}>
                        {parseFloat(it.variance_cost || 0) > 0 ? '+' : ''}{parseFloat(it.variance_cost || 0).toLocaleString()} ج.م
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <Row justify="space-between">
                <Col span={6}>إجمالي الأصناف: <strong>{selectedVoucher.total_items} صنف</strong></Col>
                <Col span={6}>إجمالي العجز: <strong style={{ color: '#dc2626' }}>-{selectedVoucher.total_deficit_qty} قطعة</strong></Col>
                <Col span={6}>إجمالي الزيادة: <strong style={{ color: '#16a34a' }}>+{selectedVoucher.total_surplus_qty} قطعة</strong></Col>
                <Col span={6} style={{ textAlign: 'left' }}>
                  صافي الأثر المالي: <strong style={{ fontSize: 15, color: parseFloat(selectedVoucher.total_variance_cost || 0) < 0 ? '#dc2626' : '#16a34a' }}>
                    {parseFloat(selectedVoucher.total_variance_cost || 0) > 0 ? '+' : ''}{parseFloat(selectedVoucher.total_variance_cost || 0).toLocaleString()} ج.م
                  </strong>
                </Col>
              </Row>
            </div>

            {/* Printable Signatures */}
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                <div>منشئ السند / أمين المخزن</div>
                <div style={{ marginTop: '6px', fontSize: 12, color: '#475569' }}>{selectedVoucher.created_by_name || 'أمين العهدة'}</div>
                <div style={{ marginTop: '16px', color: '#94a3b8' }}>..........................................</div>
              </div>
              <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                <div>المراجع / المحاسب المالي</div>
                <div style={{ marginTop: '6px', fontSize: 12, color: '#475569' }}>المراجعة والتدقيق</div>
                <div style={{ marginTop: '16px', color: '#94a3b8' }}>..........................................</div>
              </div>
              <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                <div>اعتماد مدير المستودع الرئيسي</div>
                <div style={{ marginTop: '6px', fontSize: 12, color: '#475569' }}>{selectedVoucher.approved_by_name || 'مدير المستودع'}</div>
                <div style={{ marginTop: '16px', color: '#94a3b8' }}>..........................................</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
