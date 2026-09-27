/**
 * High-Performance Geo-Location Engine & IP Resolver for ECP Store
 * - In-Memory LRU Cache for 0ms repeated lookups
 * - Automatic Egyptian Governorate & City Arabic Normalization
 * - Private & Localhost fallback for frictionless testing
 */

const ipGeoCache = new Map();
const MAX_CACHE_SIZE = 50000;

// Mapping of English / Romanized Egyptian cities to standard Arabic names
const CITY_ARABIC_MAP = {
  'cairo': 'القاهرة',
  'al qahirah': 'القاهرة',
  'new cairo': 'القاهرة الجديدة',
  'helwan': 'حلوان',
  'madinaty': 'مدينتي',
  'al shorouk': 'الشروق',
  'giza': 'الجيزة',
  'al jizah': 'الجيزة',
  '6th of october': 'السادس من أكتوبر',
  'october': 'أكتوبر',
  'sheikh zayed': 'الشيخ زايد',
  'alexandria': 'الإسكندرية',
  'al iskandariyah': 'الإسكندرية',
  'borg el arab': 'برج العرب',
  'mansoura': 'المنصورة',
  'al mansurah': 'المنصورة',
  'dakahlia': 'الدقهلية',
  'tanta': 'طنطا',
  'gharbia': 'الغربية',
  'al mahalla al kubra': 'المحلة الكبرى',
  'zagazig': 'الزقازيق',
  'az zaqaziq': 'الزقازيق',
  'sharqia': 'الشرقية',
  '10th of ramadan': 'العاشر من رمضان',
  'asyut': 'أسيوط',
  'assiut': 'أسيوط',
  'ismailia': 'الإسماعيلية',
  'al ismailiyah': 'الإسماعيلية',
  'port said': 'بورسعيد',
  'bur said': 'بورسعيد',
  'suez': 'السويس',
  'as suways': 'السويس',
  'fayoum': 'الفيوم',
  'al fayyum': 'الفيوم',
  'beni suef': 'بني سويف',
  'minya': 'المنيا',
  'al minya': 'المنيا',
  'sohag': 'سوهاج',
  'suhaj': 'سوهاج',
  'qena': 'قنا',
  'luxor': 'الأقصر',
  'al uqsur': 'الأقصر',
  'aswan': 'أسوان',
  'hurghada': 'الغردقة',
  'al ghardaqah': 'الغردقة',
  'red sea': 'البحر الأحمر',
  'sharm el sheikh': 'شرم الشيخ',
  'south sinai': 'جنوب سيناء',
  'damanhur': 'دمنهور',
  'beheira': 'البحيرة',
  'damietta': 'دمياط',
  'dumyat': 'دمياط',
  'kafr el sheikh': 'كفر الشيخ',
  'banha': 'بنها',
  'qalyubia': 'القليوبية',
  'shibin el kom': 'شبين الكوم',
  'menofia': 'المنوفية',
  'marsa matruh': 'مرسى مطروح',
  'matruh': 'مطروح',
  'arish': 'العريش',
  'north sinai': 'شمال سيناء'
};

function normalizeArabicCity(rawCity, rawRegion) {
  if (!rawCity && !rawRegion) return 'القاهرة';

  const clean = String(rawCity || '').trim().toLowerCase();
  const cleanReg = String(rawRegion || '').trim().toLowerCase();

  if (CITY_ARABIC_MAP[clean]) return CITY_ARABIC_MAP[clean];
  if (CITY_ARABIC_MAP[cleanReg]) return CITY_ARABIC_MAP[cleanReg];

  // Already Arabic
  if (/[\u0600-\u06FF]/.test(rawCity)) {
    return rawCity;
  }
  if (/[\u0600-\u06FF]/.test(rawRegion)) {
    return rawRegion;
  }

  // Capitalize clean latin name if foreign
  return rawCity || rawRegion || 'القاهرة';
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = forwarded.split(',');
    return list[0].trim();
  }
  if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].trim();
  if (req.headers['x-real-ip']) return req.headers['x-real-ip'].trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '127.0.0.1';
}

function isPrivateIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^.*:/, ''); // Strip IPv6 prefix if IPv4-mapped
  return (
    cleanIp === '127.0.0.1' ||
    cleanIp === 'localhost' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)
  );
}

/**
 * Resolve geo location for request with 0ms cache priority
 */
async function resolveLocation(req) {
  const ip = extractClientIp(req);

  // 1. Check in-memory cache
  if (ipGeoCache.has(ip)) {
    return { ...ipGeoCache.get(ip), ip };
  }

  // 2. Direct Cloudflare headers if present
  if (req.headers['cf-ipcity']) {
    const cfCity = req.headers['cf-ipcity'];
    const cfCountry = req.headers['cf-ipcountry'] === 'EG' ? 'مصر' : req.headers['cf-ipcountry'];
    const resolved = {
      country: cfCountry || 'مصر',
      region: req.headers['cf-region'] || 'محافظة القاهرة',
      city: normalizeArabicCity(cfCity, req.headers['cf-region'])
    };
    cacheResult(ip, resolved);
    return { ...resolved, ip };
  }

  // 3. Handle private / local development IPs gracefully
  if (isPrivateIp(ip)) {
    const localResolved = {
      country: 'مصر',
      region: 'محافظة القاهرة',
      city: 'القاهرة'
    };
    cacheResult(ip, localResolved);
    return { ...localResolved, ip };
  }

  // 4. Asynchronous fast public lookup with 1.5s timeout
  try {
    const cleanIp = ip.replace(/^.*:/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,query&lang=ar`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const resolved = {
          country: data.country || 'مصر',
          region: data.regionName || 'محافظة القاهرة',
          city: normalizeArabicCity(data.city, data.regionName)
        };
        cacheResult(ip, resolved);
        return { ...resolved, ip };
      }
    }
  } catch (e) {
    // Fall back to default on network timeout
  }

  const fallback = {
    country: 'مصر',
    region: 'محافظة القاهرة',
    city: 'القاهرة'
  };
  cacheResult(ip, fallback);
  return { ...fallback, ip };
}

function cacheResult(ip, location) {
  if (ipGeoCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest 500 keys
    const keysToDelete = Array.from(ipGeoCache.keys()).slice(0, 500);
    for (const k of keysToDelete) ipGeoCache.delete(k);
  }
  ipGeoCache.set(ip, location);
}

module.exports = {
  extractClientIp,
  isPrivateIp,
  resolveLocation,
  normalizeArabicCity
};
