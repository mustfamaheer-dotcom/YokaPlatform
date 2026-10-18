/**
 * Migration 018: Add POS Invoice Header & Footer custom configuration to store_settings
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('store_settings');
  if (hasTable) {
    const newSettings = [
      // Invoice Header
      { key: 'invoice_header_title', value: 'شركة يوكا ستور (YOKA STORE)', label: 'اسم المتجر / الشركة بترويسة الفاتورة' },
      { key: 'invoice_header_subtitle', value: 'للأزياء والموضة العصرية الفاخرة', label: 'العنوان الفرعي أو الشعار اللفظي بالفاتورة' },
      { key: 'invoice_show_logo', value: 'true', label: 'إظهار الشعار أعلى الفاتورة الحرارية' },
      { key: 'invoice_header_logo_url', value: '', label: 'رابط الشعار المخصص للفاتورة (فارغ للشعار الافتراضي)' },
      { key: 'invoice_header_phone', value: '01000000000', label: 'رقم هاتف خدمة العملاء / واتساب بالفاتورة' },
      { key: 'invoice_header_tax_number', value: '', label: 'الرقم الضريبي أو السجل التجاري' },
      { key: 'invoice_header_extra_text', value: 'يسعدنا دائماً خدمتكم وتشريفكم لنا', label: 'نص ترحيبي إضافي أعلى الفاتورة' },

      // Invoice Footer & Policies
      { key: 'invoice_footer_thanks', value: 'شكراً لزيارتكم وتسوقكم في YOKA STORE!', label: 'رسالة الشكر الختامية بتذييل الفاتورة' },
      { key: 'invoice_footer_policy_title', value: 'شروط وسياسة الاستبدال والاسترجاع:', label: 'عنوان قسم سياسة الاسترجاع' },
      { key: 'invoice_footer_policy_line1', value: 'الاستبدال والاسترجاع متاح خلال 14 يوماً من تاريخ الفاتورة', label: 'بند سياسة الفاتورة 1' },
      { key: 'invoice_footer_policy_line2', value: 'يشترط إحضار أصل الفاتورة وأن تكون القطع بحالتها الأصلية مع بطاقة السعر', label: 'بند سياسة الفاتورة 2' },
      { key: 'invoice_footer_policy_line3', value: 'لا يُقبل استبدال أو استرجاع الملابس الداخلية والإكسسوارات لأسباب صحية', label: 'بند سياسة الفاتورة 3' },
      { key: 'invoice_footer_extra_notes', value: 'تابعوا أحدث كولكشن وعروض على منصاتنا @YokaStore', label: 'ملاحظات ختامية أو روابط التواصل أسفل الفاتورة' },
      { key: 'invoice_show_barcode', value: 'true', label: 'إظهار باركود رقم الفاتورة أسفل الإيصال' }
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
      'invoice_header_title',
      'invoice_header_subtitle',
      'invoice_show_logo',
      'invoice_header_logo_url',
      'invoice_header_phone',
      'invoice_header_tax_number',
      'invoice_header_extra_text',
      'invoice_footer_thanks',
      'invoice_footer_policy_title',
      'invoice_footer_policy_line1',
      'invoice_footer_policy_line2',
      'invoice_footer_policy_line3',
      'invoice_footer_extra_notes',
      'invoice_show_barcode'
    ];
    await knex('store_settings').whereIn('key', keysToRemove).del();
  }
};
