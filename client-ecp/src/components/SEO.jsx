import React, { useEffect } from 'react';

/**
 * Enterprise SEO & Structured Data (JSON-LD) Component for Yoka Store
 * Ensures Google Rich Snippets, Canonical Links, and Social Previews
 */
export default function SEO({
  title,
  description,
  keywords,
  image,
  canonicalUrl,
  type = 'website',
  schemaData = null
}) {
  useEffect(() => {
    const defaultTitle = 'يوكا ستور | Yoka Store — أرقى أزياء وموضة وملابس في مصر';
    const siteName = 'يوكا ستور | Yoka Store';
    const baseUrl = 'https://yokastore.runasp.net';

    // 1. Title formatting
    const finalTitle = title ? `${title} | ${siteName}` : defaultTitle;
    document.title = finalTitle;

    // Helper to safely set or update meta tags
    const setMetaTag = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const finalDesc =
      description ||
      'تسوق أونلاين أحدث صيحات الموضة، البلوفرات الشتوية، والملابس الكاجوال بجودة عالية وأفضل الأسعار مع شحن سريع لجميع محافظات مصر والدفع عند الاستلام.';
    const finalKeywords =
      keywords ||
      'يوكا ستور, ملابس رجالي, ملابس حريمي, أزياء شتوية, كاجوال, تسوق أونلاين مصر, Yoka Store, دفع عند الاستلام';

    let finalImage = image || '/yokaStoreTransparent.png';
    if (finalImage.startsWith('/')) {
      finalImage = `${baseUrl}${finalImage}`;
    }

    const currentUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : baseUrl);

    // Standard Meta Tags
    setMetaTag('name', 'description', finalDesc);
    setMetaTag('name', 'keywords', finalKeywords);
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large');

    // Open Graph (Facebook / WhatsApp / LinkedIn)
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:image', finalImage);
    setMetaTag('property', 'og:url', currentUrl);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', 'يوكا ستور Yoka Store');
    setMetaTag('property', 'og:locale', 'ar_EG');

    // Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    setMetaTag('name', 'twitter:image', finalImage);

    // Canonical Link Tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);

    // Structured Data (JSON-LD Schema.org)
    let jsonLdScript = document.getElementById('seo-jsonld-client');
    if (schemaData) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'seo-jsonld-client';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(schemaData);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }
  }, [title, description, keywords, image, canonicalUrl, type, schemaData]);

  return null; // Headless component
}
