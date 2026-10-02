/**
 * Migration 012: Expand store_settings with luxury e-commerce design configuration
 * - Announcement Bar
 * - Hero Enhancements (Subtitles, Badges, Secondary CTA, Stats)
 * - Trust Bar (Shipping, Returns, Quality, Support)
 * - Footer Brand & Social Links
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const newSettings = [
      // Announcement Bar
      { key: 'announcement_enabled', value: 'true', label: 'تفعيل الشريط الإعلاني العلوي' },
      { key: 'announcement_text', value: 'شحن مجاني لكافة المحافظات للطلبات الأكثر من 1500 ج.م | تسوق الآن واستمتع بأرقى التشكيلات', label: 'نص الشريط الإعلاني' },
      { key: 'announcement_link', value: '/catalog', label: 'رابط الشريط الإعلاني' },
      { key: 'announcement_bg', value: 'navy', label: 'لون خلفية الشريط الإعلاني (navy | gold | dark)' },

      // Hero Enhancements
      { key: 'hero_subtitle', value: 'اكتشف أرقى التشكيلات العصرية المصممة بعناية فائقة لتمنحك حضوراً استثنائياً في كل إطلالة.', label: 'الوصف الفرعي في الهيرو' },
      { key: 'hero_badge_text', value: 'كولكشن الموسم الجديد 2026', label: 'شارة التميز أعلى العنوان في الهيرو' },
      { key: 'hero_secondary_button_text', value: 'الأكثر مبيعاً', label: 'نص الزر الثانوي في الهيرو' },
      { key: 'hero_secondary_button_link', value: '/catalog?sort=popular', label: 'رابط الزر الثانوي في الهيرو' },
      { key: 'hero_stats_enabled', value: 'true', label: 'عرض إحصائيات الثقة بالهيرو (التقييمات وعدد العملاء)' },
      { key: 'hero_countdown_enabled', value: 'false', label: 'تفعيل عداد العرض التنازلي' },
      { key: 'hero_countdown_label', value: 'ينتهي العرض الخاص خلال:', label: 'نص عداد العرض التنازلي' },

      // Trust Bar
      { key: 'trust_bar_enabled', value: 'true', label: 'تفعيل شريط مزايا الثقة (Trust Bar)' },
      { key: 'trust_shipping_title', value: 'شحن سريع وموثوق', label: 'عنوان ميزة الشحن' },
      { key: 'trust_shipping_desc', value: 'توصيل لباب بيتك خلال 2-4 أيام عمل', label: 'وصف ميزة الشحن' },
      { key: 'trust_return_title', value: 'معاينة واسترجاع 14 يوم', label: 'عنوان ميزة الاسترجاع' },
      { key: 'trust_return_desc', value: 'افحص شحنتك قبل الاستلام بكل اطمئنان', label: 'وصف ميزة الاسترجاع' },
      { key: 'trust_quality_title', value: 'أصلي وخامات ممتازة 100%', label: 'عنوان ميزة الجودة' },
      { key: 'trust_quality_desc', value: 'انتقاء دقيق لأجود الخامات والموديلات', label: 'وصف ميزة الجودة' },
      { key: 'trust_support_title', value: 'خدمة عملاء وواتساب 24/7', label: 'عنوان ميزة الدعم' },
      { key: 'trust_support_desc', value: 'متابعة فورية خطوة بخطوة لطلبك', label: 'وصف ميزة الدعم' },

      // Footer & Social Links
      { key: 'footer_description', value: 'يوكا ستور — وجهتك الأولى للموضة العصرية والأناقة الفاخرة. نقدم لك منتجات عالية الجودة مع تجربة تسوق راقية وشحن سريع لكافة أنحاء مصر.', label: 'نبذة عن المتجر في الفوتر' },
      { key: 'footer_facebook_url', value: 'https://facebook.com', label: 'رابط صفحة فيسبوك' },
      { key: 'footer_instagram_url', value: 'https://instagram.com', label: 'رابط حساب إنستجرام' },
      { key: 'footer_tiktok_url', value: 'https://tiktok.com', label: 'رابط حساب تيك توك' },
      { key: 'contact_email', value: 'info@yokastore.com', label: 'البريد الإلكتروني للدعم' }
    ];

    const existingKeys = (await knex('store_settings').select('key')).map(r => r.key);
    const toInsert = newSettings.filter(s => !existingKeys.includes(s.key));

    if (toInsert.length > 0) {
      await knex('store_settings').insert(toInsert);
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const keysToRemove = [
      'announcement_enabled', 'announcement_text', 'announcement_link', 'announcement_bg',
      'hero_subtitle', 'hero_badge_text', 'hero_secondary_button_text', 'hero_secondary_button_link',
      'hero_stats_enabled', 'hero_countdown_enabled', 'hero_countdown_label',
      'trust_bar_enabled', 'trust_shipping_title', 'trust_shipping_desc',
      'trust_return_title', 'trust_return_desc', 'trust_quality_title', 'trust_quality_desc',
      'trust_support_title', 'trust_support_desc', 'footer_description',
      'footer_facebook_url', 'footer_instagram_url', 'footer_tiktok_url', 'contact_email'
    ];
    await knex('store_settings').whereIn('key', keysToRemove).del();
  }
};
