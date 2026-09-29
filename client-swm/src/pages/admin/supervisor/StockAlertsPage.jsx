import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Table,
  Button,
  Typography,
  Space,
  Badge,
  Spin,
  Empty
} from 'antd';
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  Search,
  ArrowRight,
  Package,
  Layers,
  RefreshCw,
  Building,
  RotateCcw
} from 'lucide-react';
import api from '../../../api';
import yokaLogo from '../../../assets/yokaStoreTransparent.png';

const { Title, Text, Paragraph } = Typography;

export default function StockAlertsPage({ currentUser }) {
  const navigate = useNavigate();
  const branchId = currentUser?.branch_id || currentUser?.branchId || 1;
  const branchName = currentUser?.branch_name || currentUser?.branchName || 'الفرع الحالي';

  const [loading, setLoading] = useState(false);
  const [alertsData, setAlertsData] = useState({ summary: {}, items: [] });
  const [filterType, setFilterType] = useState('all'); // 'all' | 'out_of_stock' | 'low_stock'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/products/stock-alerts', {
        params: { branch_id: branchId }
      });
      if (res.data.success) {
        setAlertsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stock alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [branchId]);

  const handleBack = () => {
    if (currentUser?.role === 'salesperson') {
      navigate('/pos');
    } else if (currentUser?.role === 'supervisor') {
      navigate('/supervisor-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const summary = alertsData.summary || {
    total_alerts: 0,
    out_of_stock_count: 0,
    low_stock_count: 0
  };

  // Filter items in memory based on filterType and searchQuery
  const filteredItems = (alertsData.items || []).filter((item) => {
    if (filterType === 'out_of_stock' && item.system_qty > 0) return false;
    if (filterType === 'low_stock' && (item.system_qty <= 0 || item.system_qty > 2)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (item.product_name || '').toLowerCase();
      const code = (item.product_code || '').toLowerCase();
      const barcode = (item.barcode || '').toLowerCase();
      const cat = (item.category_name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || barcode.includes(q) || cat.includes(q);
    }
    return true;
  });

  const columns = [
    {
      title: 'كود / باركود الصنف',
      key: 'code',
      width: 170,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
            {r.product_code || '---'}
          </div>
          {r.barcode && (
            <div style={{ fontSize: 11, color: '#64748b' }}>
              باركود: {r.barcode}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'اسم الصنف والمواصفات',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (val, r) => (
        <div>
          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 14 }}>
            {val}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {r.category_name && (
              <Tag color="geekblue" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                {r.category_name}
              </Tag>
            )}
            {r.color && (
              <Tag color="default" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                اللون: {r.color}
              </Tag>
            )}
            {r.size && (
              <Tag color="default" style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                المقاس: {r.size}
              </Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'الرصيد المتبقي (الكمية)',
      dataIndex: 'system_qty',
      key: 'system_qty',
      width: 160,
      align: 'center',
      render: (qty) => {
        const num = parseInt(qty || 0, 10);
        if (num <= 0) {
          return (
            <Tag
              color="error"
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <XCircle size={15} />
              <span>نفد (0 قطع)</span>
            </Tag>
          );
        }
        return (
          <Tag
            color="warning"
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <AlertTriangle size={15} />
            <span>حرج ({num} {num === 1 ? 'قطعة' : 'قطع'})</span>
          </Tag>
        );
      }
    },
    {
      title: 'سعر البيع للجمهور',
      dataIndex: 'selling_price',
      key: 'selling_price',
      width: 140,
      align: 'left',
      render: (v) => (
        <strong style={{ color: '#0f172a', fontSize: 13.5 }}>
          {parseFloat(v || 0).toLocaleString()} ج.م
        </strong>
      )
    },
    {
      title: 'حالة الصنف',
      key: 'status',
      width: 140,
      render: (_, r) => {
        const isOut = parseInt(r.system_qty || 0, 10) <= 0;
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 700,
              color: isOut ? '#dc2626' : '#d97706'
            }}
          >
            {isOut ? 'غير متاح للبيع الفوري' : 'متبقي كمية محدودة'}
          </span>
        );
      }
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* ─── Top Header ───────────────────────────────────────── */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={yokaLogo} alt="Yoka Store" style={{ height: 36, objectFit: 'contain' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                لوحة تنبيهات ونواقص المخزون
              </span>
              <Tag color="volcano" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6, margin: 0 }}>
                حرج وعاجل
              </Tag>
              <Tag color="blue" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6, margin: 0 }}>
                <Building size={12} style={{ marginLeft: 4 }} />
                {branchName}
              </Tag>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              متابعة الأصناف المنتهية والكميات الحرجة لتفادي نفاد المنتجات
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<RefreshCw size={15} style={{ marginLeft: 6 }} />}
            onClick={fetchAlerts}
            loading={loading}
          >
            تحديث
          </Button>

          <Button
            type="primary"
            icon={<ArrowRight size={16} style={{ marginLeft: 6 }} />}
            onClick={handleBack}
            style={{
              backgroundColor: '#4f46e5',
              borderColor: '#4f46e5',
              borderRadius: 8,
              fontWeight: 700
            }}
          >
            {currentUser?.role === 'salesperson' ? 'العودة لنقاط البيع (POS)' : 'العودة للوحة المشرف'}
          </Button>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: '28px 24px 48px',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* KPI Alert Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Card 1: Total Alerts */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => setFilterType('all')}
              style={{
                background: filterType === 'all' ? '#eff6ff' : '#ffffff',
                border: `2px solid ${filterType === 'all' ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 700 }}>
                  إجمالي الأصناف الواجب متابعتها
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}
                >
                  <Layers size={20} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#1e3a8a', margin: '10px 0 4px' }}>
                {summary.total_alerts}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                كل الأصناف التي تقل كمياتها عن أو تساوي قطعتين
              </div>
            </div>
          </Col>

          {/* Card 2: Out of Stock (Quantity = 0) */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => setFilterType('out_of_stock')}
              style={{
                background: filterType === 'out_of_stock' ? '#fef2f2' : '#ffffff',
                border: `2px solid ${filterType === 'out_of_stock' ? '#ef4444' : '#fecaca'}`,
                borderRadius: 14,
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>
                  أصناف نفدت بالكامل (0 قطع)
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}
                >
                  <XCircle size={20} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#b91c1c', margin: '10px 0 4px' }}>
                {summary.out_of_stock_count}
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c' }}>
                رصيد المخزن الفعلي = صفر، يتطلب طلب توريد فوري
              </div>
            </div>
          </Col>

          {/* Card 3: Low Stock (Quantity <= 2) */}
          <Col xs={24} sm={8}>
            <div
              onClick={() => setFilterType('low_stock')}
              style={{
                background: filterType === 'low_stock' ? '#fffbeb' : '#ffffff',
                border: `2px solid ${filterType === 'low_stock' ? '#f59e0b' : '#fde68a'}`,
                borderRadius: 14,
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>
                  أوشكت على النفاد (1 أو 2 قطعة)
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706'
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#b45309', margin: '10px 0 4px' }}>
                {summary.low_stock_count}
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>
                كمية حرجة متبقية (قطعة أو قطعتين فقط بالفرع)
              </div>
            </div>
          </Col>
        </Row>

        {/* Filters & Search Control Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
            <Input
              placeholder="ابحث بالاسم، كود الصنف، الباركود، أو التصنيف..."
              prefix={<Search size={16} style={{ color: '#94a3b8', marginLeft: 6 }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ borderRadius: 8, height: 40 }}
            />
          </div>

          <Space>
            <Button
              type={filterType === 'all' ? 'primary' : 'default'}
              onClick={() => setFilterType('all')}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              الكل ({alertsData.items?.length || 0})
            </Button>
            <Button
              type={filterType === 'out_of_stock' ? 'primary' : 'default'}
              danger={filterType === 'out_of_stock'}
              onClick={() => setFilterType('out_of_stock')}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              نفد بالكامل ({summary.out_of_stock_count || 0})
            </Button>
            <Button
              type={filterType === 'low_stock' ? 'primary' : 'default'}
              onClick={() => setFilterType('low_stock')}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                backgroundColor: filterType === 'low_stock' ? '#d97706' : undefined,
                borderColor: filterType === 'low_stock' ? '#d97706' : undefined,
                color: filterType === 'low_stock' ? '#ffffff' : undefined
              }}
            >
              وشك على النفاد ({summary.low_stock_count || 0})
            </Button>
          </Space>
        </div>

        {/* Alerts Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)'
          }}
        >
          <Table
            loading={loading}
            dataSource={filteredItems}
            columns={columns}
            rowKey={(r) => `${r.id}-${r.variant_id || 0}`}
            pagination={{ pageSize: 12, showSizeChanger: true }}
            locale={{
              emptyText: (
                <Empty
                  description="لا توجد أصناف تنطبق عليها شروط النواقص أو التنبيهات في هذا النطاق"
                  style={{ padding: '36px 0' }}
                />
              )
            }}
          />
        </div>
      </main>
    </div>
  );
}
