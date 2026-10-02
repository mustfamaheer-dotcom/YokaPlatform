/**
 * Migration 013: Add SEO & Webmaster Tracking Settings to store_settings
 * - SEO Default Title & Description & Keywords
 * - Google Search Console verification code
 * - Google Analytics (GA4) ID
 * - Facebook Pixel ID
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const seoSettings = [
      {
        key: 'seo_title',
        value: 'يوكا ستور | Yoka Store — أرقى أزياء وموضة وملابس في مصر',
        label: 'عنوان المتجر الرئيسي لمحركات البحث (SEO Title)'
      },
      {
        key: 'seo_description',
        value: 'تسوق أونلاين أحدث صيحات الموضة، البلوفرات الشتوية، والملابس الكاجوال بجودة عالية وأفضل الأسعار مع شحن سريع لكافة محافظات مصر والدفع عند الاستلام.',
        label: 'الوصف التعريفي للمتجر في جوجل (Meta Description)'
      },
      {
        key: 'seo_keywords',
        value: 'يوكا ستور, ملابس رجالي, ملابس حريمي, موضة كاجوال, تسوق أونلاين مصر, شحن محافظات, دفع عند الاستلام, Yoka Store',
        label: 'الكلمات المفتاحية المستهدفة (SEO Keywords)'
      },
      {
        key: 'google_site_verification',
        value: '',
        label: 'رمز التحقق من Google Search Console'
      },
      {
        key: 'google_analytics_id',
        value: '',
        label: 'معرّف إحصائيات جوجل Google Analytics (G-XXXXXXXXXX)'
      },
      {
        key: 'facebook_pixel_id',
        value: '',
        label: 'معرّف فيسبوك بكسل Facebook Pixel ID'
      }
    ];

    const existingKeys = (await knex('store_settings').select('key')).map(r => r.key);
    const toInsert = seoSettings.filter(s => !existingKeys.includes(s.key));

    if (toInsert.length > 0) {
      await knex('store_settings').insert(toInsert);
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const keysToRemove = [
      'seo_title',
      'seo_description',
      'seo_keywords',
      'google_site_verification',
      'google_analytics_id',
      'facebook_pixel_id'
    ];
    await knex('store_settings').whereIn('key', keysToRemove).del();
  }
};
