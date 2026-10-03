const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Resolves and ensures the uploads/products destination folder exists.
 */
function getUploadsProductsDir() {
  const candidateDirs = [
    process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR, 'products') : null,
    path.resolve(process.cwd(), 'uploads', 'products'),
    path.resolve(__dirname, 'uploads', 'products'),
    path.resolve(__dirname, '../../uploads', 'products')
  ];

  for (const dir of candidateDirs) {
    if (!dir) continue;
    try {
      if (fs.existsSync(dir)) return dir;
    } catch (e) {}
  }

  const fallback = path.resolve(process.cwd(), 'uploads', 'products');
  try {
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
  } catch (e) {}
  return fallback;
}

const MIME_EXTENSION_MAP = {
  'jpeg': '.jpg',
  'jpg': '.jpg',
  'png': '.png',
  'webp': '.webp',
  'gif': '.gif',
  'svg+xml': '.svg',
  'svg': '.svg',
  'avif': '.avif'
};

/**
 * Decodes and deduplicates a base64 data URI into /uploads/products/<sha1>.<ext>.
 * If the value is not a data URI (or already a path/url), it is returned unchanged.
 *
 * @param {string} value - Image string or base64 data URI
 * @returns {string} - Public web path /uploads/products/<hash>.<ext> or original value
 */
function persistDataUri(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!/^data:image\//i.test(trimmed)) {
    return value;
  }

  const match = trimmed.match(/^data:image\/([a-zA-Z0-9\+\-]+)(?:;[^,]*)?;base64,(.+)$/is);
  if (!match) {
    return value;
  }

  const rawSubtype = match[1].toLowerCase();
  const base64Data = match[2];
  const ext = MIME_EXTENSION_MAP[rawSubtype] || '.jpg';

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return value;
    }

    const hash = crypto.createHash('sha1').update(buffer).digest('hex');
    const filename = `${hash}${ext}`;
    const targetDir = getUploadsProductsDir();
    const filePath = path.join(targetDir, filename);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    return `/uploads/products/${filename}`;
  } catch (err) {
    console.error('Failed to persist base64 image data URI:', err);
    return value;
  }
}

/**
 * Persists an item (string, object with image props, or array).
 */
function persistItem(item) {
  if (!item) return item;

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        const transformed = persistItem(parsed);
        return JSON.stringify(transformed);
      } catch (e) {}
    }
    return persistDataUri(item);
  }

  if (Array.isArray(item)) {
    return item.map(persistItem);
  }

  if (typeof item === 'object') {
    const copy = { ...item };
    for (const key of ['url', 'image_url', 'image', 'src', 'thumbnail']) {
      if (typeof copy[key] === 'string') {
        copy[key] = persistDataUri(copy[key]);
      }
    }
    return copy;
  }

  return item;
}

/**
 * Persists an array of image strings, or a JSON-stringified array, or a single image string.
 *
 * @param {string|Array|Object} images
 * @returns {string|Array|Object} Persisted representation matching input type
 */
function persistImages(images) {
  if (!images) return images;
  return persistItem(images);
}

/**
 * Returns a valid JSON string (or null) for PostgreSQL json columns.
 *
 * @param {string|Array|Object} gallery
 * @returns {string|null} JSON string representation or null
 */
function persistGalleryImagesJson(gallery) {
  if (!gallery) return null;
  const persisted = persistImages(gallery);
  if (!persisted) return null;
  if (typeof persisted === 'string') {
    const trimmed = persisted.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return trimmed;
    }
    return JSON.stringify([trimmed]);
  }
  return JSON.stringify(persisted);
}

module.exports = {
  persistDataUri,
  persistImages,
  persistGalleryImagesJson,
  getUploadsProductsDir
};
