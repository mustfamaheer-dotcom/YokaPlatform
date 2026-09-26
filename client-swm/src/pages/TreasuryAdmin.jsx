import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Modal, Tag, Space, Typography,
  message, Statistic, Badge, Tooltip, Popconfirm, Alert, Empty,
  Spin, Divider, Select, DatePicker
} from 'antd';
import {
  BankOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, ReloadOutlined, ShopOutlined,
  DollarCircleOutlined, ArrowDownOutlined, TeamOutlined,
  EyeOutlined, WalletOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  pending:   { label: 'في الانتظار',  color: 'orange', icon: <ClockCircleOutlined /> },
  completed: { label: 'تم الاستلام',  color: 'green',  icon: <CheckCircleOutlined /> },
  cancelled: { label: 'ملغى',         color: 'red',    icon: <CloseCircleOutlined /> }
};

export default function TreasuryAdmin() {
  const [kpis, setKpis]               = useState(null);
  const [transfers, setTransfers]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [kpiRes, trfRes] = await Promise.all([
        api.get('/api/swm/treasury/kpis'),
        api.get('/api/swm/treasury/transfers', { params: { status: statusFilter, limit: 100 } })
      ]);
      if (kpiRes.data.success) setKpis(kpiRes.data.data);
      if (trfRes.data.success) setTransfers(trfRes.data.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تحميل بيانات الخزائن');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const handleConfirm = async (id) => {
    setConfirmingId(id);
    try {
      const res = await api.put(`/api/swm/treasury/transfers/${id}/confirm`);
      if (res.data.success) {
        message.success(res.data.message);
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تأكيد التحويل');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const res = await api.put(`/api/swm/treasury/transfers/${id}/cancel`, { reason: 'رفض بواسطة المدير' });
      if (res.data.success) {
        message.success(res.data.message);
        fetchAll();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في إلغاء الطلب');
    } finally {
      setCancellingId(null);
    }
  };

  const pendingCount = transfers.filter(t => t.status === 'pending').length;

  const columns = [
    {
      title: 'رقم الطلب',
      dataIndex: 'transfer_ref',
      key: 'transfer_ref',
      render: v => <Text code style={{ fontSize: 12 }}>{v}</Text>
    },
    {
      title: 'الفرع المُرسِل',
      dataIndex: 'from_branch_name',
      key: 'from_branch_name',
      render: (v, rec) => (
        <Space size={4}>
          <ShopOutlined style={{ color: '#4f46e5' }} />
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>({rec.from_branch_code})</Text>
        </Space>
      )
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      render: v => (
        <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
          {parseFloat(v).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
        </Text>
      )
    },
    {
      title: 'طريقة التحويل',
      dataIndex: 'transfer_method',
      key: 'transfer_method',
      render: v => <Tag color={v === 'bank_transfer' ? 'blue' : 'geekblue'}>{v === 'bank_transfer' ? '🏦 بنكي' : '💵 نقدي'}</Tag>
    },
    {
      title: 'رقم مرجعي',
      dataIndex: 'reference_no',
      key: 'reference_no',
      render: v => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text type="secondary">—</Text>
    },
    {
      title: 'طلب بواسطة',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
      render: (v, rec) => v || rec.requested_by_username || '—'
    },
    {
      title: 'تاريخ الطلب',
      dataIndex: 'requested_at',
      key: 'requested_at',
      sorter: (a, b) => new Date(b.requested_at) - new Date(a.requested_at),
      defaultSortOrder: 'descend',
      render: d => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: status => {
        const s = STATUS_MAP[status] || { label: status, color: 'default', icon: null };
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>;
      }
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      fixed: 'left',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="تفاصيل الطلب">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => { setDetailRecord(record); setDetailVisible(true); }}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title={`تأكيد استلام ${parseFloat(record.amount).toFixed(2)} ج.م من ${record.from_branch_name}؟`}
                okText="تأكيد الاستلام"
                cancelText="إلغاء"
                okType="primary"
                onConfirm={() => handleConfirm(record.id)}
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={confirmingId === record.id}
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                >
                  تأكيد
                </Button>
              </Popconfirm>

              <Popconfirm
                title="رفض وإرجاع المبلغ لخزنة الفرع؟"
                okText="رفض"
                cancelText="إلغاء"
                okType="danger"
                onConfirm={() => handleCancel(record.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={cancellingId === record.id}
                >
                  رفض
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BankOutlined style={{ marginLeft: 8, color: '#4f46e5' }} />
            إدارة الخزائن (Treasury Management)
          </Title>
          <Text type="secondary">
            متابعة تحويلات النقدية من الفروع للخزينة الرئيسية، وتأكيد الاستلام
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>تحديث</Button>
      </div>

      {loading && !kpis ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="جاري تحميل بيانات الخزائن..." />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #4f46e5' }}>
                <Statistic
                  title="رصيد الخزينة الرئيسية"
                  value={kpis?.main_register_balance || 0}
                  precision={2}
                  suffix="ج.م"
                  prefix={<BankOutlined style={{ color: '#4f46e5' }} />}
                  valueStyle={{ color: '#4f46e5', fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #16a34a' }}>
                <Statistic
                  title="إجمالي المستلم (مؤكد)"
                  value={kpis?.total_received || 0}
                  precision={2}
                  suffix="ج.م"
                  prefix={<ArrowDownOutlined style={{ color: '#16a34a' }} />}
                  valueStyle={{ color: '#16a34a', fontSize: 20 }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>{kpis?.completed_count || 0} تحويل مكتمل</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
                <Statistic
                  title="طلبات معلقة"
                  value={kpis?.pending_count || 0}
                  suffix="طلب"
                  prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                  valueStyle={{ color: kpis?.pending_count > 0 ? '#f59e0b' : '#94a3b8', fontSize: 20 }}
                />
                {kpis?.total_pending_amount > 0 && (
                  <Text type="warning" style={{ fontSize: 11 }}>
                    {parseFloat(kpis.total_pending_amount).toFixed(2)} ج.م في الانتظار
                  </Text>
                )}
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #0284c7' }}>
                <Statistic
                  title="فروع أرسلت تحويلات"
                  value={kpis?.active_sending_branches || 0}
                  suffix="فرع"
                  prefix={<TeamOutlined style={{ color: '#0284c7' }} />}
                  valueStyle={{ color: '#0284c7', fontSize: 20 }}
                />
              </Card>
            </Col>
          </Row>

          {/* Branch Summary Cards */}
          {kpis?.branch_summary?.length > 0 && (
            <>
              <Title level={5} style={{ marginBottom: 12 }}>
                <ShopOutlined style={{ marginLeft: 6 }} />
                ملخص خزائن الفروع
              </Title>
              <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                {kpis.branch_summary.map(branch => (
                  <Col xs={24} sm={12} md={8} key={branch.branch_id}>
                    <Card
                      size="small"
                      style={{ borderRadius: 10, border: branch.pending_count > 0 ? '1px solid #f59e0b' : undefined }}
                      title={
                        <Space>
                          <ShopOutlined style={{ color: '#4f46e5' }} />
                          <Text strong style={{ fontSize: 13 }}>{branch.branch_name}</Text>
                          {branch.pending_count > 0 && (
                            <Badge count={branch.pending_count} style={{ backgroundColor: '#f59e0b' }} />
                          )}
                        </Space>
                      }
                    >
                      <Row gutter={8}>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>رصيد الخزنة</Text>
                          <div>
                            <Text strong style={{ color: '#4f46e5', fontSize: 14 }}>
                              {parseFloat(branch.current_balance || 0).toFixed(2)} ج.م
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>إجمالي ما أرسله</Text>
                          <div>
                            <Text strong style={{ color: '#16a34a', fontSize: 14 }}>
                              {parseFloat(branch.total_sent || 0).toFixed(2)} ج.م
                            </Text>
                          </div>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <Space>
                        <Tag color={branch.register_status === 'open' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                          {branch.register_status === 'open' ? 'مفتوح' : 'مغلق'}
                        </Tag>
                        {branch.pending_count > 0 && (
                          <Tag color="orange" style={{ fontSize: 11 }}>{branch.pending_count} طلب معلق</Tag>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}

          {/* Pending alert */}
          {(kpis?.pending_count || 0) > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              message={`${kpis.pending_count} طلب تحويل في انتظار تأكيدك`}
              description={`إجمالي المبالغ المعلقة: ${parseFloat(kpis.total_pending_amount || 0).toFixed(2)} ج.م`}
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {/* Transfers Table */}
          <Card
            title={
              <Space>
                <DollarCircleOutlined style={{ color: '#4f46e5' }} />
                <span>طلبات التحويل الواردة</span>
                <Badge
                  count={pendingCount}
                  showZero
                  style={{ backgroundColor: pendingCount > 0 ? '#f59e0b' : '#94a3b8' }}
                />
              </Space>
            }
            extra={
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 170 }}
                size="small"
              >
                <Option value="pending">⏳ المعلقة فقط</Option>
                <Option value="completed">✅ المؤكدة فقط</Option>
                <Option value="cancelled">❌ الملغية فقط</Option>
                <Option value="all">📋 الكل</Option>
              </Select>
            }
            style={{ borderRadius: 10 }}
          >
            {transfers.length === 0 ? (
              <Empty description={
                statusFilter === 'pending'
                  ? 'لا توجد طلبات معلقة حالياً 🎉'
                  : 'لا توجد طلبات بهذه الحالة'
              } />
            ) : (
              <Table
                dataSource={transfers}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="middle"
                scroll={{ x: 900 }}
                pagination={{
                  pageSize: 20,
                  showTotal: (t, r) => `عرض ${r[0]}-${r[1]} من ${t} طلب`
                }}
                rowClassName={(record) => record.status === 'pending' ? 'ant-table-row-highlight' : ''}
              />
            )}
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#4f46e5' }} />
            <span>تفاصيل طلب التحويل</span>
            {detailRecord && <Text code style={{ fontSize: 12 }}>{detailRecord.transfer_ref}</Text>}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          detailRecord?.status === 'pending' ? (
            <Space>
              <Popconfirm
                title={`تأكيد استلام ${parseFloat(detailRecord?.amount || 0).toFixed(2)} ج.م؟`}
                okText="تأكيد" cancelText="إلغاء"
                onConfirm={() => { handleConfirm(detailRecord.id); setDetailVisible(false); }}
              >
                <Button type="primary" icon={<CheckCircleOutlined />} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  تأكيد الاستلام
                </Button>
              </Popconfirm>
              <Popconfirm
                title="رفض وإرجاع المبلغ للفرع؟"
                okText="رفض" cancelText="إلغاء" okType="danger"
                onConfirm={() => { handleCancel(detailRecord.id); setDetailVisible(false); }}
              >
                <Button danger icon={<CloseCircleOutlined />}>رفض الطلب</Button>
              </Popconfirm>
            </Space>
          ) : (
            <Button onClick={() => setDetailVisible(false)}>إغلاق</Button>
          )
        }
        width={520}
      >
        {detailRecord && (
          <div style={{ lineHeight: 2 }}>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">الفرع المُرسِل:</Text><br /><Text strong>{detailRecord.from_branch_name}</Text></Col>
              <Col span={12}><Text type="secondary">المبلغ:</Text><br /><Text strong style={{ color: '#16a34a', fontSize: 16 }}>{parseFloat(detailRecord.amount).toFixed(2)} ج.م</Text></Col>
              <Col span={12}><Text type="secondary">طريقة التحويل:</Text><br /><Tag color="blue">{detailRecord.transfer_method === 'bank_transfer' ? '🏦 بنكي' : '💵 نقدي'}</Tag></Col>
              <Col span={12}><Text type="secondary">الحالة:</Text><br /><Tag color={STATUS_MAP[detailRecord.status]?.color}>{STATUS_MAP[detailRecord.status]?.label}</Tag></Col>
              {detailRecord.reference_no && (
                <Col span={24}><Text type="secondary">رقم المرجع:</Text><br /><Text code>{detailRecord.reference_no}</Text></Col>
              )}
              <Col span={12}><Text type="secondary">طُلب بواسطة:</Text><br /><Text>{detailRecord.requested_by_name || detailRecord.requested_by_username}</Text></Col>
              <Col span={12}><Text type="secondary">تاريخ الطلب:</Text><br /><Text>{new Date(detailRecord.requested_at).toLocaleString('ar-EG')}</Text></Col>
              {detailRecord.confirmed_by_name && (
                <Col span={12}><Text type="secondary">أُكد بواسطة:</Text><br /><Text>{detailRecord.confirmed_by_name}</Text></Col>
              )}
              {detailRecord.confirmed_at && (
                <Col span={12}><Text type="secondary">تاريخ التأكيد:</Text><br /><Text>{new Date(detailRecord.confirmed_at).toLocaleString('ar-EG')}</Text></Col>
              )}
              {detailRecord.notes && (
                <Col span={24}><Text type="secondary">الملاحظات:</Text><br /><Text>{detailRecord.notes}</Text></Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
