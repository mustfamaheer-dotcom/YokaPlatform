import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  Tag,
  Typography,
  Space,
  Statistic,
  Segmented,
  Tooltip,
  Modal,
  Input,
  DatePicker
} from 'antd';
import { antMessage as message } from '../utils/antAppBridge';
import {
  ScheduleOutlined,
  DollarOutlined,
  CreditCardOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  RollbackOutlined,
  CalendarOutlined,
  SearchOutlined,
  FileTextOutlined,
  BankOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';
import { printHtmlContent } from '../utils/printUtils';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text } = Typography;
const { Option } = Select;

export default function DailyShift({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [staff, setStaff] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(
    currentUser?.branch_id || currentUser?.branchId ? String(currentUser?.branch_id || currentUser?.branchId) : 'all'
  );
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || !currentUser?.branch_id;

  // Table Filter: 'all' | 'sale' | 'return' | 'expense'
  const [txFilterType, setTxFilterType] = useState('all');
  const [txSearchText, setTxSearchText] = useState('');

  // POS Invoice / Return detail modal for reprint
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  // Shift Print Modal
  const [shiftPrintModalVisible, setShiftPrintModalVisible] = useState(false);
  const shiftPrintRef = useRef(null);

  // Fetch branches list for admin filter
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

  // Fetch branch staff for filter
  const fetchStaff = async () => {
    try {
      let bId = selectedBranch !== 'all' ? selectedBranch : (currentUser?.branch_id || currentUser?.branchId);
      const params = { status: 'active' };
      if (bId && bId !== 'all') {
        params.branch_id = bId;
      }
      const res = await api.get('/api/swm/users', { params });
      if (res.data.success) {
        const allUsers = res.data.data || [];
        const branchStaff = (bId && bId !== 'all')
          ? allUsers.filter((u) => Number(u.branch_id) === Number(bId))
          : allUsers;
        setStaff(branchStaff);
      }
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  };

  // Fetch shift summary for selected date and branch
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const params = {
        date: dateStr,
        branch_id: selectedBranch,
        salesperson_id: selectedSalesperson || undefined
      };
      const res = await api.get('/api/swm/pos/shift/summary', { params });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في جلب تقرير الوردية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [selectedBranch]);

  useEffect(() => {
    fetchSummary();
  }, [selectedBranch, selectedDate, selectedSalesperson]);

  // View & reprint POS invoice or return receipt
  const handleViewInvoice = async (invoiceId) => {
    try {
      const res = await api.get(`/api/swm/pos/invoices/${invoiceId}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
        setReceiptModalVisible(true);
      }
    } catch (err) {
      message.error('فشل في تحميل تفاصيل الفاتورة');
    }
  };

  const kpi = data?.kpi || {};
  const allTransactions = data?.all_transactions || [];

  // Filtered transactions for the detailed table
  const filteredTransactions = allTransactions.filter((tx) => {
    // Type filter
    if (txFilterType === 'sale' && tx.type !== 'sale') return false;
    if (txFilterType === 'return' && tx.type !== 'return') return false;
    if (txFilterType === 'expense' && !['expense', 'refunded_expense'].includes(tx.type)) return false;

    // Keyword search filter
    if (txSearchText && txSearchText.trim()) {
      const q = txSearchText.trim().toLowerCase();
      const matchNumber = (tx.number || '').toLowerCase().includes(q);
      const matchCustomer = (tx.customerOrRecipient || '').toLowerCase().includes(q);
      const matchPhone = (tx.phone || '').toLowerCase().includes(q);
      const matchStaff = (tx.salesperson || '').toLowerCase().includes(q);
      return matchNumber || matchCustomer || matchPhone || matchStaff;
    }

    return true;
  });

  // Detailed Transactions Table Columns
  const transactionColumns = [
    {
      title: 'نوع الحركة',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type, row) => {
        if (type === 'sale') {
          return (
            <Tag color="green" icon={<ShoppingCartOutlined />} style={{ fontWeight: 600, padding: '3px 8px' }}>
              فاتورة بيع
            </Tag>
          );
        }
        if (type === 'return') {
          return (
            <Tag color="error" icon={<RollbackOutlined />} style={{ fontWeight: 700, padding: '3px 8px' }}>
              فاتورة مرتجع
            </Tag>
          );
        }
        if (type === 'refunded_expense') {
          return (
            <Tag color="cyan" icon={<ArrowDownOutlined style={{ transform: 'rotate(180deg)' }} />} style={{ fontWeight: 600, padding: '3px 8px' }}>
              مصروف مرتد للدرج
            </Tag>
          );
        }
        return (
          <Tag color="orange" icon={<WalletOutlined />} style={{ fontWeight: 600, padding: '3px 8px' }}>
            {row.typeLabel || 'سحب مصروف'}
          </Tag>
        );
      }
    },
    {
      title: 'رقم المعاملة / السند',
      dataIndex: 'number',
      key: 'number',
      width: 160,
      render: (num) => <Text strong code style={{ fontSize: 13 }}>{num}</Text>
    },
    {
      title: 'الوقت والتاريخ',
      dataIndex: 'time',
      key: 'time',
      width: 140,
      render: (t) => (
        <div>
          <Text strong>{dayjs(t).format('HH:mm:ss')}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>{dayjs(t).format('YYYY-MM-DD')}</div>
        </div>
      )
    },
    {
      title: 'البيان / العميل / الموظف المعني',
      dataIndex: 'customerOrRecipient',
      key: 'customerOrRecipient',
      render: (text, row) => {
        if (row.type === 'expense' || row.type === 'refunded_expense') {
          return (
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{text || '-'}</div>
              {row.notes && row.notes !== text && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{row.notes}</div>
              )}
            </div>
          );
        }
        return (
          <div>
            <Text strong>{text || '-'}</Text>
            {row.phone && row.phone !== '-' && (
              <div style={{ fontSize: 11, color: '#059669' }}>هاتف: {row.phone}</div>
            )}
          </div>
        );
      }
    },
    {
      title: 'البائع / المسؤول',
      dataIndex: 'salesperson',
      key: 'salesperson',
      width: 140,
      render: (sp) => (
        <Space size={4}>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>{sp || 'الفرع'}</span>
        </Space>
      )
    },
    {
      title: 'طريقة الدفع / التفصيل',
      dataIndex: 'paymentBreakdown',
      key: 'paymentBreakdown',
      width: 170,
      render: (bd, row) => {
        let parsed = bd;
        if (typeof bd === 'string') {
          try { parsed = JSON.parse(bd); } catch (e) { parsed = {}; }
        }

        if (parsed && typeof parsed === 'object' && (parsed.cash || parsed.card || parsed.transfer)) {
          return (
            <Space direction="vertical" size={2}>
              {parseFloat(parsed.cash || 0) > 0 && (
                <Tag color="green">كاش: {parseFloat(parsed.cash).toFixed(2)} ج.م</Tag>
              )}
              {parseFloat(parsed.card || 0) > 0 && (
                <Tag color="blue">فيزا: {parseFloat(parsed.card).toFixed(2)} ج.م</Tag>
              )}
              {parseFloat(parsed.transfer || 0) > 0 && (
                <Tag color="purple">تحويل: {parseFloat(parsed.transfer).toFixed(2)} ج.م</Tag>
              )}
            </Space>
          );
        }

        return <Tag>{row.paymentMethod || 'نقدًا'}</Tag>;
      }
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amt, row) => (
        <Text
          strong
          style={{
            color: row.isPositive ? '#16a34a' : '#dc2626',
            fontSize: 15
          }}
        >
          {row.displayAmount || `${row.isPositive ? '+' : '-'}${Math.abs(parseFloat(amt)).toFixed(2)} ج.م`}
        </Text>
      )
    },
    {
      title: 'إجراءات',
      key: 'actions',
      width: 90,
      render: (_, row) => {
        if (row.type === 'sale' || row.type === 'return') {
          return (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handleViewInvoice(row.rawId)}
            >
              طباعة
            </Button>
          );
        }
        return (
          <Tooltip title={row.notes || row.customerOrRecipient}>
            <Button size="small" type="text" icon={<FileTextOutlined />} />
          </Tooltip>
        );
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Filter and Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <ScheduleOutlined style={{ marginLeft: 8, color: '#2563eb' }} />
            صفحة يومية البائع والوردية (Daily Shift Closing)
          </Title>
          <Text type="secondary">
            متابعة دقيقة لمبيعات الفرع، المرتجعات، المصروفات، وتسوية رصيد الدرج
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && (
            <Select
              placeholder="الفرع"
              value={selectedBranch}
              onChange={(val) => {
                setSelectedBranch(val);
                setSelectedSalesperson(null);
              }}
              style={{ width: 180 }}
            >
              <Option value="all">🏢 جميع الفروع (إجمالي)</Option>
              {branchesList.map((b) => (
                <Option key={b.id} value={String(b.id)}>
                  {b.branch_name}
                </Option>
              ))}
            </Select>
          )}

          <DatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d || dayjs())}
            format="YYYY-MM-DD"
            allowClear={false}
            style={{ width: 140 }}
          />

          <Select
            placeholder="جميع بائعي الفرع"
            value={selectedSalesperson}
            onChange={(val) => setSelectedSalesperson(val)}
            allowClear
            style={{ width: 170 }}
          >
            {staff.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.full_name || s.username}
              </Option>
            ))}
          </Select>

          <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>
            تحديث
          </Button>

          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => setShiftPrintModalVisible(true)}
            style={{ backgroundColor: '#0f172a' }}
          >
            طباعة تقرير الشيفت (A4)
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Summary Cards Row (KPIs) with DISTINCT RETURN CARD        */}
      {/* ========================================================= */}
      <Row gutter={[12, 12]}>
        {/* KPI 1: Total Sales */}
        <Col xs={24} sm={12} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Statistic
              title="إجمالي المبيعات المحققة"
              value={kpi.total_sales || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              عدد فواتير البيع: <strong>{kpi.completed_count || 0}</strong>
            </div>
          </Card>
        </Col>

        {/* KPI 2: DISTINCT RETURN CARD (مرتجع مبيعات) */}
        <Col xs={24} sm={12} md={5}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              borderTop: '4px solid #dc2626',
              background: (kpi.returns_total || 0) > 0 ? '#fff5f5' : '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <Statistic
              title={
                <span style={{ color: '#991b1b', fontWeight: 600 }}>
                  إجمالي المرتجعات (Returns)
                </span>
              }
              value={kpi.returns_total || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#dc2626', fontWeight: 'bold', fontSize: 20 }}
              prefix={<RollbackOutlined style={{ color: '#dc2626' }} />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span>عدد المرتجعات: <strong style={{ color: '#dc2626' }}>{kpi.returns_count || 0}</strong></span>
              <span style={{ color: '#dc2626' }}>مخصوم من الدرج</span>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Total Expenses */}
        <Col xs={24} sm={12} md={4}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Statistic
              title="صافي المصروفات والسحوبات"
              value={kpi.net_expenses || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#ea580c', fontWeight: 'bold', fontSize: 20 }}
              prefix={<WalletOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              عدد السندات: <strong>{kpi.total_expenses ? data?.expenses_count || 0 : 0}</strong>
            </div>
          </Card>
        </Col>

        {/* KPI 4: Net Shift Revenue */}
        <Col xs={24} sm={12} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderTop: '4px solid #059669', background: '#f0fdf4', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Statistic
              title="صافي إيراد الوردية (Net Revenue)"
              value={kpi.net_revenue || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#059669', fontWeight: 'bold', fontSize: 20 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              المبيعات - المرتجعات - المصروفات
            </div>
          </Card>
        </Col>

        {/* KPI 5: Expected Drawer Cash */}
        <Col xs={24} sm={12} md={5}>
          <Card size="small" style={{ borderRadius: 10, background: '#fffbeb', borderTop: '4px solid #d97706', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <Statistic
              title="النقدية المتوقعة بالدرج (Cash)"
              value={kpi.expected_drawer_cash || 0}
              precision={2}
              suffix="ج.م"
              valueStyle={{ color: '#b45309', fontWeight: 'bold', fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              رصيد البداية: <strong>{(kpi.opening_balance || 0).toFixed(0)} ج.م</strong> | كاش صافي
            </div>
          </Card>
        </Col>
      </Row>

      {/* ========================================================= */}
      {/* 2. Net Revenue Breakdown by Payment Methods (كاش، فيزا، تحويل) */}
      {/* ========================================================= */}
      {(() => {
        const netCash = kpi.net_cash_revenue !== undefined
          ? Number(kpi.net_cash_revenue)
          : (Number(kpi.cash_sales || 0) - Number(kpi.cash_returns || 0));
        const netCard = kpi.net_card_revenue !== undefined
          ? Number(kpi.net_card_revenue)
          : (Number(kpi.card_sales || 0) - Number(kpi.card_returns || 0));
        const netTransfer = kpi.net_transfer_revenue !== undefined
          ? Number(kpi.net_transfer_revenue)
          : (Number(kpi.transfer_sales || 0) - Number(kpi.transfer_returns || 0));
        const netTotalSalesRevenue = netCash + netCard + netTransfer;

        return (
          <Card
            size="small"
            style={{
              borderRadius: 10,
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <WalletOutlined style={{ color: '#0284c7' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    تقسيم صافي إيراد الوردية حسب وسائل الدفع (Net Revenue = Net Cash + Net Visa + Net Transfers)
                  </span>
                </Space>
                <Tag color="green" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                  صافي الإيراد المحقق: {(kpi.net_revenue !== undefined ? Number(kpi.net_revenue) : netTotalSalesRevenue).toFixed(2)} ج.م
                </Tag>
              </div>
            }
          >
            <Row gutter={[12, 12]}>
              {/* Metric 1: Net Cash (صافي الكاش) */}
              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderLeft: '5px solid #16a34a',
                    background: '#f0fdf4',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <Statistic
                    title={<span style={{ color: '#166534', fontWeight: 700 }}>💵 صافي الكاش (Net Cash)</span>}
                    value={netCash}
                    precision={2}
                    suffix="ج.م"
                    valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: 22 }}
                    prefix={<DollarOutlined />}
                  />
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                    مبيعات: +{(kpi.cash_sales || 0).toFixed(2)} | مرتجع: -{(kpi.cash_returns || 0).toFixed(2)} | مصاريف نقدية: -{(kpi.net_cash_expenses !== undefined ? kpi.net_cash_expenses : (kpi.net_expenses || 0)).toFixed(2)}
                  </div>
                </Card>
              </Col>

              {/* Metric 2: Net Visa / Card (صافي الفيزا) */}
              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderLeft: '5px solid #2563eb',
                    background: '#eff6ff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <Statistic
                    title={<span style={{ color: '#1e40af', fontWeight: 700 }}>💳 صافي الفيزا (Net Visa / Card)</span>}
                    value={netCard}
                    precision={2}
                    suffix="ج.م"
                    valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: 22 }}
                    prefix={<CreditCardOutlined />}
                  />
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                    مبيعات: +{(kpi.card_sales || 0).toFixed(2)} | مرتجع: -{(kpi.card_returns || 0).toFixed(2)}
                  </div>
                </Card>
              </Col>

              {/* Metric 3: Net Bank Transfers (صافي التحويلات) */}
              <Col xs={24} md={8}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    borderLeft: '5px solid #9333ea',
                    background: '#faf5ff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <Statistic
                    title={<span style={{ color: '#6b21a8', fontWeight: 700 }}>📱 صافي التحويلات (Net Bank Transfers)</span>}
                    value={netTransfer}
                    precision={2}
                    suffix="ج.م"
                    valueStyle={{ color: '#9333ea', fontWeight: 'bold', fontSize: 22 }}
                    prefix={<BankOutlined style={{ color: '#9333ea' }} />}
                  />
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                    مبيعات: +{(kpi.transfer_sales || 0).toFixed(2)} | مرتجع: -{(kpi.transfer_returns || 0).toFixed(2)}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* End-of-Day Drawer Cash Reconciliation Note */}
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a', fontSize: 12, color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span>
                <strong>مطابقة وموازنة نهاية اليوم (Accounting Audit):</strong> صافي الإيراد ({((kpi.net_revenue !== undefined ? Number(kpi.net_revenue) : (netCash + netCard + netTransfer))).toFixed(2)} ج.م) = صافي كاش ({netCash.toFixed(2)}) + صافي فيزا ({netCard.toFixed(2)}) + صافي تحويلات ({netTransfer.toFixed(2)})
              </span>
              <Tag color="orange" style={{ fontWeight: 600 }}>النقدية بالدرج: {(kpi.expected_drawer_cash || 0).toFixed(2)} ج.م (رصيد الافتتاح + صافي الكاش)</Tag>
            </div>
          </Card>
        );
      })()}

      {/* ========================================================= */}
      {/* Detailed Transactions Table (Directly below summary cards) */}
      {/* ========================================================= */}
      <Card
        size="small"
        style={{ borderRadius: 10 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '4px 0' }}>
            <Space size="middle" wrap>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                <ScheduleOutlined style={{ marginLeft: 6, color: '#2563eb' }} />
                جدول حركات ومعاملات الوردية التفصيلي (Detailed Transactions)
              </span>

              {/* Type Filter Buttons */}
              <Segmented
                value={txFilterType}
                onChange={setTxFilterType}
                options={[
                  { label: `الكل (${allTransactions.length})`, value: 'all' },
                  { label: `مبيعات (${kpi.completed_count || 0})`, value: 'sale' },
                  { label: `مرتجعات (${kpi.returns_count || 0})`, value: 'return' },
                  { label: `مصروفات (${data?.expenses_count || 0})`, value: 'expense' }
                ]}
              />
            </Space>

            <Input
              size="middle"
              placeholder="بحث برقم الفاتورة، العميل، أو البائع..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={txSearchText}
              onChange={(e) => setTxSearchText(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
          </div>
        }
      >
        <Table
          dataSource={filteredTransactions}
          columns={transactionColumns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 12 }}
          size="middle"
          bordered
        />
      </Card>

      {/* Thermal Receipt Print Modal */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={null}
        width={380}
        destroyOnHidden
      >
        <ThermalReceipt
          invoice={selectedInvoice}
          items={selectedInvoice?.items || []}
          onClose={() => setReceiptModalVisible(false)}
        />
      </Modal>

      {/* ========================================================= */}
      {/* Shift Closing Summary Print Modal (A4)                   */}
      {/* ========================================================= */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '96%' }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>معاينة وطباعة تقرير تقفيل وردية الفرع (A4)</span>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => {
                if (shiftPrintRef.current) {
                  printHtmlContent({
                    title: 'تقرير تقفيل وردية الكاشير - يوكا ستور',
                    htmlContent: shiftPrintRef.current.innerHTML,
                    pageType: 'a4'
                  });
                }
              }}
              style={{ backgroundColor: '#0f172a' }}
            >
              طباعة التقرير (A4)
            </Button>
          </div>
        }
        open={shiftPrintModalVisible}
        onCancel={() => setShiftPrintModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setShiftPrintModalVisible(false)}>إغلاق</Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              if (shiftPrintRef.current) {
                printHtmlContent({
                  title: 'تقرير تقفيل وردية الكاشير - يوكا ستور',
                  htmlContent: shiftPrintRef.current.innerHTML,
                  pageType: 'a4'
                });
              }
            }}
            style={{ backgroundColor: '#0f172a' }}
          >
            طباعة تقرير الشيفت
          </Button>
        ]}
        width={850}
        destroyOnHidden
      >
        <div ref={shiftPrintRef} style={{ padding: '6px', direction: 'rtl', color: '#0f172a' }}>
          {/* Header */}
          <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
            <div className="doc-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={yokaLogo} alt="Yoka Store" style={{ height: 48, maxWidth: 115, objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>شركة يوكا ستور — YOKA STORE</h1>
                <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>تقرير تقفيل الوردية وجرد النقدية وحركة المبيعات والمرتجعات اليومية</div>
                <div style={{ fontSize: 10.5, color: '#64748b' }}>
                  المسؤول / الكاشير: <strong>{selectedSalesperson ? staff.find(s => s.id === selectedSalesperson)?.full_name || 'موظف محدد' : 'كافة كاشيرات الفرع'}</strong>
                </div>
              </div>
            </div>
            <div className="doc-badge-box" style={{ textAlign: 'left' }}>
              <div style={{ display: 'inline-block', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 800, padding: '5px 14px', borderRadius: 6 }}>
                إغلاق وردية كاشير
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: '#64748b' }}>
                تاريخ الشيفت: {dayjs().format('YYYY-MM-DD')}
              </div>
            </div>
          </div>

          {/* Operational KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 6px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>إجمالي المبيعات</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.total_sales || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #fecaca', padding: '10px 6px', borderRadius: 8, textAlign: 'center', background: '#fff5f5' }}>
              <div style={{ fontSize: 10.5, color: '#dc2626', fontWeight: 700 }}>إجمالي المرتجعات</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.returns_total || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '10px 6px', borderRadius: 8, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>صافي المصروفات</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#ea580c', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.net_expenses || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '2px solid #059669', padding: '10px 6px', borderRadius: 8, textAlign: 'center', background: '#ecfdf5' }}>
              <div style={{ fontSize: 10.5, color: '#065f46', fontWeight: 800 }}>صافي إيراد الوردية</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#059669', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.net_revenue || 0).toLocaleString()} ج.م
              </div>
            </div>
            <div style={{ border: '1px solid #fde68a', padding: '10px 6px', borderRadius: 8, textAlign: 'center', background: '#fffbeb' }}>
              <div style={{ fontSize: 10.5, color: '#b45309', fontWeight: 800 }}>النقدية بالدرج</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#b45309', fontFamily: 'monospace', marginTop: 2 }}>
                {parseFloat(kpi.expected_drawer_cash || 0).toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Net Revenue Breakdown by Payment Method Box */}
          {(() => {
            const netCash = kpi.net_cash_revenue !== undefined
              ? Number(kpi.net_cash_revenue)
              : (Number(kpi.cash_sales || 0) - Number(kpi.cash_returns || 0));
            const netCard = kpi.net_card_revenue !== undefined
              ? Number(kpi.net_card_revenue)
              : (Number(kpi.card_sales || 0) - Number(kpi.card_returns || 0));
            const netTransfer = kpi.net_transfer_revenue !== undefined
              ? Number(kpi.net_transfer_revenue)
              : (Number(kpi.transfer_sales || 0) - Number(kpi.transfer_returns || 0));

            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                  تقسيم صافي إيراد الوردية (Net Revenue = Net Cash + Net Visa + Net Transfers):
                </div>
                <Row gutter={[12, 10]}>
                  <Col span={8}>
                    <div style={{ padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                      <div style={{ fontSize: 10.5, color: '#166534', fontWeight: 700 }}>صافي الكاش (Net Cash):</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                        {netCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </div>
                      <div style={{ fontSize: 9.5, color: '#64748b' }}>مبيعات: +{parseFloat(kpi.cash_sales || 0).toFixed(1)} | مرتجع: -{parseFloat(kpi.cash_returns || 0).toFixed(1)} | مصاريف: -{parseFloat(kpi.net_cash_expenses !== undefined ? kpi.net_cash_expenses : (kpi.net_expenses || 0)).toFixed(1)}</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ padding: '8px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                      <div style={{ fontSize: 10.5, color: '#1e40af', fontWeight: 700 }}>صافي الفيزا (Net Visa):</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', marginTop: 2 }}>
                        {netCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </div>
                      <div style={{ fontSize: 9.5, color: '#64748b' }}>مبيعات: +{parseFloat(kpi.card_sales || 0).toFixed(1)} | مرتجع: -{parseFloat(kpi.card_returns || 0).toFixed(1)}</div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ padding: '8px 10px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 6 }}>
                      <div style={{ fontSize: 10.5, color: '#6b21a8', fontWeight: 700 }}>صافي التحويلات (Net Transfers):</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#9333ea', fontFamily: 'monospace', marginTop: 2 }}>
                        {netTransfer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                      </div>
                      <div style={{ fontSize: 9.5, color: '#64748b' }}>مبيعات: +{parseFloat(kpi.transfer_sales || 0).toFixed(1)} | مرتجع: -{parseFloat(kpi.transfer_returns || 0).toFixed(1)}</div>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#0f172a', background: '#e2e8f0', padding: '4px 8px', borderRadius: 4 }}>
                  صافي الإيراد = {netCash.toFixed(2)} (كاش) + {netCard.toFixed(2)} (فيزا) + {netTransfer.toFixed(2)} (تحويلات) = {((kpi.net_revenue !== undefined ? Number(kpi.net_revenue) : (netCash + netCard + netTransfer))).toFixed(2)} ج.م
                </div>
              </div>
            );
          })()}

          {/* Drawer Reconciliation Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              مطابقة وتسوية درج الكاش والمتحصلات المالية (Cashier Drawer Reconciliation):
            </div>
            <Row gutter={[12, 10]}>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>كاش مبيعات:</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: 2 }}>
                    +{parseFloat(kpi.cash_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #fecaca', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#dc2626' }}>رد نقدية مرتجعات:</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', marginTop: 2 }}>
                    -{parseFloat(kpi.cash_returns || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>مدفوعات فيزا وبطاقات:</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.card_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ padding: '8px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>تحويلات ومحافظ:</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#7c3aed', fontFamily: 'monospace', marginTop: 2 }}>
                    {parseFloat(kpi.transfer_sales || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 14, borderTop: '1px dashed #94a3b8' }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>توقيع الكاشير المسلّم للوردية</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>توقيع مشرف الوردية / مدير الفرع</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 26 }}>المراجع المالي واستلام النقدية</div>
              <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: 10.5, color: '#64748b' }}>..........................................</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>تقرير تقفيل وردية رسمي صادر من منظومة Yoka SWM</span>
            <span>وقت وتاريخ الاستخراج: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
