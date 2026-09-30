import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  Avatar,
  Empty
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
  ArrowRightOutlined,
  ThunderboltOutlined,
  BarcodeOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  EnterOutlined,
  EyeOutlined
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

  // Selected items in invoice/voucher table
  const [transferItems, setTransferItems] = useState([]);

  // Active row being targeted for search or editing
  const [activeRowKey, setActiveRowKey] = useState(null);

  // F1 Product Search Modal State
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');

  // Input Refs for fast keyboard navigation
  const rowBarcodeRefs = useRef({});
  const rowQtyRefs = useRef({});
  const modalSearchInputRef = useRef(null);

  // Single Transfer Printable Modal
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // Review & Inspect Transfer Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewedTransfer, setReviewedTransfer] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Open Transfer Review Modal
  const handleOpenReviewModal = async (transferId) => {
    setReviewLoading(true);
    setReviewModalVisible(true);
    try {
      const res = await api.get(`/api/swm/transfers/${transferId}`);
      if (res.data.success) {
        setReviewedTransfer(res.data.data);
      }
    } catch (err) {
      message.error('فشل في جلب تفاصيل إذن الصرف للمعاينة');
    } finally {
      setReviewLoading(false);
    }
  };

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
        search: filterSearch ? filterSearch.trim() : undefined,
        limit: 5000
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
    } else {
      setAvailableStock([]);
    }
  }, [selectedFromBranch]);

  // Open Create Voucher Modal
  const handleOpenCreateModal = () => {
    createForm.resetFields();
    // Default from_branch to main warehouse if available
    const mainBranch = branches.find((b) => b.branch_type === 'main_warehouse');
    const defaultBranchId = mainBranch ? mainBranch.id : (branches[0]?.id || undefined);

    createForm.setFieldsValue({
      from_branch_id: defaultBranchId,
      transfer_date: dayjs()
    });

    if (defaultBranchId) {
      fetchBranchStock(defaultBranchId);
    }

    const firstKey = `row-${Date.now()}-1`;
    setTransferItems([
      {
        key: firstKey,
        isManualRow: true,
        product_id: null,
        variant_id: null,
        barcode_input: '',
        product_name: '',
        display_name: '',
        color: null,
        size: null,
        product_code: '',
        barcode: '',
        available_qty: 0,
        quantity: 1,
        notes: ''
      }
    ]);
    setActiveRowKey(firstKey);
    setCreateModalVisible(true);

    setTimeout(() => {
      rowBarcodeRefs.current[firstKey]?.focus();
    }, 200);
  };

  useEffect(() => {
    if (autoOpenCreate) {
      handleOpenCreateModal();
      if (onResetAction) onResetAction();
    }
  }, [autoOpenCreate]);

  // --- Strict Keyboard Workflow: F11 (Add Row), F1 (Search Product), F4 (Submit Voucher) ---
  useEffect(() => {
    if (!createModalVisible) return;

    const handleKeyDown = (e) => {
      // If Search modal is visible, escape closes it
      if (searchModalVisible) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSearchModalVisible(false);
        }
        return;
      }

      if (e.key === 'F11') {
        e.preventDefault();
        handleAddNewRow();
      } else if (e.key === 'F1') {
        e.preventDefault();
        handleOpenSearchModal();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleTriggerSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createModalVisible, searchModalVisible, transferItems, availableStock, submitting]);

  // Step 1: Add new empty row (F11)
  const handleAddNewRow = () => {
    const newKey = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setTransferItems((prev) => [
      ...prev,
      {
        key: newKey,
        isManualRow: true,
        product_id: null,
        variant_id: null,
        barcode_input: '',
        product_name: '',
        display_name: '',
        color: null,
        size: null,
        product_code: '',
        barcode: '',
        available_qty: 0,
        quantity: 1,
        notes: ''
      }
    ]);
    setActiveRowKey(newKey);
    message.info('سطر جديد [F11]: اكتب الباركود أو اضغط F1 للبحث عن الصنف');
    setTimeout(() => {
      rowBarcodeRefs.current[newKey]?.focus();
    }, 80);
  };

  // Step 2: Open Product Search Modal (F1)
  const handleOpenSearchModal = (targetRowKey = null) => {
    if (!selectedFromBranch) {
      return message.warning('يرجى اختيار المخزن / الفرع المنصرف منه أولاً لعرض الأصناف المتاحة');
    }

    if (targetRowKey) {
      setActiveRowKey(targetRowKey);
    } else {
      // Target existing empty row or append a new one
      const emptyRow = transferItems.find((i) => i.isManualRow || !i.product_id);
      if (emptyRow) {
        setActiveRowKey(emptyRow.key);
      } else {
        const newKey = `row-${Date.now()}`;
        setTransferItems((prev) => [
          ...prev,
          {
            key: newKey,
            isManualRow: true,
            product_id: null,
            variant_id: null,
            barcode_input: '',
            product_name: '',
            display_name: '',
            color: null,
            size: null,
            product_code: '',
            barcode: '',
            available_qty: 0,
            quantity: 1,
            notes: ''
          }
        ]);
        setActiveRowKey(newKey);
      }
    }

    setSearchModalVisible(true);
    setTimeout(() => {
      modalSearchInputRef.current?.focus();
    }, 150);
  };

  // Populate product details into specified row
  const populateProductIntoRow = (rowKey, stockRow) => {
    setTransferItems((prev) => {
      const exists = prev.some((i) => i.key === rowKey);
      if (!exists) {
        return [
          ...prev,
          {
            key: rowKey || `row-${Date.now()}`,
            isManualRow: false,
            balance_id: stockRow.balance_id,
            product_id: stockRow.product_id,
            variant_id: stockRow.variant_id || null,
            barcode_input: stockRow.variant_sku || stockRow.barcode || stockRow.product_code || '',
            product_name: stockRow.product_name,
            display_name: stockRow.display_name,
            color: stockRow.color,
            size: stockRow.size,
            image_url: stockRow.image_url,
            category_name: stockRow.category_name,
            product_code: stockRow.product_code,
            barcode: stockRow.variant_sku || stockRow.barcode,
            available_qty: stockRow.available_qty,
            quantity: 1,
            notes: ''
          }
        ];
      }
      return prev.map((item) => {
        if (item.key === rowKey) {
          return {
            ...item,
            isManualRow: false,
            balance_id: stockRow.balance_id,
            product_id: stockRow.product_id,
            variant_id: stockRow.variant_id || null,
            barcode_input: stockRow.variant_sku || stockRow.barcode || stockRow.product_code || '',
            product_name: stockRow.product_name,
            display_name: stockRow.display_name,
            color: stockRow.color,
            size: stockRow.size,
            image_url: stockRow.image_url,
            category_name: stockRow.category_name,
            product_code: stockRow.product_code,
            barcode: stockRow.variant_sku || stockRow.barcode,
            available_qty: stockRow.available_qty,
            quantity: item.quantity > 0 ? item.quantity : 1,
            notes: item.notes || ''
          };
        }
        return item;
      });
    });
  };

  // Barcode / SKU typed and submitted with Enter in a row
  const handleBarcodeKeyDown = (e, rowKey, val) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!val || !val.trim()) return;
      const cleanVal = val.trim().toLowerCase();

      // Check if sending branch is selected
      if (!selectedFromBranch) {
        return message.warning('يرجى اختيار المخزن / الفرع المنصرف منه أولاً');
      }

      // Exact match in available stock
      const found = availableStock.find((s) => {
        const b = (s.barcode || '').toLowerCase();
        const sku = (s.variant_sku || '').toLowerCase();
        const code = (s.product_code || '').toLowerCase();
        return b === cleanVal || sku === cleanVal || code === cleanVal;
      });

      if (found) {
        // Check if already in another row
        const alreadyInOtherRow = transferItems.find(
          (i) => i.key !== rowKey && i.product_id === found.product_id && (i.variant_id || null) === (found.variant_id || null)
        );

        if (alreadyInOtherRow) {
          message.warning(`الصنف "${found.display_name}" مضاف بالفعل! تم زيادة كميته.`);
          setTransferItems((prev) =>
            prev.filter((i) => i.key !== rowKey || !i.isManualRow).map((i) => {
              if (i.key === alreadyInOtherRow.key) {
                const nq = Math.min(i.available_qty, i.quantity + 1);
                return { ...i, quantity: nq };
              }
              return i;
            })
          );
          return;
        }

        populateProductIntoRow(rowKey, found);
        message.success(`تم إدراج: ${found.display_name}`);

        setTimeout(() => {
          rowQtyRefs.current[rowKey]?.focus();
        }, 80);
      } else {
        // Open search modal with this query
        setActiveRowKey(rowKey);
        setModalSearchQuery(val.trim());
        setSearchModalVisible(true);
        message.warning(`لم يتم العثور على صنف مطابق للكود "${val}". جاري البحث الموسع (F1)...`);
      }
    } else if (e.key === 'F1') {
      e.preventDefault();
      handleOpenSearchModal(rowKey);
    }
  };

  // Product selected from F1 Search Modal
  const handleSelectProductFromModal = (stockRow) => {
    if (!stockRow) return;

    // Check if already added in another row
    const alreadyInOtherRow = transferItems.find(
      (i) => i.key !== activeRowKey && i.product_id === stockRow.product_id && (i.variant_id || null) === (stockRow.variant_id || null)
    );

    if (alreadyInOtherRow) {
      message.warning(`الصنف "${stockRow.display_name}" مضاف بالفعل في سطر آخر! تم زيادة كميته.`);
      setTransferItems((prev) =>
        prev
          .filter((item) => item.key !== activeRowKey || !item.isManualRow)
          .map((item) => {
            if (item.key === alreadyInOtherRow.key) {
              const nextQty = Math.min(item.available_qty, item.quantity + 1);
              return { ...item, quantity: nextQty };
            }
            return item;
          })
      );
      setSearchModalVisible(false);
      return;
    }

    populateProductIntoRow(activeRowKey, stockRow);
    setSearchModalVisible(false);
    setModalSearchQuery('');
    message.success(`تم اختيار وإدراج: ${stockRow.display_name}`);

    setTimeout(() => {
      if (activeRowKey && rowQtyRefs.current[activeRowKey]) {
        rowQtyRefs.current[activeRowKey].focus();
      }
    }, 80);
  };

  // Update item quantity
  const handleUpdateItemQty = (rowKey, qty) => {
    setTransferItems((prev) =>
      prev.map((item) => {
        if (item.key !== rowKey) return item;
        const maxVal = item.available_qty || 1;
        const validQty = Math.max(1, Math.min(maxVal, parseInt(qty, 10) || 1));
        return { ...item, quantity: validQty };
      })
    );
  };

  // Update item notes
  const handleUpdateItemNotes = (rowKey, notes) => {
    setTransferItems((prev) =>
      prev.map((item) => (item.key === rowKey ? { ...item, notes } : item))
    );
  };

  // Update row barcode text
  const handleUpdateItemBarcodeInput = (rowKey, barcode_input) => {
    setTransferItems((prev) =>
      prev.map((item) => (item.key === rowKey ? { ...item, barcode_input } : item))
    );
  };

  // Remove row
  const handleRemoveRow = (rowKey) => {
    setTransferItems((prev) => {
      const filtered = prev.filter((item) => item.key !== rowKey);
      if (filtered.length === 0) {
        // Keep at least one empty row ready
        return [
          {
            key: `row-${Date.now()}`,
            isManualRow: true,
            product_id: null,
            variant_id: null,
            barcode_input: '',
            product_name: '',
            display_name: '',
            color: null,
            size: null,
            product_code: '',
            barcode: '',
            available_qty: 0,
            quantity: 1,
            notes: ''
          }
        ];
      }
      return filtered;
    });
  };

  // Valid populated items in voucher
  const validTransferItems = transferItems.filter((item) => item.product_id && item.quantity > 0);
  const totalUnits = validTransferItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Trigger F4 Submit
  const handleTriggerSubmit = () => {
    createForm
      .validateFields()
      .then((values) => {
        handleCreateTransfer(values);
      })
      .catch(() => {
        message.error('يرجى استكمال البيانات الإلزامية (المخزن المرسل وجهة الاستلام وتاريخ الصرف)');
      });
  };

  // Submit Stock Transfer (F4)
  const handleCreateTransfer = async (values) => {
    if (validTransferItems.length === 0) {
      return message.error('يرجى إضافة صنف واحد على الأقل لإذن الصرف (اضغط F11 ثم F1 لاختيار الأصناف)');
    }

    if (values.from_branch_id === values.to_branch_id) {
      return message.error('لا يمكن نقل البضائع إلى نفس المخزن أو الفرع!');
    }

    // Verify stock availability
    for (const it of validTransferItems) {
      if (it.quantity > it.available_qty) {
        return message.error(`الكمية المطلوبة للصنف (${it.display_name}) أكبر من الرصيد المتوفر (${it.available_qty})!`);
      }
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
        items: validTransferItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          product_name: item.display_name || item.product_name,
          product_code: item.product_code,
          notes: item.notes
        }))
      };

      const res = await api.post('/api/swm/transfers', payload);
      if (res.data.success) {
        message.success(res.data.message || 'تم حفظ وتنفيذ إذن الصرف ونقل المخزون بنجاح [F4]');
        setCreateModalVisible(false);
        fetchMetrics();
        fetchTransfers();

        // Auto-open printable A4 note
        handleViewPrint(res.data.data.id);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ وتنفيذ إذن الصرف');
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

  // Filtered products inside F1 modal
  const filteredModalProducts = availableStock.filter((item) => {
    const q = modalSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      (item.product_name || '').toLowerCase().includes(q) ||
      (item.display_name || '').toLowerCase().includes(q) ||
      (item.product_code || '').toLowerCase().includes(q) ||
      (item.barcode || '').toLowerCase().includes(q) ||
      (item.variant_sku || '').toLowerCase().includes(q) ||
      (item.color || '').toLowerCase().includes(q) ||
      (item.size || '').toLowerCase().includes(q);

    const matchCategory =
      modalCategoryFilter === 'all' ||
      String(item.category_id) === String(modalCategoryFilter) ||
      item.category_name === modalCategoryFilter;

    return matchQuery && matchCategory;
  });

  // Extract unique categories from current branch stock for quick filter pills
  const availableCategories = Array.from(
    new Set(availableStock.map((s) => s.category_name).filter(Boolean))
  );

  // Transfers List Table Columns
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
      render: (driver, row) =>
        driver ? (
          <div>
            <span>{driver}</span>
            {row.vehicle_number && <div style={{ fontSize: 11, color: '#64748b' }}>سيارة: {row.vehicle_number}</div>}
          </div>
        ) : (
          <Text type="secondary">-</Text>
        )
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
      render: () => (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          مكتمل ومُرحّل
        </Tag>
      )
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 170,
      render: (_, row) => (
        <Space size="small">
          <Tooltip title="معاينة ومراجعة محتويات الإذن والأصناف">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenReviewModal(row.id)}
              style={{ borderColor: '#6366f1', color: '#6366f1' }}
            >
              معاينة
            </Button>
          </Tooltip>
          <Tooltip title="طباعة إذن الصرف الرسمي A4">
            <Button
              type="primary"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handleViewPrint(row.id)}
              style={{ backgroundColor: '#1e293b' }}
            >
              طباعة
            </Button>
          </Tooltip>
        </Space>
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
            نقل البضائع والأصناف من المستودع الرئيسي إلى الفروع أو بين الفروع، مع جدول سطور فواتير متكامل واختصارات لوحة المفاتيح
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
          pagination={false}
          size="middle"
        />
      </Card>

      {/* ========================================================================= */}
      {/* 🚀 EXPANSIVE CREATE DISPATCH VOUCHER MODAL (Full Desktop Invoicing Experience) */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 10px', borderRadius: 8, fontSize: 18 }}>
                <SwapOutlined />
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 'bold' }}>إنشاء إذن صرف وتوزيع منتجات جديد</span>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 'normal' }}>
                  نظام أسطر الفاتورة السريعة واختصارات لوحة المفاتيح
                </div>
              </div>
            </div>

            {/* Quick Keyboard Shortcuts Ribbon */}
            <Space size={8} style={{ direction: 'ltr' }}>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }} onClick={handleAddNewRow}>
                ⌨️ <strong style={{ color: '#1d4ed8' }}>F11</strong> إضافة سطر جديد
              </Tag>
              <Tag color="purple" style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }} onClick={() => handleOpenSearchModal()}>
                🔍 <strong style={{ color: '#6d28d9' }}>F1</strong> بحث عن صنف
              </Tag>
              <Tag color="success" style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }} onClick={handleTriggerSubmit}>
                ⚡ <strong style={{ color: '#15803d' }}>F4</strong> ضرب الفاتورة / ترحيل
              </Tag>
            </Space>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width="95vw"
        style={{ top: 12, maxWidth: 1440, paddingBottom: 0 }}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateTransfer}>
          {/* Header Card: Sender, Receiver, Date, Driver */}
          <Card
            size="small"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: 14
            }}
          >
            <Row gutter={[12, 10]}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="from_branch_id"
                  label={<strong>المخزن / الفرع المنصرف منه (المصدر) *</strong>}
                  rules={[{ required: true, message: 'يرجى تحديد الجهة الصارفة' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    size="large"
                    placeholder="اختر المخزن المنصرف منه"
                    style={{ width: '100%' }}
                    onChange={() => setTransferItems([])}
                  >
                    {branches.map((b) => (
                      <Option key={b.id} value={b.id} disabled={b.id === selectedToBranch}>
                        {b.branch_name} ({b.branch_code}) - {b.branch_type === 'main_warehouse' ? 'مستودع رئيسي' : 'فرع'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="to_branch_id"
                  label={<strong>المخزن / الفرع المستلم (الوجهة) *</strong>}
                  rules={[{ required: true, message: 'يرجى تحديد جهة الاستلام' }]}
                  style={{ marginBottom: 0 }}
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

              <Col xs={24} sm={8} md={4}>
                <Form.Item
                  name="transfer_date"
                  label={<strong>تاريخ إذن الصرف *</strong>}
                  rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker size="large" style={{ width: '100%' }} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8} md={4}>
                <Form.Item name="driver_name" label="مندوب النقل / السائق" style={{ marginBottom: 0 }}>
                  <Input size="large" prefix={<CarOutlined style={{ color: '#94a3b8' }} />} placeholder="اسم السائق" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8} md={4}>
                <Form.Item name="vehicle_number" label="رقم وسيلة النقل / السيارة" style={{ marginBottom: 0 }}>
                  <Input size="large" placeholder="مثال: أ ب ج 123" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Action Ribbon & Stock Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '8px 14px',
              marginBottom: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0369a1', fontSize: 13 }}>
              <InfoCircleOutlined style={{ fontSize: 16 }} />
              <span>
                <strong>طريقة العمل السريعة:</strong> اضغط <strong>F11</strong> لإضافة سطر جديد، اكتب أو امسح الباركود، أو اضغط <strong>F1</strong> للبحث واختيار الصنف، ثم اضغط <strong>F4</strong> لحفظ وترحيل الإذن فوراً!
              </span>
            </div>

            <Space size={8}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddNewRow}
                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              >
                إضافة سطر جديد [F11]
              </Button>

              <Button
                icon={<SearchOutlined />}
                onClick={() => handleOpenSearchModal()}
                style={{ borderColor: '#6366f1', color: '#6366f1' }}
              >
                بحث واختيار صنف [F1]
              </Button>
            </Space>
          </div>

          {/* Lines Table (سطور الفاتورة والإذن) */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                <thead style={{ background: '#1e293b', color: '#f8fafc', position: 'sticky', top: 0, zIndex: 2 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', width: 45, textAlign: 'center' }}>#</th>
                    <th style={{ padding: '10px 12px', width: 220 }}>الباركود / الكود [Enter]</th>
                    <th style={{ padding: '10px 12px' }}>بيان الصنف والمتغير</th>
                    <th style={{ padding: '10px 12px', width: 140, textAlign: 'center' }}>الرصيد المتاح بالمخزن</th>
                    <th style={{ padding: '10px 12px', width: 130, textAlign: 'center' }}>الكمية المنصرفة</th>
                    <th style={{ padding: '10px 12px', width: 220 }}>ملاحظات السطر</th>
                    <th style={{ padding: '10px 8px', width: 50, textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {transferItems.map((item, idx) => {
                    const hasProduct = Boolean(item.product_id);
                    const isOverStock = hasProduct && item.quantity > item.available_qty;

                    return (
                      <tr
                        key={item.key}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: activeRowKey === item.key ? '#f0f9ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                        onClick={() => setActiveRowKey(item.key)}
                      >
                        {/* Seq # */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                          {idx + 1}
                        </td>

                        {/* Barcode / Code Scanner Input with inline F1 picker */}
                        <td style={{ padding: '8px 10px' }}>
                          <Input
                            ref={(el) => (rowBarcodeRefs.current[item.key] = el)}
                            size="middle"
                            placeholder="امسح الباركود أو F1"
                            prefix={<BarcodeOutlined style={{ color: '#94a3b8' }} />}
                            value={item.barcode_input}
                            onChange={(e) => handleUpdateItemBarcodeInput(item.key, e.target.value)}
                            onKeyDown={(e) => handleBarcodeKeyDown(e, item.key, item.barcode_input)}
                            addonAfter={
                              <Tooltip title="فتح شاشة البحث عن الأصناف (F1)">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<SearchOutlined style={{ color: '#6366f1' }} />}
                                  onClick={() => handleOpenSearchModal(item.key)}
                                  style={{ border: 'none', padding: 0 }}
                                />
                              </Tooltip>
                            }
                          />
                        </td>

                        {/* Product & Variant Details */}
                        <td style={{ padding: '8px 10px' }}>
                          {hasProduct ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt=""
                                  style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                />
                              ) : (
                                <Avatar shape="square" size={36} icon={<ShopOutlined />} style={{ backgroundColor: '#e2e8f0', color: '#64748b' }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                                  {item.display_name || item.product_name}
                                </div>
                                <Space size={4} style={{ marginTop: 2, flexWrap: 'wrap' }}>
                                  {item.color && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{item.color}</Tag>}
                                  {item.size && <Tag color="purple" style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>{item.size}</Tag>}
                                  <Text code style={{ fontSize: 11 }}>{item.barcode || item.product_code}</Text>
                                  {item.category_name && <Tag style={{ fontSize: 10, margin: 0 }}>{item.category_name}</Tag>}
                                </Space>
                              </div>
                              <Button
                                size="small"
                                type="link"
                                onClick={() => handleOpenSearchModal(item.key)}
                                style={{ fontSize: 11, padding: 0 }}
                              >
                                تغيير
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleOpenSearchModal(item.key)}
                              style={{
                                cursor: 'pointer',
                                color: '#6366f1',
                                border: '1px dashed #c7d2fe',
                                borderRadius: 6,
                                padding: '6px 12px',
                                background: '#f5f3ff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <SearchOutlined />
                              <span>اضغط هنا أو F1 لاختيار الصنف من المخزن</span>
                            </div>
                          )}
                        </td>

                        {/* Available Stock */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {hasProduct ? (
                            <Tag color="cyan" style={{ fontSize: 12, padding: '2px 8px', fontWeight: 'bold' }}>
                              {item.available_qty} قطعة
                            </Tag>
                          ) : (
                            <Text type="secondary">-</Text>
                          )}
                        </td>

                        {/* Quantity Input */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {hasProduct ? (
                            <div>
                              <InputNumber
                                ref={(el) => (rowQtyRefs.current[item.key] = el)}
                                min={1}
                                max={item.available_qty}
                                value={item.quantity}
                                onChange={(qty) => handleUpdateItemQty(item.key, qty)}
                                status={isOverStock ? 'error' : ''}
                                style={{ width: 85, fontWeight: 'bold' }}
                                onPressEnter={handleAddNewRow}
                              />
                              {isOverStock && (
                                <div style={{ color: '#ef4444', fontSize: 10, marginTop: 2 }}>يتجاوز المتاح!</div>
                              )}
                            </div>
                          ) : (
                            <InputNumber disabled style={{ width: 85 }} />
                          )}
                        </td>

                        {/* Row Notes */}
                        <td style={{ padding: '8px 10px' }}>
                          <Input
                            placeholder="ملاحظات الصنف..."
                            value={item.notes}
                            onChange={(e) => handleUpdateItemNotes(item.key, e.target.value)}
                          />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveRow(item.key)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Row Insertion Bar */}
            <div
              style={{
                background: '#f8fafc',
                padding: '8px 12px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddNewRow}
                style={{ borderColor: '#2563eb', color: '#2563eb', fontWeight: 600 }}
              >
                + إضافة سطر جديد فارغ (F11)
              </Button>

              <div style={{ fontSize: 12, color: '#64748b' }}>
                عدد السطور في الإذن: <strong>{transferItems.length}</strong> (الأصناف الصالحة: <strong>{validTransferItems.length}</strong>)
              </div>
            </div>
          </div>

          {/* Footer Bar: Voucher Notes, Live KPI Summary & Submit Button [F4] */}
          <Row gutter={16} align="bottom">
            <Col xs={24} md={12}>
              <Form.Item name="notes" label="ملاحظات عامة على إذن الصرف والتوزيع" style={{ marginBottom: 0 }}>
                <TextArea rows={2} placeholder="أي تعليمات إضافية بخصوص النقل أو التسليم..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <div
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '12px 18px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>إجمالي الأصناف والقطع المراد صرفها:</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
                    <span style={{ fontSize: 14 }}>
                      الأصناف: <strong style={{ color: '#38bdf8' }}>{validTransferItems.length}</strong>
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>
                      إجمالي القطع: <strong style={{ color: '#4ade80', fontSize: 22 }}>{totalUnits}</strong> قطعة
                    </span>
                  </div>
                </div>

                <Space size={10}>
                  <Button size="large" onClick={() => setCreateModalVisible(false)} style={{ borderRadius: 6 }}>
                    إلغاء [Esc]
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    loading={submitting}
                    onClick={handleTriggerSubmit}
                    disabled={validTransferItems.length === 0}
                    style={{
                      backgroundColor: '#16a34a',
                      borderColor: '#16a34a',
                      fontWeight: 'bold',
                      fontSize: 15,
                      padding: '0 24px',
                      height: 44,
                      borderRadius: 6,
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)'
                    }}
                  >
                    ضرب الفاتورة وترحيل الإذن [F4]
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* 🔍 LARGE PRODUCT SEARCH & PICKER MODAL (F1) */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#ede9fe', color: '#7c3aed', padding: '6px 10px', borderRadius: 8, fontSize: 18 }}>
                <SearchOutlined />
              </div>
              <div>
                <span style={{ fontSize: 17, fontWeight: 'bold' }}>
                  البحث السريع عن الأصناف واختيارها من المخزن المنصرف منه
                </span>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  المخزن: {branches.find((b) => b.id === selectedFromBranch)?.branch_name || 'غير محدد'} | متوفر بالمخزن: {availableStock.length} صنف
                </div>
              </div>
            </div>

            <Tag color="purple" style={{ fontSize: 12 }}>
              اضغط <strong>[Enter]</strong> أو انقر على الصنف لاختياره فوراً
            </Tag>
          </div>
        }
        open={searchModalVisible}
        onCancel={() => setSearchModalVisible(false)}
        footer={null}
        width={1120}
        style={{ top: 20 }}
        destroyOnHidden
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search Bar & Category Filter */}
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={24} md={14}>
                <Input
                  ref={modalSearchInputRef}
                  size="large"
                  placeholder="ابحث باسم الصنف، الباركود، الكود، اللون، المقاس..."
                  prefix={<SearchOutlined style={{ color: '#7c3aed', fontSize: 18 }} />}
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  allowClear
                  autoFocus
                />
              </Col>

              <Col xs={24} md={10}>
                <Select
                  size="large"
                  value={modalCategoryFilter}
                  onChange={setModalCategoryFilter}
                  style={{ width: '100%' }}
                  placeholder="تصفية حسب التصنيف"
                >
                  <Option value="all">كافة التصنيفات والأقسام ({availableStock.length})</Option>
                  {availableCategories.map((cat) => (
                    <Option key={cat} value={cat}>
                      {cat} ({availableStock.filter((s) => s.category_name === cat).length})
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </div>

          {/* Product Results Table */}
          <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
              <thead style={{ background: '#0f172a', color: '#ffffff', position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th style={{ padding: '10px 12px', width: 60, textAlign: 'center' }}>صورة</th>
                  <th style={{ padding: '10px 12px', width: 140 }}>الكود / الباركود</th>
                  <th style={{ padding: '10px 12px' }}>اسم الصنف</th>
                  <th style={{ padding: '10px 12px', width: 140 }}>القسم / التصنيف</th>
                  <th style={{ padding: '10px 12px', width: 150 }}>المتغير (لون / مقاس)</th>
                  <th style={{ padding: '10px 12px', width: 130, textAlign: 'center' }}>الرصيد المتاح</th>
                  <th style={{ padding: '10px 12px', width: 110, textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredModalProducts.map((p, pIdx) => {
                  const isAlreadyAdded = transferItems.some(
                    (it) => it.product_id === p.product_id && (it.variant_id || null) === (p.variant_id || null)
                  );

                  return (
                    <tr
                      key={`${p.product_id}-${p.variant_id || '0'}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isAlreadyAdded ? '#f0fdf4' : pIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        cursor: 'pointer'
                      }}
                      onDoubleClick={() => handleSelectProductFromModal(p)}
                    >
                      {/* Image */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          />
                        ) : (
                          <Avatar shape="square" size={38} icon={<ShopOutlined />} style={{ backgroundColor: '#e2e8f0', color: '#64748b' }} />
                        )}
                      </td>

                      {/* Code / Barcode */}
                      <td style={{ padding: '8px 10px' }}>
                        <Text strong code style={{ fontSize: 12 }}>
                          {p.variant_sku || p.barcode || p.product_code}
                        </Text>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.product_name}</div>
                        {isAlreadyAdded && (
                          <Tag color="success" style={{ fontSize: 10, marginTop: 2 }}>مضاف مسبقاً بالإذن</Tag>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>
                        {p.category_name || '-'}
                      </td>

                      {/* Variant */}
                      <td style={{ padding: '8px 10px' }}>
                        <Space size={4}>
                          {p.color && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{p.color}</Tag>}
                          {p.size && <Tag color="purple" style={{ fontSize: 11, margin: 0, fontWeight: 600 }}>{p.size}</Tag>}
                        </Space>
                      </td>

                      {/* Available Qty */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <Tag color="cyan" style={{ fontSize: 12, fontWeight: 'bold', padding: '2px 8px' }}>
                          {p.available_qty} قطعة
                        </Tag>
                      </td>

                      {/* Select Action */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <Button
                          type="primary"
                          size="small"
                          icon={<EnterOutlined />}
                          onClick={() => handleSelectProductFromModal(p)}
                          style={{
                            backgroundColor: isAlreadyAdded ? '#16a34a' : '#2563eb',
                            borderColor: isAlreadyAdded ? '#16a34a' : '#2563eb'
                          }}
                        >
                          اختيار
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredModalProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px 0', textAlign: 'center' }}>
                      <Empty description="لم يتم العثور على أصناف مطابقة في رصيد هذا المخزن" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer inside F1 modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
            <span>
              إجمالي النتائج المطابقة: <strong>{filteredModalProducts.length}</strong> صنف متوفر
            </span>
            <Button onClick={() => setSearchModalVisible(false)}>إغلاق [Esc]</Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 👁️ REVIEW & INSPECT TRANSFER MODAL */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EyeOutlined style={{ color: '#6366f1', fontSize: 20 }} />
              <span style={{ fontSize: 17, fontWeight: 'bold' }}>
                معاينة ومراجعة إذن الصرف والتوزيع رقم {reviewedTransfer?.transfer_number}
              </span>
            </div>
            {reviewedTransfer && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                مكتمل ومُرحّل
              </Tag>
            )}
          </div>
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              تاريخ الإنشاء: {reviewedTransfer?.created_at ? dayjs(reviewedTransfer.created_at).format('YYYY-MM-DD HH:mm') : '—'}
            </span>
            <Space>
              <Button onClick={() => setReviewModalVisible(false)}>إغلاق</Button>
              {reviewedTransfer && (
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={() => {
                    setReviewModalVisible(false);
                    handleViewPrint(reviewedTransfer.id);
                  }}
                  style={{ backgroundColor: '#1e293b' }}
                >
                  طباعة الإذن الرسمي A4
                </Button>
              )}
            </Space>
          </div>
        }
        width={900}
        destroyOnHidden
      >
        {reviewLoading || !reviewedTransfer ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>جاري تحميل تفاصيل الإذن...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header Voucher Info */}
            <Card size="small" style={{ background: '#f8fafc', borderRadius: 8 }}>
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>المخزن المنصرف منه (المصدر):</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: '#0f172a', marginTop: 2 }}>
                    {reviewedTransfer.from_branch_name} ({reviewedTransfer.from_branch_code})
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>المخزن المستلم (الوجهة):</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: '#16a34a', marginTop: 2 }}>
                    {reviewedTransfer.to_branch_name} ({reviewedTransfer.to_branch_code})
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>تاريخ الصرف والتسليم:</Text>
                  <div style={{ fontWeight: 'bold', fontSize: 14, marginTop: 2 }}>
                    {dayjs(reviewedTransfer.transfer_date).format('YYYY-MM-DD')}
                  </div>
                </Col>

                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>مندوب النقل / السائق:</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {reviewedTransfer.driver_name || 'غير محدد'}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>وسيلة النقل / السيارة:</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {reviewedTransfer.vehicle_number || 'غير محدد'}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>المسؤول المنشئ:</Text>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {reviewedTransfer.created_by_name || 'الإدارة'}
                  </div>
                </Col>

                {reviewedTransfer.notes && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 12 }}>ملاحظات عامة:</Text>
                    <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', marginTop: 2 }}>
                      {reviewedTransfer.notes}
                    </div>
                  </Col>
                )}
              </Row>
            </Card>

            {/* Dispatched Items Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text strong style={{ fontSize: 14 }}>الأصناف والكميات المنصرفة في هذا الإذن:</Text>
                <Space>
                  <Tag color="blue">{reviewedTransfer.items?.length || 0} أصناف مختلفة</Tag>
                  <Tag color="green">{reviewedTransfer.total_units || 0} قطعة إجمالية</Tag>
                </Space>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <thead style={{ background: '#0f172a', color: '#ffffff' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', width: 40, textAlign: 'center' }}>#</th>
                    <th style={{ padding: '8px 10px', width: 50, textAlign: 'center' }}>صورة</th>
                    <th style={{ padding: '8px 10px' }}>اسم الصنف والكود</th>
                    <th style={{ padding: '8px 10px', width: 140 }}>المتغير (لون / مقاس)</th>
                    <th style={{ padding: '8px 10px', width: 110, textAlign: 'center' }}>الكمية المنقولة</th>
                    <th style={{ padding: '8px 10px', width: 160 }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(reviewedTransfer.items || []).map((item, i) => (
                    <tr key={item.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                        ) : (
                          <Avatar shape="square" size={32} icon={<ShopOutlined />} />
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <Text code style={{ fontSize: 11 }}>{item.variant_sku || item.product_code || item.barcode}</Text>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <Space size={4}>
                          {item.color && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{item.color}</Tag>}
                          {item.size && <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>{item.size}</Tag>}
                          {!item.color && !item.size && <Text type="secondary">—</Text>}
                        </Space>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <Tag color="cyan" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px' }}>
                          {item.quantity} قطعة
                        </Tag>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 12 }}>
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 🖨️ PRINTABLE A4 DISPATCH NOTE MODAL */}
      {/* ========================================================================= */}
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
