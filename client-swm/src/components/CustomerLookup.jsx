import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Tag, Space, Typography, Modal, Form, Tooltip, InputNumber, AutoComplete, Spin } from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  UserAddOutlined,
  CrownOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { Phone, Trophy } from 'lucide-react';
import api from '../api';
import { antMessage as message } from '../utils/antAppBridge';

const { Text } = Typography;

export default function CustomerLookup({
  loyaltySettings,
  cartTotal = 0,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  redeemPoints = 0,
  onChangeRedeemPoints
}) {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerForm] = Form.useForm();
  const searchTimeoutRef = useRef(null);

  const isLoyaltyEnabled = loyaltySettings?.loyalty_enabled !== false;
  const pointValue = loyaltySettings?.loyalty_point_value || 0.5;
  const minRedeem = loyaltySettings?.loyalty_min_redeem || 100;
  const maxRedeemPct = loyaltySettings?.loyalty_max_redeem_pct || 50;

  // Maximum discount allowed by percentage of current invoice total
  const maxAllowedDiscountEgp = (cartTotal * (maxRedeemPct / 100));
  const maxPointsAllowedByTotal = Math.floor(maxAllowedDiscountEgp / (pointValue || 1));
  const customerAvailablePoints = selectedCustomer ? (selectedCustomer.total_points || 0) : 0;
  const maxRedeemablePoints = Math.max(0, Math.min(customerAvailablePoints, maxPointsAllowedByTotal));

  // Real-time suggestions search with 200ms debounce
  const fetchSuggestions = (queryText) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const clean = (queryText || '').trim();
    if (!clean || clean.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/swm/loyalty/suggest', { params: { q: clean } });
        if (res.data?.success && Array.isArray(res.data.data)) {
          setSuggestions(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch customer suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);
  };

  // Immediate lookup by clicking search or pressing enter
  const handleImmediateLookup = async (phoneOrName) => {
    const clean = (phoneOrName || searchText).trim();
    if (!clean) return;

    try {
      // 1. Try exact phone lookup
      const res = await api.get('/api/swm/loyalty/lookup', { params: { phone: clean } });
      if (res.data?.success && res.data.data.found) {
        const cust = res.data.data.customer;
        onSelectCustomer(cust);
        setSearchText('');
        setSuggestions([]);
        message.success(`تم اختيار العميل: ${cust.full_name} (${cust.total_points} نقطة)`);
        return;
      }

      // 2. Fallback to suggest
      const sugRes = await api.get('/api/swm/loyalty/suggest', { params: { q: clean } });
      if (sugRes.data?.success && sugRes.data.data?.length > 0) {
        const cust = sugRes.data.data[0];
        onSelectCustomer(cust);
        setSearchText('');
        setSuggestions([]);
        message.success(`تم اختيار العميل: ${cust.full_name} (${cust.total_points} نقطة)`);
        return;
      }

      // 3. Not found -> prompt to register
      message.info(`العميل غير مسجل. يمكنك تسجيله الآن.`);
      const isDigits = /^\d+$/.test(clean);
      registerForm.setFieldsValue({
        phone: isDigits ? clean : '',
        full_name: isDigits ? '' : clean
      });
      setRegisterModalOpen(true);
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  const handleSelectSuggestion = (value, option) => {
    if (value === '__NEW_CUSTOMER__') {
      const isDigits = /^\d+$/.test(searchText.trim());
      registerForm.setFieldsValue({
        phone: isDigits ? searchText.trim() : '',
        full_name: isDigits ? '' : searchText.trim()
      });
      setRegisterModalOpen(true);
      return;
    }

    if (option?.customer) {
      onSelectCustomer(option.customer);
      setSearchText('');
      setSuggestions([]);
      message.success(`تم اختيار العميل: ${option.customer.full_name} (${option.customer.total_points} نقطة)`);
    }
  };

  const handleRegisterSubmit = async (values) => {
    setRegistering(true);
    try {
      const res = await api.post('/api/swm/loyalty/customers', values);
      if (res.data.success) {
        const newCust = res.data.data;
        message.success('تم تسجيل العميل بنجاح');
        setRegisterModalOpen(false);
        registerForm.resetFields();
        setSearchText('');
        setSuggestions([]);
        onSelectCustomer(newCust);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في تسجيل العميل');
    } finally {
      setRegistering(false);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setSuggestions([]);
    if (onClearCustomer) onClearCustomer();
  };

  // Build AutoComplete Options
  const autoCompleteOptions = suggestions.map((c) => ({
    value: c.phone,
    customer: c,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
            {c.full_name}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Phone size={11} /> <span>{c.phone}</span> • <span style={{ fontFamily: 'monospace' }}>{c.customer_code}</span>
          </div>
        </div>
        <Tag color="gold" icon={<Trophy size={11} />} style={{ fontWeight: 800, borderRadius: 6, margin: 0, fontSize: 11 }}>
          {c.total_points} نقطة
        </Tag>
      </div>
    )
  }));

  if (searchText && searchText.trim().length >= 2) {
    autoCompleteOptions.push({
      value: '__NEW_CUSTOMER__',
      label: (
        <div style={{ color: '#d97706', fontWeight: 700, fontSize: 12, padding: '4px 0', borderTop: '1px dashed #fde68a' }}>
          <UserAddOutlined style={{ marginLeft: 6 }} />
          تسجيل "{searchText.trim()}" كعميل جديد الآن...
        </div>
      )
    });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {!selectedCustomer ? (
        <Card
          size="small"
          style={{
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fafafa',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AutoComplete
              style={{ flex: 1 }}
              options={autoCompleteOptions}
              value={searchText}
              onChange={(val) => {
                setSearchText(val);
                fetchSuggestions(val);
              }}
              onSelect={handleSelectSuggestion}
            >
              <Input
                size="middle"
                placeholder="ابحث بالهاتف أو الاسم أو كود العميل (اقتراحات فورية)..."
                prefix={<PhoneOutlined style={{ color: '#C8A45C' }} />}
                suffix={loadingSuggestions ? <Spin size="small" /> : null}
                onPressEnter={() => handleImmediateLookup()}
                style={{ borderRadius: 6 }}
                allowClear
              />
            </AutoComplete>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => handleImmediateLookup()}
              style={{
                backgroundColor: '#0B0F17',
                borderColor: '#C8A45C',
                color: '#DFCA95',
                fontWeight: 600,
                borderRadius: 6
              }}
            >
              بحث
            </Button>

            <Button
              icon={<UserAddOutlined />}
              onClick={() => {
                const isDigits = /^\d+$/.test(searchText.trim());
                registerForm.setFieldsValue({
                  phone: isDigits ? searchText.trim() : '',
                  full_name: isDigits ? '' : searchText.trim()
                });
                setRegisterModalOpen(true);
              }}
              style={{ borderRadius: 6 }}
            >
              عميل جديد
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          size="small"
          style={{
            borderRadius: 8,
            border: '1px solid #C8A45C',
            background: 'linear-gradient(135deg, #FFFDF8 0%, #FDF8EC 100%)',
            boxShadow: '0 2px 6px rgba(200, 164, 92, 0.15)'
          }}
          styles={{ body: { padding: '10px 14px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space align="center">
              <CrownOutlined style={{ color: '#C8A45C', fontSize: 20 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text strong style={{ fontSize: 14, color: '#0B0F17' }}>
                    {selectedCustomer.full_name}
                  </Text>
                  <Tag color="gold" style={{ fontSize: 11, borderRadius: 4, fontWeight: 700 }}>
                    {selectedCustomer.customer_code}
                  </Tag>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  هاتف: <strong>{selectedCustomer.phone}</strong>
                </div>
              </div>
            </Space>

            <Space align="center" size="middle">
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, color: '#64748b' }}>رصيد نقاط الولاء</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>
                    {customerAvailablePoints}
                  </span>
                  <span style={{ fontSize: 11, color: '#b45309' }}>نقطة</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    (≈ {(customerAvailablePoints * pointValue).toFixed(2)} ج.م)
                  </span>
                </div>
              </div>

              <Tooltip title="إلغاء تحديد العميل">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleClear}
                />
              </Tooltip>
            </Space>
          </div>

          {/* Points Redemption Control */}
          {isLoyaltyEnabled && customerAvailablePoints >= minRedeem && cartTotal > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 12px',
                background: '#ffffff',
                borderRadius: 6,
                border: '1px dashed #C8A45C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <GiftOutlined style={{ color: '#C8A45C', fontSize: 16 }} />
                <Text strong style={{ fontSize: 12, color: '#0B0F17' }}>
                  استبدال نقاط كخصم على الفاتورة:
                </Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InputNumber
                  size="small"
                  min={0}
                  max={maxRedeemablePoints}
                  step={10}
                  value={redeemPoints}
                  onChange={(val) => {
                    const num = parseInt(val, 10) || 0;
                    if (onChangeRedeemPoints) onChangeRedeemPoints(num);
                  }}
                  style={{ width: 95 }}
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (onChangeRedeemPoints) onChangeRedeemPoints(maxRedeemablePoints);
                  }}
                  disabled={redeemPoints === maxRedeemablePoints || maxRedeemablePoints < minRedeem}
                  style={{ fontSize: 11, height: 24, padding: '0 6px' }}
                >
                  الحد الأقصى
                </Button>
                {redeemPoints > 0 && (
                  <Tag color="success" style={{ fontWeight: 700, margin: 0 }}>
                    خصم: -{(redeemPoints * pointValue).toFixed(2)} ج.م
                  </Tag>
                )}
              </div>
            </div>
          )}

          {isLoyaltyEnabled && customerAvailablePoints < minRedeem && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
              * الحد الأدنى لاستبدال النقاط هو {minRedeem} نقطة (رصيد العميل الحالي: {customerAvailablePoints} نقطة).
            </div>
          )}
        </Card>
      )}

      {/* Customer Quick Registration Modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#C8A45C' }} />
            <span>تسجيل عميل جديد بنظام الولاء</span>
          </Space>
        }
        open={registerModalOpen}
        onCancel={() => setRegisterModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={420}
      >
        <Form form={registerForm} layout="vertical" onFinish={handleRegisterSubmit}>
          <Form.Item
            name="full_name"
            label="اسم العميل الكامل"
            rules={[{ required: true, message: 'يرجى إدخال اسم العميل' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="مثال: محمد أحمد" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="رقم الهاتف"
            rules={[
              { required: true, message: 'يرجى إدخال رقم الهاتف' },
              { min: 9, message: 'رقم الهاتف قصير جداً' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="01xxxxxxxxx" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setRegisterModalOpen(false)}>إلغاء</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={registering}
              style={{ backgroundColor: '#0B0F17', borderColor: '#C8A45C', color: '#DFCA95', fontWeight: 700 }}
            >
              حفظ وتسجيل
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
