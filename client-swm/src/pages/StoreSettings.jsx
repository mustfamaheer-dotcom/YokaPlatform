import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  App as AntdApp,
  Divider,
  Row,
  Col,
  Space,
  Tabs,
  Switch,
  Select
} from 'antd';
import {
  ShopOutlined,
  SaveOutlined,
  ReloadOutlined,
  LinkOutlined,
  EyeOutlined,
  FontSizeOutlined,
  CompassOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
  CustomerServiceOutlined,
  NotificationOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  MailOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { PhoneCall, MessageCircle, ArrowLeft, ExternalLink, Sparkles, Truck, RotateCcw, Award, Star, ShieldCheck, Users, Flame } from 'lucide-react';
import api from '../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function StoreSettings({ currentUser }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live preview states
  const [previewValues, setPreviewValues] = useState({
    hero_title: 'أناقة وفخامة تليق بك مع يوكا ستور',
    hero_subtitle: 'اكتشف أرقى التشكيلات العصرية المصممة بعناية فائقة لتمنحك حضوراً استثنائياً.',
    hero_badge_text: 'كولكشن الموسم الجديد 2026',
    hero_button_text: 'تسوق الكتالوج الآن',
    hero_button_link: '/catalog',
    hero_secondary_button_text: 'الأكثر مبيعاً',
    hero_secondary_button_link: '/catalog?sort=popular',
    hero_stats_enabled: 'true',
    announcement_enabled: 'true',
    announcement_text: 'شحن مجاني لكافة المحافظات للطلبات الأكثر من 1500 ج.م | تسوق الآن',
    announcement_link: '/catalog',
    announcement_bg: 'navy',
    trust_bar_enabled: 'true',
    trust_shipping_title: 'شحن سريع وموثوق',
    trust_shipping_desc: 'توصيل لباب بيتك خلال 2-4 أيام عمل',
    trust_return_title: 'معاينة واسترجاع 14 يوم',
    trust_return_desc: 'افحص شحنتك قبل الاستلام بكل اطمئنان',
    trust_quality_title: 'أصلي وخامات ممتازة 100%',
    trust_quality_desc: 'انتقاء دقيق لأجود الخامات والموديلات',
    trust_support_title: 'خدمة عملاء وواتساب 24/7',
    trust_support_desc: 'متابعة فورية خطوة بخطوة لطلبك',
    contact_phone: '01000000000',
    contact_whatsapp: '01000000000',
    contact_email: 'info@yokastore.com',
    footer_description: 'يوكا ستور — وجهتك الأولى للموضة العصرية والأناقة الفاخرة.',
    footer_facebook_url: 'https://facebook.com',
    footer_instagram_url: 'https://instagram.com',
    footer_tiktok_url: 'https://tiktok.com',
    seo_title: 'يوكا ستور | Yoka Store — أرقى أزياء وموضة وملابس في مصر',
    seo_description: 'تسوق أونلاين أحدث صيحات الموضة، البلوفرات الشتوية، والملابس الكاجوال بجودة عالية وأفضل الأسعار مع شحن سريع لكافة محافظات مصر والدفع عند الاستلام.',
    seo_keywords: 'يوكا ستور, ملابس رجالي, ملابس حريمي, موضة كاجوال, تسوق أونلاين مصر, شحن محافظات, دفع عند الاستلام, Yoka Store',
    google_site_verification: '',
    google_analytics_id: '',
    facebook_pixel_id: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/swm/store-settings');
      if (res.data.success && res.data.data) {
        const map = {};
        res.data.data.forEach((item) => {
          map[item.key] = item.value;
        });

        const merged = { ...previewValues, ...map };
        setPreviewValues(merged);

        form.setFieldsValue({
          announcement_enabled: merged.announcement_enabled !== 'false',
          announcement_text: merged.announcement_text,
          announcement_link: merged.announcement_link,
          announcement_bg: merged.announcement_bg || 'navy',
          hero_title: merged.hero_title,
          hero_subtitle: merged.hero_subtitle,
          hero_badge_text: merged.hero_badge_text,
          hero_button_text: merged.hero_button_text,
          hero_button_link: merged.hero_button_link,
          hero_secondary_button_text: merged.hero_secondary_button_text,
          hero_secondary_button_link: merged.hero_secondary_button_link,
          hero_stats_enabled: merged.hero_stats_enabled !== 'false',
          trust_bar_enabled: merged.trust_bar_enabled !== 'false',
          trust_shipping_title: merged.trust_shipping_title,
          trust_shipping_desc: merged.trust_shipping_desc,
          trust_return_title: merged.trust_return_title,
          trust_return_desc: merged.trust_return_desc,
          trust_quality_title: merged.trust_quality_title,
          trust_quality_desc: merged.trust_quality_desc,
          trust_support_title: merged.trust_support_title,
          trust_support_desc: merged.trust_support_desc,
          contact_phone: merged.contact_phone,
          contact_whatsapp: merged.contact_whatsapp,
          contact_email: merged.contact_email,
          footer_description: merged.footer_description,
          footer_facebook_url: merged.footer_facebook_url,
          footer_instagram_url: merged.footer_instagram_url,
          footer_tiktok_url: merged.footer_tiktok_url,
          seo_title: merged.seo_title,
          seo_description: merged.seo_description,
          seo_keywords: merged.seo_keywords,
          google_site_verification: merged.google_site_verification,
          google_analytics_id: merged.google_analytics_id,
          facebook_pixel_id: merged.facebook_pixel_id
        });
      }
    } catch (err) {
      console.error('Error loading store settings:', err);
      message.error('تعذر جلب إعدادات المتجر');
    } finally {
      setLoading(false);
    }
  };

  const handleValuesChange = (changed, allValues) => {
    setPreviewValues((prev) => ({
      ...prev,
      ...allValues,
      announcement_enabled: allValues.announcement_enabled ? 'true' : 'false',
      hero_stats_enabled: allValues.hero_stats_enabled ? 'true' : 'false',
      trust_bar_enabled: allValues.trust_bar_enabled ? 'true' : 'false'
    }));
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        announcement_enabled: values.announcement_enabled ? 'true' : 'false',
        announcement_text: values.announcement_text || '',
        announcement_link: values.announcement_link || '/catalog',
        announcement_bg: values.announcement_bg || 'navy',
        hero_title: values.hero_title || 'أناقة وفخامة تليق بك مع يوكا ستور',
        hero_subtitle: values.hero_subtitle || '',
        hero_badge_text: values.hero_badge_text || '',
        hero_button_text: values.hero_button_text || 'تسوق الكتالوج الآن',
        hero_button_link: values.hero_button_link || '/catalog',
        hero_secondary_button_text: values.hero_secondary_button_text || '',
        hero_secondary_button_link: values.hero_secondary_button_link || '/catalog?sort=popular',
        hero_stats_enabled: values.hero_stats_enabled ? 'true' : 'false',
        trust_bar_enabled: values.trust_bar_enabled ? 'true' : 'false',
        trust_shipping_title: values.trust_shipping_title || 'شحن سريع وموثوق',
        trust_shipping_desc: values.trust_shipping_desc || 'توصيل لباب بيتك خلال 2-4 أيام عمل',
        trust_return_title: values.trust_return_title || 'معاينة واسترجاع 14 يوم',
        trust_return_desc: values.trust_return_desc || 'افحص شحنتك قبل الاستلام بكل اطمئنان',
        trust_quality_title: values.trust_quality_title || 'أصلي وخامات ممتازة 100%',
        trust_quality_desc: values.trust_quality_desc || 'انتقاء دقيق لأجود الخامات والموديلات',
        trust_support_title: values.trust_support_title || 'خدمة عملاء وواتساب 24/7',
        trust_support_desc: values.trust_support_desc || 'متابعة فورية خطوة بخطوة لطلبك',
        contact_phone: values.contact_phone || '01000000000',
        contact_whatsapp: values.contact_whatsapp || '01000000000',
        contact_email: values.contact_email || 'info@yokastore.com',
        footer_description: values.footer_description || '',
        footer_facebook_url: values.footer_facebook_url || '',
        footer_instagram_url: values.footer_instagram_url || '',
        footer_tiktok_url: values.footer_tiktok_url || '',
        seo_title: values.seo_title || '',
        seo_description: values.seo_description || '',
        seo_keywords: values.seo_keywords || '',
        google_site_verification: values.google_site_verification || '',
        google_analytics_id: values.google_analytics_id || '',
        facebook_pixel_id: values.facebook_pixel_id || ''
      };

      const res = await api.post('/api/swm/store-settings/bulk', { settings: payload });
      if (res.data.success) {
        message.success('تم حفظ كافة إعدادات واجهة المتجر بنجاح وتحديث المتجر فورياً!');
      } else {
        message.error(res.data.message || 'فشل حفظ الإعدادات');
      }
    } catch (err) {
      console.error('Error saving store settings:', err);
      message.error(err.response?.data?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'announcement_hero',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <NotificationOutlined style={{ color: '#C8A45C' }} />
          <span>الشريط الإعلاني والهيرو (Hero & Banner)</span>
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Section 1: Announcement Bar */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>الشريط الإعلاني العلوي (Announcement Bar)</span>}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="announcement_enabled"
                  valuePropName="checked"
                  label={<span style={{ fontWeight: 600 }}>تفعيل الشريط أعلى الموقع</span>}
                >
                  <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="announcement_bg"
                  label={<span style={{ fontWeight: 600 }}>لون خلفية الشريط</span>}
                >
                  <Select style={{ borderRadius: 8 }}>
                    <Option value="navy">كحلي ملوكي داكن (Navy Gradient)</Option>
                    <Option value="gold">ذهبي فاخر (Gold Accent)</Option>
                    <Option value="dark">أسود ملكي فاحم (Dark Onyx)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="announcement_text"
                  label={<span style={{ fontWeight: 600 }}>نص الإعلان أو كود الخصم</span>}
                >
                  <Input placeholder="مثال: شحن مجاني لكافة المحافظات للطلبات الأكثر من 1500 ج.م" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="announcement_link"
                  label={<span style={{ fontWeight: 600 }}>رابط التوجيه عند النقر</span>}
                >
                  <Input prefix={<LinkOutlined style={{ color: '#C8A45C' }} />} placeholder="/catalog" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 2: Hero Section */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>قسم الهيرو الرئيسي والبانر (Hero Section)</span>}
          >
            <Form.Item
              name="hero_badge_text"
              label={<span style={{ fontWeight: 600 }}>شارة الكولكشن أعلى العنوان الرئيسي</span>}
            >
              <Input placeholder="مثال: كولكشن الموسم الجديد 2026" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="hero_title"
              label={<span style={{ fontWeight: 600 }}>عنوان الهيرو الرئيسي (Headline)</span>}
              rules={[{ required: true, message: 'يرجى إدخال عنوان الهيرو' }]}
            >
              <Input size="large" placeholder="أناقة وفخامة تليق بك مع يوكا ستور" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="hero_subtitle"
              label={<span style={{ fontWeight: 600 }}>الوصف الفرعي الأنيق (Editorial Subtitle)</span>}
            >
              <TextArea rows={2} placeholder="اكتشف أرقى التشكيلات العصرية المصممة بعناية فائقة لتمنحك حضوراً استثنائياً." style={{ borderRadius: 8 }} />
            </Form.Item>

            <Divider style={{ margin: '14px 0' }} />

            <Row gutter={12}>
              <Col xs={24} sm={14}>
                <Form.Item name="hero_button_text" label={<span style={{ fontWeight: 600 }}>نص زر التسوق الأساسي</span>}>
                  <Input prefix={<CompassOutlined style={{ color: '#C8A45C' }} />} placeholder="تسوق الكتالوج الآن" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item name="hero_button_link" label={<span style={{ fontWeight: 600 }}>رابط الزر الأساسي</span>}>
                  <Input prefix={<LinkOutlined style={{ color: '#C8A45C' }} />} placeholder="/catalog" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col xs={24} sm={14}>
                <Form.Item name="hero_secondary_button_text" label={<span style={{ fontWeight: 600 }}>نص الزر الثانوي (اختياري)</span>}>
                  <Input placeholder="الأكثر مبيعاً" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item name="hero_secondary_button_link" label={<span style={{ fontWeight: 600 }}>رابط الزر الثانوي</span>}>
                  <Input prefix={<LinkOutlined style={{ color: '#C8A45C' }} />} placeholder="/catalog?sort=popular" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="hero_stats_enabled"
              valuePropName="checked"
              label={<span style={{ fontWeight: 600 }}>عرض شريط إحصائيات الثقة أسفل الأزرار (+2,500 عميل والتقييمات)</span>}
            >
              <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
            </Form.Item>
          </Card>
        </Space>
      )
    },
    {
      key: 'trust_bar',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <SafetyCertificateOutlined style={{ color: '#C8A45C' }} />
          <span>مزايا الثقة (Trust Bar)</span>
        </span>
      ),
      children: (
        <Card
          size="small"
          style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
          title={<span style={{ fontWeight: 700 }}>شريط مزايا وضمانات المتجر (Trust Badges Strip)</span>}
        >
          <Form.Item
            name="trust_bar_enabled"
            valuePropName="checked"
            label={<span style={{ fontWeight: 600 }}>تفعيل شريط مزايا الثقة بين الهيرو والتصنيفات</span>}
          >
            <Switch checkedChildren="مفعل" unCheckedChildren="معطل" />
          </Form.Item>

          <Divider style={{ margin: '14px 0' }} />

          {/* Feature 1 */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>1. ميزة الشحن والتوصيل</span>
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item name="trust_shipping_title" style={{ marginBottom: 8 }}>
                  <Input placeholder="عنوان الميزة (مثال: شحن سريع وموثوق)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item name="trust_shipping_desc" style={{ marginBottom: 8 }}>
                  <Input placeholder="وصف الميزة (مثال: توصيل لباب بيتك خلال 2-4 أيام عمل)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Feature 2 */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>2. ميزة المعاينة والاسترجاع</span>
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item name="trust_return_title" style={{ marginBottom: 8 }}>
                  <Input placeholder="عنوان الميزة (مثال: معاينة واسترجاع 14 يوم)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item name="trust_return_desc" style={{ marginBottom: 8 }}>
                  <Input placeholder="وصف الميزة (مثال: افحص شحنتك قبل الاستلام بكل اطمئنان)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Feature 3 */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>3. ميزة الجودة والأصالة</span>
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item name="trust_quality_title" style={{ marginBottom: 8 }}>
                  <Input placeholder="عنوان الميزة (مثال: أصلي وخامات ممتازة 100%)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item name="trust_quality_desc" style={{ marginBottom: 8 }}>
                  <Input placeholder="وصف الميزة (مثال: انتقاء دقيق لأجود الخامات والموديلات)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Feature 4 */}
          <div>
            <span style={{ fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: 6 }}>4. ميزة الدعم الفني وخدمة العملاء</span>
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item name="trust_support_title" style={{ marginBottom: 8 }}>
                  <Input placeholder="عنوان الميزة (مثال: خدمة عملاء وواتساب 24/7)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item name="trust_support_desc" style={{ marginBottom: 8 }}>
                  <Input placeholder="وصف الميزة (مثال: متابعة فورية خطوة بخطوة لطلبك)" style={{ borderRadius: 8 }} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Card>
      )
    },
    {
      key: 'footer_contact',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <GlobalOutlined style={{ color: '#C8A45C' }} />
          <span>التواصل والفوتر (Contact & Footer)</span>
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Contact Numbers */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>أرقام وقنوات التواصل المباشر</span>}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="contact_phone"
                  label={<span style={{ fontWeight: 600 }}>رقم الهاتف المباشر (Phone)</span>}
                  rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
                >
                  <Input prefix={<PhoneOutlined style={{ color: '#C8A45C' }} />} style={{ borderRadius: 8, direction: 'ltr', textAlign: 'right' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="contact_whatsapp"
                  label={<span style={{ fontWeight: 600 }}>رقم محادثات واتساب (WhatsApp)</span>}
                  rules={[{ required: true, message: 'يرجى إدخال رقم واتساب' }]}
                >
                  <Input prefix={<WhatsAppOutlined style={{ color: '#25D366' }} />} style={{ borderRadius: 8, direction: 'ltr', textAlign: 'right' }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="contact_email"
                  label={<span style={{ fontWeight: 600 }}>البريد الإلكتروني للدعم</span>}
                >
                  <Input prefix={<MailOutlined style={{ color: '#C8A45C' }} />} placeholder="support@yokastore.com" style={{ borderRadius: 8, direction: 'ltr', textAlign: 'right' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Footer & Social Media */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>روابط التواصل الاجتماعي وتذييل الصفحة (Footer)</span>}
          >
            <Form.Item
              name="footer_description"
              label={<span style={{ fontWeight: 600 }}>نبذة عن المتجر في الفوتر (Store Bio)</span>}
            >
              <TextArea rows={2} placeholder="يوكا ستور — وجهتك الأولى للموضة العصرية والأناقة الفاخرة..." style={{ borderRadius: 8 }} />
            </Form.Item>

            <Divider style={{ margin: '14px 0' }} />

            <Row gutter={12}>
              <Col xs={24} sm={8}>
                <Form.Item name="footer_instagram_url" label={<span style={{ fontWeight: 600 }}>رابط حساب إنستجرام</span>}>
                  <Input placeholder="https://instagram.com/..." style={{ borderRadius: 8, direction: 'ltr' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="footer_facebook_url" label={<span style={{ fontWeight: 600 }}>رابط صفحة فيسبوك</span>}>
                  <Input placeholder="https://facebook.com/..." style={{ borderRadius: 8, direction: 'ltr' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="footer_tiktok_url" label={<span style={{ fontWeight: 600 }}>رابط حساب تيك توك</span>}>
                  <Input placeholder="https://tiktok.com/@..." style={{ borderRadius: 8, direction: 'ltr' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Space>
      )
    },
    {
      key: 'seo_tracking',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <SearchOutlined style={{ color: '#C8A45C' }} />
          <span>الـ SEO ومحركات البحث (SEO & Webmaster)</span>
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Section 1: Meta Tags */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>تهيئة وسوم البحث والظهور في Google (Meta Tags & Rich Snippets)</span>}
          >
            <Form.Item
              name="seo_title"
              label={<span style={{ fontWeight: 600 }}>عنوان المتجر لمحركات البحث (Meta Title)</span>}
              extra="العنوان الذي يظهر في نتائج بحث جوجل وشريط المتصفح (المثالي: 50-60 حرفاً)"
            >
              <Input placeholder="مثال: يوكا ستور | Yoka Store — أرقى أزياء وموضة وملابس في مصر" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="seo_description"
              label={<span style={{ fontWeight: 600 }}>الوصف التعريفي للبحث (Meta Description)</span>}
              extra="الوصف الترويجي الذي يقرأه العميل تحت رابط موقعك في نتائج البحث (المثالي: 140-160 حرفاً)"
            >
              <TextArea rows={3} placeholder="تسوق أونلاين أحدث صيحات الموضة، البلوفرات الشتوية، والملابس الكاجوال بجودة عالية وأفضل الأسعار..." style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="seo_keywords"
              label={<span style={{ fontWeight: 600 }}>الكلمات المفتاحية المستهدفة (Meta Keywords)</span>}
              extra="افصل بين كل كلمة بفاصلة (مثال: ملابس رجالي, أزياء حريمي, تسوق أونلاين مصر, دفع عند الاستلام)"
            >
              <Input placeholder="يوكا ستور, ملابس, أزياء, كاجوال, شحن محافظات" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Card>

          {/* Section 2: Verification & Pixels */}
          <Card
            size="small"
            style={{ borderRadius: 10, borderColor: '#E2E8F0' }}
            title={<span style={{ fontWeight: 700 }}>أدوات مشرفي المواقع والتتبع الإعلاني (Webmaster & Analytics)</span>}
          >
            <Form.Item
              name="google_site_verification"
              label={<span style={{ fontWeight: 600 }}>رمز إثبات الملكية في Google Search Console</span>}
              extra="الكود التعريفي لإثبات ملكية المتجر وتفعيل الفهرسة الفورية في جوجل"
            >
              <Input placeholder="مثال: abc123XYZ_sample_token" style={{ borderRadius: 8, direction: 'ltr' }} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="google_analytics_id"
                  label={<span style={{ fontWeight: 600 }}>معرّف Google Analytics (GA4)</span>}
                  extra="معرف القياس لتتبع الزوار ومصادر الحركة"
                >
                  <Input placeholder="G-XXXXXXXXXX" style={{ borderRadius: 8, direction: 'ltr' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="facebook_pixel_id"
                  label={<span style={{ fontWeight: 600 }}>معرّف Facebook Pixel ID</span>}
                  extra="لتتبع الحملات الإعلانية ومعدل الشراء"
                >
                  <Input placeholder="مثال: 123456789012345" style={{ borderRadius: 8, direction: 'ltr' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'block' }}>خريطة الموقع الآلية (Dynamic XML Sitemap)</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>مفهرسة تلقائياً وتحدث مع كل منتج وتصنيف جديد</span>
              </div>
              <a href="https://yokastore.runasp.net/sitemap.xml" target="_blank" rel="noopener noreferrer">
                <Button size="small" icon={<ExternalLink size={12} />} style={{ fontWeight: 700, color: '#C8A45C', borderColor: '#C8A45C' }}>
                  معاينة sitemap.xml ↗
                </Button>
              </a>
            </div>
          </Card>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '8px 0 24px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShopOutlined style={{ color: '#C8A45C' }} />
            التحكم الشامل في واجهة وتصميم المتجر الإلكتروني (Storefront Control Center)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            تعديل وتخصيص الشريط الإعلاني، الهيرو، مزايا الثقة، الفوتر، وقنوات التواصل مع التحديث الفوري المباشر لمتجر العملاء
          </Text>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={loading}>
            تحديث البيانات
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
      >
        <Row gutter={[24, 24]}>
          {/* Main Configuration Tabs */}
          <Col xs={24} lg={14}>
            <Card
              variant="outlined"
              style={{
                borderRadius: 14,
                borderColor: '#E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
              }}
            >
              <Tabs defaultActiveKey="announcement_hero" items={tabItems} orientation="horizontal" />

              <Divider style={{ margin: '20px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SaveOutlined />}
                  loading={saving}
                  style={{
                    backgroundColor: '#0F172A',
                    borderColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: 10,
                    fontWeight: 700,
                    minWidth: 220,
                    height: 48,
                    boxShadow: '0 4px 14px rgba(15,23,42,0.25)'
                  }}
                >
                  حفظ وتطبيق التغييرات فوراً
                </Button>
              </div>
            </Card>
          </Col>

          {/* Live Preview Column */}
          <Col xs={24} lg={10}>
            <Card
              variant="outlined"
              style={{
                borderRadius: 14,
                borderColor: '#E2E8F0',
                background: '#F8FAFC',
                position: 'sticky',
                top: 20
              }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A' }}>
                  <EyeOutlined style={{ color: '#C8A45C' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>معاينة حية للمتجر (Live Storefront Preview)</span>
                </div>
              }
            >
              {/* Simulated Announcement Bar */}
              {previewValues.announcement_enabled !== 'false' && (
                <div
                  style={{
                    background:
                      previewValues.announcement_bg === 'gold'
                        ? 'linear-gradient(90deg, #99782F 0%, #C8A45C 100%)'
                        : previewValues.announcement_bg === 'dark'
                        ? '#030712'
                        : 'linear-gradient(90deg, #0B132B 0%, #1E293B 100%)',
                    color: previewValues.announcement_bg === 'gold' ? '#0F172A' : '#FFFFFF',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    textAlign: 'center',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Sparkles size={12} color={previewValues.announcement_bg === 'gold' ? '#0F172A' : '#C8A45C'} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewValues.announcement_text || 'نص الشريط الإعلاني...'}
                  </span>
                </div>
              )}

              {/* Simulated Hero Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  borderRadius: 12,
                  padding: '20px 16px',
                  color: '#FFFFFF',
                  border: '1px solid rgba(200, 164, 92, 0.35)',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
                  textAlign: 'right',
                  marginBottom: 14
                }}
              >
                {previewValues.hero_badge_text && (
                  <div style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        background: 'rgba(200, 164, 92, 0.2)',
                        border: '1px solid rgba(200, 164, 92, 0.4)',
                        color: '#DFCA95',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 12
                      }}
                    >
                      {previewValues.hero_badge_text}
                    </span>
                  </div>
                )}

                <h4 style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 16, margin: '0 0 8px', lineHeight: 1.4 }}>
                  {previewValues.hero_title || 'عنوان الهيرو...'}
                </h4>

                {previewValues.hero_subtitle && (
                  <p style={{ color: '#CBD5E1', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
                    {previewValues.hero_subtitle}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <Button
                    type="primary"
                    size="small"
                    style={{
                      backgroundColor: '#C8A45C',
                      color: '#0F172A',
                      fontWeight: 800,
                      borderRadius: 14,
                      border: 'none',
                      fontSize: 12,
                      flex: '1 1 0',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {previewValues.hero_button_text || 'تسوق الآن'}
                  </Button>

                  {previewValues.hero_secondary_button_text && (
                    <Button
                      size="small"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: 12,
                        flex: '1 1 0',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {previewValues.hero_secondary_button_text}
                    </Button>
                  )}
                </div>

                {previewValues.hero_stats_enabled !== 'false' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 4,
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 11,
                      color: '#94A3B8'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: '1 1 0', justifyContent: 'center' }}>
                      <Users size={12} color="#C8A45C" /> +2,500 عميل
                    </span>
                    <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: '1 1 0', justifyContent: 'center' }}>
                      <Star size={12} fill="#EAB308" color="#EAB308" /> 4.9 تقييم
                    </span>
                    <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: '1 1 0', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                      <ShieldCheck size={12} color="#C8A45C" /> فحص عند الاستلام
                    </span>
                  </div>
                )}
              </div>

              {/* Simulated Trust Bar */}
              {previewValues.trust_bar_enabled !== 'false' && (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginBottom: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck size={14} color="#C8A45C" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                      {previewValues.trust_shipping_title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={14} color="#C8A45C" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                      {previewValues.trust_return_title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={14} color="#C8A45C" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                      {previewValues.trust_quality_title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={14} color="#C8A45C" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                      {previewValues.trust_support_title}
                    </span>
                  </div>
                </div>
              )}

              {/* Contact Channels */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PhoneCall size={14} color="#C8A45C" />
                  <span style={{ fontSize: 12, fontWeight: 700, direction: 'ltr' }}>{previewValues.contact_phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WhatsAppOutlined style={{ color: '#25D366', fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, direction: 'ltr' }}>{previewValues.contact_whatsapp}</span>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11 }}>تنعكس الإعدادات فورياً على متجر العملاء.</span>
                      <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
                        <Button size="small" type="link" style={{ padding: 0, fontWeight: 700, color: '#C8A45C', fontSize: 11 }}>
                          زيارة المتجر ↗
                        </Button>
                      </a>
                    </div>
                  }
                  style={{ borderRadius: 8 }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
