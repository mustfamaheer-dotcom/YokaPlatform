import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { printHtmlContent } from '../utils/printUtils';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  Input,
  InputNumber,
  Tag,
  Typography,
  Space,
  Statistic,
  Badge,
  Tooltip,
  message,
  Divider,
  Modal,
  Spin,
  Alert,
  Tabs,
  Radio
} from 'antd';
import {
  FileSearchOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  AppstoreOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DiffOutlined,
  BarcodeOutlined,
  FilterOutlined,
  StopOutlined,
  BarsOutlined,
  InfoCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function StockAudit({ onNavigateToAdjustments, currentUser }) {
  const navigate = useNavigate();
  const isRetailBranch = Boolean(
    currentUser &&
    (currentUser.branchType === 'retail_branch' || currentUser.isBranchAccount) &&
    !['super_admin', 'admin'].includes(currentUser.role)
  );

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // Review & Inspect Item Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewedItem, setReviewedItem] = useState(null);

  const handleViewItemReview = (item) => {
    setReviewedItem(item);
    setReviewModalVisible(true);
  };

  const [kpi, setKpi] = useState({
    totalItems: 0,
    totalUnits: 0,
    totalStockValue: 0,
    inStockCount: 0,
    outOfStockCount: 0,
    lowStockCount: 0
  });

  // Lookups
  const [branchesList, setBranchesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // Active Tab View: 'in_stock' | 'zero_stock' | 'all'
  const [activeTab, setActiveTab] = useState('in_stock');

  // Filters
  const [selectedBranch, setSelectedBranch] = useState(
    currentUser?.branchId ? String(currentUser.branchId) : 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  // Local state for modified actual inventory count rows: { [rowKey]: { ... } }
  const [modifiedRows, setModifiedRows] = useState({});
  const [submittingReconciliation, setSubmittingReconciliation] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Print modal
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printScope, setPrintScope] = useState('in_stock'); // 'in_stock' | 'zero_stock' | 'all'
  const [exportLoading, setExportLoading] = useState(false);
  const [exportAllItems, setExportAllItems] = useState([]);
  const printAreaRef = useRef(null);

  // Fetch Branches from GET /api/swm/branches
  const fetchBranches = async () => {
    setBranchesLoading(true);
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setBranchesList(res.data.data);
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
      message.error('فشل في تحميل قائمة الفروع');
    } finally {
      setBranchesLoading(false);
    }
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/swm/categories');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setCategoriesList(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  // Fetch Stocktaking Sheet Data with branch_id query parameter
  const fetchData = async (page = 1, currentTab = activeTab, branchOverride = selectedBranch) => {
    setLoading(true);
    try {
      let mappedStatus = 'all';
      if (currentTab === 'in_stock') mappedStatus = 'in_stock';
      else if (currentTab === 'zero_stock') mappedStatus = 'out_of_stock';
      else if (currentTab === 'all') mappedStatus = 'all';

      const branchParam =
        branchOverride !== 'all' && branchOverride !== undefined && branchOverride !== null && branchOverride !== ''
          ? branchOverride
          : undefined;

      const params = {
        branch_id: branchParam,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        status_filter: mappedStatus,
        search: searchKeyword.trim() || undefined,
        page,
        limit: 5000
      };

      const res = await api.get('/api/swm/stock-audit', { params });
      if (res.data.success) {
        setItems(res.data.data?.items || []);
        setKpi(res.data.data?.kpi || {});
        setPagination(prev => ({
          ...prev,
          current: res.data.data?.pagination?.page || 1,
          total: res.data.data?.pagination?.total || 0
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل كشف الجرد المجمع');
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches and lookups on mount
  useEffect(() => {
    fetchBranches();
    fetchCategories();
  }, []);

  // Re-fetch when category or tab changes
  useEffect(() => {
    fetchData(1, activeTab, selectedBranch);
  }, [selectedCategory, activeTab]);

  // Handle Branch Selector onChange: updates state and immediately triggers re-fetch with branch_id
  const handleBranchChange = (branchId) => {
    const val = String(branchId);
    setSelectedBranch(val);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchData(1, activeTab, val);
  };

  // Branch Options List
  const branchOptions = useMemo(() => [
    { value: 'all', label: '🌐 جميع الفروع والمخازن' },
    ...branchesList.map((branch) => ({
      value: String(branch.id),
      label: `${branch.branch_name} (${branch.branch_code || branch.id})`
    }))
  ], [branchesList]);

  // Handle Search Input Submit
  const handleSearchSubmit = () => {
    fetchData(1, activeTab, selectedBranch);
  };

  // Update physical actual count for a specific row
  const handleActualQtyChange = (record, newVal) => {
    const rowKey = `${record.product_id}-${record.variant_id || 'base'}-${record.branch_id || selectedBranch}`;
    setModifiedRows(prev => {
      const next = { ...prev };
      if (newVal === null || newVal === undefined || newVal === '') {
        delete next[rowKey];
      } else {
        const parsedQty = Math.max(0, parseInt(newVal, 10) || 0);
        const sysQty = parseInt(record.system_qty || 0, 10);
        next[rowKey] = {
          key: rowKey,
          branch_id: record.branch_id || (selectedBranch !== 'all' ? selectedBranch : (branchesList[0]?.id || 1)),
          product_id: record.product_id,
          variant_id: record.variant_id || null,
          product_name: record.product_name,
          variant_sku: record.variant_sku || record.product_code,
          system_qty: sysQty,
          actual_qty: parsedQty,
          variance: parsedQty - sysQty
        };
      }
      return next;
    });
  };

  // Submit Reconciliation Action: POST /api/swm/inventory-counts/submit
  const onSubmitReconciliation = async () => {
    const modifiedList = Object.values(modifiedRows);

    if (modifiedList.length === 0) {
      return message.warning('لم تقم بتعديل الرصيد الفعلي لأي صنف بعد لاعتماد جرد التسوية');
    }

    let targetBranchId = selectedBranch !== 'all' ? parseInt(selectedBranch, 10) : null;
    if (!targetBranchId && modifiedList[0]?.branch_id) {
      targetBranchId = parseInt(modifiedList[0].branch_id, 10);
    }
    if (!targetBranchId && branchesList.length > 0) {
      targetBranchId = branchesList[0].id;
    }

    if (!targetBranchId) {
      return message.error('يرجى اختيار الفرع المستهدف لإتمام اعتماد جرد التسوية');
    }

    const payload = {
      branch_id: targetBranchId,
      items: modifiedList.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        system_qty: item.system_qty,
        actual_qty: item.actual_qty,
        notes: item.variance !== 0 ? `فارق تسوية (${item.variance > 0 ? '+' : ''}${item.variance})` : 'جرد مطابق'
      }))
    };

    setSubmittingReconciliation(true);
    try {
      const res = await api.post('/api/swm/inventory-counts/submit', payload);
      if (res.data?.success) {
        message.success(res.data.message || `تم اعتماد جرد التسوية بعدد ${modifiedList.length} صنف بنجاح!`);
        setModifiedRows({});
        fetchData(pagination.current, activeTab, selectedBranch);
      } else {
        message.error(res.data?.message || 'فشل في حفظ واعتماد جرد التسوية');
      }
    } catch (err) {
      console.error('Submit reconciliation error:', err);
      message.error(err.response?.data?.message || 'حدث خطأ أثناء اعتماد جرد التسوية');
    } finally {
      setSubmittingReconciliation(false);
    }
  };

  // Open Printable Stock Audit Sheet Modal (fetches all items for printing)
  const handleOpenPrintModal = async () => {
    setPrintScope(activeTab);
    setExportLoading(true);
    setPrintModalVisible(true);
    try {
      const params = {
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        status_filter: 'all',
        search: searchKeyword.trim() || undefined,
        limit: 'all'
      };
      const res = await api.get('/api/swm/stock-audit', { params });
      if (res.data.success) {
        setExportAllItems(res.data.data?.items || []);
      }
    } catch (e) {
      message.error('فشل في تجهيز كشف الجرد للطباعة');
    } finally {
      setExportLoading(false);
    }
  };

  // Filtered items for printable sheet based on chosen printScope
  const printableItems = useMemo(() => {
    if (printScope === 'in_stock') {
      return exportAllItems.filter(i => parseInt(i.system_qty || 0, 10) > 0);
    }
    if (printScope === 'zero_stock') {
      return exportAllItems.filter(i => parseInt(i.system_qty || 0, 10) <= 0);
    }
    return exportAllItems;
  }, [exportAllItems, printScope]);

  // Execute browser printing of the A4 Stocktaking Sheet
  const handleExecutePrint = () => {
    if (printAreaRef.current) {
      printHtmlContent({
        title: `كشف الجرد الفعلي الميداني - ${currentBranchObj ? currentBranchObj.branch_name : 'الكل'}`,
        htmlContent: printAreaRef.current.innerHTML,
        pageType: 'a4-landscape'
      });
    }
  };

  // Selected Branch Object
  const currentBranchObj = branchesList.find(b => b.id === parseInt(selectedBranch, 10));

  // Table Columns Definition
  const columns = [
    {
      title: 'كود الصنف / الباركود',
      key: 'code',
      width: 160,
      render: (_, r) => (
        <div>
          <Tag color="geekblue" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
            {r.variant_sku || r.product_code}
          </Tag>
          {r.barcode && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              <BarcodeOutlined /> {r.barcode}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'اسم الصنف والمجموعة',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{r.product_name}</Text>
          <div style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>
            <AppstoreOutlined /> {r.category_name || 'بدون مجموعة'}
            {r.brand && <span style={{ marginRight: 8, color: '#64748b' }}>• الماركة: {r.brand}</span>}
          </div>
        </div>
      )
    },
    {
      title: 'المقاس واللون',
      key: 'attributes',
      width: 140,
      render: (_, r) => (
        <Space size="small" wrap>
          {r.color && <Tag color="blue">{r.color}</Tag>}
          {r.size && <Tag color="cyan">{r.size}</Tag>}
          {!r.color && !r.size && <Text type="secondary">—</Text>}
        </Space>
      )
    },
    {
      title: 'الفرع / المستودع',
      key: 'branch',
      width: 150,
      render: (_, r) => (
        <Tag color="purple" style={{ fontWeight: 600 }}>
          <ShopOutlined /> {r.branch_name || currentBranchObj?.branch_name || 'المستودع الرئيسي'}
        </Tag>
      )
    },
    {
      title: 'سعر التكلفة',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 120,
      align: 'right',
      render: (c) => `${parseFloat(c || 0).toLocaleString()} ج.م`
    },
    {
      title: 'الرصيد الدفتري (النظام)',
      dataIndex: 'system_qty',
      key: 'system_qty',
      width: 130,
      align: 'center',
      render: (qty) => {
        const n = parseInt(qty || 0, 10);
        return (
          <Tag color={n > 0 ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 800, padding: '2px 10px' }}>
            {n} قطعة
          </Tag>
        );
      }
    },
    {
      title: 'إجمالي القيمة التقديرية',
      key: 'stock_val',
      width: 140,
      align: 'right',
      render: (_, r) => {
        const val = parseInt(r.system_qty || 0, 10) * parseFloat(r.cost_price || 0);
        return <Text strong style={{ color: '#0f766e' }}>{val.toLocaleString()} ج.م</Text>;
      }
    },
    {
      title: 'الرصيد الفعلي (المحصى)',
      key: 'actual_count_input',
      width: 140,
      align: 'center',
      render: (_, r) => {
        const rowKey = `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || selectedBranch}`;
        const item = modifiedRows[rowKey];
        const currentVal = item !== undefined ? item.actual_qty : undefined;

        return (
          <InputNumber
            min={0}
            placeholder="أدخل الفعلي..."
            value={currentVal}
            onChange={(val) => handleActualQtyChange(r, val)}
            style={{
              width: '100%',
              borderRadius: 6,
              borderColor: currentVal !== undefined ? '#4f46e5' : undefined,
              boxShadow: currentVal !== undefined ? '0 0 0 2px rgba(79, 70, 229, 0.12)' : undefined
            }}
          />
        );
      }
    },
    {
      title: 'الفارق (عجز / زيادة)',
      key: 'variance',
      width: 140,
      align: 'center',
      render: (_, r) => {
        const rowKey = `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || selectedBranch}`;
        const item = modifiedRows[rowKey];

        if (!item || item.actual_qty === undefined || item.actual_qty === null) {
          return <span style={{ color: '#9ca3af' }}>—</span>;
        }

        const variance = item.variance;

        if (variance < 0) {
          return (
            <span
              className="text-red-500 font-bold"
              style={{
                color: '#ef4444',
                fontWeight: 700,
                backgroundColor: '#fef2f2',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #fecaca',
                display: 'inline-block'
              }}
            >
              عجز ({variance})
            </span>
          );
        } else if (variance > 0) {
          return (
            <span
              className="text-green-500 font-bold"
              style={{
                color: '#22c55e',
                fontWeight: 700,
                backgroundColor: '#f0fdf4',
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #bbf7d0',
                display: 'inline-block'
              }}
            >
              زيادة (+{variance})
            </span>
          );
        }

        return (
          <span
            style={{
              color: '#6b7280',
              fontWeight: 600,
              backgroundColor: '#f3f4f6',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              display: 'inline-block'
            }}
          >
            متطابق (0)
          </span>
        );
      }
    },
    {
      title: 'معاينة',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, r) => (
        <Tooltip title="معاينة وتدقيق بطاقة الصنف">
          <Button
            type="text"
            size="middle"
            icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 16 }} />}
            onClick={() => handleViewItemReview(r)}
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Standardized Header and Page Title */}
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
          <h2>
            <FileSearchOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            الجرد الفعلي وسندات التسوية (Stock Audit & Reconciliation)
          </h2>
          <p>استعراض الأرصدة، تسجيل الجرد الفعلي الميداني، ومطابقة الفروقات واعتماد سندات التسوية فورياً</p>
        </div>

        <div className="swm-page-actions">
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => fetchData(pagination.current)} style={{ height: 44, borderRadius: 8 }}>
            تحديث الأرصدة
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleOpenPrintModal}
            className="btn-print"
            style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', height: 44, borderRadius: 8, fontWeight: 700 }}
          >
            طباعة كشف الجرد الميداني (A4)
          </Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={onSubmitReconciliation}
            loading={submittingReconciliation}
            style={{
              backgroundColor: '#16a34a',
              borderColor: '#16a34a',
              fontWeight: 700,
              height: 44,
              borderRadius: 8,
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
            }}
          >
            اعتماد جرد التسوية {Object.keys(modifiedRows).length > 0 && `(${Object.keys(modifiedRows).length})`}
          </Button>
        </div>
      </div>

      {/* 2. Control & Filter Card */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Branch Filter */}
          <Col xs={24} sm={12} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <ShopOutlined /> الفرع المستهدف:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={String(selectedBranch || 'all')}
              onChange={handleBranchChange}
              placeholder="اختر الفرع المستهدف..."
              loading={branchesLoading}
              showSearch
              optionFilterProp="label"
              options={branchOptions}
            />
          </Col>

          {/* Category Filter */}
          <Col xs={24} sm={12} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <AppstoreOutlined /> المجموعة / التصنيف:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
            >
              <Option value="all">كافة المجموعات</Option>
              {categoriesList.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.category_name}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Keyword Search */}
          <Col xs={24} sm={24} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              بحث بالصنف أو الكود:
            </Text>
            <Input.Search
              placeholder="ابحث بالاسم، الكود، الباركود..."
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={handleSearchSubmit}
              enterButton={<SearchOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 3. Valuation & Summary KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#475569' }}>📦 إجمالي الأصناف المسجلة</Text>}
              value={kpi.totalItems}
              suffix="صنف"
              valueStyle={{ color: '#1e293b', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
              تشمل كافة الأصناف ضمن النطاق
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#047857' }}>📊 إجمالي عدد القطع المتوفرة</Text>}
              value={kpi.totalUnits}
              suffix="قطعة"
              valueStyle={{ color: '#065f46', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#047857' }}>
              المخزون الدفتري الفعلي في الأرصدة
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#1d4ed8' }}>💰 إجمالي تقييم المخزون بالتكلفة</Text>}
              value={kpi.totalStockValue}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#1e40af', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#1d4ed8' }}>
              القيمة المالية بسعر تكلفة الشراء
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ borderRadius: 12, backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
          >
            <Statistic
              title={<Text strong style={{ color: '#c2410c' }}>⚠️ أصناف رصيدها صفري (= 0)</Text>}
              value={kpi.outOfStockCount}
              suffix="صنف"
              valueStyle={{ color: '#9a3412', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: '#c2410c' }}>
              تم عزلها في قائمة مستقلة لحصرها
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Stocktaking Master Table with Partitioned Tabs */}
      <Card
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: '16px 20px 20px 20px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPagination(prev => ({ ...prev, current: 1 }));
          }}
          size="large"
          style={{ marginBottom: 12 }}
          items={[
            {
              key: 'in_stock',
              label: (
                <Space>
                  <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>أصناف ذات رصيد متوفر (الرصيد الدفتري &gt; 0)</span>
                  <Tag color="success" style={{ borderRadius: 12, marginRight: 6, fontWeight: 800 }}>
                    {kpi.inStockCount || 0} صنف
                  </Tag>
                </Space>
              )
            },
            {
              key: 'zero_stock',
              label: (
                <Space>
                  <StopOutlined style={{ color: '#dc2626', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>أصناف منعدمة الرصيد (الرصيد الدفتري = 0)</span>
                  <Tag color="error" style={{ borderRadius: 12, marginRight: 6, fontWeight: 800 }}>
                    {kpi.outOfStockCount || 0} صنف
                  </Tag>
                </Space>
              )
            },
            {
              key: 'all',
              label: (
                <Space>
                  <BarsOutlined style={{ color: '#6366f1', fontSize: 16 }} />
                  <span style={{ fontWeight: 700 }}>كافة الأصناف (شامل)</span>
                  <Tag color="blue" style={{ borderRadius: 12, marginRight: 6, fontWeight: 800 }}>
                    {kpi.totalItems || 0} صنف
                  </Tag>
                </Space>
              )
            }
          ]}
        />

        {/* Informative Alert per tab */}
        {activeTab === 'in_stock' && (
          <Alert
            type="success"
            showIcon
            message="كشف الأصناف ذات الأرصدة المتوفرة (> 0)"
            description="يعرض فقط المنتجات والمقاسات والألوان المسجل لها كميات مخزنية فعلية في النظام (> 0)، وهي القائمة الأساسية المعتمدة للجرد الدوري والمطابقة الميدانية."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {activeTab === 'zero_stock' && (
          <Alert
            type="warning"
            showIcon
            message="قائمة الأصناف منعدمة الرصيد الدفتري (رصيد النظام = 0)"
            description="تم تجميع كافة الأصناف التي لا يتوفر لها رصيد دفتري مسجل في النظام في هذه القائمة المنفصلة لتجنب إرباك لجان الجرد الميداني. في حال العثور على أي كميات فعلية على الرفوف لهذه الأصناف أثناء الجرد، قم بتدوين الرصيد الفعلي هنا لحساب الفائض وإنشاء سند تسوية بالزيادة."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {activeTab === 'all' && (
          <Alert
            type="info"
            showIcon
            message="كشف شامل لكافة الأصناف المسجلة"
            description="يشمل جميع الأصناف سواء المتوفرة برصيد أو منعدمة الرصيد في مستودعات وفروع الشركة."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {/* Pending Reconciliation Modifications Alert */}
        {Object.keys(modifiedRows).length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span>
                  تم تعديل الرصيد الفعلي لـ <strong style={{ color: '#15803d' }}>{Object.keys(modifiedRows).length}</strong> صنف جاهزة للاعتماد والمطابقة.
                </span>
                <Space>
                  <Button size="small" onClick={() => setModifiedRows({})}>
                    إلغاء التعديلات
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={onSubmitReconciliation}
                    loading={submittingReconciliation}
                    style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 700 }}
                  >
                    اعتماد جرد التسوية الآن ({Object.keys(modifiedRows).length})
                  </Button>
                </Space>
              </div>
            }
            style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #86efac', backgroundColor: '#f0fdf4' }}
          />
        )}

        <Table
          dataSource={items}
          columns={columns}
          rowKey={(r) => `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || '0'}`}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 5. Printable Physical Stock Audit Sheet Modal (كشف الجرد الميداني A4) */}
      <Modal
        title={
          <Space>
            <PrinterOutlined style={{ color: '#0f766e' }} />
            <span>معاينة كشف الجرد الفعلي الميداني للطباعة</span>
          </Space>
        }
        open={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        width={950}
        footer={[
          <Button key="close" onClick={() => setPrintModalVisible(false)}>
            إلغاء
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleExecutePrint}
            className="btn-print"
            style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700 }}
            disabled={exportLoading || printableItems.length === 0}
          >
            بدء الطباعة الورقية (A4)
          </Button>
        ]}
      >
        {exportLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}>جارٍ تجهيز كافة الأصناف لكشف الجرد...</div>
          </div>
        ) : (
          <div>
            {/* Print Scope Selector */}
            <div style={{ marginBottom: 16, padding: '10px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Space>
                <Text strong>نطاق الكشف المراد طباعته:</Text>
                <Radio.Group value={printScope} onChange={(e) => setPrintScope(e.target.value)} buttonStyle="solid">
                  <Radio.Button value="in_stock">
                    <CheckCircleOutlined style={{ marginLeft: 4, color: '#16a34a' }} />
                    الأصناف المتوفرة فقط (&gt; 0)
                  </Radio.Button>
                  <Radio.Button value="zero_stock">
                    <StopOutlined style={{ marginLeft: 4, color: '#dc2626' }} />
                    الأصناف الصفرية فقط (= 0)
                  </Radio.Button>
                  <Radio.Button value="all">
                    <BarsOutlined style={{ marginLeft: 4, color: '#6366f1' }} />
                    كافة الأصناف (شامل)
                  </Radio.Button>
                </Radio.Group>
              </Space>
              <Tag color="geekblue" style={{ fontSize: 13, padding: '3px 10px' }}>
                عدد الأصناف في أمر الطباعة: {printableItems.length} صنف
              </Tag>
            </div>

            {/* Print Area Preview */}
            <div ref={printAreaRef} className="printable-sheet" style={{ padding: '4px', color: '#0f172a', direction: 'rtl' }}>
              {/* Header */}
              <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
                <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={yokaLogo} alt="Yoka Store" style={{ height: 46, maxWidth: 110, objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>شركة يوكا ستور (YOKA STORE)</h2>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>منظومة إدارة المخازن المركزية والفرعية • كشف الجرد الفعلي الميداني</div>
                  </div>
                </div>
                <div className="doc-badge-box" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 6 }}>
                    كشف الجرد الفعلي للمخزون (A4)
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11.5, color: '#334155', fontWeight: 600 }}>
                    تاريخ ووقت الكشف: {dayjs().format('YYYY-MM-DD HH:mm')}
                  </div>
                </div>
              </div>

              {/* Meta Card */}
              <div className="meta-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 14px' }}>
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>المستودع / الفرع المستهدف:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    {currentBranchObj ? `${currentBranchObj.branch_name} (${currentBranchObj.branch_code})` : 'كافة الفروع والمستودعات'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>نطاق الأصناف المطبوعة:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    {printScope === 'in_stock' ? 'الأصناف المتوفرة برصيد (> 0)' : printScope === 'zero_stock' ? 'الأصناف الصفرية (= 0)' : 'كشف شامل لكافة الأصناف'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>إجمالي بنود الجرد:</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{printableItems.length} صنف مسجل</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>تعليمات الجرد:</div>
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>كتابة العدد الفعلي بدقة بالقلم الجاف</div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#fff' }}>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '30px', textAlign: 'center' }}>م</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '130px', textAlign: 'center' }}>كود الصنف / الباركود</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px' }}>اسم الصنف والوصف</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '90px' }}>المجموعة</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '90px', textAlign: 'center' }}>المقاس / اللون</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '85px', textAlign: 'center' }}>رصيد الدفتر</th>
                    <th style={{ border: '1.5px solid #0f172a', padding: '6px 8px', width: '95px', textAlign: 'center', background: '#334155' }}>العدد الفعلي</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '110px' }}>ملاحظات الجرد</th>
                  </tr>
                </thead>
                <tbody>
                  {printableItems.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.variant_sku || item.product_code}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 600 }}>
                        {item.product_name}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', color: '#475569' }}>
                        {item.category_name || '—'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center' }}>
                        {[item.size, item.color].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>
                        {item.system_qty}
                      </td>
                      <td style={{ border: '1.5px solid #0f172a', padding: '5px 8px', textAlign: 'center', background: '#fff' }}>
                        <div style={{ height: '22px' }}></div>
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>
                      </td>
                    </tr>
                  ))}
                  {printableItems.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        لا توجد أصناف مطابقة لهذا النطاق المحدد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Printable Signatures */}
              <div className="signatures-grid" style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 14, borderTop: '1px dashed #94a3b8' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: 28, fontSize: 12 }}>أمين المخزن / الفرع المستهدف</div>
                  <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: 11, color: '#475569' }}>
                    التوقيع: .....................
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: 28, fontSize: 12 }}>عضو ومسؤول لجنة الجرد الميداني</div>
                  <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: 11, color: '#475569' }}>
                    التوقيع: .....................
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, marginBottom: 28, fontSize: 12 }}>اعتماد الإدارة العامة والمستودعات</div>
                  <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: 11, color: '#475569' }}>
                    الختم والاعتماد: .....................
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                كشف رسمي صادر من منظومة Yoka SWM • تاريخ ووقت الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 👁️ STOCK ITEM REVIEW & INSPECTION MODAL */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              معاينة وتدقيق بطاقة الصنف بالمخزون: {reviewedItem?.product_name}
            </span>
          </div>
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={<Button type="primary" onClick={() => setReviewModalVisible(false)}>إغلاق [Esc]</Button>}
        width={680}
        destroyOnHidden
      >
        {reviewedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 16, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {reviewedItem.image_url || reviewedItem.featured_image ? (
                  <img src={reviewedItem.image_url || reviewedItem.featured_image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <ShopOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: 16, color: '#0f172a' }}>{reviewedItem.product_name}</div>
                <Space size={6} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {reviewedItem.category_name && <Tag color="purple">{reviewedItem.category_name}</Tag>}
                  {reviewedItem.brand && <Tag color="blue">{reviewedItem.brand}</Tag>}
                  <Text code>{reviewedItem.variant_sku || reviewedItem.product_code || reviewedItem.barcode}</Text>
                </Space>
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                  الفرع المستهدف: <strong>{reviewedItem.branch_name || currentBranchObj?.branch_name || 'المستودع الرئيسي'}</strong>
                </div>
              </div>
            </div>

            <Card size="small" style={{ borderRadius: 8 }}>
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>المقاس واللون (المتغير):</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    <Space size={4}>
                      {reviewedItem.color && <Tag color="blue">{reviewedItem.color}</Tag>}
                      {reviewedItem.size && <Tag color="cyan">{reviewedItem.size}</Tag>}
                      {!reviewedItem.color && !reviewedItem.size && <Text type="secondary">صنف أساسي بدون متغير</Text>}
                    </Space>
                  </div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>الرصيد الدفتري المسجل بالنظام:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 2 }}>
                    <Tag color={parseInt(reviewedItem.system_qty || 0, 10) > 0 ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 'bold', padding: '2px 10px' }}>
                      {reviewedItem.system_qty || 0} قطعة
                    </Tag>
                  </div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>سعر تكلفة الشراء:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#0f172a', marginTop: 2 }}>
                    {parseFloat(reviewedItem.cost_price || 0).toLocaleString()} ج.م
                  </div>
                </Col>

                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>إجمالي قيمة الرصيد الدفتري:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#0f766e', marginTop: 2 }}>
                    {(parseInt(reviewedItem.system_qty || 0, 10) * parseFloat(reviewedItem.cost_price || 0)).toLocaleString()} ج.م
                  </div>
                </Col>

                {reviewedItem.selling_price && (
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>سعر البيع للجمهور:</Text>
                    <div style={{ fontWeight: 600, color: '#2563eb', marginTop: 2 }}>
                      {parseFloat(reviewedItem.selling_price).toLocaleString()} ج.م
                    </div>
                  </Col>
                )}

                {/* Actual Count & Variance status if entered */}
                {(() => {
                  const rowKey = `${reviewedItem.product_id}-${reviewedItem.variant_id || 'base'}-${reviewedItem.branch_id || selectedBranch}`;
                  const mod = modifiedRows[rowKey];
                  if (!mod) return null;
                  return (
                    <Col span={24}>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>الرصيد الفعلي المدخل للجرد: <strong>{mod.actual_qty} قطعة</strong></span>
                        <span>فارق التسوية: <strong style={{ color: mod.variance < 0 ? '#ef4444' : mod.variance > 0 ? '#22c55e' : '#6b7280' }}>{mod.variance > 0 ? `+${mod.variance}` : mod.variance}</strong></span>
                      </div>
                    </Col>
                  );
                })()}
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
