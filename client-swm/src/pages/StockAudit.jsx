import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Package, BarChart3, Coins, AlertTriangle } from 'lucide-react';
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
  Radio,
  Form
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
  EyeOutlined,
  EditOutlined
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

  // Product Edit & Pricing Modal State (Direct Stock Audit Pricing Management)
  const [editProductModalVisible, setEditProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductBranches, setEditingProductBranches] = useState([]);
  const [productEditSubmitting, setProductEditSubmitting] = useState(false);
  const [productEditForm] = Form.useForm();
  const watchedSellingPrice = Form.useWatch('selling_price', productEditForm);
  const watchedCostPrice = Form.useWatch('cost_price', productEditForm);

  // View Mode: 'grouped' (Consolidated single row per product) vs 'detailed' (breakdown per branch)
  const [viewMode, setViewMode] = useState('grouped');

  const handleOpenEditProduct = (item) => {
    setEditingProduct(item);

    // Compute multi-branch breakdown for this product
    const matching = items.filter(it => it.product_id === item.product_id);
    const branchMap = new Map();
    matching.forEach(it => {
      const bId = String(it.branch_id || 'main');
      const existing = branchMap.get(bId) || {
        branch_id: it.branch_id,
        branch_name: it.branch_name || currentBranchObj?.branch_name || 'المستودع الرئيسي',
        qty: 0
      };
      existing.qty += parseInt(it.system_qty || 0, 10);
      branchMap.set(bId, existing);
    });
    setEditingProductBranches(Array.from(branchMap.values()));

    productEditForm.setFieldsValue({
      product_name: item.product_name,
      barcode: item.barcode || '',
      brand: item.brand || '',
      selling_price: item.selling_price !== undefined ? parseFloat(item.selling_price) : 0,
      cost_price: item.cost_price !== undefined ? parseFloat(item.cost_price) : 0,
      wholesale_price: item.wholesale_price ? parseFloat(item.wholesale_price) : undefined,
      sale_price: item.sale_price ? parseFloat(item.sale_price) : undefined,
      reason: ''
    });
    setEditProductModalVisible(true);
  };

  const handleSaveProductEdit = async () => {
    try {
      const values = await productEditForm.validateFields();
      if (!editingProduct) return;
      setProductEditSubmitting(true);

      const payload = {
        product_name: values.product_name,
        barcode: values.barcode,
        brand: values.brand,
        selling_price: values.selling_price,
        cost_price: values.cost_price,
        wholesale_price: values.wholesale_price,
        sale_price: values.sale_price,
        reason: values.reason
      };

      const res = await api.patch(`/api/swm/products/${editingProduct.product_id}/price`, payload);
      if (res.data?.success) {
        message.success(res.data.message || 'تم تحديث واعتماد سعر وبيانات الصنف بنجاح');
        setEditProductModalVisible(false);

        // Optimistically update items state while preserving all modified physical inventory count rows
        setItems(prevItems =>
          prevItems.map(it => {
            if (it.product_id === editingProduct.product_id) {
              const newCost = values.cost_price !== undefined ? values.cost_price : it.cost_price;
              const newSelling = values.selling_price !== undefined ? values.selling_price : it.selling_price;
              const sysQty = parseInt(it.system_qty || 0, 10);
              return {
                ...it,
                product_name: values.product_name || it.product_name,
                barcode: values.barcode !== undefined ? values.barcode : it.barcode,
                brand: values.brand !== undefined ? values.brand : it.brand,
                cost_price: newCost,
                selling_price: newSelling,
                wholesale_price: values.wholesale_price,
                sale_price: values.sale_price,
                stock_value: sysQty * parseFloat(newCost || 0)
              };
            }
            return it;
          })
        );

        if (reviewedItem && reviewedItem.product_id === editingProduct.product_id) {
          setReviewedItem(prev => ({
            ...prev,
            product_name: values.product_name || prev.product_name,
            barcode: values.barcode !== undefined ? values.barcode : prev.barcode,
            brand: values.brand !== undefined ? values.brand : prev.brand,
            cost_price: values.cost_price,
            selling_price: values.selling_price,
            wholesale_price: values.wholesale_price,
            sale_price: values.sale_price
          }));
        }
      }
    } catch (err) {
      console.error('Failed to update product from stock audit:', err);
      message.error(err.response?.data?.message || 'فشل في تحديث بيانات وسعر الصنف');
    } finally {
      setProductEditSubmitting(false);
    }
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
    { value: 'all', label: 'جميع الفروع والمخازن' },
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

  // Consolidated Multi-Branch Mode
  const isConsolidatedMode = selectedBranch === 'all' && viewMode === 'grouped';

  const displayedItems = useMemo(() => {
    if (!isConsolidatedMode) {
      return items;
    }

    const map = new Map();
    items.forEach(it => {
      const groupKey = `${it.product_id}-${it.variant_id || 'base'}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          ...it,
          groupKey,
          isGroupedRow: true,
          total_system_qty: parseInt(it.system_qty || 0, 10),
          total_stock_value: parseFloat(it.stock_value || (parseInt(it.system_qty || 0, 10) * parseFloat(it.cost_price || 0))),
          branchBreakdown: [
            {
              branch_id: it.branch_id,
              branch_name: it.branch_name || 'المستودع الرئيسي',
              system_qty: parseInt(it.system_qty || 0, 10),
              cost_price: it.cost_price,
              record: it
            }
          ]
        });
      } else {
        const existing = map.get(groupKey);
        const q = parseInt(it.system_qty || 0, 10);
        existing.total_system_qty += q;
        existing.total_stock_value += parseFloat(it.stock_value || (q * parseFloat(it.cost_price || 0)));
        existing.branchBreakdown.push({
          branch_id: it.branch_id,
          branch_name: it.branch_name || 'المستودع الرئيسي',
          system_qty: q,
          cost_price: it.cost_price,
          record: it
        });
      }
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      system_qty: g.total_system_qty,
      stock_value: g.total_stock_value,
      branchCount: g.branchBreakdown.length
    }));
  }, [items, isConsolidatedMode]);

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
      width: 160,
      render: (_, r) => {
        if (r.isGroupedRow) {
          const breakdown = r.branchBreakdown || [];
          return (
            <Tooltip
              title={
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>توزيع الرصيد عبر الفروع:</div>
                  {breakdown.map((b, i) => (
                    <div key={i} style={{ fontSize: 12 }}>
                      • {b.branch_name}: <strong>{b.system_qty} قطعة</strong>
                    </div>
                  ))}
                </div>
              }
            >
              <Tag color="purple" style={{ fontWeight: 700, cursor: 'pointer', padding: '2px 8px' }}>
                <ShopOutlined /> متوفر في {r.branchCount || 1} فروع
              </Tag>
            </Tooltip>
          );
        }

        return (
          <Tag color="purple" style={{ fontWeight: 600 }}>
            <ShopOutlined /> {r.branch_name || currentBranchObj?.branch_name || 'المستودع الرئيسي'}
          </Tag>
        );
      }
    },
    {
      title: 'التسعير والهامش',
      key: 'pricing',
      width: 170,
      render: (_, r) => {
        const sell = parseFloat(r.selling_price || 0);
        const cost = parseFloat(r.cost_price || 0);
        const profit = sell - cost;
        const marginPct = sell > 0 ? ((profit / sell) * 100).toFixed(1) : 0;
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>البيع:</Text>
              <Text strong style={{ color: '#2563eb', fontSize: 13 }}>
                {sell > 0 ? `${sell.toLocaleString()} ج.م` : '—'}
              </Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>التكلفة:</Text>
              <Text style={{ color: '#0f172a', fontSize: 12 }}>
                {cost > 0 ? `${cost.toLocaleString()} ج.م` : '—'}
              </Text>
            </div>
            {sell > 0 && cost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: '#8A6A24' }}>الهامش:</span>
                <Tag color={profit >= 0 ? 'gold' : 'error'} style={{ margin: 0, fontSize: 10, padding: '0 4px', lineHeight: '18px', fontWeight: 600 }}>
                  {profit >= 0 ? `+${marginPct}%` : `${marginPct}%`}
                </Tag>
              </div>
            )}
          </Space>
        );
      }
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
      width: 150,
      align: 'center',
      render: (_, r) => {
        if (r.isGroupedRow) {
          const breakdown = r.branchBreakdown || [];
          const modifiedBranches = breakdown.filter(b => {
            const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
            return modifiedRows[rowKey] !== undefined;
          });

          if (modifiedBranches.length > 0) {
            const totalActual = modifiedBranches.reduce((sum, b) => {
              const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
              return sum + (modifiedRows[rowKey]?.actual_qty || 0);
            }, 0);
            return (
              <Tag color="blue" style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px' }}>
                المحصى: {totalActual} ({modifiedBranches.length}/{r.branchCount} فروع)
              </Tag>
            );
          }

          return (
            <Text type="secondary" style={{ fontSize: 11 }}>
              افتح السطر لتسجيل كل فرع
            </Text>
          );
        }

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
        if (r.isGroupedRow) {
          const breakdown = r.branchBreakdown || [];
          const modifiedBranches = breakdown.filter(b => {
            const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
            return modifiedRows[rowKey] !== undefined;
          });

          if (modifiedBranches.length === 0) {
            return <span style={{ color: '#9ca3af' }}>—</span>;
          }

          const totalVariance = modifiedBranches.reduce((sum, b) => {
            const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
            return sum + (modifiedRows[rowKey]?.variance || 0);
          }, 0);

          if (totalVariance < 0) {
            return (
              <span
                style={{
                  color: '#ef4444',
                  fontWeight: 700,
                  backgroundColor: '#fef2f2',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid #fecaca'
                }}
              >
                عجز ({totalVariance})
              </span>
            );
          } else if (totalVariance > 0) {
            return (
              <span
                style={{
                  color: '#22c55e',
                  fontWeight: 700,
                  backgroundColor: '#f0fdf4',
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0'
                }}
              >
                زيادة (+{totalVariance})
              </span>
            );
          }
          return (
            <span style={{ color: '#6b7280', fontWeight: 600, backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: 6 }}>
              متطابق (0)
            </span>
          );
        }

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
      title: 'إجراءات',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="معاينة وتدقيق بطاقة الصنف">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#4f46e5', fontSize: 16 }} />}
              onClick={() => handleViewItemReview(r)}
            />
          </Tooltip>
          <Tooltip title="تعديل الصنف وتحديث الأسعار المباشرة">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditProduct(r)}
              style={{
                borderColor: '#C8A45C',
                color: '#8A6A24',
                backgroundColor: '#FFFDF9',
                fontWeight: 600
              }}
            >
              تعديل / السعر
            </Button>
          </Tooltip>
        </Space>
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
              title={<Text strong style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}><Package size={15} /> إجمالي الأصناف المسجلة</Text>}
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
              title={<Text strong style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={15} /> إجمالي عدد القطع المتوفرة</Text>}
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
              title={<Text strong style={{ color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}><Coins size={15} /> إجمالي تقييم المخزون بالتكلفة</Text>}
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
              title={<Text strong style={{ color: '#c2410c', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={15} /> أصناف رصيدها صفري (= 0)</Text>}
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
          tabBarExtraContent={
            selectedBranch === 'all' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
                <Text strong style={{ fontSize: 12, color: '#64748b' }}>طريقة العرض:</Text>
                <Radio.Group
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  size="small"
                  buttonStyle="solid"
                >
                  <Radio.Button value="grouped">
                    <Space size={4}>
                      <AppstoreOutlined />
                      <span>عرض مجمع للأصناف (صنف واحد)</span>
                    </Space>
                  </Radio.Button>
                  <Radio.Button value="detailed">
                    <Space size={4}>
                      <BarsOutlined />
                      <span>تفصيلي حسب الفروع</span>
                    </Space>
                  </Radio.Button>
                </Radio.Group>
              </div>
            ) : null
          }
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
          dataSource={displayedItems}
          columns={columns}
          rowKey={(r) => r.isGroupedRow ? r.groupKey : `${r.product_id}-${r.variant_id || 'base'}-${r.branch_id || '0'}`}
          loading={loading}
          pagination={false}
          size="middle"
          expandable={isConsolidatedMode ? {
            expandedRowRender: (record) => (
              <div style={{ margin: '6px 12px', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: '#1e293b', fontSize: 13 }}>
                    تفاصيل أرصدة الصنف والجرد الفعلي عبر الفروع والمستودعات:
                  </Text>
                  <Tag color="purple">
                    إجمالي الرصيد الدفتري: {record.system_qty} قطعة موزعة على {record.branchCount} فروع
                  </Tag>
                </div>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={record.branchBreakdown || []}
                  rowKey={(b) => `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id}`}
                  columns={[
                    {
                      title: 'الفرع / المخزن',
                      dataIndex: 'branch_name',
                      key: 'branch_name',
                      render: (name) => <Tag color="geekblue"><ShopOutlined /> {name}</Tag>
                    },
                    {
                      title: 'الرصيد الدفتري للنظام',
                      dataIndex: 'system_qty',
                      key: 'system_qty',
                      align: 'center',
                      render: (q) => <strong>{q} قطعة</strong>
                    },
                    {
                      title: 'سعر التكلفة',
                      key: 'cost',
                      align: 'right',
                      render: (_, b) => `${parseFloat(b.cost_price || record.cost_price || 0).toLocaleString()} ج.م`
                    },
                    {
                      title: 'القيمة التقديرية',
                      key: 'val',
                      align: 'right',
                      render: (_, b) => `${(parseInt(b.system_qty || 0, 10) * parseFloat(b.cost_price || record.cost_price || 0)).toLocaleString()} ج.م`
                    },
                    {
                      title: 'الرصيد الفعلي (المحصى)',
                      key: 'actual',
                      align: 'center',
                      width: 140,
                      render: (_, b) => {
                        const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
                        const item = modifiedRows[rowKey];
                        const currentVal = item !== undefined ? item.actual_qty : undefined;
                        return (
                          <InputNumber
                            min={0}
                            placeholder="الفعلي..."
                            value={currentVal}
                            onChange={(val) => handleActualQtyChange(b.record, val)}
                            style={{ width: '100%', borderRadius: 6 }}
                          />
                        );
                      }
                    },
                    {
                      title: 'الفارق',
                      key: 'variance',
                      align: 'center',
                      render: (_, b) => {
                        const rowKey = `${b.record.product_id}-${b.record.variant_id || 'base'}-${b.record.branch_id || selectedBranch}`;
                        const item = modifiedRows[rowKey];
                        if (!item) return <span style={{ color: '#9ca3af' }}>—</span>;
                        const v = item.variance;
                        if (v < 0) return <Tag color="error">عجز ({v})</Tag>;
                        if (v > 0) return <Tag color="success">زيادة (+{v})</Tag>;
                        return <Tag color="default">مطابق (0)</Tag>;
                      }
                    }
                  ]}
                />
              </div>
            ),
            rowExpandable: (record) => Boolean(record.isGroupedRow && record.branchBreakdown && record.branchBreakdown.length > 0)
          } : undefined}
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
      {/* STOCK ITEM REVIEW & INSPECTION MODAL */}
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
        footer={
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                const it = reviewedItem;
                setReviewModalVisible(false);
                handleOpenEditProduct(it);
              }}
              style={{ backgroundColor: '#8A6A24', borderColor: '#8A6A24', fontWeight: 600 }}
            >
              تعديل بيانات وأسعار الصنف
            </Button>
            <Button onClick={() => setReviewModalVisible(false)}>
              إغلاق [Esc]
            </Button>
          </Space>
        }
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

      {/* ========================================================================= */}
      {/* DIRECT PRODUCT & PRICING EDIT MODAL FOR STOCK AUDIT */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B45309'
            }}>
              <DollarOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>
                تعديل واعتماد تسعير وبيانات الصنف بالجرد
              </div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 'normal' }}>
                {editingProduct?.product_name} ({editingProduct?.variant_sku || editingProduct?.product_code})
              </div>
            </div>
          </div>
        }
        open={editProductModalVisible}
        onCancel={() => setEditProductModalVisible(false)}
        onOk={handleSaveProductEdit}
        okText="اعتماد وحفظ السعر والبيانات"
        cancelText="إلغاء"
        confirmLoading={productEditSubmitting}
        okButtonProps={{
          style: { backgroundColor: '#8A6A24', borderColor: '#8A6A24', fontWeight: 600, height: 38 }
        }}
        width={620}
        destroyOnHidden
      >
        <div style={{ marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message="تحديث فوري لأسعار الصنف وتقييم المخزون"
            description="يتم اعتماد التعديلات هنا فورياً على مستوى النظام (نقاط بيع الفروع، المتجر الإلكتروني، وتقييم رصيد المخزن الحالي دون التأثير على الجرد الفعلي المحصى)."
            style={{ marginBottom: 12, border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}
          />

          {/* Multi-Branch Stock & Unified Pricing Notice */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Space align="middle">
                <ShopOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                <Text strong style={{ color: '#15803d', fontSize: 13 }}>
                  نطاق تطبيق السعر: توحيد مركزي لجميع المخازن والفروع
                </Text>
              </Space>
              <Tag color="green" style={{ fontWeight: 700 }}>
                {editingProductBranches.length > 0 ? `متواجد في ${editingProductBranches.length} فروع` : 'المخزن الرئيسي'}
              </Tag>
            </div>

            <div style={{ fontSize: 12, color: '#166534', marginBottom: 8, lineHeight: 1.6 }}>
              تعديل السعر هنا هو <strong>تعديل مركزي شامل</strong> يُعتمد فورياً وبنقرة واحدة لجميع المخازن ونقاط بيع الفروع والمتجر الإلكتروني، دون الحاجة لتكرار التعديل لكل فرع على حدة.
            </div>

            {editingProductBranches.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 6, padding: '8px 10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>توزيع رصيد الصنف الحالي عبر الفروع:</div>
                <Space size={[6, 6]} wrap>
                  {editingProductBranches.map((b, idx) => (
                    <Tag key={idx} color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>
                      <strong>{b.branch_name}:</strong> {b.qty} قطعة
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>

          <Form form={productEditForm} layout="vertical">
            <Row gutter={16}>
              <Col span={14}>
                <Form.Item
                  name="product_name"
                  label={<Text strong style={{ color: '#0F172A' }}>اسم الصنف الأساسي (Product Name):</Text>}
                  rules={[{ required: true, message: 'يرجى إدخال اسم الصنف' }]}
                >
                  <Input placeholder="اسم الصنف..." size="large" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item
                  name="brand"
                  label={<Text style={{ color: '#475569' }}>الماركة / Brand:</Text>}
                >
                  <Input placeholder="Yoka Store" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="barcode"
                  label={<Text style={{ color: '#475569' }}>الباركود الدولي (Barcode):</Text>}
                >
                  <Input prefix={<BarcodeOutlined />} placeholder="622XXXXXXXXXX" size="middle" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0 16px', borderColor: '#f1f5f9' }} />

            <div style={{ backgroundColor: '#fffdf5', border: '1px solid #fde68a', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Space align="middle">
                  <DollarOutlined style={{ color: '#b45309', fontSize: 16 }} />
                  <Text strong style={{ color: '#92400e', fontSize: 13 }}>
                    تسعير الصنف الموحد (Pricing Details):
                  </Text>
                </Space>
                <Tag color="gold" style={{ fontWeight: 600 }}>يُعتمد لجميع الفروع والكاشير</Tag>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="selling_price"
                    label={<Text strong style={{ color: '#0F172A' }}>سعر البيع للقطاعي (ج.م) *</Text>}
                    rules={[{ required: true, message: 'يرجى إدخال سعر البيع' }]}
                  >
                    <InputNumber
                      min={0}
                      step={1}
                      precision={2}
                      size="large"
                      style={{ width: '100%' }}
                      addonAfter="ج.م"
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="cost_price"
                    label={<Text strong style={{ color: '#475569' }}>سعر التكلفة الأساسي (ج.م) *</Text>}
                    rules={[{ required: true, message: 'يرجى إدخال سعر التكلفة' }]}
                  >
                    <InputNumber
                      min={0}
                      step={1}
                      precision={2}
                      size="large"
                      style={{ width: '100%' }}
                      addonAfter="ج.م"
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="wholesale_price"
                    label={<Text style={{ color: '#475569' }}>سعر الجملة (ج.م) (اختياري)</Text>}
                  >
                    <InputNumber
                      min={0}
                      step={1}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="ج.م"
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="sale_price"
                    label={<Text style={{ color: '#b91c1c' }}>سعر التخفيض / العرض (اختياري)</Text>}
                  >
                    <InputNumber
                      min={0}
                      step={1}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="ج.م"
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Dynamic Live Profit Margin & Stock Impact */}
            {(() => {
              const liveSelling = Number(watchedSellingPrice ?? editingProduct?.selling_price ?? 0);
              const liveCost = Number(watchedCostPrice ?? editingProduct?.cost_price ?? 0);
              const liveProfit = liveSelling - liveCost;
              const liveMargin = liveSelling > 0 ? ((liveProfit / liveSelling) * 100).toFixed(1) : 0;
              const isLoss = liveProfit < 0;
              const totalUnits = editingProductBranches.length > 0
                ? editingProductBranches.reduce((sum, b) => sum + b.qty, 0)
                : parseInt(editingProduct?.system_qty || 0, 10);
              const newTotalStockVal = totalUnits * liveCost;

              return (
                <div style={{
                  backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                  border: `1.5px solid ${isLoss ? '#f87171' : '#86efac'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: isLoss ? '#991b1b' : '#166534', fontWeight: 600 }}>
                        {isLoss ? 'تحذير: هامش ربح سلبي!' : 'حساب هامش الربح اللحظي:'}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: isLoss ? '#dc2626' : '#15803d', marginTop: 2 }}>
                        صافي الربح: {liveProfit.toLocaleString()} ج.م للقطعة
                      </div>
                    </div>
                    <Tag
                      color={isLoss ? 'error' : 'success'}
                      style={{ fontSize: 14, padding: '4px 10px', borderRadius: 6, fontWeight: 'bold' }}
                    >
                      {liveProfit >= 0 ? `+${liveMargin}%` : `${liveMargin}%`}
                    </Tag>
                  </div>

                  {totalUnits > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#475569' }}>
                        إجمالي تقييم رصيد الصنف بكافة الفروع ({totalUnits} قطعة):
                      </span>
                      <strong style={{ color: '#0f766e' }}>
                        {newTotalStockVal.toLocaleString()} ج.م
                      </strong>
                    </div>
                  )}

                  {isLoss && (
                    <Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      سعر البيع الحالي أقل من سعر التكلفة، مما يؤدي لخسارة مالية عند البيع.
                    </Text>
                  )}
                </div>
              );
            })()}

            <Form.Item
              name="reason"
              label={<Text style={{ color: '#475569' }}>سبب تعديل السعر والبيانات (سجل التدقيق):</Text>}
            >
              <Input.TextArea
                rows={2}
                placeholder="مثال: تعديل بعد حصر الجرد الفعلي، تصحيح سعر التكلفة من فاتورة الشراء، مراجعة دورية..."
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
