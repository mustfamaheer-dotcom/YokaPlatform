import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, X, ChevronLeft } from 'lucide-react';

export default function AnnouncementBar({ settings }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isClosed = sessionStorage.getItem('yoka_announcement_dismissed');
    if (isClosed === 'true') {
      setDismissed(true);
    }
  }, []);

  const isEnabled = settings?.announcement_enabled !== 'false';
  if (!isEnabled || dismissed) return null;

  const rawText = settings?.announcement_text || 'شحن مجاني لكافة المحافظات للطلبات الأكثر من 1500 ج.م | تسوق الآن واستمتع بأرقى التشكيلات';
  const text = rawText.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/g, '').trim();
  const link = settings?.announcement_link || '/catalog';
  const bgType = settings?.announcement_bg || 'navy';

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem('yoka_announcement_dismissed', 'true');
  };

  // Luxury Background Variants
  const bgStyles = {
    navy: 'linear-gradient(90deg, #0B132B 0%, #1E293B 50%, #0B132B 100%)',
    gold: 'linear-gradient(90deg, #99782F 0%, #C8A45C 50%, #99782F 100%)',
    dark: 'linear-gradient(90deg, #030712 0%, #0F172A 50%, #030712 100%)'
  };

  const currentBg = bgStyles[bgType] || bgStyles.navy;
  const textColor = bgType === 'gold' ? '#0F172A' : '#F8FAFC';
  const accentColor = bgType === 'gold' ? '#0F172A' : '#C8A45C';

  return (
    <div
      role="banner"
      aria-label="إعلان المتجر"
      style={{
        background: currentBg,
        color: textColor,
        fontSize: '12.5px',
        fontWeight: 600,
        position: 'relative',
        zIndex: 1001,
        borderBottom: bgType === 'gold' ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(200, 164, 92, 0.25)',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '5px 32px 5px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          minHeight: 32
        }}
      >
        <Link
          to={link}
          style={{
            color: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            textDecoration: 'none',
            lineHeight: 1.3,
            padding: '2px 0',
            maxWidth: '100%',
            overflow: 'hidden'
          }}
          className="announcement-bar-link"
        >
          <Flame size={13} color={accentColor} style={{ flexShrink: 0 }} />
          <span style={{ letterSpacing: '0.2px', fontSize: 'clamp(11px, 2.7vw, 12.5px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
          </span>
          <ChevronLeft size={13} color={accentColor} style={{ flexShrink: 0, opacity: 0.85 }} />
        </Link>

        {/* Close / Dismiss button */}
        <button
          onClick={handleDismiss}
          type="button"
          aria-label="إغلاق الإعلان"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: textColor,
            opacity: 0.65,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'opacity 0.2s ease, transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.65';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
