import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import {
  Card,
  Table,
  Tag,
  Switch,
  Button,
  Input,
  Select,
  Space,
  Row,
  Col,
  Typography,
  message,
  Statistic,
  Badge,
  Tooltip,
  Avatar,
  Modal,
  Divider,
  Empty,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShopOutlined,
  AppstoreOutlined,
  InboxOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  CheckSquareOutlined,
  BorderOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function EcomInventory({ currentUser, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total_products: 0,
    total_units: 0,
    listed_count: 0,
    unlisted_count: 0
  });
  const [branchInfo, setBranchInfo] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(undefined);
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'true' | 'false'
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock'
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Single toggle loading & selection for batch
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Variant Modal Preview
  const [selectedProductVariants, setSelectedProductVariants] = useState(null);
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  // Fetch Categories for Filter
  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/swm/categories');
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      // Fallback: categories not blocking
    }
  };

  // Fetch E-Com Warehouse Stock & Listing
  const fetchStock = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        search: search || undefined,
        category_id: categoryFilter || undefined,
        is_ecom_listed: listingFilter === 'all' ? undefined : listingFilter,
        stock_filter: stockFilter,
        branch_id: currentUser?.branchId || undefined
      };

      const res = await api.get('/api/swm/products/ecom-warehouse-stock', { params });
      if (res.data.success) {
        setProducts(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.branch) setBranchInfo(res.data.branch);
        setPagination(prev => ({
          ...prev,
          current: res.data.meta.page,
          total: res.data.meta.total
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل مخزون ومعروضات المستودع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchStock(1);
  }, [search, categoryFilter, listingFilter, stockFilter]);

  // Toggle single product visibility
  const handleToggleListing = async (productId, nextState) => {
    setUpdatingId(productId);
    try {
      const res = await api.patch(`/api/swm/products/${productId}/ecom-listing`, {
        is_ecom_listed: nextState
      });
      if (res.data.success) {
        message.success(res.data.message);
        // Optimistic update
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_ecom_listed: nextState } : p));
        // Update stats
        setStats(prev => ({
          ...prev,
          listed_count: nextState ? prev.listed_count + 1 : Math.max(0, prev.listed_count - 1),
          unlisted_count: !nextState ? prev.unlisted_count + 1 : Math.max(0, prev.unlisted_count - 1)
        }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحديث حالة عرض الصنف');
    } finally {
      setUpdatingId(null);
    }
  };

  // Batch Toggle Listing
  const handleBatchToggle = async (nextState) => {
    if (selectedRowKeys.length === 0) {
      return message.warning('يرجى تحديد صنف واحد على الأقل');
    }

    setBatchLoading(true);
    try {
      const res = await api.patch('/api/swm/products/batch-ecom-listing', {
        product_ids: selectedRowKeys,
        is_ecom_listed: nextState
      });
      if (res.data.success) {
        message.success(res.data.message);
        setSelectedRowKeys([]);
        fetchStock(pagination.current);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تنفيذ الإجراء الجماعي');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleOpenVariantsModal = (record) => {
    setSelectedProductVariants(record);
    setVariantModalOpen(true);
  };

  const columns = [
    {
      title: 'الصورة',
      dataIndex: 'featured_image',
      key: 'featured_image',
      width: 70,
      align: 'center',
      render: (img, r) => (
        <Avatar
          shape="square"
          size={50}
          src={img}
          icon={<ShopOutlined />}
          style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', objectFit: 'cover' }}
        />
      )
    },
    {
      title: 'الصنف وبياناته',
      key: 'product_info',
      width: 280,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.product_name}</div>
          <Space size={4} style={{ marginTop: 3, flexWrap: 'wrap' }}>
            {r.category_name && <Tag color="blue" style={{ margin: 0 }}>{r.category_name}</Tag>}
            {r.brand && <Tag color="default" style={{ margin: 0 }}>{r.brand}</Tag>}
            <Text code style={{ fontSize: 11 }}>{r.product_code || r.barcode}</Text>
          </Space>
        </div>
      )
    },
    {
      title: 'سعر البيع',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 120,
      render: (p) => (
        <Text strong style={{ fontSize: 14, color: '#1e293b' }}>
          {(parseFloat(p) || 0).toLocaleString()} ج.م
        </Text>
      )
    },
    {
      title: 'الرصيد المتاح بالمستودع',
      dataIndex: 'warehouse_stock',
      key: 'warehouse_stock',
      width: 160,
      render: (qty, r) => {
        const stockNum = parseInt(qty, 10) || 0;
        let color = '#16a34a';
        let bg = '#ecfdf5';
        let text = `${stockNum} قطعة متوفرة`;

        if (stockNum === 0) {
          color = '#dc2626';
          bg = '#fef2f2';
          text = 'نفذ من المستودع (0)';
        } else if (stockNum <= 5) {
          color = '#ea580c';
          bg = '#fff7ed';
          text = `${stockNum} قطع (رصيد حرج)`;
        }

        return (
          <div>
            <div style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 6,
              background: bg,
              color,
              fontWeight: 700,
              fontSize: 12,
              border: `1px solid ${color}33`
            }}>
              {text}
            </div>
            {r.variant_count > 0 && (
              <div style={{ marginTop: 4 }}>
                <Button
                  type="link"
                  size="small"
                  icon={<Search size={12} />}
                  style={{ padding: 0, fontSize: 11, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleOpenVariantsModal(r)}
                >
                  تفاصيل {r.variant_count} مقاس ولون
                </Button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'توزيع المقاسات والألوان المتوفرة',
      key: 'variants_preview',
      render: (_, r) => {
        const variants = r.variants_stock || [];
        if (variants.length === 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>صنف أساسي بدون متغيرات</Text>;
        }

        const withStock = variants.filter(v => v.available_qty > 0);
        if (withStock.length === 0) {
          return <Tag color="error">لا يوجد رصيد لأي مقاس</Tag>;
        }

        return (
          <Space size={4} wrap>
            {withStock.slice(0, 4).map((v) => (
              <Tag key={v.variant_id} color="geekblue" style={{ fontSize: 11, margin: '2px 0' }}>
                {v.color || 'عام'} - {v.size || 'حر'}: <strong>{v.available_qty}</strong>
              </Tag>
            ))}
            {withStock.length > 4 && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0, fontSize: 11 }}
                onClick={() => handleOpenVariantsModal(r)}
              >
                +{withStock.length - 4} مقاسات أخرى
              </Button>
            )}
          </Space>
        );
      }
    },
    {
      title: 'العرض بالمتجر للعملاء',
      dataIndex: 'is_ecom_listed',
      key: 'is_ecom_listed',
      width: 170,
      align: 'center',
      render: (isListed, r) => {
        const isUpdating = updatingId === r.id;
        return (
          <Space orientation="vertical" size={2} align="center">
            <Switch
              checked={Boolean(isListed)}
              loading={isUpdating}
              checkedChildren="معروض"
              unCheckedChildren="مخفي"
              style={{
                backgroundColor: isListed ? '#16a34a' : '#94a3b8'
              }}
              onChange={(checked) => handleToggleListing(r.id, checked)}
            />
            <div style={{ marginTop: 4 }}>
              {isListed ? (
                <Tag color="green" icon={<GlobalOutlined />} style={{ fontSize: 11, margin: 0 }}>
                  معروض بالمتجر
                </Tag>
              ) : (
                <Tag color="default" icon={<CloseCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>
                  مخفي عن العملاء
                </Tag>
              )}
            </div>
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <GlobalOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            مخزون ومعروضات مستودع المتجر الإلكتروني
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            إدارة كافة المنتجات المتواجدة بمخزن {branchInfo?.branch_name || 'مستودع المتجر'} والتحكم الفوري في إظهارها أو إخفائها عن عملاء المتجر الإلكتروني
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchStock(pagination.current)}>
            تحديث القائمة
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 12 }}>إجمالي الأصناف بالمستودع</span>}
              value={stats.total_products}
              prefix={<AppstoreOutlined style={{ color: '#2563eb', marginLeft: 6 }} />}
              valueStyle={{ fontWeight: 800, color: '#0f172a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Statistic
              title={<span style={{ color: '#475569', fontSize: 12 }}>إجمالي القطع الجاهزة للطلب</span>}
              value={stats.total_units}
              prefix={<InboxOutlined style={{ color: '#059669', marginLeft: 6 }} />}
              valueStyle={{ fontWeight: 800, color: '#059669', fontSize: 22 }}
              suffix={<span style={{ fontSize: 13, color: '#64748b' }}>قطعة</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Statistic
              title={<span style={{ color: '#166534', fontSize: 12 }}>المعروض بالمتجر للعملاء</span>}
              value={stats.listed_count}
              prefix={<CheckCircleOutlined style={{ color: '#16a34a', marginLeft: 6 }} />}
              valueStyle={{ fontWeight: 800, color: '#15803d', fontSize: 22 }}
              suffix={<span style={{ fontSize: 13, color: '#166534' }}>صنف نشط</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <Statistic
              title={<span style={{ color: '#64748b', fontSize: 12 }}>المخفي من المتجر</span>}
              value={stats.unlisted_count}
              prefix={<CloseCircleOutlined style={{ color: '#94a3b8', marginLeft: 6 }} />}
              valueStyle={{ fontWeight: 800, color: '#475569', fontSize: 22 }}
              suffix={<span style={{ fontSize: 13, color: '#64748b' }}>صنف مخفي</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter & Batch Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={7}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="ابحث بالاسم أو كود الصنف أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="middle"
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="تصفية حسب القسم"
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
            >
              {categories.map((c) => (
                <Option key={c.id} value={c.id}>{c.category_name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={listingFilter}
              onChange={setListingFilter}
            >
              <Option value="all">كافة المعروضات (الكل)</Option>
              <Option value="true">
                <Space size={6} align="middle">
                  <Badge status="success" />
                  <span>المعروض بالمتجر فقط</span>
                </Space>
              </Option>
              <Option value="false">
                <Space size={6} align="middle">
                  <Badge status="default" />
                  <span>المخفي من المتجر فقط</span>
                </Space>
              </Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={stockFilter}
              onChange={setStockFilter}
            >
              <Option value="all">كافة مستويات الرصيد</Option>
              <Option value="in_stock">متوفر بالمستودع فقط (&gt; 0)</Option>
              <Option value="out_of_stock">نفذ من المستودع (0)</Option>
            </Select>
          </Col>
          <Col xs={12} md={4} style={{ textAlign: 'left' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              عدد النتائج: <strong>{pagination.total}</strong> صنف
            </Text>
          </Col>
        </Row>

        {/* Batch Operations Bar */}
        {selectedRowKeys.length > 0 && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <Space>
              <Badge count={selectedRowKeys.length} style={{ backgroundColor: '#2563eb' }} />
              <Text strong style={{ fontSize: 13 }}>أصناف محددة لتعديل حالة العرض الجماعي</Text>
            </Space>
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={batchLoading}
                onClick={() => handleBatchToggle(true)}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              >
                عرض المحددين بالمتجر
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                loading={batchLoading}
                onClick={() => handleBatchToggle(false)}
              >
                إخفاء المحددين من المتجر
              </Button>
              <Button onClick={() => setSelectedRowKeys([])}>
                إلغاء التحديد
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Main Table */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (p) => fetchStock(p),
            showTotal: (total) => `إجمالي الأصناف: ${total}`
          }}
          locale={{
            emptyText: <Empty description="لا توجد منتجات مسجلة في هذا المستودع تطابق معايير البحث" />
          }}
        />
      </Card>

      {/* Variant Details Modal */}
      <Modal
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              تفاصيل مقاسات وألوان: {selectedProductVariants?.product_name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              كود: {selectedProductVariants?.product_code} | إجمالي رصيد المستودع: <strong>{selectedProductVariants?.warehouse_stock} قطعة</strong>
            </div>
          </div>
        }
        open={variantModalOpen}
        onCancel={() => setVariantModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setVariantModalOpen(false)}>
            إغلاق
          </Button>
        ]}
        width={650}
      >
        <Table
          size="small"
          dataSource={selectedProductVariants?.variants_stock || []}
          pagination={false}
          rowKey="variant_id"
          columns={[
            {
              title: 'اللون',
              dataIndex: 'color',
              key: 'color',
              render: (c) => <Tag color="geekblue" style={{ fontSize: 12 }}>{c || 'عام'}</Tag>
            },
            {
              title: 'المقاس',
              dataIndex: 'size',
              key: 'size',
              render: (s) => <Tag color="purple" style={{ fontSize: 12, fontWeight: 700 }}>{s || 'حر'}</Tag>
            },
            {
              title: 'كود المتغير / SKU',
              dataIndex: 'sku',
              key: 'sku',
              render: (sku) => <Text code>{sku || '—'}</Text>
            },
            {
              title: 'الرصيد المتاح بالمستودع',
              dataIndex: 'available_qty',
              key: 'available_qty',
              align: 'center',
              render: (qty) => {
                const q = parseInt(qty, 10) || 0;
                return (
                  <Tag color={q > 0 ? 'green' : 'red'} style={{ fontWeight: 700, fontSize: 12 }}>
                    {q > 0 ? `${q} قطعة` : 'غير متوفر (0)'}
                  </Tag>
                );
              }
            }
          ]}
        />
      </Modal>
    </div>
  );
}
