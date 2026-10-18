import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Space,
  Tabs,
  Switch,
  InputNumber,
  Tag,
  Alert,
  Tooltip,
  App as AntdApp,
  message as antdMessage
} from 'antd';
import {
  PrinterOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  UndoOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  BarcodeOutlined,
  PhoneOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import {
  Receipt,
  FileCheck,
  Percent,
  RotateCcw,
  UserCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trophy,
  Coins
} from 'lucide-react';
import api from '../api';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { printHtmlContent } from '../utils/printUtils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const DEFAULT_INVOICE_SETTINGS = {
  // Invoice Header
  invoice_header_title: 'شركة يوكا ستور (YOKA STORE)',
  invoice_header_subtitle: 'للأزياء والموضة العصرية الفاخرة',
  invoice_show_logo: true,
  invoice_header_logo_url: '',
  invoice_header_phone: '01000000000',
  invoice_header_tax_number: '',
  invoice_header_extra_text: 'يسعدنا دائماً خدمتكم وتشريفكم لنا',

  // Invoice Footer & Policies
  invoice_footer_thanks: 'شكراً لزيارتكم وتسوقكم في YOKA STORE!',
  invoice_footer_policy_title: 'شروط وسياسة الاستبدال والاسترجاع:',
  invoice_footer_policy_line1: 'الاستبدال والاسترجاع متاح خلال 14 يوماً من تاريخ الفاتورة',
  invoice_footer_policy_line2: 'يشترط إحضار أصل الفاتورة وأن تكون القطع بحالتها الأصلية مع بطاقة السعر',
  invoice_footer_policy_line3: 'لا يُقبل استبدال أو استرجاع الملابس الداخلية والإكسسوارات لأسباب صحية',
  invoice_footer_extra_notes: 'تابعوا أحدث كولكشن وعروض على منصاتنا @YokaStore',
  invoice_show_barcode: true,

  // POS Sales Rules & Permissions
  pos_allow_salesperson_discount: true,
  pos_max_salesperson_discount_pct: 5,
  pos_require_supervisor_discount: true,
  pos_allow_salesperson_return: false,
  pos_require_supervisor_return: true,
  pos_require_client_name: true,
  pos_require_client_phone: true,
  pos_default_opening_float: 0.00
};

export default function SalesInvoiceSettings({ currentUser, onNavigate }) {
  const antdApp = AntdApp.useApp();
  const message = antdApp?.message || antdMessage;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveSettings, setLiveSettings] = useState(DEFAULT_INVOICE_SETTINGS);

  // Load Settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/store-settings');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const map = {};
        res.data.data.forEach((item) => {
          map[item.key] = item.value;
        });

        const merged = {
          invoice_header_title: map['invoice_header_title'] !== undefined ? map['invoice_header_title'] : DEFAULT_INVOICE_SETTINGS.invoice_header_title,
          invoice_header_subtitle: map['invoice_header_subtitle'] !== undefined ? map['invoice_header_subtitle'] : '',
          invoice_show_logo: map['invoice_show_logo'] !== undefined ? map['invoice_show_logo'] === 'true' : true,
          invoice_header_logo_url: map['invoice_header_logo_url'] !== undefined ? map['invoice_header_logo_url'] : '',
          invoice_header_phone: map['invoice_header_phone'] !== undefined ? map['invoice_header_phone'] : DEFAULT_INVOICE_SETTINGS.invoice_header_phone,
          invoice_header_tax_number: map['invoice_header_tax_number'] !== undefined ? map['invoice_header_tax_number'] : '',
          invoice_header_extra_text: map['invoice_header_extra_text'] !== undefined ? map['invoice_header_extra_text'] : '',

          invoice_footer_thanks: map['invoice_footer_thanks'] !== undefined ? map['invoice_footer_thanks'] : DEFAULT_INVOICE_SETTINGS.invoice_footer_thanks,
          invoice_footer_policy_title: map['invoice_footer_policy_title'] !== undefined ? map['invoice_footer_policy_title'] : DEFAULT_INVOICE_SETTINGS.invoice_footer_policy_title,
          invoice_footer_policy_line1: map['invoice_footer_policy_line1'] !== undefined ? map['invoice_footer_policy_line1'] : DEFAULT_INVOICE_SETTINGS.invoice_footer_policy_line1,
          invoice_footer_policy_line2: map['invoice_footer_policy_line2'] !== undefined ? map['invoice_footer_policy_line2'] : DEFAULT_INVOICE_SETTINGS.invoice_footer_policy_line2,
          invoice_footer_policy_line3: map['invoice_footer_policy_line3'] !== undefined ? map['invoice_footer_policy_line3'] : '',
          invoice_footer_extra_notes: map['invoice_footer_extra_notes'] !== undefined ? map['invoice_footer_extra_notes'] : '',
          invoice_show_barcode: map['invoice_show_barcode'] !== undefined ? map['invoice_show_barcode'] === 'true' : true,

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
        };

        setLiveSettings(merged);
        form.setFieldsValue(merged);

        try {
          localStorage.setItem('yoka_receipt_settings', JSON.stringify(merged));
          localStorage.setItem('yoka_receipt_settings_time', String(Date.now()));
          window.dispatchEvent(new CustomEvent('yoka_receipt_settings_updated', { detail: merged }));
        } catch (e) {
          console.warn('Could not cache receipt settings:', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch invoice settings:', err);
      message.error('فشل في جلب إعدادات الفاتورة من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValuesChange = (_, allValues) => {
    setLiveSettings(prev => ({
      ...prev,
      ...allValues
    }));
  };

  const handleRestoreDefaults = () => {
    form.setFieldsValue(DEFAULT_INVOICE_SETTINGS);
    setLiveSettings(DEFAULT_INVOICE_SETTINGS);
    message.info('تمت استعادة الإعدادات النموذجية. اضغط "حفظ الإعدادات" للاعتماد.');
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        invoice_header_title: String(values.invoice_header_title ?? ''),
        invoice_header_subtitle: String(values.invoice_header_subtitle ?? ''),
        invoice_show_logo: String(Boolean(values.invoice_show_logo)),
        invoice_header_logo_url: String(values.invoice_header_logo_url ?? ''),
        invoice_header_phone: String(values.invoice_header_phone ?? ''),
        invoice_header_tax_number: String(values.invoice_header_tax_number ?? ''),
        invoice_header_extra_text: String(values.invoice_header_extra_text ?? ''),

        invoice_footer_thanks: String(values.invoice_footer_thanks ?? ''),
        invoice_footer_policy_title: String(values.invoice_footer_policy_title ?? ''),
        invoice_footer_policy_line1: String(values.invoice_footer_policy_line1 ?? ''),
        invoice_footer_policy_line2: String(values.invoice_footer_policy_line2 ?? ''),
        invoice_footer_policy_line3: String(values.invoice_footer_policy_line3 ?? ''),
        invoice_footer_extra_notes: String(values.invoice_footer_extra_notes ?? ''),
        invoice_show_barcode: String(Boolean(values.invoice_show_barcode)),

        pos_allow_salesperson_discount: String(Boolean(values.pos_allow_salesperson_discount)),
        pos_max_salesperson_discount_pct: String(values.pos_max_salesperson_discount_pct ?? 0),
        pos_require_supervisor_discount: String(Boolean(values.pos_require_supervisor_discount)),
        pos_allow_salesperson_return: String(Boolean(values.pos_allow_salesperson_return)),
        pos_require_supervisor_return: String(Boolean(values.pos_require_supervisor_return)),
        pos_require_client_name: String(Boolean(values.pos_require_client_name)),
        pos_require_client_phone: String(Boolean(values.pos_require_client_phone)),
        pos_default_opening_float: String(values.pos_default_opening_float ?? 0)
      };

      const res = await api.post('/api/swm/store-settings/bulk', { settings: payload });
      if (res.data?.success) {
        message.success('تم حفظ كافة إعدادات ترويسة وتذييل الفاتورة وقواعد البيع بنجاح وتطبيقها فورياً!');
        const updatedLiveSettings = { ...liveSettings, ...values };
        setLiveSettings(updatedLiveSettings);
        try {
          localStorage.setItem('yoka_receipt_settings', JSON.stringify(updatedLiveSettings));
          localStorage.setItem('yoka_receipt_settings_time', String(Date.now()));
          window.dispatchEvent(new CustomEvent('yoka_receipt_settings_updated', { detail: updatedLiveSettings }));
        } catch (e) {
          console.warn('Could not broadcast receipt settings:', e);
        }
      } else {
        message.error(res.data?.message || 'فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Save invoice settings error:', err);
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // Test Print
  const handlePrintTestReceipt = () => {
    const el = document.getElementById('preview-thermal-receipt');
    if (el) {
      printHtmlContent({
        title: 'تجربة طباعة فاتورة الكاشير (80mm Test)',
        htmlContent: el.innerHTML,
        pageType: 'thermal'
      });
    }
  };

  const tabItems = [
    {
      key: 'header',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <FileTextOutlined style={{ color: '#0284c7' }} />
          ترويسة الفاتورة (Header)
        </span>
      ),
      children: (
        <div style={{ padding: '8px 4px' }}>
          <Alert
            type="info"
            showIcon
            message="تخصيص بيانات الترويسة العلوية"
            description="البيانات المسجلة هنا تظهر في أعلى الإيصال الحراري لكافة فروع التجزئة ومبيعات الكاشير المباشرة."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Row gutter={[16, 12]}>
            <Col xs={24} md={14}>
              <Form.Item
                name="invoice_header_title"
                label={<strong>اسم المتجر / الشركة الرئيسي</strong>}
                rules={[{ required: true, message: 'اسم الشركة حقل إلزامي' }]}
              >
                <Input placeholder="مثال: شركة يوكا ستور (YOKA STORE)" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={10}>
              <Form.Item
                name="invoice_header_phone"
                label={<strong>رقم هاتف خدمة العملاء / واتساب</strong>}
              >
                <Input placeholder="مثال: 01000000000" size="large" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={14}>
              <Form.Item
                name="invoice_header_subtitle"
                label={<strong>العنوان الفرعي أو الشعار اللفظي (Slogan)</strong>}
              >
                <Input placeholder="مثال: للأزياء والموضة العصرية الفاخرة" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={10}>
              <Form.Item
                name="invoice_header_tax_number"
                label={<strong>الرقم الضريبي / السجل التجاري (إن وجد)</strong>}
              >
                <Input placeholder="مثال: 123-456-789" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>طباعة الشعار الرسمي بأعلى الفاتورة</strong>
                  <Text type="secondary" style={{ fontSize: 11 }}>إظهار أو إخفاء صورة اللوجو من رأس الفاتورة الحرارية</Text>
                </div>
                <Form.Item name="invoice_show_logo" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="invoice_header_logo_url"
                label={<strong>رابط صورة شعار مخصص (اختياري)</strong>}
                tooltip="اتركه فارغاً لاعتماد الشعار الرسمي لمتجر يوكا تلقائياً"
              >
                <Input placeholder="https://example.com/logo.png (فارغ للشعار الافتراضي)" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="invoice_header_extra_text"
                label={<strong>نص ترحيبي إضافي أعلى الفاتورة (Header Note)</strong>}
              >
                <Input placeholder="مثال: يسعدنا دائماً خدمتكم وتشريفكم لنا في فروعنا" size="large" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'footer',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <SafetyCertificateOutlined style={{ color: '#059669' }} />
          تذييل الفاتورة والسياسات (Footer)
        </span>
      ),
      children: (
        <div style={{ padding: '8px 4px' }}>
          <Alert
            type="success"
            showIcon
            message="تخصيص سياسة الاستبدال والتذييل"
            description="هذه النصوص تطبع في نهاية كل إيصال مشتريات وتضمن حماية حقوق المتجر والعميل طبقاً للقانون واللوائح."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Row gutter={[16, 12]}>
            <Col xs={24}>
              <Form.Item
                name="invoice_footer_thanks"
                label={<strong>رسالة الشكر والتقدير الختامية</strong>}
                rules={[{ required: true, message: 'رسالة الشكر مطلوبة' }]}
              >
                <Input placeholder="مثال: شكراً لزيارتكم وتسوقكم في YOKA STORE!" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="invoice_footer_policy_title"
                label={<strong>عنوان قسم شروط وسياسة الاسترجاع</strong>}
              >
                <Input placeholder="مثال: شروط وسياسة الاستبدال والاسترجاع:" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13, color: '#0f172a' }}>طباعة باركود رقم الفاتورة بالأسفل</strong>
                  <Text type="secondary" style={{ fontSize: 11 }}>تسهيل قراءة رقم الفاتورة بالماسح الضوئي لسرعة عمل المرتجعات</Text>
                </div>
                <Form.Item name="invoice_show_barcode" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="invoice_footer_policy_line1"
                label={<strong>بند السياسة الأول (مدة الاسترجاع والاستبدال)</strong>}
              >
                <Input placeholder="مثال: الاستبدال والاسترجاع متاح خلال 14 يوماً من تاريخ الفاتورة" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="invoice_footer_policy_line2"
                label={<strong>بند السياسة الثاني (حالة البضاعة والفاتورة)</strong>}
              >
                <Input placeholder="مثال: يشترط إحضار أصل الفاتورة وأن تكون القطع بحالتها الأصلية مع بطاقة السعر" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="invoice_footer_policy_line3"
                label={<strong>بند السياسة الثالث (الاستثناءات والملابس الخاصة)</strong>}
              >
                <Input placeholder="مثال: لا يُقبل استبدال أو استرجاع الملابس الداخلية والإكسسوارات لأسباب صحية" size="large" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="invoice_footer_extra_notes"
                label={<strong>ملاحظات ختامية أو روابط حسابات التواصل (Social Media Note)</strong>}
              >
                <Input placeholder="مثال: تابعوا أحدث كولكشن وعروض على منصاتنا @YokaStore" size="large" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'rules',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <Sliders size={15} color="#d97706" />
          قواعد وصلاحيات البيع (POS Rules)
        </span>
      ),
      children: (
        <div style={{ padding: '8px 4px' }}>
          <Alert
            type="warning"
            showIcon
            message="الرقابة المركزية على صلاحيات الكاشير"
            description="هذه القواعد تطبق فورياً على شاشات نقاط البيع (POS) لمنع أي تلاعب أو تجاوزات للخصومات دون رمز موافقة المشرف."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Percent size={18} color="#d97706" />
                  <strong style={{ fontSize: 14 }}>صلاحيات الخصومات للكاشير</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>السماح للبائع بمنح خصم مباشر</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>تفعيل أو إقفال حقل الخصم في POS</Text>
                  </div>
                  <Form.Item name="pos_allow_salesperson_discount" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>الحد الأقصى للخصم المسموح للبائع (%)</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>سقف الخصم دون إذن المشرف</Text>
                  </div>
                  <Form.Item name="pos_max_salesperson_discount_pct" noStyle>
                    <InputNumber min={0} max={50} formatter={v => `${v}%`} parser={v => v.replace('%', '')} style={{ width: 85 }} />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>اشتراط إذن المشرف لتجاوز الخصم</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>طلب رمز المشرف السري</Text>
                  </div>
                  <Form.Item name="pos_require_supervisor_discount" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <RotateCcw size={18} color="#0284c7" />
                  <strong style={{ fontSize: 14 }}>المرتجعات وإلزامية بيانات العملاء</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>السماح للبائع بإجراء مرتجعات</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>تمكين زر المرتجع بحساب البائع</Text>
                  </div>
                  <Form.Item name="pos_allow_salesperson_return" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>إلزامية إدخال اسم العميل</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>منع الحفظ بدون اسم العميل</Text>
                  </div>
                  <Form.Item name="pos_require_client_name" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>إلزامية إدخال رقم هاتف العميل</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>بناء قاعدة العملاء وحساب النقاط</Text>
                  </div>
                  <Form.Item name="pos_require_client_phone" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>الرصيد الافتتاحي التلقائي للدرج (Float)</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>مبلغ الفكة عند بدء كل وردية</Text>
                  </div>
                  <Form.Item name="pos_default_opening_float" noStyle>
                    <InputNumber min={0} step={50} formatter={v => `${v} ج.م`} parser={v => v.replace(' ج.م', '')} style={{ width: 105 }} />
                  </Form.Item>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )
    }
  ];

  const logoSrc = liveSettings.invoice_header_logo_url?.trim() || yokaLogo;

  return (
    <div style={{ padding: '4px 0 32px 0' }}>
      {/* ─── Breadcrumb & Top Controls ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <Space>
          {onNavigate && (
            <Button
              icon={<ArrowRightOutlined />}
              onClick={() => onNavigate('home')}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              الرجوع للرئيسية
            </Button>
          )}
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={22} color="#0284c7" />
              إعدادات البيع وتخصيص الفواتير (Invoice Header & Footer)
            </Title>
            <Text type="secondary" style={{ fontSize: 12.5 }}>
              إدارة ترويسة وتذييل الفاتورة الحرارية، الشعار، أرقام التواصل، والسياسات المطبوعة لنقاط البيع والفروع
            </Text>
          </div>
        </Space>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={loading}>
            تحديث
          </Button>
          <Button icon={<UndoOutlined />} onClick={handleRestoreDefaults}>
            استعادة الافتراضي
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
            className="swm-btn-primary"
            style={{
              backgroundColor: '#0B0F17',
              borderColor: '#C8A45C',
              color: '#DFCA95',
              fontWeight: 800,
              height: 38,
              borderRadius: 8,
              padding: '0 20px'
            }}
          >
            حفظ وتطبيق الإعدادات فورياً
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_INVOICE_SETTINGS}
        onValuesChange={handleValuesChange}
        onFinish={handleSubmit}
      >
        <Row gutter={[20, 20]}>
          {/* Left Column: Configuration Tabs */}
          <Col xs={24} lg={15}>
            <Card
              style={{
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
              }}
            >
              <Tabs defaultActiveKey="header" items={tabItems} />

              <Divider style={{ margin: '18px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SaveOutlined />}
                  loading={saving}
                  style={{
                    backgroundColor: '#0B0F17',
                    borderColor: '#C8A45C',
                    color: '#DFCA95',
                    fontWeight: 800,
                    height: 44,
                    minWidth: 240,
                    borderRadius: 10
                  }}
                >
                  حفظ وتطبيق الإعدادات فورياً
                </Button>
              </div>
            </Card>
          </Col>

          {/* Right Column: Live Thermal Receipt Preview */}
          <Col xs={24} lg={9}>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space align="middle">
                    <EyeOutlined style={{ color: '#0284c7', fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 800 }}>معاينة حية للإيصال الحراري (80mm)</span>
                  </Space>
                  <Tag color="cyan" style={{ margin: 0, fontWeight: 700 }}>تحديث لحظي</Tag>
                </div>
              }
              extra={
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={handlePrintTestReceipt}
                  style={{ borderColor: '#0284c7', color: '#0284c7', fontWeight: 700, borderRadius: 6 }}
                >
                  تجربة طباعة
                </Button>
              }
              style={{
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                background: '#f8fafc',
                position: 'sticky',
                top: 20
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  محاكاة دقيقة للشكل الفعلي للإيصال المطبوع عبر طابعات الكاشير 80 مم
                </Text>
              </div>

              {/* 80mm Simulated Container */}
              <div
                id="preview-thermal-receipt"
                style={{
                  width: '74mm',
                  maxWidth: '300px',
                  margin: '0 auto',
                  padding: '12px 10px',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '11px',
                  lineHeight: 1.45,
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 10,
                  direction: 'rtl',
                  textAlign: 'right',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
                }}
              >
                {/* ─── Receipt Header ─── */}
                <div style={{ textAlign: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1.5px dashed #334155' }}>
                  {liveSettings.invoice_show_logo && (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      style={{ height: 38, maxWidth: 110, objectFit: 'contain', marginBottom: 3, display: 'inline-block' }}
                      onError={(e) => { e.target.src = yokaLogo; }}
                    />
                  )}
                  <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {liveSettings.invoice_header_title || 'شركة يوكا ستور (YOKA STORE)'}
                  </div>

                  {liveSettings.invoice_header_subtitle && (
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: 1, fontWeight: 600 }}>
                      {liveSettings.invoice_header_subtitle}
                    </div>
                  )}

                  <div style={{
                    display: 'inline-block',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    color: '#15803d',
                    background: '#f0fdf4',
                    padding: '1px 8px',
                    borderRadius: 5,
                    marginTop: 4
                  }}>
                    إيصال استلام مبيعات (Sale)
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    فرع المهندسين - الرئيسي
                  </div>

                  {liveSettings.invoice_header_phone && (
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: 1 }}>
                      خدمة العملاء: <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: 700 }}>{liveSettings.invoice_header_phone}</span>
                    </div>
                  )}

                  {liveSettings.invoice_header_tax_number && (
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: 1 }}>
                      الرقم الضريبي: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{liveSettings.invoice_header_tax_number}</span>
                    </div>
                  )}

                  {liveSettings.invoice_header_extra_text && (
                    <div style={{ fontSize: '9.5px', color: '#0284c7', marginTop: 2, fontWeight: 600, fontStyle: 'italic' }}>
                      {liveSettings.invoice_header_extra_text}
                    </div>
                  )}
                </div>

                {/* ─── Receipt Metadata Box ─── */}
                <div style={{ fontSize: '10px', background: '#f8fafc', padding: '5px 7px', borderRadius: 6, marginBottom: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>رقم الفاتورة:</span>
                    <strong style={{ fontFamily: 'monospace' }}>INV-2026-0891</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ color: '#64748b' }}>التاريخ والوقت:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>2026/10/18 - 01:30 م</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ color: '#64748b' }}>الكاشير:</span>
                    <strong>أحمد محمود</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ color: '#64748b' }}>العميل:</span>
                    <strong>سارة علي (01012345678)</strong>
                  </div>
                </div>

                {/* ─── Sample Items Table ─── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: 8 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #0f172a' }}>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>الصنف والمواصفات</th>
                      <th style={{ textAlign: 'center', padding: '3px 0', width: '28px' }}>الكمية</th>
                      <th style={{ textAlign: 'left', padding: '3px 0', width: '55px' }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3px 0' }}>كارديجان صوف فاخر (كحلي - L)</td>
                      <td style={{ textAlign: 'center', padding: '3px 0' }}>1</td>
                      <td style={{ textAlign: 'left', padding: '3px 0', fontWeight: 700 }}>450.00</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3px 0' }}>بلوزة شيفون كاجوال (أبيض - M)</td>
                      <td style={{ textAlign: 'center', padding: '3px 0' }}>1</td>
                      <td style={{ textAlign: 'left', padding: '3px 0', fontWeight: 700 }}>275.00</td>
                    </tr>
                  </tbody>
                </table>

                {/* ─── Financial Totals ─── */}
                <div style={{ fontSize: '10.5px', borderTop: '1px dashed #94a3b8', paddingTop: 4, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                    <span style={{ color: '#64748b' }}>إجمالي القطع:</span>
                    <strong style={{ fontFamily: 'monospace' }}>2 قطعة</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderTop: '1.5px solid #0f172a', marginTop: 3, paddingTop: 3, fontSize: '12px' }}>
                    <strong>صافي الفاتورة:</strong>
                    <strong style={{ fontSize: '13px' }}>725.00 ج.م</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#16a34a' }}>
                    <span>طريقة الدفع (نقداً):</span>
                    <strong style={{ fontFamily: 'monospace' }}>725.00 ج.م</strong>
                  </div>
                </div>

                {/* ─── Loyalty Points Block Sample ─── */}
                <div style={{
                  fontSize: '10px',
                  background: '#fffdf5',
                  padding: '5px 7px',
                  borderRadius: 6,
                  marginBottom: 8,
                  border: '1.5px dashed #C8A45C',
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '10.5px' }}>
                    <Trophy size={11} style={{ color: '#b45309' }} /> برنامج ولاء يوكا (Yoka Points)
                  </div>
                  <div style={{ color: '#15803d', fontWeight: 700, marginTop: 2 }}>
                    نقاط مكتسبة بهذه الفاتورة: +35 نقطة
                  </div>
                </div>

                {/* ─── Receipt Footer & Return Policies ─── */}
                <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', borderTop: '1.5px dashed #334155', paddingTop: 6 }}>
                  {liveSettings.invoice_footer_thanks && (
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 3, fontSize: '10px' }}>
                      {liveSettings.invoice_footer_thanks}
                    </div>
                  )}

                  {liveSettings.invoice_footer_policy_title && (
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {liveSettings.invoice_footer_policy_title}
                    </div>
                  )}

                  {liveSettings.invoice_footer_policy_line1 && (
                    <div style={{ marginTop: 1 }}>{liveSettings.invoice_footer_policy_line1}</div>
                  )}

                  {liveSettings.invoice_footer_policy_line2 && (
                    <div style={{ marginTop: 1 }}>{liveSettings.invoice_footer_policy_line2}</div>
                  )}

                  {liveSettings.invoice_footer_policy_line3 && (
                    <div style={{ marginTop: 1 }}>{liveSettings.invoice_footer_policy_line3}</div>
                  )}

                  {liveSettings.invoice_footer_extra_notes && (
                    <div style={{ marginTop: 3, color: '#0284c7', fontWeight: 600, fontStyle: 'italic' }}>
                      {liveSettings.invoice_footer_extra_notes}
                    </div>
                  )}

                  {liveSettings.invoice_show_barcode && (
                    <div style={{ marginTop: 5, letterSpacing: '2px', fontWeight: 800, fontSize: '10.5px', color: '#0f172a', fontFamily: 'monospace' }}>
                      *INV-2026-0891*
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
