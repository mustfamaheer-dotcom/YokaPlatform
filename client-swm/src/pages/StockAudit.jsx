import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function StockAudit({ onNavigateToAdjustments, currentUser }) {
  const isRetailBranch = Boolean(
    currentUser &&
    (currentUser.branchType === 'retail_branch' || currentUser.isBranchAccount) &&
    !['super_admin', 'admin'].includes(currentUser.role)
  );

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
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
    isRetailBranch && currentUser?.branchId ? currentUser.branchId : 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  useEffect(() => {
    if (isRetailBranch && currentUser?.branchId) {
      setSelectedBranch(currentUser.branchId);
    }
  }, [isRetailBranch, currentUser?.branchId]);

  // In-table physical actual count overrides map: { [uniqueKey]: actualQty }
  const [actualCounts, setActualCounts] = useState({});

  // Print modal
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printScope, setPrintScope] = useState('in_stock'); // 'in_stock' | 'zero_stock' | 'all'
  const [exportLoading, setExportLoading] = useState(false);
  const [exportAllItems, setExportAllItems] = useState([]);
  const printAreaRef = useRef(null);

  // Fetch Lookups
  const fetchLookups = async () => {
    try {
      const [brRes, catRes] = await Promise.all([
        api.get('/api/swm/branches'),
        api.get('/api/swm/categories')
      ]);
      if (brRes.data.success) setBranchesList(brRes.data.data || []);
      if (catRes.data.success) setCategoriesList(catRes.data.data || []);
    } catch (err) {
      console.error('Fetch lookups error:', err);
    }
  };

  // Fetch Stocktaking Sheet Data
  const fetchData = async (page = 1, currentTab = activeTab) => {
    setLoading(true);
    try {
      let mappedStatus = 'all';
      if (currentTab === 'in_stock') mappedStatus = 'in_stock';
      else if (currentTab === 'zero_stock') mappedStatus = 'out_of_stock';
      else if (currentTab === 'all') mappedStatus = 'all';

      const params = {
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        status_filter: mappedStatus,
        search: searchKeyword.trim() || undefined,
        page,
        limit: pagination.pageSize
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

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchData(1, activeTab);
  }, [selectedBranch, selectedCategory, activeTab]);

  // Handle Search Input Submit
  const handleSearchSubmit = () => {
    fetchData(1, activeTab);
  };

  // Update physical count input for a row
  const handleCountChange = (rowKey, val) => {
    setActualCounts(prev => ({
      ...prev,
      [rowKey]: val
    }));
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
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>كشف الجرد الفعلي الميداني</title>
            <style>
              body { font-family: sans-serif; padding: 20px; direction: rtl; font-size: 13px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #94a3b8; padding: 8px 10px; text-align: right; }
              th { background: #f1f5f9; font-weight: bold; }
              .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
              .actual-box { min-width: 60px; height: 26px; border: 1.5px dashed #475569; border-radius: 4px; }
              .signatures { margin-top: 40px; display: flex; justify-content: space-between; }
              .sign-box { width: 30%; text-align: center; border-top: 1px solid #64748b; padding-top: 8px; font-weight: bold; }
              @media print {
                @page { size: A4 landscape; margin: 10mm; }
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
      title: 'الرصيد الفعلي (المحصي)',
      key: 'actual_count_input',
      width: 130,
      align: 'center',
      render: (_, r) => {
        const rowKey = `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || selectedBranch}`;
        const currentVal = actualCounts[rowKey];
        return (
          <InputNumber
            min={0}
            placeholder="الفعلي..."
            value={currentVal}
            onChange={(val) => handleCountChange(rowKey, val)}
            style={{ width: '100%', borderColor: currentVal !== undefined ? '#4f46e5' : undefined }}
          />
        );
      }
    },
    {
      title: 'الفارق (عجز / زيادة)',
      key: 'variance',
      width: 120,
      align: 'center',
      render: (_, r) => {
        const rowKey = `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || selectedBranch}`;
        const actualVal = actualCounts[rowKey];
        if (actualVal === undefined || actualVal === null) {
          return <Text type="secondary">—</Text>;
        }
        const sys = parseInt(r.system_qty || 0, 10);
        const diff = actualVal - sys;

        if (diff < 0) {
          return <Tag color="red" style={{ fontWeight: 700 }}>عجز ({diff})</Tag>;
        } else if (diff > 0) {
          return <Tag color="green" style={{ fontWeight: 700 }}>زيادة (+{diff})</Tag>;
        }
        return <Tag color="blue">متطابق (0)</Tag>;
      }
    }
  ];

  return (
    <div style={{ padding: '4px' }}>
      {/* 1. Header and Page Title */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>
            <FileSearchOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            الجرد المجمع (Comprehensive Stock Audit)
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            استعراض وطباعة الأرصدة المتوفرة لإجراء الجرد الفعلي الميداني، ومطابقة الأرصدة مع كشوفات التسوية
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => fetchData(pagination.current)}>
            تحديث الأرصدة
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handleOpenPrintModal}
            style={{ backgroundColor: '#0f766e' }}
          >
            طباعة كشف الجرد الميداني (A4 Sheet)
          </Button>
          {onNavigateToAdjustments && (
            <Button
              type="primary"
              icon={<DiffOutlined />}
              onClick={() => onNavigateToAdjustments('stock_adjustments')}
              style={{ backgroundColor: '#4f46e5' }}
            >
              الانتقال إلى سندات التسوية
            </Button>
          )}
        </Space>
      </div>

      {/* 2. Control & Filter Card */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          {/* Branch Filter */}
          <Col xs={24} sm={12} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <ShopOutlined /> {isRetailBranch ? 'الفرع:' : 'الفرع المستهدف:'}
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
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val)}
                placeholder="اختر الفرع..."
              >
                <Option value="all">🌐 جميع الفروع والمخازن</Option>
                {branchesList.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.branch_name} ({b.branch_code})
                  </Option>
                ))}
              </Select>
            )}
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

        <Table
          dataSource={items}
          columns={columns}
          rowKey={(r) => `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || '0'}`}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (p) => fetchData(p, activeTab),
            showTotal: (total) => `إجمالي الأصناف في هذه القائمة: ${total}`
          }}
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
            style={{ backgroundColor: '#0f766e' }}
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
            <div ref={printAreaRef} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
              {/* Printable Header */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, color: '#0f172a' }}>
                      Yoka Store — كشف الجرد الفعلي الميداني للمخزون
                      {printScope === 'in_stock' && ' (الأصناف المتوفرة بالرصيد)'}
                      {printScope === 'zero_stock' && ' (حصر الأصناف منعدمة الرصيد)'}
                      {printScope === 'all' && ' (كشف شامل لكافة الأصناف)'}
                    </h2>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                      المستودع / الفرع: <strong>{currentBranchObj ? currentBranchObj.branch_name : 'كافة الفروع والمستودعات'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: 12, color: '#475569' }}>
                    <div>تاريخ الطباعة: <strong>{dayjs().format('YYYY-MM-DD hh:mm A')}</strong></div>
                    <div>إجمالي الأصناف: <strong>{printableItems.length} صنف</strong></div>
                    <div>نوع الكشف: <strong>{printScope === 'in_stock' ? 'أصناف متوفرة' : printScope === 'zero_stock' ? 'أصناف رصيدها صفر' : 'شامل'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Printable Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '35px', textAlign: 'center' }}>#</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '130px' }}>كود الصنف / الباركود</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px' }}>اسم الصنف / المنتج</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '90px' }}>المجموعة</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '90px' }}>المقاس / اللون</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '90px', textAlign: 'center' }}>الرصيد بالدفتر</th>
                    <th style={{ border: '1px solid #0f172a', padding: '6px 8px', width: '90px', textAlign: 'center', background: '#e2e8f0' }}>الرصيد الفعلي</th>
                    <th style={{ border: '1px solid #94a3b8', padding: '6px 8px', width: '120px' }}>ملاحظات الجرد</th>
                  </tr>
                </thead>
                <tbody>
                  {printableItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontFamily: 'monospace' }}>
                        {item.variant_sku || item.product_code}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontWeight: 'bold' }}>
                        {item.product_name}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                        {item.category_name || '—'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                        {[item.size, item.color].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                        {item.system_qty}
                      </td>
                      <td style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center', background: '#f8fafc' }}>
                        {/* Blank box for manual pen writing */}
                        <div style={{ height: '22px' }}></div>
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>
                        {/* Notes line */}
                      </td>
                    </tr>
                  ))}
                  {printableItems.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        لا توجد أصناف مطابقة لهذا النطاق
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Printable Signatures */}
              <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                  <div>توقيع أمين المخزن / الفرع</div>
                  <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
                </div>
                <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                  <div>توقيع عضو لجنة الجرد</div>
                  <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
                </div>
                <div style={{ width: '28%', textAlign: 'center', borderTop: '1px solid #475569', paddingTop: '8px' }}>
                  <div>اعتماد مدير المستودع الرئيسي</div>
                  <div style={{ marginTop: '20px', color: '#64748b' }}>..........................................</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
