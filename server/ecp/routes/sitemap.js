const express = require('express');
const router = express.Router();
const { query } = require('../../shared/db');

// In-memory caching for ultra-fast crawler response (<20ms)
let cachedXml = null;
let lastGenerated = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const xmlEscape = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * GET /sitemap.xml
 * Dynamic XML Sitemap for Google, Bing, and other search engines
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedXml && (now - lastGenerated) < CACHE_TTL_MS) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 mins
      return res.send(cachedXml);
    }

    const baseUrl = process.env.PUBLIC_STORE_URL || 'https://yokastore.runasp.net';

    // 1. Fetch active categories
    let categories = [];
    try {
      const catRes = await query(
        `SELECT id, category_name, slug, updated_at
         FROM product_categories
         WHERE status = 'active'
         ORDER BY id ASC`
      );
      categories = catRes.rows || catRes || [];
    } catch (e) {
      console.warn('Sitemap category query warning:', e.message);
    }

    // 2. Fetch active products with images
    let products = [];
    try {
      const prodRes = await query(
        `SELECT id, slug, product_name, featured_image, updated_at, created_at
         FROM products
         WHERE status = 'active' AND is_ecom_listed = true
         ORDER BY updated_at DESC
         LIMIT 2000`
      );
      products = prodRes.rows || prodRes || [];
    } catch (e) {
      console.warn('Sitemap product query warning:', e.message);
    }

    const todayIso = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Core Store Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/catalog</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/catalog?sort=popular</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    // Append Category URLs
    for (const cat of categories) {
      const catLastMod = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : todayIso;
      xml += `
  <url>
    <loc>${baseUrl}/catalog?category_id=${cat.id}</loc>
    <lastmod>${catLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Append Product URLs with Google Image Extensions
    for (const prod of products) {
      const prodLastMod = prod.updated_at
        ? new Date(prod.updated_at).toISOString().split('T')[0]
        : prod.created_at
        ? new Date(prod.created_at).toISOString().split('T')[0]
        : todayIso;

      const prodUrl = `${baseUrl}/product/${prod.slug || prod.id}`;

      let imageXml = '';
      if (prod.featured_image) {
        let fullImgUrl = prod.featured_image;
        if (fullImgUrl.startsWith('/')) {
          fullImgUrl = `${baseUrl}${fullImgUrl}`;
        }
        imageXml = `
    <image:image>
      <image:loc>${xmlEscape(fullImgUrl)}</image:loc>
      <image:title>${xmlEscape(prod.product_name)} - يوكا ستور مصر</image:title>
    </image:image>`;
      }

      xml += `
  <url>
    <loc>${xmlEscape(prodUrl)}</loc>
    <lastmod>${prodLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imageXml}
  </url>`;
    }

    xml += `
</urlset>`;

    cachedXml = xml;
    lastGenerated = now;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap XML:', err);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * GET /robots.txt
 * Dynamic Robots.txt pointing to the accurate sitemap
 */
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.PUBLIC_STORE_URL || 'https://yokastore.runasp.net';
  const robots = `# Yoka Store Optimized Robots.txt
User-agent: *
Allow: /
Allow: /catalog
Allow: /product/
Allow: /contact
Disallow: /checkout/
Disallow: /order-success/
Disallow: /swm-admin/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(robots);
});

module.exports = router;
