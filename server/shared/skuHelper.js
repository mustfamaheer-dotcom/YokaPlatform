/**
 * SKU Generation and Color/Size Code Helper
 * Provides robust Arabic and Latin color/size abbreviations and guaranteed-unique SKU generation.
 */

const ARABIC_COLOR_CODES = {
  // Standard & Common Colors
  'أسود': 'BLK', 'اسود': 'BLK', 'بلاك': 'BLK',
  'أبيض': 'WHT', 'ابيض': 'WHT', 'وايت': 'WHT',
  'كحلي': 'NVY', 'كحلى': 'NVY', 'نافي': 'NVY',
  'أزرق': 'BLU', 'ازرق': 'BLU', 'بلو': 'BLU',
  'رمادي': 'GRY', 'رمادى': 'GRY', 'رصاصي': 'GRY', 'رصاصى': 'GRY', 'جراي': 'GRY',
  'رمادي فاتح': 'LGY', 'رمادى فاتح': 'LGY',
  'رمادي غامق': 'DGY', 'رمادى غامق': 'DGY',
  'بيج': 'BEI', 'بيچ': 'BEI',
  'بني': 'BRN', 'بنى': 'BRN', 'براون': 'BRN',
  'جملي': 'CAM', 'جملى': 'CAM', 'هافان': 'HVN',
  'أحمر': 'RED', 'احمر': 'RED', 'ريد': 'RED',
  'نبيتي': 'BUR', 'نبيتى': 'BUR', 'عنابي': 'MRN', 'عنابى': 'MRN', 'بورجوندي': 'BUR',
  'أخضر': 'GRN', 'اخضر': 'GRN', 'جرين': 'GRN',
  'زيتي': 'OLV', 'زيتى': 'OLV', 'زيتوني': 'OLV',
  'أصفر': 'YLW', 'اصفر': 'YLW', 'يلو': 'YLW',
  'برتقالي': 'ORG', 'برتقالى': 'ORG', 'اورانج': 'ORG',
  'وردي': 'PNK', 'وردى': 'PNK', 'بينك': 'PNK', 'روز': 'ROS',
  'فوشيا': 'FUS', 'فوشيه': 'FUS',
  'بنفسجي': 'PUR', 'بنفسجى': 'PUR', 'موف': 'MAU', 'بيربل': 'PUR', 'ليلكي': 'LIL',
  'سماوي': 'SKY', 'سماوى': 'SKY', 'بيبي بلو': 'BBL', 'بيبى بلو': 'BBL',
  'تركواز': 'TRQ', 'فيروزي': 'TRQ', 'فيروزى': 'TRQ',
  'ذهبي': 'GLD', 'ذهبى': 'GLD', 'جولد': 'GLD',
  'فضي': 'SLV', 'فضى': 'SLV', 'سيلفر': 'SLV',
  'مستردة': 'MUS', 'مسترده': 'MUS',
  'كشمير': 'CSH', 'كاشمير': 'CSH',
  'أوف وايت': 'OWH', 'اوف وايت': 'OWH',
  'سيمون': 'SMN', 'سلمون': 'SLM',
  'مينت': 'MNT', 'منت جرين': 'MNT', 'مينت جرين': 'MNT',
  'طوبي': 'BRK', 'طوبى': 'BRK',
  'بترولي': 'PET', 'بترولى': 'PET',
  'بيستاج': 'PST', 'فستقي': 'PST',
  'جينز': 'DNM', 'توتي': 'BER', 'توتى': 'BER'
};

const ARABIC_SIZE_CODES = {
  'صغير': 'S',
  'وسط': 'M',
  'متوسط': 'M',
  'كبير': 'L',
  'كبير جدا': 'XL',
  'خاص': 'XXL',
  'موحد': 'OS',
  'مقاس موحد': 'OS',
  'فري سايز': 'FS',
  'وان سايز': 'OS'
};

/**
 * Normalizes Arabic text for consistent lookup
 */
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .trim()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // Remove diacritics / tashkeel
}

/**
 * Returns a 2-4 character code for a color name
 */
function getSafeColorCode(colorName, colorIndex = 0) {
  if (!colorName) return `C${colorIndex + 1}`;
  const trimmed = String(colorName).trim();

  // Direct lookup
  if (ARABIC_COLOR_CODES[trimmed]) {
    return ARABIC_COLOR_CODES[trimmed];
  }

  // Normalized Arabic lookup
  const norm = normalizeArabic(trimmed);
  for (const [key, code] of Object.entries(ARABIC_COLOR_CODES)) {
    if (normalizeArabic(key) === norm) {
      return code;
    }
  }

  // Latin alphanumeric lookup (e.g. "Black" -> "BLA" or "Navy" -> "NAV")
  const latinOnly = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (latinOnly.length >= 2) {
    return latinOnly.slice(0, 3).toUpperCase();
  }

  // Fallback to indexed color code
  return `C${colorIndex + 1}`;
}

/**
 * Returns a concise code for a size name
 */
function getSafeSizeCode(sizeName, sizeIndex = 0) {
  if (!sizeName) return `S${sizeIndex + 1}`;
  const trimmed = String(sizeName).trim();

  if (ARABIC_SIZE_CODES[trimmed]) {
    return ARABIC_SIZE_CODES[trimmed];
  }

  const norm = normalizeArabic(trimmed);
  for (const [key, code] of Object.entries(ARABIC_SIZE_CODES)) {
    if (normalizeArabic(key) === norm) {
      return code;
    }
  }

  // Numeric or Latin characters (e.g. "XL", "38", "42", "2XL")
  const latinOrNum = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (latinOrNum.length > 0) {
    return latinOrNum.toUpperCase();
  }

  return `SZ${sizeIndex + 1}`;
}

/**
 * Builds a clean base variant SKU from product code, color, and size
 */
function buildVariantSku(productCode, colorName, sizeName, colorIndex = 0, sizeIndex = 0) {
  const code = String(productCode || 'PRD')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '') || 'PRD';
  const cCode = getSafeColorCode(colorName, colorIndex);
  const sCode = getSafeSizeCode(sizeName, sizeIndex);
  return `${code}-${cCode}-${sCode}`;
}

/**
 * Ensures a SKU is completely unique across the DB table and within the batch
 * @param {object} dbClient - PostgreSQL client or transaction object with .query()
 * @param {string} candidateSku - desired SKU
 * @param {Set<string>} usedSkusInBatch - Set of SKUs already used in current batch
 * @param {number|null} excludeVariantId - optional variant ID to exclude (e.g. self)
 * @returns {Promise<string>} guaranteed-unique SKU
 */
async function ensureUniqueVariantSku(dbClient, candidateSku, usedSkusInBatch = new Set(), excludeVariantId = null) {
  const baseSku = String(candidateSku || 'PRD-VAR').trim().toUpperCase();
  let finalSku = baseSku;
  let counter = 1;

  while (true) {
    if (usedSkusInBatch.has(finalSku)) {
      counter++;
      finalSku = `${baseSku}-${counter}`;
      continue;
    }

    let querySql = `SELECT id FROM product_variants WHERE variant_sku = $1`;
    const params = [finalSku];
    if (excludeVariantId) {
      querySql += ` AND id != $2`;
      params.push(excludeVariantId);
    }
    querySql += ` LIMIT 1`;

    const res = await dbClient.query(querySql, params);
    if (res.rows && res.rows.length > 0) {
      counter++;
      finalSku = `${baseSku}-${counter}`;
    } else {
      break;
    }
  }

  usedSkusInBatch.add(finalSku);
  return finalSku;
}

module.exports = {
  ARABIC_COLOR_CODES,
  ARABIC_SIZE_CODES,
  getSafeColorCode,
  getSafeSizeCode,
  buildVariantSku,
  ensureUniqueVariantSku
};
