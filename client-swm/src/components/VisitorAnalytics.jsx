import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Typography,
  Space,
  Statistic,
  Progress,
  Badge,
  DatePicker,
  Tooltip,
  Divider,
  Alert,
  Empty
} from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  DesktopOutlined,
  MobileOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  CalendarOutlined,
  GlobalOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ArrowRightOutlined,
  FireOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { ShoppingCart, Check } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
import api from '../api';

dayjs.extend(relativeTime);
dayjs.locale('ar');

const { Title, Text } = Typography;

export default function VisitorAnalytics() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().subtract(29, 'day'), dayjs()]);
  const [isAllTime, setIsAllTime] = useState(false);
  const [presetKey, setPresetKey] = useState('30d');
  const [data, setData] = useState(null);

  const rangePresets = [
    { label: 'اليوم', value: [dayjs().startOf('day'), dayjs().endOf('day')], key: 'today' },
    { label: 'أمس', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')], key: 'yesterday' },
    { label: 'آخر 7 أيام', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')], key: '7d' },
    { label: 'آخر 14 يوم', value: [dayjs().subtract(13, 'day').startOf('day'), dayjs().endOf('day')], key: '14d' },
    { label: 'آخر 30 يوم', value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')], key: '30d' },
    { label: 'هذا الشهر', value: [dayjs().startOf('month'), dayjs().endOf('month')], key: 'this_month' }
  ];

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (isAllTime) {
        params.days = 'all';
      } else if (presetKey === 'today') {
        params.days = 'today';
      } else if (presetKey === 'yesterday') {
        params.days = 'yesterday';
      } else if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        params.days = '30';
      }

      const res = await api.get('/api/swm/visitor-analytics', { params });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Fetch visitor analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 45s for live tracking
    const timer = setInterval(() => {
      fetchAnalytics();
    }, 45000);
    return () => clearInterval(timer);
  }, [dateRange, isAllTime, presetKey]);

  const kpi = data?.kpi || {};
  const cities = data?.cities || [];
  const funnel = data?.funnel || [];
  const devices = data?.devices || [];
  const topProducts = data?.top_viewed_products || [];
  const recentSessions = data?.recent_sessions || [];
  const referrers = data?.referrers || [];

  const formatSeconds = (sec) => {
    const s = parseInt(sec || 0, 10);
    if (s < 60) return `${s} ثانية`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m} دقيقة ${rem > 0 ? `و ${rem} ث` : ''}`;
  };

  // City Table Columns
  const cityColumns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_, __, i) => (
        <Badge
          count={i + 1}
          style={{
            backgroundColor: i === 0 ? '#C8A45C' : i === 1 ? '#0F172A' : i === 2 ? '#2563EB' : '#94A3B8',
            color: '#fff'
          }}
        />
      )
    },
    {
      title: 'المدينة / المحافظة',
      dataIndex: 'city',
      key: 'city',
      render: (city, r) => (
        <div>
          <Space>
            <CompassOutlined style={{ color: '#C8A45C' }} />
            <Text strong style={{ fontSize: 13.5, color: '#0F172A' }}>{city}</Text>
          </Space>
          {r.region && r.region !== city && (
            <div style={{ fontSize: 11, color: '#64748B', marginRight: 18 }}>
              {r.region} • {r.country}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'عدد الزيارات',
      dataIndex: 'count',
      key: 'count',
      align: 'center',
      render: (cnt) => (
        <Tag color="blue" style={{ fontWeight: 700, fontSize: 12 }}>
          {cnt} زيارة
        </Tag>
      )
    },
    {
      title: 'الزوار الفريدين',
      dataIndex: 'unique_visitors',
      key: 'unique_visitors',
      align: 'center',
      render: (uv) => <span style={{ fontWeight: 600 }}>{uv} زائر</span>
    },
    {
      title: 'الحصة من إجمالي الزوار',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 150,
      render: (pct) => (
        <div>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 2 }}>{pct}%</div>
          <Progress percent={pct} size="small" strokeColor="#C8A45C" showInfo={false} />
        </div>
      )
    },
    {
      title: 'الطلبات المكتملة',
      dataIndex: 'orders_count',
      key: 'orders_count',
      align: 'center',
      render: (orders, r) => (
        <div>
          <Tag color={orders > 0 ? 'green' : 'default'} style={{ fontWeight: 700 }}>
            {orders} طلب
          </Tag>
          {orders > 0 && (
            <div style={{ fontSize: 10.5, color: '#16A34A', fontWeight: 600, marginTop: 2 }}>
              تحويل: {r.conversion_rate}%
            </div>
          )}
        </div>
      )
    }
  ];

  // Recent Sessions Columns
  const sessionColumns = [
    {
      title: 'المدينة والموقع',
      dataIndex: 'city',
      key: 'city',
      render: (city, r) => (
        <div>
          <Space size={6}>
            <CompassOutlined style={{ color: '#2563EB' }} />
            <Text strong style={{ fontSize: 12.5 }}>{city || 'القاهرة'}</Text>
          </Space>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {r.region || 'مصر'}
          </div>
        </div>
      )
    },
    {
      title: 'الجهاز والمتصفح',
      dataIndex: 'device_type',
      key: 'device_type',
      render: (device, r) => (
        <div>
          <Space size={4}>
            {device === 'desktop' ? <DesktopOutlined style={{ color: '#475569' }} /> : <MobileOutlined style={{ color: '#059669' }} />}
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {device === 'desktop' ? 'كمبيوتر' : (device === 'tablet' ? 'تابلت' : 'هاتف ذكي')}
            </span>
          </Space>
          <div style={{ fontSize: 10.5, color: '#64748B' }}>
            {r.os || 'Unknown'} • {r.browser || ''}
          </div>
        </div>
      )
    },
    {
      title: 'الصفحات والنشاط',
      dataIndex: 'page_views_count',
      key: 'page_views_count',
      render: (pvc, r) => (
        <div>
          <Space wrap size={4}>
            <Tag color="cyan">{pvc} مشاهدات</Tag>
            {r.has_cart_activity && <Tag color="orange" icon={<ShoppingCart size={11} />}>سلة</Tag>}
            {r.has_ordered && <Tag color="green" icon={<Check size={11} />}>تم الشراء</Tag>}
          </Space>
          <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>
            آخر صفحة: <code style={{ fontSize: 10 }}>{r.exit_page || '/'}</code>
          </div>
        </div>
      )
    },
    {
      title: 'مدة التصفح',
      dataIndex: 'duration_seconds',
      key: 'duration_seconds',
      render: (dur) => <span style={{ fontSize: 11.5, color: '#334155' }}>{formatSeconds(dur)}</span>
    },
    {
      title: 'آخر نشاط',
      dataIndex: 'last_activity_at',
      key: 'last_activity_at',
      render: (ts) => (
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
            {dayjs(ts).fromNow()}
          </span>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>
            {dayjs(ts).format('HH:mm:ss')}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="visitor-analytics-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Filter and Live Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#FFFFFF',
          padding: '12px 18px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}
      >
        <Space wrap size={8}>
          {rangePresets.map((p) => (
            <Button
              key={p.key}
              size="middle"
              type={presetKey === p.key && !isAllTime ? 'primary' : 'default'}
              onClick={() => {
                setIsAllTime(false);
                setPresetKey(p.key);
                setDateRange(p.value);
              }}
              style={{
                borderRadius: 8,
                backgroundColor: presetKey === p.key && !isAllTime ? '#0F172A' : undefined,
                fontWeight: 600
              }}
            >
              {p.label}
            </Button>
          ))}

          <Button
            size="middle"
            type={isAllTime ? 'primary' : 'default'}
            onClick={() => {
              setIsAllTime(true);
              setPresetKey('all');
              setDateRange(null);
            }}
            style={{
              borderRadius: 8,
              backgroundColor: isAllTime ? '#0F172A' : undefined,
              fontWeight: 600
            }}
          >
            كل الأوقات
          </Button>

          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange(dates);
                setIsAllTime(false);
                setPresetKey('custom');
              }
            }}
            format="YYYY-MM-DD"
            placeholder={['من تاريخ', 'إلى تاريخ']}
            allowClear={false}
            style={{ borderRadius: 8, width: 230 }}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAnalytics}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            تحديث
          </Button>
        </Space>

        {/* Live Indicator Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#F0FDF4',
            padding: '6px 14px',
            borderRadius: 20,
            border: '1px solid #BBF7D0'
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#16A34A',
              display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.25)'
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
            الزوار المتصلين بالمتجر الآن: <strong>{kpi.live_visitors_now || 0}</strong> زائر
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #0F172A', height: '100%' }}>
            <Statistic
              title="إجمالي الزيارات"
              value={kpi.total_sessions || 0}
              suffix="زيارة"
              valueStyle={{ color: '#0F172A', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 22px)' }}
              prefix={<UserOutlined style={{ color: '#C8A45C' }} />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              منها {kpi.unique_visitors || 0} زائر فريد
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #2563EB', height: '100%' }}>
            <Statistic
              title="مشاهدات الصفحات"
              value={kpi.total_pageviews || 0}
              suffix="مشاهدة"
              valueStyle={{ color: '#2563EB', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 22px)' }}
              prefix={<EyeOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              معدل {kpi.total_sessions > 0 ? (kpi.total_pageviews / kpi.total_sessions).toFixed(1) : 0} صفحة / جلسة
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #F59E0B', height: '100%' }}>
            <Statistic
              title="معدل الإضافة للسلة"
              value={kpi.cart_rate || 0}
              suffix="%"
              valueStyle={{ color: '#D97706', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 22px)' }}
              prefix={<ShoppingCartOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              نسبة الزوار المتفاعلين مع السلة
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #16A34A', height: '100%' }}>
            <Statistic
              title="معدل إتمام الشراء"
              value={kpi.order_rate || 0}
              suffix="%"
              valueStyle={{ color: '#16A34A', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 22px)' }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              نسبة تحويل الزوار لمشترين
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #7C3AED', height: '100%' }}>
            <Statistic
              title="متوسط مدة الجلسة"
              value={formatSeconds(kpi.avg_duration_seconds)}
              valueStyle={{ color: '#7C3AED', fontWeight: 800, fontSize: 'clamp(15px, 3.5vw, 18px)' }}
              prefix={<ClockCircleOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              معدل بقاء الزائر في المتجر
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6} lg={4}>
          <Card size="small" style={{ borderRadius: 12, borderTop: '4px solid #EF4444', height: '100%' }}>
            <Statistic
              title="معدل الارتداد (Bounce)"
              value={kpi.bounce_rate || 0}
              suffix="%"
              valueStyle={{ color: '#DC2626', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 22px)' }}
              prefix={<FireOutlined />}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              غادروا بعد صفحة واحدة فقط
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row: Conversion Funnel Visualizer */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
        title={
          <Space>
            <LineChartOutlined style={{ color: '#C8A45C' }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>قمع التحويل ومسار سلوك العميل (E-Commerce Funnel)</span>
          </Space>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {funnel.map((step, idx) => (
            <div
              key={step.stage}
              style={{
                background: '#F8FAFC',
                borderRadius: 10,
                padding: '14px 12px',
                border: '1px solid #E2E8F0',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                خطوة {idx + 1}: {step.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: step.color, fontVariantNumeric: 'tabular-nums' }}>
                  {step.count.toLocaleString()}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>زائر</span>
              </div>
              <Progress
                percent={step.percentage}
                size="small"
                strokeColor={step.color}
                format={(p) => `${p}%`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Main Grid: Cities Distribution & Devices Breakdown */}
      <Row gutter={[16, 16]}>
        {/* Cities Table */}
        <Col xs={24} lg={15}>
          <Card
            size="small"
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <GlobalOutlined style={{ color: '#2563EB' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    توزيع الزوار حسب المدن والمحافظات (Visitor Cities & Geography)
                  </span>
                </Space>
                <Tag color="gold">{cities.length} مدينة رُصدت</Tag>
              </div>
            }
          >
            <Table
              dataSource={cities}
              columns={cityColumns}
              rowKey="city"
              loading={loading}
              pagination={{ pageSize: 7 }}
              size="middle"
              bordered
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        {/* Devices, Browsers & Traffic Sources */}
        <Col xs={24} lg={9}>
          <Card
            size="small"
            style={{ borderRadius: 12, border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
            title={
              <Space>
                <DesktopOutlined style={{ color: '#0F172A' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>أنواع الأجهزة ومصادر الزيارات</span>
              </Space>
            }
          >
            {/* Devices */}
            <div style={{ marginBottom: 18 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#0F172A' }}>
                الأجهزة المستخدمة:
              </Text>
              {devices.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>لا توجد بيانات مسجلة بعد</Text>
              ) : (
                devices.map((d) => (
                  <div key={d.device} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <Space>
                        {d.device === 'desktop' ? <DesktopOutlined /> : <MobileOutlined />}
                        <span>{d.device === 'desktop' ? 'أجهزة الكمبيوتر (Desktop)' : (d.device === 'tablet' ? 'أجهزة التابلت (Tablet)' : 'الهواتف الذكية (Mobile)')}</span>
                      </Space>
                      <strong>{d.count} ({d.percentage}%)</strong>
                    </div>
                    <Progress percent={d.percentage} strokeColor={d.device === 'mobile' ? '#16A34A' : '#2563EB'} showInfo={false} size="small" />
                  </div>
                ))
              )}
            </div>

            <Divider style={{ margin: '14px 0' }} />

            {/* Referrers */}
            <div>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#0F172A' }}>
                مصادر الحركة والزيارات (Referrers):
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {referrers.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>لا توجد مصادر محددة</Text>
                ) : (
                  referrers.map((r) => (
                    <div key={r.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '6px 10px', borderRadius: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.source}</span>
                      <Tag color="purple">{r.count} زيارة ({r.percentage}%)</Tag>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Real-Time Recent Visitors Sessions Activity Table */}
      <Card
        size="small"
        style={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#F59E0B' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                سجل حركة الزوار الفعلي واللحظي (Live Visitor Activity Stream)
              </span>
            </Space>
            <Tag color="cyan">آخر {recentSessions.length} جلسة نشطة</Tag>
          </div>
        }
      >
        <Table
          dataSource={recentSessions}
          columns={sessionColumns}
          rowKey="session_id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          size="small"
          bordered
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
