import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Switch,
  InputNumber,
  App,
  Spin,
  Alert,
  Divider,
  Space
} from 'antd';
import {
  Sliders,
  ShieldCheck,
  Percent,
  RotateCcw,
  UserCheck,
  Save,
  CheckCircle2,
  Lock,
  Coins
} from 'lucide-react';
import api from '../../../api';

const { Title, Text, Paragraph } = Typography;

export default function InvoiceSettingsCard({ branchId }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    pos_allow_salesperson_discount: true,
    pos_max_salesperson_discount_pct: 5,
    pos_require_supervisor_discount: true,
    pos_allow_salesperson_return: false,
    pos_require_supervisor_return: true,
    pos_require_client_name: true,
    pos_require_client_phone: true,
    pos_default_opening_float: 0.00
  });

  // Load Settings from Backend
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/store-settings');
      if (res.data.success && Array.isArray(res.data.data)) {
        const map = {};
        res.data.data.forEach((item) => {
          map[item.key] = item.value;
        });

        setSettings({
          pos_allow_salesperson_discount: map['pos_allow_salesperson_discount'] !== 'false',
          pos_max_salesperson_discount_pct: map['pos_max_salesperson_discount_pct'] !== undefined
            ? parseFloat(map['pos_max_salesperson_discount_pct'])
            : 5,
          pos_require_supervisor_discount: map['pos_require_supervisor_discount'] !== 'false',
          pos_allow_salesperson_return: map['pos_allow_salesperson_return'] === 'true',
          pos_require_supervisor_return: map['pos_require_supervisor_return'] !== 'false',
          pos_require_client_name: map['pos_require_client_name'] !== 'false',
          pos_require_client_phone: map['pos_require_client_phone'] !== 'false',
          pos_default_opening_float: map['pos_default_opening_float'] !== undefined
            ? parseFloat(map['pos_default_opening_float'])
            : 0.00
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save Settings to Backend
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        pos_allow_salesperson_discount: String(settings.pos_allow_salesperson_discount),
        pos_max_salesperson_discount_pct: String(settings.pos_max_salesperson_discount_pct),
        pos_require_supervisor_discount: String(settings.pos_require_supervisor_discount),
        pos_allow_salesperson_return: String(settings.pos_allow_salesperson_return),
        pos_require_supervisor_return: String(settings.pos_require_supervisor_return),
        pos_require_client_name: String(settings.pos_require_client_name),
        pos_require_client_phone: String(settings.pos_require_client_phone),
        pos_default_opening_float: String(settings.pos_default_opening_float)
      };

      const res = await api.post('/api/swm/store-settings/bulk', { settings: payload });
      if (res.data.success) {
        message.success('تم حفظ وتطبيق قواعد وصلاحيات الكاشير بنجاح على شاشات البيع (POS)');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'فشل في حفظ إعدادات وصلاحيات الفواتير');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: 24,
        background: '#ffffff',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* ─── Card Header ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid #f1f5f9',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
            }}
          >
            <Sliders size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                4. بطاقة إعدادات الفواتير والصلاحيات (POS Rules & Permissions)
              </Title>
              <Tag color="gold" style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                تطبيق فوري على الكاشير
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              تحديد سقف الخصم المسموح للبائعين، صلاحيات المرتجعات، وقواعد الفواتير الإلزامية
            </Text>
          </div>
        </div>

        {/* Save Button */}
        <Button
          type="primary"
          icon={<Save size={16} style={{ marginLeft: 6 }} />}
          onClick={handleSaveSettings}
          loading={saving}
          style={{
            backgroundColor: '#d97706',
            borderColor: '#d97706',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            height: 40,
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          حفظ وتطبيق القواعد فورياً
        </Button>
      </div>

      <Spin spinning={loading}>
        <Alert
          type="warning"
          showIcon
          icon={<ShieldCheck size={16} />}
          message={
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              يتم تطبيق هذه القواعد آلياً على كاشير الفرع. أي محاولة من البائع لتخطي الحد الأقصى للخصم أو عمل مرتجع دون إذن ستتطلب إدخال رمز ترقية المشرف الفوري.
            </span>
          }
          style={{ marginBottom: 24, borderRadius: 10, border: '1px solid #fde68a' }}
        />

        <Row gutter={[24, 24]}>
          {/* Section A: Discount Permissions */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Percent size={18} color="#d97706" />
                <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                  قواعد وصلاحيات الخصومات (Discounts)
                </Text>
              </div>

              {/* Toggle 1: Allow Salesperson Discount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    السماح للبائع بمنح خصم مباشر
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    تفعيل أو قفل حقل الخصم في شاشة الكاشير لحسابات البائعين
                  </Text>
                </div>
                <Switch
                  checked={settings.pos_allow_salesperson_discount}
                  onChange={(c) => setSettings({ ...settings, pos_allow_salesperson_discount: c })}
                />
              </div>

              {/* Limit 1: Max Discount % */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    الحد الأقصى للخصم المسموح للبائع (%)
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    سقف الخصم المسموح للبائع تطبيقه دون طلب موافقة المشرف
                  </Text>
                </div>
                <InputNumber
                  min={0}
                  max={50}
                  value={settings.pos_max_salesperson_discount_pct}
                  onChange={(v) => setSettings({ ...settings, pos_max_salesperson_discount_pct: v || 0 })}
                  formatter={(v) => `${v}%`}
                  parser={(v) => v.replace('%', '')}
                  disabled={!settings.pos_allow_salesperson_discount}
                  style={{ width: 90, borderRadius: 6, fontWeight: 700 }}
                />
              </div>

              {/* Toggle 2: Require Supervisor for Exceeding Discount */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    اشتراط إذن المشرف لتجاوز سقف الخصم
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    فتح نافذة رمز المشرف السري إذا حاول البائع إدخال خصم أعلى من السقف
                  </Text>
                </div>
                <Switch
                  checked={settings.pos_require_supervisor_discount}
                  onChange={(c) => setSettings({ ...settings, pos_require_supervisor_discount: c })}
                />
              </div>
            </div>
          </Col>

          {/* Section B: Returns & Invoice Validation */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <RotateCcw size={18} color="#d97706" />
                <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                  قواعد المرتجعات وبيانات العملاء (Returns & Validation)
                </Text>
              </div>

              {/* Toggle 3: Allow Salesperson Returns */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    السماح للبائع بإجراء مرتجعات
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    تمكين زر "فاتورة مرتجع" لحساب البائع أو قصره على المشرف
                  </Text>
                </div>
                <Switch
                  checked={settings.pos_allow_salesperson_return}
                  onChange={(c) => setSettings({ ...settings, pos_allow_salesperson_return: c })}
                />
              </div>

              {/* Toggle 4: Require Client Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    إلزامية إدخال اسم العميل
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    منع حفظ الفاتورة إلا بعد إدخال اسم العميل
                  </Text>
                </div>
                <Switch
                  checked={settings.pos_require_client_name}
                  onChange={(c) => setSettings({ ...settings, pos_require_client_name: c })}
                />
              </div>

              {/* Toggle 5: Require Client Phone */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    إلزامية إدخال رقم هاتف العميل
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    اشتراط رقم هاتف العميل للتواصل وبناء قاعدة بيانات العملاء
                  </Text>
                </div>
                <Switch
                  checked={settings.pos_require_client_phone}
                  onChange={(c) => setSettings({ ...settings, pos_require_client_phone: c })}
                />
              </div>

              {/* Limit 2: Default Opening Float */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                    الرصيد الافتتاحي التلقائي لدرج الكاشير (Float)
                  </strong>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    مبلغ الفكة المتروك في الدرج تلقائياً عند بدء كل وردية جديدة
                  </Text>
                </div>
                <InputNumber
                  min={0}
                  step={50}
                  value={settings.pos_default_opening_float}
                  onChange={(v) => setSettings({ ...settings, pos_default_opening_float: v || 0 })}
                  formatter={(v) => `${v} ج.م`}
                  parser={(v) => v.replace(' ج.م', '')}
                  style={{ width: 110, borderRadius: 6, fontWeight: 700 }}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Spin>
    </Card>
  );
}
