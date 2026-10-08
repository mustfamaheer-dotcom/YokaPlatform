import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Tabs,
  Space,
  Typography,
  Badge,
  Tooltip,
  Alert,
  Spin,
  Empty,
  Switch,
  TimePicker,
  Input,
  message
} from 'antd';
import {
  ShopOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
  LogoutOutlined,
  AuditOutlined,
  FilterOutlined,
  SettingOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  WalletOutlined,
  RiseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Clean cashier name from verbose activity string
const formatCashierName = (raw) => {
  if (!raw) return 'كاشير الفرع';
  if (typeof raw !== 'string') return String(raw);
  if (raw.includes('logged in')) {
    const parts = raw.split('logged in');
    const cleaned = parts[0].replace(/^(Branch|Warehouse|Main Warehouse)\s*/i, '').trim();
    return cleaned || raw;
  }
  return raw;
};

export default function BranchShiftMonitor() {
  const [activeTab, setActiveTab] = useState('live');
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({
    totalBranches: 0,
    activeShiftsCount: 0,
    todaySales: 0,
    todayInvoices: 0,
    todayLoginsCount: 0
  });

  // Tab 1: Live branches state
  const [branches, setBranches] = useState([]);

  // Tab 2: Sessions log state
  const [sessions, setSessions] = useState([]);
  const [sessionsMeta, setSessionsMeta] = useState({ page: 1, limit: 30, total: 0 });
  const [sessionsFilter, setSessionsFilter] = useState({
    branch_id: undefined,
    action_type: undefined,
    dateRange: null
  });

  // Tab 3: Shifts history state
  const [shifts, setShifts] = useState([]);
  const [shiftsMeta, setShiftsMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [shiftsFilter, setShiftsFilter] = useState({
    branch_id: undefined,
    status: undefined,
    dateRange: null
  });

  // Load KPIs and Live Branches
  const fetchKpisAndLive = async () => {
    try {
      const [kpiRes, branchRes] = await Promise.allSettled([
        api.get('/api/swm/branch-shifts-monitor/kpis'),
        api.get('/api/swm/branch-shifts-monitor/live-branches')
      ]);
      if (kpiRes.status === 'fulfilled' && kpiRes.value?.data?.success) {
        setKpis(kpiRes.value.data.data);
      }
      if (branchRes.status === 'fulfilled' && branchRes.value?.data?.success) {
        setBranches(branchRes.value.data.data);
      }
    } catch (err) {
      console.error('Fetch live monitor error:', err);
    }
  };

  // Load Sessions Log
  const fetchSessions = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: sessionsMeta.limit,
        branch_id: sessionsFilter.branch_id,
        action_type: sessionsFilter.action_type
      };
      if (sessionsFilter.dateRange && sessionsFilter.dateRange[0]) {
        params.start_date = sessionsFilter.dateRange[0].format('YYYY-MM-DD');
        params.end_date = sessionsFilter.dateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/api/swm/branch-shifts-monitor/sessions-log', { params });
      if (res.data?.success) {
        setSessions(res.data.data);
        setSessionsMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Shifts History
  const fetchShifts = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: shiftsMeta.limit,
        branch_id: shiftsFilter.branch_id,
        status: shiftsFilter.status
      };
      if (shiftsFilter.dateRange && shiftsFilter.dateRange[0]) {
        params.start_date = shiftsFilter.dateRange[0].format('YYYY-MM-DD');
        params.end_date = shiftsFilter.dateRange[1].format('YYYY-MM-DD');
      }
      const res = await api.get('/api/swm/branch-shifts-monitor/shifts-history', { params });
      if (res.data?.success) {
        setShifts(res.data.data);
        setShiftsMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Fetch shifts error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Shift Closure Automation state
  const [autoCloseConfig, setAutoCloseConfig] = useState({
    enabled: true,
    closeTime: '01:00',
    nextRunInMinutes: null
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configTimeVal, setConfigTimeVal] = useState('01:00');

  // Load Shift Closure Settings
  const fetchShiftCloseConfig = async () => {
    try {
      const res = await api.get('/api/swm/store-settings/shift-closure');
      if (res.data?.success) {
        setAutoCloseConfig(res.data.data);
        setConfigTimeVal(res.data.data.closeTime || '01:00');
      }
    } catch (e) {
      console.error('Fetch shift closure config error:', e);
    }
  };

  // Save Shift Closure Settings
  const handleSaveShiftCloseConfig = async (overrideEnabled, overrideTime) => {
    setSavingConfig(true);
    try {
      const targetEnabled = overrideEnabled !== undefined ? overrideEnabled : autoCloseConfig.enabled;
      const targetTime = overrideTime !== undefined ? overrideTime : configTimeVal;

      const res = await api.put('/api/swm/store-settings/shift-closure', {
        enabled: targetEnabled,
        closeTime: targetTime
      });

      if (res.data?.success) {
        setAutoCloseConfig(res.data.data);
        setConfigTimeVal(res.data.data.closeTime || '01:00');
        message.success(res.data.message || 'تم تحديث توقيت الإغلاق الآلي للورديات بنجاح');
      }
    } catch (err) {
      console.error('Save shift close config error:', err);
      message.error(err.response?.data?.message || 'فشل حفظ إعدادات الإغلاق الآلي');
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    fetchKpisAndLive();
    fetchSessions(1);
    fetchShifts(1);
    fetchShiftCloseConfig();
    const interval = setInterval(() => {
      fetchKpisAndLive();
      fetchShiftCloseConfig();
    }, 30000); // 30s live polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions(1);
    if (activeTab === 'shifts') fetchShifts(1);
  }, [activeTab, sessionsFilter, shiftsFilter]);

  // Action tag helper
  const renderActionTag = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'BRANCH_LOGIN':
      case 'ADMIN_WAREHOUSE_LOGIN':
      case 'BRANCH_STAFF_LOGIN':
        return <Tag color="green" icon={<LoginOutlined />}>تسجيل دخول</Tag>;
      case 'BRANCH_SUPERVISOR_LOGIN':
      case 'SUPERVISOR_UNLOCK':
        return <Tag color="gold" icon={<SafetyCertificateOutlined />}>دخول مشرف</Tag>;
      case 'LOGOUT':
        return <Tag color="red" icon={<LogoutOutlined />}>تسجيل خروج</Tag>;
      case 'POS_SESSION_OPEN':
        return <Tag color="blue" icon={<ShopOutlined />}>فتح وردية</Tag>;
      case 'POS_SESSION_CLOSE':
      case 'EOD_SHIFT_CLOSE':
        return <Tag color="purple" icon={<CheckCircleOutlined />}>إغلاق وردية (يدوي)</Tag>;
      case 'AUTO_POS_SESSION_CLOSE_1AM':
        return <Tag color="orange" icon={<ClockCircleOutlined />}>إغلاق آلي 1:00 AM</Tag>;
      default:
        return <Tag color="default">{action}</Tag>;
    }
  };

  const sessionsColumns = [
    {
      title: 'الوقت والتاريخ',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val) => dayjs(val).format('YYYY-MM-DD hh:mm:ss A')
    },
    {
      title: 'الفرع / المنفذ',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (val, row) => (
        <Space>
          <ShopOutlined style={{ color: '#C8A45C' }} />
          <Text strong>{val || 'الإدارة العامة'}</Text>
          {row.branch_code && <Tag color="default">{row.branch_code}</Tag>}
        </Space>
      )
    },
    {
      title: 'المستخدم / الموظف',
      dataIndex: 'user_full_name',
      key: 'user_full_name',
      render: (val, row) => (
        <Space>
          <UserOutlined />
          <Text>{val || row.username || 'حساب فرع'}</Text>
          {row.user_role && <Tag color="gold">{row.user_role}</Tag>}
        </Space>
      )
    },
    {
      title: 'نوع الحركة',
      dataIndex: 'action_type',
      key: 'action_type',
      render: renderActionTag
    },
    {
      title: 'عنوان IP والجهاز',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (val, row) => (
        <div>
          <Text code style={{ fontSize: 11 }}>{val || 'N/A'}</Text>
          {row.user_agent && (
            <div style={{ fontSize: 10, color: '#64748B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.user_agent}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'ملاحظات',
      dataIndex: 'notes',
      key: 'notes',
      render: (val) => <Text type="secondary" style={{ fontSize: 12 }}>{val || '-'}</Text>
    }
  ];

  const shiftsColumns = [
    {
      title: 'كود الوردية',
      dataIndex: 'shift_code',
      key: 'shift_code',
      render: (val) => <Text strong code style={{ color: '#C8A45C' }}>{val}</Text>
    },
    {
      title: 'الفرع',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (val, row) => `${val} (${row.branch_code})`
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (val) => val === 'open' ? <Tag color="green">مفتوحة حالياً</Tag> : <Tag color="default">مغلقة</Tag>
    },
    {
      title: 'مسؤول الفتح',
      dataIndex: 'opened_by_name',
      key: 'opened_by_name',
      render: (val, row) => (
        <div>
          <Text>{val || '-'}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {dayjs(row.opened_at).format('YYYY-MM-DD hh:mm A')}
          </div>
        </div>
      )
    },
    {
      title: 'مسؤول الإغلاق',
      dataIndex: 'closed_by_name',
      key: 'closed_by_name',
      render: (val, row) => row.closed_at ? (
        <div>
          <Text>{val || row.closure_type || '-'}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {dayjs(row.closed_at).format('YYYY-MM-DD hh:mm A')}
          </div>
        </div>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'مبيعات الوردية',
      dataIndex: 'gross_sales_total',
      key: 'gross_sales_total',
      render: (val) => <Text strong>{parseFloat(val || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'المرحل للخزينة',
      dataIndex: 'total_transferred_to_safe',
      key: 'total_transferred_to_safe',
      render: (val) => <Text type="success">{parseFloat(val || 0).toLocaleString()} ج.م</Text>
    },
    {
      title: 'العجز / الزيادة',
      dataIndex: 'cash_discrepancy',
      key: 'cash_discrepancy',
      render: (val) => {
        const d = parseFloat(val || 0);
        if (d === 0) return <Tag color="green">مطابق (0)</Tag>;
        if (d < 0) return <Tag color="red">عجز ({d} ج.م)</Tag>;
        return <Tag color="blue">زيادة (+{d} ج.م)</Tag>;
      }
    }
  ];

  return (
    <div style={{ padding: '4px 0' }} className="fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#0F172A' }}>
            مراقبة الورديات وعمليات فتح وإغلاق الفروع
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            لوحة رقابية حية لمتابعة نشاط الفروع، تواجد الكاشيرية، وسجلات تسجيل الدخول والخروج
          </Text>
        </div>
        <Space>
          <Button
            icon={<SyncOutlined />}
            onClick={() => {
              fetchKpisAndLive();
              if (activeTab === 'sessions') fetchSessions(sessionsMeta.page);
              if (activeTab === 'shifts') fetchShifts(shiftsMeta.page);
            }}
            style={{ borderRadius: 8, borderColor: '#C8A45C', color: '#0F172A', fontWeight: 600 }}
          >
            تحديث البيانات
          </Button>
        </Space>
      </div>

      {/* Executive Auto Shift Close Configuration Banner */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0B0F17 0%, #151D2A 50%, #0B0F17 100%)',
          border: '1px solid rgba(200, 164, 92, 0.45)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4), 0 0 20px rgba(200,164,92,0.1)',
          marginBottom: 24,
          color: '#F8FAFC'
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(200, 164, 92, 0.15)',
                  border: '1px solid #C8A45C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DFCA95'
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 18 }} />
              </div>
              <Title level={4} style={{ margin: 0, color: '#DFCA95', fontWeight: 800 }}>
                إغلاق النظام الآلي للوردية ونهاية اليوم (Automated Shift Close & EOD)
              </Title>
              {autoCloseConfig.enabled ? (
                <Tag color="success" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                  <CheckCircleFilled style={{ marginLeft: 4 }} />
                  مفعل ونشط
                </Tag>
              ) : (
                <Tag color="default" style={{ fontWeight: 700, borderRadius: 6, margin: 0, backgroundColor: '#334155', color: '#94A3B8', borderColor: '#475569' }}>
                  معطل حالياً
                </Tag>
              )}
            </div>

            <Text style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.6, display: 'block' }}>
              يقوم النظام آلياً في الموعد المحدد بإغلاق كافة الورديات المفتوحة بجميع الفروع، ترحيل متحصلات الكاش والفيزا إلى خزائن الفروع المركزية، وفتح ورديات جديدة تلقائياً لليوم الجديد دون انقطاع العمل.
            </Text>

            {autoCloseConfig.enabled && autoCloseConfig.nextRunInMinutes !== null && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200, 164, 92, 0.12)', border: '1px solid rgba(200, 164, 92, 0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#DFCA95' }}>
                <ThunderboltOutlined style={{ color: '#F59E0B' }} />
                <span>
                  الموعد المحدد: <strong>الساعة {autoCloseConfig.closeTime}</strong> — التنفيذ القادم بعد <strong>{Math.floor(autoCloseConfig.nextRunInMinutes / 60)} س و {autoCloseConfig.nextRunInMinutes % 60} د</strong>
                </span>
              </div>
            )}
          </div>

          {/* Right Action / Control Panel */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(200, 164, 92, 0.25)',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minWidth: 320
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                حالة الإغلاق الآلي:
              </span>
              <Switch
                checked={autoCloseConfig.enabled}
                onChange={(checked) => handleSaveShiftCloseConfig(checked, configTimeVal)}
                checkedChildren="مفعل"
                unCheckedChildren="معطل"
                style={{ backgroundColor: autoCloseConfig.enabled ? '#16A34A' : '#475569' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                توقيت الإغلاق:
              </span>
              <Input
                value={configTimeVal}
                onChange={(e) => setConfigTimeVal(e.target.value)}
                placeholder="HH:mm (مثال 01:00)"
                style={{
                  width: 110,
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  backgroundColor: '#0B0F17',
                  borderColor: '#C8A45C',
                  color: '#DFCA95',
                  borderRadius: 6
                }}
              />
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingConfig}
                onClick={() => handleSaveShiftCloseConfig(autoCloseConfig.enabled, configTimeVal)}
                style={{
                  backgroundColor: '#C8A45C',
                  borderColor: '#C8A45C',
                  color: '#0B0F17',
                  fontWeight: 800,
                  borderRadius: 6
                }}
              >
                تطبيق
              </Button>
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>خيارات سريعة:</span>
              {[
                { label: '01:00 ص (افتراضي)', val: '01:00' },
                { label: '02:00 ص', val: '02:00' },
                { label: '12:00 منتصف الليل', val: '00:00' }
              ].map((p) => (
                <Tag
                  key={p.val}
                  onClick={() => {
                    setConfigTimeVal(p.val);
                    handleSaveShiftCloseConfig(autoCloseConfig.enabled, p.val);
                  }}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 11,
                    backgroundColor: configTimeVal === p.val ? 'rgba(200, 164, 92, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    borderColor: configTimeVal === p.val ? '#C8A45C' : '#475569',
                    color: configTimeVal === p.val ? '#DFCA95' : '#CBD5E1',
                    margin: 0
                  }}
                >
                  {p.label}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Top Operations KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <Statistic
              title={<span style={{ color: '#64748B', fontWeight: 600 }}>إجمالي الفروع النشطة</span>}
              value={kpis.totalBranches}
              prefix={<ShopOutlined style={{ color: '#C8A45C', marginLeft: 8 }} />}
              valueStyle={{ fontWeight: 800, color: '#0F172A' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <Statistic
              title={<span style={{ color: '#64748B', fontWeight: 600 }}>الفروع المفتوحة (ورديات نشطة)</span>}
              value={kpis.activeShiftsCount}
              prefix={<Badge status="processing" color="#16A34A" style={{ marginLeft: 8 }} />}
              valueStyle={{ fontWeight: 800, color: '#16A34A' }}
              suffix={<span style={{ fontSize: 12, color: '#64748B' }}>فرع مفتوح</span>}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <Statistic
              title={<span style={{ color: '#64748B', fontWeight: 600 }}>إجمالي مبيعات اليوم الحية</span>}
              value={kpis.todaySales}
              prefix={<DollarCircleOutlined style={{ color: '#C8A45C', marginLeft: 8 }} />}
              precision={0}
              suffix="ج.م"
              valueStyle={{ fontWeight: 800, color: '#0F172A' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card style={{ borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <Statistic
              title={<span style={{ color: '#64748B', fontWeight: 600 }}>حركات تسجيل الدخول اليوم</span>}
              value={kpis.todayLoginsCount}
              prefix={<LoginOutlined style={{ color: '#2563EB', marginLeft: 8 }} />}
              valueStyle={{ fontWeight: 800, color: '#2563EB' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs Navigation */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 14, border: '1px solid #E2E8F0' }}
        items={[
          {
            key: 'live',
            label: (
              <span>
                <ShopOutlined /> لوحة حالة الفروع الحية (فتح / إغلاق)
              </span>
            ),
            children: (
              <div style={{ paddingTop: 12 }}>
                <Row gutter={[16, 16]}>
                  {branches.map((b) => {
                    const isOpen = b.isOpen;
                    const hasActiveShift = b.hasActiveShift;
                    const accentColor = hasActiveShift ? '#16A34A' : isOpen ? '#0284C7' : '#94A3B8';

                    return (
                      <Col xs={24} sm={12} lg={8} key={b.id}>
                        <div
                          className={`live-branch-card ${isOpen ? 'is-open' : ''}`}
                          style={{
                            borderTop: `4px solid ${accentColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                          }}
                        >
                          <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Card Header: Branch Name, Code, City & Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <ShopOutlined style={{ color: accentColor, fontSize: 16 }} />
                                  <Text strong style={{ fontSize: 16, color: '#0F172A' }}>{b.branchName}</Text>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                                  <Tag color="cyan" style={{ fontSize: 11, borderRadius: 4, margin: 0, fontWeight: 700 }}>
                                    {b.branchCode}
                                  </Tag>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    • {b.city || 'المركز الرئيسي'}
                                  </Text>
                                </div>
                              </div>

                              {hasActiveShift ? (
                                <Tag color="success" style={{ borderRadius: 8, padding: '3px 10px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Badge status="processing" color="#16A34A" />
                                  <span>مفتوح (وردية نشطة)</span>
                                </Tag>
                              ) : isOpen ? (
                                <Tag color="processing" style={{ borderRadius: 8, padding: '3px 10px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Badge status="processing" color="#0284C7" />
                                  <span>متصل (جلسة نشطة)</span>
                                </Tag>
                              ) : (
                                <Tag color="default" style={{ borderRadius: 8, padding: '3px 10px', fontWeight: 700, margin: 0, backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }}>
                                  مغلق حالياً
                                </Tag>
                              )}
                            </div>

                            {/* Card Body: Active Operator / Shift Details */}
                            {isOpen && b.activeShift ? (
                              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 12, borderRadius: 10, marginBottom: 14, flex: 1 }}>
                                {/* Cashier / Operator Row */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #CBD5E1' }}>
                                  <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <UserOutlined />
                                    <span>{hasActiveShift ? 'الكاشير المسؤول:' : 'المشغل / الحساب:'}</span>
                                  </span>
                                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.activeShift.cashierName}>
                                    {formatCashierName(b.activeShift.cashierName)}
                                  </span>
                                </div>

                                {/* Shift Time & Opening Float */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                  <div style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                                    <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>
                                      <ClockCircleOutlined style={{ marginLeft: 4 }} />
                                      {hasActiveShift ? 'فتح الوردية:' : 'وقت الدخول:'}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                                      {b.activeShift.openedAt ? dayjs(b.activeShift.openedAt).format('hh:mm A') : '-'}
                                    </span>
                                  </div>

                                  <div style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                                    <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>
                                      <DollarCircleOutlined style={{ marginLeft: 4 }} />
                                      العهدة الافتتاحية:
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                                      {hasActiveShift ? `${b.activeShift.openingFloat.toLocaleString()} ج.م` : '-'}
                                    </span>
                                  </div>
                                </div>

                                {/* Live Shift Sales Banner */}
                                {hasActiveShift ? (
                                  <div
                                    style={{
                                      background: 'linear-gradient(135deg, #0B0F17 0%, #151D2A 100%)',
                                      border: '1px solid rgba(200, 164, 92, 0.4)',
                                      borderRadius: 8,
                                      padding: '8px 12px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <span style={{ fontSize: 12, color: '#DFCA95', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <RiseOutlined />
                                      <span>مبيعات الوردية حتى الآن:</span>
                                    </span>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: '#DFCA95', fontFamily: 'monospace' }}>
                                      {b.activeShift.currentSales.toLocaleString()} ج.م
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 11.5, color: '#16A34A', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '6px 10px', borderRadius: 6, border: '1px solid #A7F3D0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <Check size={13} />
                                    <span>متصل بالنظام وجاهز للعمليات</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', padding: '22px 14px', borderRadius: 10, marginBottom: 14, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 12.5, display: 'block', fontWeight: 600 }}>
                                  لا توجد وردية أو جلسة نشطة مسجلة في هذا الفرع حالياً
                                </Text>
                                {b.lastActivity?.time && (
                                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                                    آخر نشاط: {dayjs(b.lastActivity.time).format('YYYY-MM-DD hh:mm A')}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Card Footer: Safe Cash & Working Hours */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 'auto' }}>
                              <div>
                                <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <WalletOutlined />
                                  <span>نقدية الخزينة:</span>
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                                  {b.safeCash.toLocaleString()} ج.م
                                </span>
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>
                                  ساعات العمل:
                                </span>
                                <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                                  {b.workingHours || '10:00 AM - 11:00 PM'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            )
          },
          {
            key: 'sessions',
            label: (
              <span>
                <LoginOutlined /> سجل تسجيل الدخول والخروج (Login & Logout Log)
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {/* Filters Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select
                    placeholder="تصفية حسب الفرع"
                    value={sessionsFilter.branch_id}
                    onChange={(val) => setSessionsFilter(prev => ({ ...prev, branch_id: val }))}
                    style={{ width: 180 }}
                    allowClear
                  >
                    {branches.map(b => (
                      <Option key={b.id} value={b.id}>{b.branchName}</Option>
                    ))}
                  </Select>

                  <Select
                    placeholder="نوع الحركة"
                    value={sessionsFilter.action_type}
                    onChange={(val) => setSessionsFilter(prev => ({ ...prev, action_type: val }))}
                    style={{ width: 180 }}
                    allowClear
                  >
                    <Option value="LOGIN">تسجيل دخول مستخدم</Option>
                    <Option value="BRANCH_LOGIN">تسجيل دخول فرع</Option>
                    <Option value="LOGOUT">تسجيل خروج</Option>
                    <Option value="SUPERVISOR_UNLOCK">دخول مشرف</Option>
                    <Option value="POS_SESSION_OPEN">فتح جلسة POS</Option>
                    <Option value="POS_SESSION_CLOSE">إغلاق جلسة POS</Option>
                  </Select>

                  <RangePicker
                    placeholder={['من تاريخ', 'إلى تاريخ']}
                    value={sessionsFilter.dateRange}
                    onChange={(val) => setSessionsFilter(prev => ({ ...prev, dateRange: val }))}
                  />

                  <Button
                    onClick={() => setSessionsFilter({ branch_id: undefined, action_type: undefined, dateRange: null })}
                    type="link"
                    style={{ color: '#C8A45C' }}
                  >
                    إعادة ضبط الفلاتر
                  </Button>
                </div>

                <Table
                  dataSource={sessions}
                  columns={sessionsColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: sessionsMeta.page,
                    pageSize: sessionsMeta.limit,
                    total: sessionsMeta.total,
                    onChange: (p) => fetchSessions(p),
                    showTotal: (total) => `إجمالي الحركات: ${total}`
                  }}
                />
              </div>
            )
          },
          {
            key: 'shifts',
            label: (
              <span>
                <AuditOutlined /> سجل الورديات والإغلاقات (Shift Reconciliation)
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {/* Filters Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Select
                    placeholder="تصفية حسب الفرع"
                    value={shiftsFilter.branch_id}
                    onChange={(val) => setShiftsFilter(prev => ({ ...prev, branch_id: val }))}
                    style={{ width: 180 }}
                    allowClear
                  >
                    {branches.map(b => (
                      <Option key={b.id} value={b.id}>{b.branchName}</Option>
                    ))}
                  </Select>

                  <Select
                    placeholder="حالة الوردية"
                    value={shiftsFilter.status}
                    onChange={(val) => setShiftsFilter(prev => ({ ...prev, status: val }))}
                    style={{ width: 150 }}
                    allowClear
                  >
                    <Option value="open">مفتوحة حالياً</Option>
                    <Option value="closed">مغلقة ومرحلة</Option>
                  </Select>

                  <RangePicker
                    placeholder={['من تاريخ', 'إلى تاريخ']}
                    value={shiftsFilter.dateRange}
                    onChange={(val) => setShiftsFilter(prev => ({ ...prev, dateRange: val }))}
                  />

                  <Button
                    onClick={() => setShiftsFilter({ branch_id: undefined, status: undefined, dateRange: null })}
                    type="link"
                    style={{ color: '#C8A45C' }}
                  >
                    إعادة ضبط
                  </Button>
                </div>

                <Table
                  dataSource={shifts}
                  columns={shiftsColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: shiftsMeta.page,
                    pageSize: shiftsMeta.limit,
                    total: shiftsMeta.total,
                    onChange: (p) => fetchShifts(p),
                    showTotal: (total) => `إجمالي الورديات: ${total}`
                  }}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
