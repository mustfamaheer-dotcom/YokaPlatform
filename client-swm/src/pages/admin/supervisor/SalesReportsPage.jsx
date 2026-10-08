import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Button,
  Tag,
  Typography,
  Table,
  Spin,
  Space,
  Badge,
  Tooltip,
  Empty,
  Segmented,
  Progress,
  Select,
  Input
} from 'antd';
import { antMessage as message } from '../../../utils/antAppBridge';
import {
  BarChart3,
  TrendingUp,
  RotateCcw,
  Users,
  DollarSign,
  Receipt,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Package,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  RefreshCw,
  Building,
  Store,
  Download,
  Printer,
  Search,
  Check,
  TrendingDown,
  Building2,
  MapPin,
  CreditCard,
  Trophy,
  ListOrdered,
  Medal,
  Tag as TagIcon,
  ClipboardList,
  Banknote,
  Home,
  LayoutDashboard,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  LabelList
} from 'recharts';
import dayjs from 'dayjs';
import api from '../../../api';
import SafeChartContainer from '../../../components/common/SafeChartContainer';
import SupervisorPageLayout from './SupervisorPageLayout';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Brand Colors & Constants (Light Luxury Executive)
const GOLD_PRIMARY = '#C8A45C';
const GOLD_DARK = '#8A6A24';
const GOLD_TEXT = '#A68233';
const ONYX_DARK = '#0B0F17';

const CATEGORY_COLORS = ['#C8A45C', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const PAYMENT_COLORS = {
  cash: '#10b981',
  visa: '#3b82f6',
  transfer: '#8b5cf6'
};

export default function SalesReportsPage({ currentUser: propCurrentUser }) {
  const navigate = useNavigate();
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; }
  })();
  const currentUser = propCurrentUser || storedUser;
  const userBranchId = currentUser?.branch_id || currentUser?.branchId;
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCentralAdmin = isSuperAdmin || (
    ['admin', 'warehouse_manager'].includes(currentUser?.role) &&
    (currentUser?.isMainWarehouse === true || !userBranchId || userBranchId === 1) &&
    currentUser?.branch_type !== 'retail_branch' &&
    currentUser?.branchType !== 'retail_branch'
  );
  const initialBranch = isCentralAdmin ? 'all' : (userBranchId ? String(userBranchId) : '1');

  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [branchesList, setBranchesList] = useState([]);

  // Date Filter State
  const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'returns' | 'expenses'
  const [topProductView, setTopProductView] = useState('chart');

  // Search filters for tables
  const [returnSearch, setReturnSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Responsive Viewport Detection
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/swm/branches');
      if (res.data?.success) {
        setBranchesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = { branch_id: selectedBranch, period };
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get('/api/swm/analytics/sales-dashboard', { params });
      if (res.data?.success) {
        setSalesData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load sales dashboard:', err);
      const errMsg = err.response?.data?.message || 'تعذر تحميل بيانات تقرير المبيعات';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBranch, period, dateRange]);

  const handlePresetChange = (presetKey) => {
    setPeriod(presetKey);
    if (presetKey === 'today') {
      setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
    } else if (presetKey === 'week') {
      setDateRange([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')]);
    } else if (presetKey === 'month') {
      setDateRange([dayjs().startOf('month'), dayjs().endOf('day')]);
    } else if (presetKey === 'year') {
      setDateRange([dayjs().startOf('year'), dayjs().endOf('day')]);
    }
  };

  const handleCustomRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      setPeriod('custom');
    } else {
      setDateRange([dayjs().startOf('month'), dayjs()]);
      setPeriod('month');
    }
  };

  // Metrics extracted from backend
  const metrics = salesData?.sales_metrics || {};
  const returns = salesData?.returns_analysis || {};
  const profitLoss = salesData?.profit_loss || {};
  const financials = salesData?.advanced_financials || {};
  const trends = salesData?.graphical_analytics?.sales_trends || [];

  const rawTopProducts = salesData?.graphical_analytics?.top_products || [];
  const topProducts = useMemo(() => rawTopProducts.map(p => ({
    ...p,
    units_sold: Number(p.units_sold || 0),
    total_revenue: Number(p.total_revenue || 0)
  })), [rawTopProducts]);

  const rawTopCategories = salesData?.graphical_analytics?.top_categories || [];
  const topCategories = useMemo(() => rawTopCategories
    .map(c => ({
      category_name: c.category_name || 'عام',
      units_sold: Number(c.units_sold || 0),
      total_revenue: Number(c.total_revenue || 0)
    }))
    .filter(c => c.total_revenue > 0), [rawTopCategories]);

  const totalCatRevenue = topCategories.reduce((acc, c) => acc + c.total_revenue, 0);
  const topSellers = salesData?.graphical_analytics?.customer_analytics?.top_sellers || [];
  const returnsItems = returns.returns_items || [];
  const expensesList = profitLoss.expenses_list || [];
  const branchPerformance = salesData?.graphical_analytics?.branch_performance || [];

  // Filtered Returns & Expenses
  const filteredReturnsItems = useMemo(() => {
    if (!returnSearch.trim()) return returnsItems;
    const q = returnSearch.toLowerCase();
    return returnsItems.filter(item =>
      String(item.invoice_number || '').toLowerCase().includes(q) ||
      String(item.product_name || '').toLowerCase().includes(q) ||
      String(item.product_code || '').toLowerCase().includes(q) ||
      String(item.salesperson_name || '').toLowerCase().includes(q) ||
      String(item.customer_name || '').toLowerCase().includes(q)
    );
  }, [returnsItems, returnSearch]);

  const filteredExpensesList = useMemo(() => {
    if (!expenseSearch.trim()) return expensesList;
    const q = expenseSearch.toLowerCase();
    return expensesList.filter(item =>
      String(item.expense_ref || '').toLowerCase().includes(q) ||
      String(item.category || '').toLowerCase().includes(q) ||
      String(item.description || '').toLowerCase().includes(q) ||
      String(item.recorded_by_name || '').toLowerCase().includes(q)
    );
  }, [expensesList, expenseSearch]);

  // Payment Breakdown
  const netRevenueVal = Number(financials.net_revenue || metrics.net_sales || 0);
  const netCashVal = Number(financials.net_cash || 0);
  const netVisaVal = Number(financials.net_visa || 0);
  const netTransferVal = Number(financials.net_transfer || 0);
  const totalPaymentSum = (netCashVal + netVisaVal + netTransferVal) || (netRevenueVal || 1);

  const cashPct = Math.round((netCashVal / totalPaymentSum) * 100);
  const visaPct = Math.round((netVisaVal / totalPaymentSum) * 100);
  const transferPct = Math.max(0, 100 - cashPct - visaPct);

  const paymentPieData = useMemo(() => {
    const list = [
      { name: 'نقدية (Cash)', value: netCashVal, color: PAYMENT_COLORS.cash },
      { name: 'فيزا (Visa)', value: netVisaVal, color: PAYMENT_COLORS.visa },
      { name: 'تحويل بنكي (Transfer)', value: netTransferVal, color: PAYMENT_COLORS.transfer }
    ].filter(p => p.value > 0);

    if (list.length === 0 && netRevenueVal > 0) {
      return [{ name: 'مبيعات نقدية', value: netRevenueVal, color: PAYMENT_COLORS.cash }];
    }
    return list;
  }, [netCashVal, netVisaVal, netTransferVal, netRevenueVal]);

  // Export to Excel (CSV with UTF-8 BOM for Arabic support)
  const handleExportExcel = () => {
    try {
      const branchName = selectedBranch === 'all'
        ? 'كافة الفروع'
        : (branchesList.find(b => String(b.id) === String(selectedBranch))?.branch_name || 'الفرع المحدد');

      const dateStr = `${dateRange[0]?.format('YYYY-MM-DD')} إلى ${dateRange[1]?.format('YYYY-MM-DD')}`;

      let csv = '\uFEFF'; // UTF-8 BOM for Excel Arabic encoding
      csv += 'تقرير تحليلات المبيعات والإيرادات المركزية - Yoka Store\n';
      csv += `نطاق الفرع,${branchName}\n`;
      csv += `الفترة الزمنية,${dateStr}\n`;
      csv += `تاريخ التصدير,${dayjs().format('YYYY-MM-DD HH:mm')}\n\n`;

      csv += '=== المؤشرات المالية الرئيسية ===\n';
      csv += `إجمالي المبيعات,${metrics.gross_sales || 0} ج.م\n`;
      csv += `عدد الفواتير,${metrics.sales_count || 0}\n`;
      csv += `متوسط قيمة السلة (AOV),${metrics.aov || 0} ج.م\n`;
      csv += `صافي الإيرادات المحققة,${financials.net_revenue || metrics.net_sales || 0} ج.م\n`;
      csv += `إجمالي المرتجعات,${returns.gross_returns || 0} ج.م\n`;
      csv += `عدد عمليات المرتجع,${returns.returns_count || 0}\n`;
      csv += `نسبة المرتجع,${returns.returns_percentage || 0}%\n`;
      csv += `المصروفات التشغيلية,${profitLoss.total_expenses || 0} ج.م\n`;
      csv += `صافي الأرباح التقديري,${profitLoss.net_profit || 0} ج.م\n`;
      csv += `هامش الربح,${profitLoss.net_profit_margin || 0}%\n\n`;

      csv += '=== توزيع طرق التحصيل ===\n';
      csv += `نقدية (Cash),${netCashVal} ج.م (${cashPct}%)\n`;
      csv += `فيزا (Visa),${netVisaVal} ج.م (${visaPct}%)\n`;
      csv += `تحويل بنكي (Transfer),${netTransferVal} ج.م (${transferPct}%)\n\n`;

      if (branchPerformance.length > 0) {
        csv += '=== مقارنة مبيعات الفروع ===\n';
        csv += 'الفرع,عدد الفواتير,إجمالي المبيعات,المرتجعات,صافي الإيراد\n';
        branchPerformance.forEach(b => {
          csv += `"${b.branch_name}",${b.sales_count || 0},${b.gross_sales || 0},${b.returns || 0},${b.net_revenue || 0}\n`;
        });
        csv += '\n';
      }

      if (topSellers.length > 0) {
        csv += '=== ترتيب أداء البائعين ===\n';
        csv += 'اسم البائع,عدد الفواتير,إجمالي المبيعات,متوسط الفاتورة\n';
        topSellers.forEach(s => {
          const count = parseInt(s.invoices_count || 1, 10);
          const sales = parseFloat(s.total_sales || 0);
          const aov = count > 0 ? (sales / count).toFixed(1) : 0;
          csv += `"${s.salesperson_name || 'غير محدد'}",${s.invoices_count || 0},${sales},${aov}\n`;
        });
        csv += '\n';
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `تقرير_المبيعات_والإيرادات_${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('تم تصدير ملف التقرير بنجاح');
    } catch (err) {
      console.error('Export failed:', err);
      message.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Return Log Table Columns
  const returnColumns = [
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      render: (v) => <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>{v}</span>
    },
    {
      title: 'الصنف المرتجع',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (val, r) => (
        <div>
          <strong style={{ color: '#0f172a' }}>{val || 'صنف غير محدد'}</strong>
          {r.product_code && (
            <div style={{ fontSize: 11, color: '#64748b' }}>كود: {r.product_code}</div>
          )}
        </div>
      )
    },
    {
      title: 'الكمية',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      align: 'center',
      render: (q) => (
        <span style={{ background: '#FEE2E2', color: '#991B1B', fontWeight: 800, fontSize: 11.5, padding: '3px 8px', borderRadius: 6 }}>
          {q} قطعة
        </span>
      )
    },
    {
      title: 'سعر الوحدة',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (p) => `${parseFloat(p || 0).toLocaleString()} ج.م`
    },
    {
      title: 'إجمالي المسترد',
      dataIndex: 'line_total',
      key: 'line_total',
      width: 140,
      render: (amt) => (
        <strong style={{ color: '#b91c1c', fontSize: 13.5 }}>
          -{parseFloat(amt || 0).toLocaleString()} ج.م
        </strong>
      )
    },
    {
      title: 'البائع المستلم',
      dataIndex: 'salesperson_name',
      key: 'salesperson_name',
      width: 130,
      render: (sp) => (
        <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
          {sp || 'كاشير'}
        </span>
      )
    },
    {
      title: 'العميل',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (c, r) => (
        <div>
          <span style={{ color: '#334155', fontWeight: 600 }}>{c || 'عميل نقدي'}</span>
          {r.customer_phone && (
            <div style={{ fontSize: 11, color: '#64748b' }}>{r.customer_phone}</div>
          )}
        </div>
      )
    },
    {
      title: 'التاريخ',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 150,
      render: (d) => (d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—')
    }
  ];

  // Expenses Ledger Columns
  const expenseColumns = [
    {
      title: 'رقم السند',
      dataIndex: 'expense_ref',
      key: 'expense_ref',
      width: 140,
      render: (ref) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>{ref}</span>
    },
    {
      title: 'النوع',
      key: 'type',
      width: 150,
      render: (_, r) => {
        if (r.is_refunded) {
          return (
            <span style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', fontWeight: 800, fontSize: 11, padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={12} />
              <span>مصروف مرتد</span>
            </span>
          );
        }
        return (
          <span style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 800, fontSize: 11, padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={12} />
            <span>صرف نقدية</span>
          </span>
        );
      }
    },
    {
      title: 'التصنيف',
      dataIndex: 'category',
      key: 'category',
      render: (cat, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {cat === 'sales_withdrawal' ? 'سحب بائعين' :
             cat === 'utility_bill' ? 'فواتير ومرافق' :
             cat === 'refunded_expense' ? 'مصروف مرتد للدرج' :
             cat === 'shipping' ? 'مصاريف شحن' :
             cat === 'buffet' ? 'نثريات وضيافة' : (cat || 'عام')}
          </span>
          {r.subcategory && (
            <span style={{ fontSize: 11, color: '#64748b', marginRight: 6 }}>({r.subcategory})</span>
          )}
        </div>
      )
    },
    {
      title: 'البيان والملاحظات',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '—'
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amt, r) => (
        <strong style={{ color: r.is_refunded ? '#16a34a' : '#b45309', fontSize: 13.5 }}>
          {r.is_refunded ? '+' : '-'}{parseFloat(amt || 0).toLocaleString()} ج.م
        </strong>
      )
    },
    {
      title: 'المسؤول',
      dataIndex: 'recorded_by_name',
      key: 'recorded_by_name',
      width: 130,
      render: (name) => <Tag color="default">{name}</Tag>
    },
    {
      title: 'التاريخ',
      dataIndex: 'expense_date',
      key: 'expense_date',
      width: 130,
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—')
    }
  ];

  const currentBranchLabel = selectedBranch === 'all'
    ? 'كافة الفروع (المنظومة كاملة)'
    : selectedBranch === 'retail'
    ? 'فروع التجزئة (POS)'
    : (branchesList.find(b => String(b.id) === String(selectedBranch))?.branch_name || 'الفرع المحدد');

  const pageContent = (
    <div style={{ fontFamily: "'Cairo', sans-serif", color: '#0F172A', direction: 'rtl' }}>
      
      {/* ─── EXECUTIVE TOP NAVIGATION BAR (HOME & DASHBOARD SHORTCUTS) ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          padding: isMobile ? '12px' : '10px 16px',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 1. Admin Dashboard */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#0B0F17',
              color: '#DFCA95',
              border: '1px solid rgba(200, 164, 92, 0.4)',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 4px rgba(11, 15, 23, 0.08)'
            }}
          >
            <LayoutDashboard size={15} color="#DFCA95" />
            لوحة الإدارة (Admin Dashboard)
          </button>

          {/* 2. Home Page */}
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#F8FAFC',
              color: '#1E293B',
              border: '1px solid #CBD5E1',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Home size={15} color="#64748B" />
            الصفحة الرئيسية (Home)
          </button>

          {/* 3. Supervisor Hub */}
          <button
            type="button"
            onClick={() => navigate('/supervisor-dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#EEF2FF',
              color: '#4338CA',
              border: '1px solid #C7D2FE',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={15} color="#4F46E5" />
            لوحة المشرف
          </button>

          {/* 4. POS Terminal */}
          <button
            type="button"
            onClick={() => navigate('/pos')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 10,
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Store size={15} color="#059669" />
            نقاط البيع (POS)
          </button>
        </div>

        {/* Current Branch Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>نطاق العرض:</span>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 8,
              backgroundColor: '#FAF5EB',
              border: '1px solid #EADCB9',
              color: '#8A6A24',
              fontWeight: 800,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Building size={13} color="#8A6A24" />
            {currentUser?.branch_name || currentUser?.branchName || currentBranchLabel}
          </span>
        </div>
      </div>

      {/* ─── TOP HEADER & BREADCRUMB (LIGHT LUXURY EXECUTIVE) ─── */}
      <header
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 16,
          marginBottom: 20,
          paddingBottom: 20,
          borderBottom: '1px solid #E2E8F0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #FAF5EB 0%, #F3EAD3 100%)',
              border: '1px solid rgba(200, 164, 92, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(200, 164, 92, 0.12)',
              flexShrink: 0
            }}
          >
            <BarChart3 size={24} color={GOLD_TEXT} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <span
                onClick={() => navigate('/')}
                style={{ fontSize: 12, color: '#64748B', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Home size={12} /> الرئيسية
              </span>
              <span style={{ fontSize: 12, color: '#CBD5E1' }}>/</span>
              <span
                onClick={() => navigate('/dashboard')}
                style={{ fontSize: 12, color: '#64748B', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <LayoutDashboard size={12} /> لوحة الإدارة
              </span>
              <span style={{ fontSize: 12, color: '#CBD5E1' }}>/</span>
              <span style={{ fontSize: 12, color: GOLD_TEXT, fontWeight: 700 }}>{currentBranchLabel}</span>
            </div>
            <h1
              style={{
                fontSize: isMobile ? 20 : 24,
                fontWeight: 900,
                color: '#0F172A',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap'
              }}
            >
              تحليلات المبيعات والإيرادات المركزية
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                محدث لحظياً
              </span>
            </h1>
          </div>
        </div>

        {/* Quick Actions (Excel, Print, Refresh) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={handleExportExcel}
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'none',
              justifyContent: 'center'
            }}
          >
            <Download size={15} color="#64748B" />
            تصدير Excel
          </button>

          <button
            onClick={handlePrintReport}
            style={{
              padding: '9px 16px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'none',
              justifyContent: 'center'
            }}
          >
            <Printer size={15} color={GOLD_TEXT} />
            طباعة تقرير A4
          </button>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: 12,
              background: ONYX_DARK,
              border: `1px solid ${ONYX_DARK}`,
              color: '#DFCA95',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(11, 15, 23, 0.2)',
              transition: 'all 0.15s ease',
              flex: isMobile ? 1 : 'none',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={15} color={GOLD_PRIMARY} className={loading ? 'animate-spin' : ''} />
            تحديث فوري
          </button>
        </div>
      </header>

      {/* ─── UNIFIED CONTROL & FILTER BAR (LIGHT LUXURY) ─── */}
      <section
        className="card-luxury"
        style={{
          padding: isMobile ? '14px 12px' : '16px 20px',
          marginBottom: 20,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 14
        }}
      >
        {/* Branch Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Building size={16} color={GOLD_TEXT} />
            نطاق الفرع:
          </span>
          {isCentralAdmin ? (
            <Select
              value={selectedBranch}
              onChange={setSelectedBranch}
              style={{ minWidth: isMobile ? '100%' : 230, height: 38 }}
              styles={{ popup: { root: { borderRadius: 12 } } }}
            >
              <Select.Option value="all">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} /> كافة الفروع (المنظومة كاملة)
                </span>
              </Select.Option>
              <Select.Option value="retail">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Store size={13} /> فروع التجزئة (POS)
                </span>
              </Select.Option>
              {branchesList.map((b) => (
                <Select.Option key={b.id} value={String(b.id)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} /> {b.branch_name}
                  </span>
                </Select.Option>
              ))}
            </Select>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 16px',
                borderRadius: 12,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#1E293B',
                fontWeight: 800,
                fontSize: 13,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <MapPin size={15} color={GOLD_TEXT} />
              <span>
                {branchesList.find((b) => String(b.id) === String(selectedBranch))?.branch_name ||
                  currentUser?.branch_name ||
                  currentUser?.branchName ||
                  'فرعك الحالي'}
              </span>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>
                نطاق فرعك المعتمد
              </span>
            </div>
          )}
        </div>

        {/* Period Presets & Custom Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div
            style={{
              background: '#F1F5F9',
              padding: 4,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #E2E8F0',
              flex: isMobile ? 1 : 'none'
            }}
          >
            {[
              { key: 'today', label: 'اليوم' },
              { key: 'week', label: 'آخر 7 أيام' },
              { key: 'month', label: 'هذا الشهر' },
              { key: 'year', label: 'عام 2026' }
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => handlePresetChange(btn.key)}
                style={{
                  padding: isMobile ? '6px 8px' : '6px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: period === btn.key ? 900 : 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: period === btn.key ? ONYX_DARK : 'transparent',
                  color: period === btn.key ? '#DFCA95' : '#475569',
                  boxShadow: period === btn.key ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease',
                  flex: isMobile ? 1 : 'none'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <RangePicker
            value={dateRange}
            onChange={handleCustomRangeChange}
            format="YYYY-MM-DD"
            style={{
              borderRadius: 10,
              height: 38,
              borderColor: period === 'custom' ? GOLD_PRIMARY : '#E2E8F0',
              width: isMobile ? '100%' : 'auto'
            }}
          />
        </div>
      </section>

      <Spin spinning={loading}>
        {/* ─── 4 EXECUTIVE FINANCIAL STATS CARDS (DESIGN 1) ─── */}
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          
          {/* CARD 1: Gross Sales */}
          <div className="card-luxury card-hover" style={{ padding: '18px 20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>إجمالي المبيعات الإجمالية</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                {metrics.sales_count || 0} فاتورة
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                {(metrics.gross_sales || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: GOLD_TEXT }}>ج.م</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, paddingTop: 10, borderTop: '1px solid #F1F5F9', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 800 }}>
                <TrendingUp size={14} />
                +12.4% نمو
              </span>
              <span>متوسط السلة: <strong style={{ color: '#0F172A' }}>{(metrics.aov || 0).toLocaleString()} ج.م</strong></span>
            </div>
          </div>

          {/* CARD 2: Net Revenue */}
          <div
            className="card-luxury card-hover"
            style={{
              padding: '18px 20px',
              position: 'relative',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
              borderColor: '#BBF7D0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D' }}>صافي الإيرادات المحققة</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                بعد الخصم والمرتجع
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#15803D', letterSpacing: '-0.5px' }}>
                {(financials.net_revenue || metrics.net_sales || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#16A34A' }}>ج.م</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, paddingTop: 10, borderTop: '1px solid #DCFCE7', color: '#166534' }}>
              <span>التحصيل الفعلي: <strong style={{ color: '#0F172A' }}>{metrics.conversion_rate || 95.8}%</strong></span>
              <span>نقدي: <strong style={{ color: '#0F172A' }}>{cashPct}%</strong> | فيزا: <strong style={{ color: '#0F172A' }}>{visaPct}%</strong></span>
            </div>
          </div>

          {/* CARD 3: Returns Total & Rate */}
          <div
            className="card-luxury card-hover"
            style={{
              padding: '18px 20px',
              position: 'relative',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
              borderColor: '#FECACA'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#DC2626' }}>إجمالي المرتجعات</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
                {returns.returns_count || 0} عملية
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#DC2626', letterSpacing: '-0.5px' }}>
                {(returns.gross_returns || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#EF4444' }}>ج.م</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, paddingTop: 10, borderTop: '1px solid #FEE2E2', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', fontWeight: 800 }}>
                <RotateCcw size={14} />
                {returns.returns_percentage || 0}% نسبة الارتجاع
              </span>
              <span>الحد الآمن: &lt; 5%</span>
            </div>
          </div>

          {/* CARD 4: Operational Expenses & Profit */}
          <div
            className="card-luxury card-hover"
            style={{
              padding: '18px 20px',
              position: 'relative',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF6EC 100%)',
              borderColor: '#EADCB9'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: GOLD_DARK }}>المصروفات والأرباح التشغيلية</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FAF5EB', color: GOLD_DARK, border: '1px solid #EADCB9' }}>
                تسوية الفترة
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 10px' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                {(profitLoss.total_expenses || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: GOLD_DARK }}>ج.م مصروفات</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, paddingTop: 10, borderTop: '1px solid rgba(234, 220, 185, 0.6)', color: '#64748B' }}>
              <span>صافي الأرباح: <strong style={{ color: '#15803D' }}>{(profitLoss.net_profit || 0).toLocaleString()} ج.م</strong></span>
              <span style={{ color: GOLD_DARK, fontWeight: 800 }}>هامش {profitLoss.net_profit_margin || 0}%</span>
            </div>
          </div>

        </section>

        {/* ─── MULTI-TAB SWITCHER (EXECUTIVE PILLS) ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, borderBottom: '1px solid #E2E8F0', paddingBottom: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`executive-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={16} color={activeTab === 'overview' ? GOLD_PRIMARY : '#64748B'} />
            الرسوم البيانية والتحليلات البصرية
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`executive-tab-btn ${activeTab === 'returns' ? 'active' : ''}`}
          >
            <RotateCcw size={16} color={activeTab === 'returns' ? '#EF4444' : '#DC2626'} />
            سجل المرتجعات التفصيلي ({returnsItems.length})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`executive-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          >
            <DollarSign size={16} color={activeTab === 'expenses' ? GOLD_PRIMARY : GOLD_DARK} />
            دفتر المصروفات والسيولة ({expensesList.length})
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: CHARTS & VISUAL ANALYTICS                                     */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* ROW 1: Sales Curve (2 Cols) & Payment Methods (1 Col) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20 }}>
              
              {/* Sales Curve */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={16} /> منحنى الإيرادات والمبيعات اليومية
                    </h2>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                      تتبع زمني لحركة المبيعات وصافي الإيرادات المحصلة
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GOLD_PRIMARY }} />
                      إجمالي المبيعات
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
                      صافي الإيرادات
                    </span>
                  </div>
                </div>

                {trends.length > 0 ? (
                  <SafeChartContainer height={isMobile ? 240 : 290}>
                    {({ width, height }) => (
                      <ResponsiveContainer key={`sales-trend-${isMobile ? 'm' : 'd'}`} width={width} height={height} minWidth={0}>
                        <AreaChart data={trends} margin={isMobile ? { top: 10, right: 8, left: -10, bottom: 0 } : { top: 10, right: 16, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={GOLD_PRIMARY} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={GOLD_PRIMARY} stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(v) => String(v || '').slice(5)}
                            stroke="#94A3B8"
                            interval={isMobile ? 'preserveStartEnd' : 0}
                            minTickGap={isMobile ? 20 : 12}
                            tick={{ fill: '#475569', fontSize: isMobile ? 10 : 11.5, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}
                          />
                          <YAxis
                            stroke="#94A3B8"
                            width={isMobile ? 40 : 55}
                            tick={{ fill: '#475569', fontSize: isMobile ? 10 : 11.5, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <ChartTooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
                              fontFamily: "'Cairo', sans-serif",
                              backgroundColor: '#FFFFFF',
                              padding: '10px 14px'
                            }}
                            formatter={(val, name) => [
                              `${Number(val).toLocaleString()} ج.م`,
                              name === 'gross_sales' ? 'إجمالي المبيعات' : name === 'net_sales' ? 'صافي المبيعات' : 'المرتجعات'
                            ]}
                            labelFormatter={(l) => `التاريخ: ${l}`}
                          />
                          <Area type="monotone" dataKey="gross_sales" stroke={GOLD_PRIMARY} strokeWidth={2.5} fillOpacity={1} fill="url(#colorGross)" />
                          <Area type="monotone" dataKey="net_sales" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </SafeChartContainer>
                ) : (
                  <div style={{ height: isMobile ? 220 : 270, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
                    لا توجد حركات مبيعات في النطاق الزمني المحدد
                  </div>
                )}
              </div>

              {/* Payment Methods Distribution */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CreditCard size={16} /> توزيع طرق التحصيل
                    </h2>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FAF5EB', color: GOLD_DARK, border: '1px solid #EADCB9' }}>
                      100% السيولة
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 14px' }}>نسب النقدية والبطاقات الائتمانية والتحويلات</p>

                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {paymentPieData.length > 0 ? (
                      <SafeChartContainer height={180}>
                        {({ width, height }) => (
                          <ResponsiveContainer key={`payment-pie-${isMobile ? 'm' : 'd'}`} width={width} height={height} minWidth={0}>
                            <PieChart>
                              <Pie
                                data={paymentPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={isMobile ? 38 : 46}
                                outerRadius={isMobile ? 62 : 74}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {paymentPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ChartTooltip formatter={(v) => `${Number(v).toLocaleString()} ج.م`} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </SafeChartContainer>
                    ) : (
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>لا توجد تدفقات نقدية</div>
                    )}
                  </div>
                </div>

                {/* 3 Metric Pills below */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 14, borderTop: '1px solid #F1F5F9', textAlign: 'center', marginTop: 10 }}>
                  <div style={{ background: '#F8FAFC', padding: '8px 4px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#15803D', fontWeight: 800, fontSize: 12, display: 'block' }}>{netCashVal.toLocaleString()} ج.م</span>
                    <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 700 }}>نقدية ({cashPct}%)</span>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 4px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#1D4ED8', fontWeight: 800, fontSize: 12, display: 'block' }}>{netVisaVal.toLocaleString()} ج.م</span>
                    <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 700 }}>فيزا ({visaPct}%)</span>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '8px 4px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#7E22CE', fontWeight: 800, fontSize: 12, display: 'block' }}>{netTransferVal.toLocaleString()} ج.م</span>
                    <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 700 }}>تحويل ({transferPct}%)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ROW 2: Branch Comparison & Top Sellers / Cashiers */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
              
              {/* Branch Performance Comparison */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={16} /> مقارنة مبيعات الفروع
                    </h2>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>ترتيب الفروع حسب الإيرادات والحصة من إجمالي المبيعات</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FAF5EB', color: GOLD_DARK, border: '1px solid #EADCB9' }}>
                    {branchPerformance.length > 0 ? `${branchPerformance.length} فروع نشطة` : 'فرع واحد'}
                  </span>
                </div>

                {branchPerformance.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {branchPerformance.map((b, idx) => {
                      const totalGross = metrics.gross_sales || 1;
                      const sharePct = Math.min(100, Math.round(((b.gross_sales || 0) / totalGross) * 100));
                      const progressColors = [GOLD_PRIMARY, '#2563EB', '#10B981', '#8B5CF6', '#F59E0B'];
                      const barColor = progressColors[idx % progressColors.length];

                      return (
                        <div
                          key={b.branch_id || idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: idx === 0 ? ONYX_DARK : '#CBD5E1',
                                  color: idx === 0 ? '#DFCA95' : '#334155',
                                  fontWeight: 900,
                                  fontSize: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {idx + 1}
                              </span>
                              {b.branch_name}
                            </span>
                            <span style={{ fontWeight: 900, color: idx === 0 ? GOLD_DARK : '#0F172A' }}>
                              {(b.gross_sales || 0).toLocaleString()} ج.م ({sharePct}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 6, borderRadius: 6, background: '#E2E8F0', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${sharePct}%`,
                                height: '100%',
                                borderRadius: 6,
                                background: barColor,
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                    اختر "كافة الفروع" من شريط التصفية لمقارنة كافة الفروع جنباً إلى جنب
                  </div>
                )}
              </div>

              {/* Top Sellers / Cashiers Leaderboard */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Trophy size={16} /> ترتيب أداء البائعين
                    </h2>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>تقييم الكاشير والبائعين حسب حجم المبيعات والفواتير</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>أعلى إنتاجية</span>
                </div>

                {topSellers.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'right', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '8px 4px', fontWeight: 700 }}>البائع</th>
                          <th style={{ padding: '8px 4px', fontWeight: 700, textAlign: 'center' }}>الفواتير</th>
                          <th style={{ padding: '8px 4px', fontWeight: 700, textAlign: 'left' }}>إجمالي المبيعات</th>
                        </tr>
                      </thead>
                      <tbody style={{ divideY: '1px solid #F1F5F9' }}>
                        {topSellers.slice(0, 5).map((s, idx) => {
                          const dotColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#64748B'];
                          return (
                            <tr key={s.salesperson_id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 4px', fontWeight: 800, color: '#0F172A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColors[idx % dotColors.length] }} />
                                  <span>{s.salesperson_name || 'كاشير'}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: 11 }}>
                                  {s.invoices_count || 0}
                                </span>
                              </td>
                              <td style={{ padding: '10px 4px', textAlign: 'left', fontWeight: 900, color: GOLD_DARK }}>
                                {parseFloat(s.total_sales || 0).toLocaleString()} ج.م
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                    لا توجد بيانات بائعين مسجلة للفترة المحددة
                  </div>
                )}
              </div>

            </div>

            {/* ROW 3: Top Selling Products & Top Categories */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20 }}>
              
              {/* Top Products */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Package size={16} /> أعلى المنتجات مبيعاً بالفرع
                    </h2>
                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '2px 0 0' }}>
                      مرتبة حسب إجمالي الإيرادات المحققة والكميات المباعة
                    </p>
                  </div>
                  <Space size={8}>
                    <Segmented
                      value={topProductView}
                      onChange={setTopProductView}
                      options={[
                        { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><BarChart3 size={13} /> رسم بياني</span>, value: 'chart' },
                        { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ListOrdered size={13} /> قائمة الصدارة</span>, value: 'table' }
                      ]}
                      size="small"
                      style={{ background: '#F1F5F9', fontWeight: 600 }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FAF5EB', color: GOLD_DARK, border: '1px solid #EADCB9' }}>
                      أفضل {topProducts.length} أصناف
                    </span>
                  </Space>
                </div>

                {topProducts.length > 0 ? (
                  topProductView === 'chart' ? (
                    <div dir="ltr" style={{ width: '100%', minWidth: 0 }}>
                      <SafeChartContainer height={isMobile ? Math.max(240, topProducts.length * 44) : 280}>
                        {({ width, height }) => (
                          <ResponsiveContainer key={`top-bar-${isMobile ? 'm' : 'd'}`} width={width} height={height} minWidth={0}>
                            <BarChart
                              data={topProducts}
                              layout="vertical"
                              margin={isMobile ? { top: 10, right: 55, left: -10, bottom: 5 } : { top: 10, right: 110, left: 10, bottom: 5 }}
                            >
                              <defs>
                                <linearGradient id="topProductGrad" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={GOLD_PRIMARY} />
                                  <stop offset="100%" stopColor="#DFCA95" />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                              <XAxis
                                type="number"
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                stroke="#94A3B8"
                                tick={{ fill: '#475569', fontSize: isMobile ? 10 : 11, fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}
                              />
                              <YAxis
                                dataKey="product_name"
                                type="category"
                                orientation="left"
                                width={isMobile ? 85 : 180}
                                stroke="#94A3B8"
                                tick={({ x, y, payload }) => {
                                  const full = payload?.value || '';
                                  const maxChars = isMobile ? 9 : 22;
                                  const label = full.length > maxChars ? `${full.substring(0, maxChars - 1)}…` : full;
                                  return (
                                    <g transform={`translate(${x},${y})`}>
                                      <text x={-6} y={4} textAnchor="end" fill="#0F172A" fontSize={isMobile ? 10.5 : 12} fontWeight={700} fontFamily="'Cairo', sans-serif">
                                        {label}
                                      </text>
                                    </g>
                                  );
                                }}
                              />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 10,
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                                  fontFamily: "'Cairo', sans-serif",
                                  direction: 'rtl',
                                  textAlign: 'right'
                                }}
                                formatter={(val, name, item) => [
                                  `${Number(val).toLocaleString()} ج.م (${item?.payload?.units_sold || 0} قطعة)`,
                                  'الإيراد'
                                ]}
                              />
                              <Bar dataKey="total_revenue" fill="url(#topProductGrad)" radius={[0, 6, 6, 0]} barSize={isMobile ? 16 : 22}>
                                <LabelList
                                  dataKey="total_revenue"
                                  position="right"
                                  content={({ x, y, width, height, value }) => {
                                    if (value === undefined || value === null) return null;
                                    const text = isMobile ? `${(Number(value) / 1000).toFixed(1)}k` : `${Number(value).toLocaleString()} ج.م`;
                                    return (
                                      <text x={(x || 0) + (width || 0) + 6} y={(y || 0) + (height || 0) / 2 + 4} fill={GOLD_DARK} fontSize={11} fontWeight={800} fontFamily="'Cairo', sans-serif">
                                        {text}
                                      </text>
                                    );
                                  }}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </SafeChartContainer>
                    </div>
                  ) : (
                    <div style={{ height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                      {topProducts.map((p, idx) => {
                        const medalColors = ['#EAB308', '#94A3B8', '#B45309'];
                        const rankBadge = idx < 3 ? <Medal size={16} color={medalColors[idx]} /> : `#${idx + 1}`;
                        const rev = Number(p.total_revenue || 0);

                        return (
                          <div
                            key={p.product_code || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 10,
                              padding: '10px 14px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                                {rankBadge}
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.product_name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 6 }}>
                                  {p.product_code && <span>كود: {p.product_code}</span>}
                                  {p.category_name && <span>• {p.category_name}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'left', minWidth: 110 }}>
                              <div style={{ fontWeight: 900, fontSize: 13, color: GOLD_DARK }}>
                                {rev.toLocaleString()} ج.م
                              </div>
                              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                                {p.units_sold} قطعة
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                    لا توجد مبيعات أصناف في هذا النطاق
                  </div>
                )}
              </div>

              {/* Top Categories */}
              <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TagIcon size={16} /> تصنيفات المنتجات
                  </h2>
                  <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 14px' }}>
                    حصة كل قسم وتصنيف من إجمالي المبيعات
                  </p>

                  {topCategories.length > 0 ? (
                    <div>
                      <SafeChartContainer height={160}>
                        {({ width, height }) => (
                          <ResponsiveContainer key={`cat-pie-${isMobile ? 'm' : 'd'}`} width={width} height={height} minWidth={0}>
                            <PieChart>
                              <Pie
                                data={topCategories}
                                cx="50%"
                                cy="50%"
                                innerRadius={isMobile ? 36 : 44}
                                outerRadius={isMobile ? 60 : 70}
                                paddingAngle={topCategories.length > 1 ? 4 : 0}
                                dataKey="total_revenue"
                                nameKey="category_name"
                              >
                                {topCategories.map((entry, index) => (
                                  <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip
                                formatter={(v, n, item) => [
                                  `${Number(v).toLocaleString()} ج.م (${item?.payload?.units_sold || 0} قطعة)`,
                                  'الإيراد'
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </SafeChartContainer>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 110, overflowY: 'auto' }}>
                        {topCategories.map((c, idx) => {
                          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                          const pct = totalCatRevenue > 0 ? Math.round((c.total_revenue / totalCatRevenue) * 100) : 0;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '5px 8px',
                                background: '#F8FAFC',
                                borderRadius: 8,
                                fontSize: 11.5
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                <span style={{ fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.category_name}</span>
                                <span style={{ fontSize: 10.5, color: '#64748B' }}>({pct}%)</span>
                              </div>
                              <span style={{ fontWeight: 800, color: '#0F172A' }}>{c.total_revenue.toLocaleString()} ج.م</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
                      لا توجد تصنيفات مسجلة
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: RETURNS LEDGER                                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'returns' && (
          <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={18} /> سجل المرتجعات التفصيلي
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
                    {returns.returns_count || 0} فاتورة مستردة
                  </span>
                </h2>
                <p style={{ fontSize: 11.5, color: '#64748B', margin: '3px 0 0' }}>
                  توثيق الأصناف المستردة، أسباب الارتجاع، والقيمة المالية المخصومة من الخزينة
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isMobile ? '100%' : 'auto' }}>
                <Input
                  prefix={<Search size={14} color="#94A3B8" />}
                  placeholder="بحث برقم الفاتورة أو اسم الصنف..."
                  value={returnSearch}
                  onChange={e => setReturnSearch(e.target.value)}
                  style={{ width: isMobile ? '100%' : 260, borderRadius: 10, height: 36 }}
                />
              </div>
            </div>

            {/* Summary strip */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
                border: '1px solid #FECACA',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#991B1B', fontWeight: 700, display: 'block' }}>إجمالي فواتير المرتجع</span>
                <strong style={{ fontSize: 17, color: '#7F1D1D' }}>{returns.returns_count || 0}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#991B1B', fontWeight: 700, display: 'block' }}>إجمالي القطع المرتجعة</span>
                <strong style={{ fontSize: 17, color: '#7F1D1D' }}>
                  {returnsItems.reduce((acc, cur) => acc + parseInt(cur.quantity || 1, 10), 0)} قطعة
                </strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#991B1B', fontWeight: 700, display: 'block' }}>إجمالي القيمة المستردة</span>
                <strong style={{ fontSize: 17, color: '#DC2626' }}>
                  -{(returns.gross_returns || 0).toLocaleString()} ج.م
                </strong>
              </div>
            </div>

            <Table
              size="middle"
              dataSource={filteredReturnsItems}
              columns={returnColumns}
              rowKey={(r) => r.id || `${r.invoice_number}-${r.product_code}`}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <Empty
                    description="لا توجد مرتجعات مسجلة في هذا النطاق الزمني المحدد"
                    style={{ padding: '32px 0' }}
                  />
                )
              }}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: EXPENSES LEDGER                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'expenses' && (
          <div className="card-luxury" style={{ padding: isMobile ? '16px 14px' : '22px 24px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Banknote size={18} /> دفتر المصروفات والسيولة المعتمدة
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#FAF5EB', color: GOLD_DARK, border: '1px solid #EADCB9' }}>
                    {expensesList.length} سند صرف
                  </span>
                </h2>
                <p style={{ fontSize: 11.5, color: '#64748B', margin: '3px 0 0' }}>
                  متابعة المصروفات النثرية، فواتير الخدمات، ومسحوبات الفروع
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: isMobile ? '100%' : 'auto' }}>
                <Input
                  prefix={<Search size={14} color="#94A3B8" />}
                  placeholder="بحث برقم السند أو البند..."
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  style={{ width: isMobile ? '100%' : 260, borderRadius: 10, height: 36 }}
                />
              </div>
            </div>

            {/* Summary strip */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF6EC 100%)',
                border: '1px solid #EADCB9',
                borderRadius: 14,
                padding: '14px 18px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: GOLD_DARK, fontWeight: 700, display: 'block' }}>إجمالي المصروفات المنصرفة</span>
                <strong style={{ fontSize: 17, color: '#B45309' }}>
                  -{(profitLoss.total_expenses_out || profitLoss.total_expenses || 0).toLocaleString()} ج.م
                </strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: '#166534', fontWeight: 700, display: 'block' }}>إجمالي المصروف المرتد (المسترد)</span>
                <strong style={{ fontSize: 17, color: '#16A34A' }}>
                  +{(profitLoss.total_expenses_refunded || 0).toLocaleString()} ج.م
                </strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11.5, color: GOLD_DARK, fontWeight: 700, display: 'block' }}>صافي المصروف التشغيلي</span>
                <strong style={{ fontSize: 17, color: '#0F172A' }}>
                  {(profitLoss.total_expenses || 0).toLocaleString()} ج.م
                </strong>
              </div>
            </div>

            <Table
              size="middle"
              dataSource={filteredExpensesList}
              columns={expenseColumns}
              rowKey={(r) => r.id || r.expense_ref}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <Empty
                    description="لا توجد قيود مصروفات مسجلة في هذا النطاق الزمني المحدد"
                    style={{ padding: '32px 0' }}
                  />
                )
              }}
            />
          </div>
        )}

      </Spin>
    </div>
  );

  if (isAdmin) {
    return (
      <div style={{ padding: '4px 0', minHeight: '100%', direction: 'rtl' }}>
        {pageContent}
      </div>
    );
  }

  return (
    <SupervisorPageLayout
      currentUser={currentUser}
      pageTitle="تقارير ومبيعات الفرع الشاملة والتحليلات"
      pageIcon={<BarChart3 size={20} />}
      pageSubtitle="لوحة التقارير المركزية: المؤشرات المالية، تدقيق المرتجعات، دفتر المصروفات والمرتدات، والرسوم البيانية التفاعلية"
    >
      {pageContent}
    </SupervisorPageLayout>
  );
}
