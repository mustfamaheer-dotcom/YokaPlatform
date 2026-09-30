import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Divider,
  DatePicker,
  Radio,
  Popconfirm,
  Alert,
  Spin,
  Modal
} from 'antd';
import dayjs from 'dayjs';
import { Users, Layers, Clock, Plus, Trash2 } from 'lucide-react';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SellerPayrollAndExpenseCategoriesCards({ currentUser }) {
  // Seller Payroll Disbursal State
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState(dayjs().format('YYYY-MM'));
  const [sellerSummary, setSellerSummary] = useState(null);
  const [loadingSellerSummary, setLoadingSellerSummary] = useState(false);
  const [deductionsAmount, setDeductionsAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [payrollChannel, setPayrollChannel] = useState('cash');
  const [payrollNotes, setPayrollNotes] = useState('');
  const [submittingPayroll, setSubmittingPayroll] = useState(false);
  const [advancesModalOpen, setAdvancesModalOpen] = useState(false);
  const [safeBalances, setSafeBalances] = useState({ cash: 0, visa: 0, transfer: 0, total: 0 });

  // Branch Expense Categories State
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const fetchEmployeesList = async () => {
    try {
      const res = await api.get('/api/swm/users', { params: { limit: 200, status: 'active' } });
      if (res.data?.success) setEmployeesList(res.data.data || []);
    } catch (e) {
      console.error('Fetch employees error:', e);
    }
  };

  const fetchSafeBalances = async () => {
    try {
      const res = await api.get('/api/swm/treasury/kpis');
      if (res.data?.success && res.data.data?.main_safe) {
        const ms = res.data.data.main_safe;
        setSafeBalances({
          cash: parseFloat(ms.cash_balance || 0),
          visa: parseFloat(ms.visa_balance || 0),
          transfer: parseFloat(ms.transfer_balance || 0),
          total: parseFloat(ms.total_balance || 0)
        });
      }
    } catch (e) {
      console.error('Fetch safe balances error:', e);
    }
  };

  const fetchSellerSummary = async (sellerId, monthVal) => {
    if (!sellerId) {
      setSellerSummary(null);
      return;
    }
    setLoadingSellerSummary(true);
    try {
      const res = await api.get(`/api/swm/treasury/employee-payroll-summary/${sellerId}`, {
        params: { month: monthVal || payrollMonth }
      });
      if (res.data?.success) {
        setSellerSummary(res.data.data);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في تحميل بيانات مرتب البائع');
    } finally {
      setLoadingSellerSummary(false);
    }
  };

  const fetchExpenseCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get('/api/swm/pos/expense-categories');
      if (res.data?.success) {
        setExpenseCategories(res.data.data || []);
      }
    } catch (e) {
      console.error('Fetch categories error:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      message.warning('يرجى كتابة اسم تصنيف المصروف أولاً');
      return;
    }
    setAddingCategory(true);
    try {
      const res = await api.post('/api/swm/pos/expense-categories', { category: newCategoryInput.trim() });
      if (res.data?.success) {
        message.success(res.data.message);
        setExpenseCategories(res.data.data || []);
        setNewCategoryInput('');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في إضافة التصنيف');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    try {
      const res = await api.delete('/api/swm/pos/expense-categories', { data: { category: cat } });
      if (res.data?.success) {
        message.success(res.data.message);
        setExpenseCategories(res.data.data || []);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'فشل في حذف التصنيف');
    }
  };

  const handleDisburseSellerPayroll = async () => {
    if (!sellerSummary) {
      message.warning('يرجى اختيار بائع أولاً');
      return;
    }
    const baseSal = parseFloat(sellerSummary.base_salary || 0);
    const adv = parseFloat(sellerSummary.advances_total || 0);
    const ded = parseFloat(deductionsAmount || 0);
    const net = Math.round((baseSal - adv - ded) * 100) / 100;

    if (net <= 0) {
      message.error('صافي القبض يجب أن يكون أكبر من الصفر');
      return;
    }

    const avail = safeBalances[payrollChannel] || 0;
    if (net > avail + 0.01) {
      message.error(`رصيد الخزينة في قناة ${payrollChannel === 'cash' ? 'الكاش' : payrollChannel === 'visa' ? 'الفيزا' : 'التحويل'} (${avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض (${net.toLocaleString()} ج.م)`);
      return;
    }

    setSubmittingPayroll(true);
    try {
      const payload = {
        employee_id: sellerSummary.employee.id,
        payout_month: payrollMonth,
        base_salary: baseSal,
        advances_deducted: adv,
        deductions: ded,
        deduction_reason: deductionReason,
        bonus: 0,
        channel: payrollChannel,
        notes: payrollNotes
      };
      const res = await api.post('/api/swm/treasury/pay-salary', payload);
      if (res.data?.success) {
        message.success(res.data.message);
        setDeductionsAmount(0);
        setDeductionReason('');
        setPayrollNotes('');
        fetchSafeBalances();
        fetchSellerSummary(sellerSummary.employee.id, payrollMonth);
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'تعذر إتمام صرف القبض');
    } finally {
      setSubmittingPayroll(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
    fetchSafeBalances();
    fetchExpenseCategories();
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {/* Card 1: Seller Payroll & Disbursal */}
        <Col xs={24} lg={13}>
          <Card
            style={{
              borderRadius: 16,
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              height: '100%',
              background: '#ffffff'
            }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space size={8}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#2563eb" />
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                      صرف وقبض رواتب البائعين
                    </Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>خصم من الخزينة وقيد مباشر باليومية الإدارية</Text>
                  </div>
                </Space>
                <Space size={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>شهر القبض:</Text>
                  <DatePicker
                    picker="month"
                    size="small"
                    value={dayjs(payrollMonth, 'YYYY-MM')}
                    format="YYYY-MM"
                    allowClear={false}
                    onChange={(d) => {
                      if (d) {
                        const m = d.format('YYYY-MM');
                        setPayrollMonth(m);
                        if (selectedSellerId) fetchSellerSummary(selectedSellerId, m);
                      }
                    }}
                    style={{ width: 115 }}
                  />
                </Space>
              </div>
            }
          >
            {/* Seller Selector */}
            <div style={{ marginBottom: 14 }}>
              <Select
                showSearch
                allowClear
                placeholder="🔍 اختر أو ابحث عن اسم البائع..."
                style={{ width: '100%' }}
                size="large"
                value={selectedSellerId}
                onChange={(val) => {
                  setSelectedSellerId(val);
                  setDeductionsAmount(0);
                  setDeductionReason('');
                  if (val) fetchSellerSummary(val, payrollMonth);
                  else setSellerSummary(null);
                }}
                filterOption={(input, option) => {
                  const txt = option?.filterText || '';
                  return txt.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {employeesList.map(emp => (
                  <Option
                    key={emp.id}
                    value={emp.id}
                    filterText={`${emp.full_name} ${emp.phone || ''} ${emp.branch_name || ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space size={6}>
                        <Text strong>{emp.full_name}</Text>
                        {emp.phone && <Text type="secondary" style={{ fontSize: 11 }}>({emp.phone})</Text>}
                      </Space>
                      <Space size={4}>
                        <Tag color="cyan" style={{ fontSize: 10 }}>{emp.branch_name || 'الفرع الرئيسي'}</Tag>
                        <Tag color="geekblue" style={{ fontSize: 10 }}>مرتب: {parseFloat(emp.salary || 0).toLocaleString()} ج.م</Tag>
                      </Space>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            {loadingSellerSummary ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
            ) : !sellerSummary ? (
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px dashed #cbd5e1'
              }}>
                <Users size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <div style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
                  اختر اسم البائع لعرض بيانات القبض، المصروفات والسلف المسحوبة، وحساب الصافي وخصمه من الخزينة.
                </div>
              </div>
            ) : (
              <div>
                {/* Seller Header Info */}
                <div style={{
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: 6
                }}>
                  <Space size={6}>
                    <Text strong style={{ fontSize: 13, color: '#1e293b' }}>{sellerSummary.employee.full_name}</Text>
                    {sellerSummary.employee.phone && (
                      <Text type="secondary" style={{ fontSize: 11 }}>• {sellerSummary.employee.phone}</Text>
                    )}
                  </Space>
                  <Space size={4}>
                    <Tag color="blue">{sellerSummary.employee.branch_name || 'الفرع الرئيسي'}</Tag>
                    <Tag color="purple">{sellerSummary.employee.role === 'salesperson' ? 'بائع' : 'موظف'}</Tag>
                  </Space>
                </div>

                {sellerSummary.already_paid && (
                  <Alert
                    type="warning"
                    showIcon
                    message={`تنبيه: تم صرف راتب شهر (${payrollMonth}) لهذا البائع مسبقاً!`}
                    style={{ marginBottom: 12, borderRadius: 8, fontSize: 12 }}
                  />
                )}

                {/* Math Breakdown: Base Salary - Expenses - Deductions = Net Payout */}
                <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                  {/* 1. Base Salary */}
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: 10, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>المرتب الأساسي</Text>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {parseFloat(sellerSummary.base_salary || 0).toLocaleString()} ج.م
                      </div>
                    </div>
                  </Col>

                  {/* 2. Expenses & Advances Taken */}
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '10px', background: '#fef2f2', borderRadius: 10, textAlign: 'center', border: '1px solid #fecaca' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>مصروفات وسلف الفترة (-)</Text>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
                        - {parseFloat(sellerSummary.advances_total || 0).toLocaleString()} ج.م
                      </div>
                      {sellerSummary.advances_list?.length > 0 && (
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, height: 'auto', fontSize: 10, color: '#b91c1c' }}
                          onClick={() => setAdvancesModalOpen(true)}
                        >
                          ({sellerSummary.advances_list.length} حركة - عرض)
                        </Button>
                      )}
                    </div>
                  </Col>

                  {/* 3. Deductions Field */}
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '8px 10px', background: '#fff1f2', borderRadius: 10, border: '1px solid #ffe4e6' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>الخصومات (-)</Text>
                      <InputNumber
                        min={0}
                        size="small"
                        style={{ width: '100%', marginTop: 2 }}
                        placeholder="0.00"
                        value={deductionsAmount}
                        onChange={(v) => setDeductionsAmount(v || 0)}
                        precision={2}
                      />
                      <Input
                        size="small"
                        placeholder="سبب الخصم..."
                        value={deductionReason}
                        onChange={(e) => setDeductionReason(e.target.value)}
                        style={{ marginTop: 4, fontSize: 10 }}
                      />
                    </div>
                  </Col>
                </Row>

                {/* Net Payout Banner & Disburse Action */}
                {(() => {
                  const baseSal = parseFloat(sellerSummary.base_salary || 0);
                  const adv = parseFloat(sellerSummary.advances_total || 0);
                  const ded = parseFloat(deductionsAmount || 0);
                  const net = Math.round((baseSal - adv - ded) * 100) / 100;
                  const avail = safeBalances[payrollChannel] || 0;
                  const canAfford = net > 0 && net <= avail;

                  return (
                    <div style={{
                      padding: '12px 16px',
                      background: net > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
                      borderRadius: 12,
                      border: `1.5px solid ${net > 0 ? '#86efac' : '#e2e8f0'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <Text strong style={{ fontSize: 13, color: '#166534' }}>صافي القبض المستحق:</Text>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d' }}>
                            {net > 0 ? net.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : 0} ج.م
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            [الأساسي {baseSal.toLocaleString()} - المصروفات {adv.toLocaleString()} - الخصومات {ded.toLocaleString()} = {net.toLocaleString()} ج.م]
                          </Text>
                        </div>

                        <div>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                            صرف من قناة الخزينة:
                          </Text>
                          <Radio.Group
                            size="small"
                            value={payrollChannel}
                            onChange={(e) => setPayrollChannel(e.target.value)}
                          >
                            <Radio.Button value="cash">💵 كاش</Radio.Button>
                            <Radio.Button value="visa">💳 فيزا</Radio.Button>
                            <Radio.Button value="transfer">📱 تحويل</Radio.Button>
                          </Radio.Group>
                          <div style={{ fontSize: 10, marginTop: 4, color: avail >= net ? '#16a34a' : '#dc2626' }}>
                            رصيد الخزينة المتاح: {avail.toLocaleString()} ج.م
                          </div>
                        </div>
                      </div>

                      <Row gutter={8} align="middle">
                        <Col xs={24} sm={14}>
                          <Input
                            placeholder="ملاحظات الصرف..."
                            value={payrollNotes}
                            onChange={(e) => setPayrollNotes(e.target.value)}
                            size="middle"
                          />
                        </Col>
                        <Col xs={24} sm={10}>
                          <Popconfirm
                            title={`تأكيد صرف قبض ${sellerSummary.employee.full_name} بمبلغ ${net.toLocaleString()} ج.م؟`}
                            description="سيتم خصم المبلغ من الخزينة وقيده كعملية باليومية الإدارية."
                            okText="تأكيد الصرف"
                            cancelText="إلغاء"
                            okType="primary"
                            onConfirm={handleDisburseSellerPayroll}
                            disabled={net <= 0 || !canAfford || submittingPayroll}
                          >
                            <Button
                              type="primary"
                              block
                              size="middle"
                              loading={submittingPayroll}
                              disabled={net <= 0 || !canAfford}
                              style={{
                                backgroundColor: canAfford ? '#16a34a' : undefined,
                                borderColor: canAfford ? '#16a34a' : undefined,
                                fontWeight: 700
                              }}
                            >
                              صرف القبض وخصم من الخزينة
                            </Button>
                          </Popconfirm>
                        </Col>
                      </Row>

                      {!canAfford && net > 0 && (
                        <div style={{ marginTop: 6, textAlign: 'center', color: '#dc2626', fontSize: 11 }}>
                          ⚠️ رصيد الخزينة في هذه القناة ({avail.toLocaleString()} ج.م) لا يكفي لصرف صافي القبض ({net.toLocaleString()} ج.م)
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        </Col>

        {/* Card 2: Branch Expense Categories (تسمع في كل الفروع) */}
        <Col xs={24} lg={11}>
          <Card
            style={{
              borderRadius: 16,
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff'
            }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space size={8}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} color="#d97706" />
                  </div>
                  <div>
                    <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                      تصنيفات وبنود المصروفات
                    </Title>
                    <Text type="secondary" style={{ fontSize: 11 }}>تسمع فورياً في كافة الفروع ونقاط البيع</Text>
                  </div>
                </Space>
                <Tag color="orange" style={{ fontWeight: 700, borderRadius: 6 }}>
                  {expenseCategories.length} تصنيف معتمد
                </Tag>
              </div>
            }
          >
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                أي تصنيف يتم إضافته هنا يظهر تلقائياً لجميع الفروع والكاشيرات بالـ POS عند تسجيل أي سحب أو مصروف:
              </Text>
            </div>

            {/* Categories Tags Container */}
            <div style={{
              flex: 1,
              minHeight: 180,
              maxHeight: 250,
              overflowY: 'auto',
              padding: 12,
              background: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              marginBottom: 14
            }}>
              {loadingCategories ? (
                <div style={{ textAlign: 'center', padding: 30 }}><Spin size="small" /></div>
              ) : expenseCategories.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>لا توجد تصنيفات مسجلة</div>
              ) : (
                <Space size={[8, 10]} wrap>
                  {expenseCategories.map(cat => (
                    <Tag
                      key={cat}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleDeleteCategory(cat);
                      }}
                      style={{
                        fontSize: 12,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      🏷️ {cat}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>

            {/* Add New Category Input & Button */}
            <div style={{
              background: '#fffbeb',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #fde68a'
            }}>
              <div style={{ marginBottom: 6, fontWeight: 700, color: '#92400e', fontSize: 12 }}>
                ➕ إضافة تصنيف مصروف جديد وتعميمه:
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="مثال: أدوات ومهمات مكتبية، نقل بضاعة، إنترنت..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onPressEnter={handleAddCategory}
                  size="middle"
                />
                <Button
                  type="primary"
                  onClick={handleAddCategory}
                  loading={addingCategory}
                  style={{ backgroundColor: '#d97706', borderColor: '#d97706', fontWeight: 700 }}
                >
                  إضافة لكافة الفروع
                </Button>
              </Space.Compact>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Seller Advances Modal */}
      <Modal
        title={
          <Space>
            <Clock size={18} color="#dc2626" />
            <span>تفاصيل مصروفات وسلف الفترة — {sellerSummary?.employee?.full_name}</span>
          </Space>
        }
        open={advancesModalOpen}
        onCancel={() => setAdvancesModalOpen(false)}
        footer={<Button onClick={() => setAdvancesModalOpen(false)}>إغلاق</Button>}
        width={600}
      >
        <div style={{ marginBottom: 12 }}>
          <Alert
            type="info"
            message={`إجمالي المصروفات والسلف المستقطعة لشهر ${payrollMonth}: ${parseFloat(sellerSummary?.advances_total || 0).toLocaleString()} ج.م`}
          />
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {(!sellerSummary?.advances_list || sellerSummary.advances_list.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>لا توجد سلف أو مصروفات مسجلة هذا الشهر</div>
          ) : (
            sellerSummary.advances_list.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <Text strong>{item.subcategory || 'سلفة / مصروف'}</Text>
                  {item.description && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.description}</Text>}
                  <Text type="secondary" style={{ fontSize: 10 }}>{item.expense_date ? new Date(item.expense_date).toLocaleDateString('ar-EG') : ''}</Text>
                </div>
                <Text strong style={{ color: '#dc2626', fontSize: 14 }}>
                  - {parseFloat(item.amount || 0).toLocaleString()} ج.م
                </Text>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
