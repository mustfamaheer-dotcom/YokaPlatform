import React, { useState, useEffect } from 'react';
import { Card, Checkbox, InputNumber, Row, Col, Typography, Tag, Space, Divider, Button, Alert } from 'antd';
import {
  DollarCircleOutlined,
  BankOutlined,
  MobileOutlined,
  CreditCardOutlined,
  FileProtectOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export const AVAILABLE_PAYMENT_METHODS = [
  { key: 'cash', label: 'نقداً (خزينة)', icon: <DollarCircleOutlined style={{ color: '#16a34a' }} />, defaultAmount: 0 },
  { key: 'bank_transfer', label: 'تحويل بنكي / إنستاباي', icon: <BankOutlined style={{ color: '#2563eb' }} />, defaultAmount: 0 },
  { key: 'e_wallet', label: 'محفظة إلكترونية (فودافون كاش / إنستاباي)', icon: <MobileOutlined style={{ color: '#d97706' }} />, defaultAmount: 0 }
];

/**
 * Reusable Multi-Tender Split Payment Component
 *
 * @param {Object} props
 * @param {number} [props.targetAmount] - Optional total target balance/due amount
 * @param {Array} [props.value] - Existing breakdown array [{ method, method_name, amount }]
 * @param {Function} props.onChange - Callback with (breakdownArray, totalAmount)
 * @param {boolean} [props.allowZero] - Whether zero total is acceptable (e.g. for purely unpaid/credit)
 */
export default function SplitPayment({
  targetAmount = 0,
  value = [],
  onChange,
  allowZero = false
}) {
  const [selectedMethods, setSelectedMethods] = useState(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map(v => v.method);
    }
    return ['cash'];
  });

  const [methodAmounts, setMethodAmounts] = useState(() => {
    const map = {};
    if (Array.isArray(value) && value.length > 0) {
      value.forEach(v => {
        map[v.method] = v.amount;
      });
    } else {
      map['cash'] = targetAmount > 0 ? targetAmount : 0;
    }
    return map;
  });

  // Keep amounts and breakdown in sync with caller
  useEffect(() => {
    const breakdown = selectedMethods
      .map(methodKey => {
        const meta = AVAILABLE_PAYMENT_METHODS.find(m => m.key === methodKey);
        const amount = parseFloat(methodAmounts[methodKey]) || 0;
        return {
          method: methodKey,
          method_name: meta ? meta.label : methodKey,
          amount
        };
      })
      .filter(item => item.amount > 0 || selectedMethods.length === 1);

    const totalPaid = breakdown.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

    if (onChange) {
      onChange(breakdown, totalPaid);
    }
  }, [selectedMethods, methodAmounts]);

  // When targetAmount changes externally and only one method selected
  useEffect(() => {
    if (targetAmount > 0 && selectedMethods.length === 1 && !methodAmounts[selectedMethods[0]]) {
      setMethodAmounts(prev => ({
        ...prev,
        [selectedMethods[0]]: targetAmount
      }));
    }
  }, [targetAmount]);

  const handleToggleMethod = (methodKey, checked) => {
    if (checked) {
      const newSelected = [...selectedMethods, methodKey];
      setSelectedMethods(newSelected);

      // Auto calculate remaining to fill if target is given
      if (targetAmount > 0) {
        const currentSum = Object.entries(methodAmounts)
          .filter(([k]) => selectedMethods.includes(k))
          .reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);
        const remaining = Math.max(0, targetAmount - currentSum);
        setMethodAmounts(prev => ({
          ...prev,
          [methodKey]: remaining > 0 ? remaining : 0
        }));
      } else {
        setMethodAmounts(prev => ({
          ...prev,
          [methodKey]: prev[methodKey] || 0
        }));
      }
    } else {
      if (selectedMethods.length === 1 && !allowZero) {
        // Prevent deselecting last method if zero not allowed
        return;
      }
      setSelectedMethods(selectedMethods.filter(k => k !== methodKey));
      setMethodAmounts(prev => {
        const copy = { ...prev };
        delete copy[methodKey];
        return copy;
      });
    }
  };

  const handleAmountChange = (methodKey, val) => {
    const num = val === null || val === undefined || isNaN(val) ? 0 : parseFloat(val);
    setMethodAmounts(prev => ({
      ...prev,
      [methodKey]: num
    }));
  };

  const totalCalculated = selectedMethods.reduce((sum, key) => sum + (parseFloat(methodAmounts[key]) || 0), 0);
  const diff = targetAmount > 0 ? targetAmount - totalCalculated : 0;

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
      title={
        <Space>
          <DollarCircleOutlined style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600 }}>نظام السداد المقسم (Multi-Tender / Split Payment)</span>
        </Space>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: '#334155' }}>
          اختر وسائل الدفع المستخدمة في العملية:
        </Text>
        <Space wrap>
          {AVAILABLE_PAYMENT_METHODS.map(method => {
            const isSelected = selectedMethods.includes(method.key);
            return (
              <Button
                key={method.key}
                type={isSelected ? 'primary' : 'default'}
                icon={method.icon}
                onClick={() => handleToggleMethod(method.key, !isSelected)}
                style={{
                  borderRadius: 6,
                  fontWeight: isSelected ? 600 : 400,
                  borderColor: isSelected ? undefined : '#cbd5e1'
                }}
              >
                {method.label}
              </Button>
            );
          })}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Dynamic input fields for each selected payment method */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: '#334155' }}>
          تحديد المبالغ لكل وسيلة دفع:
        </Text>
        <Row gutter={[12, 12]}>
          {selectedMethods.map(methodKey => {
            const meta = AVAILABLE_PAYMENT_METHODS.find(m => m.key === methodKey) || {
              label: methodKey,
              icon: <DollarCircleOutlined />
            };
            return (
              <Col xs={24} sm={12} key={methodKey}>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Space size="small">
                      {meta.icon}
                      <Text strong style={{ fontSize: 13 }}>{meta.label}</Text>
                    </Space>
                    {selectedMethods.length > 1 && (
                      <Button
                        type="link"
                        danger
                        size="small"
                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                        onClick={() => handleToggleMethod(methodKey, false)}
                      >
                        إلغاء
                      </Button>
                    )}
                  </div>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={10}
                    value={methodAmounts[methodKey] || 0}
                    onChange={(v) => handleAmountChange(methodKey, v)}
                    addonAfter="ج.م"
                    placeholder="المبلغ المسدد"
                  />
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* Summary calculation badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          marginTop: 8
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>إجمالي المدفوع الموزع: </Text>
          <Text strong style={{ fontSize: 16, color: '#16a34a' }}>
            {totalCalculated.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
          </Text>
        </div>

        {targetAmount > 0 && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>المتبقي آجل / مستحق: </Text>
            <Tag color={diff === 0 ? 'green' : diff > 0 ? 'orange' : 'red'} style={{ fontSize: 13, padding: '2px 8px' }}>
              {diff === 0 ? 'مسدد بالكامل ✓' : `${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م ${diff > 0 ? 'آجل' : 'زيادة'}`}
            </Tag>
          </div>
        )}
      </div>
    </Card>
  );
}
