import React from 'react';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

/**
 * Reusable NavCard Component for Yoka SWM Admin Navigation Hub
 * Complies with Eye-Comfort Palette:
 * - Card Background: #FFFFFF
 * - Accent: Petrol Emerald Green (#0F766E)
 * - Text: #0F172A (slate-900), #475569 (slate-600)
 * - Border: #E2E8F0 (hover: #0F766E)
 * - RTL Native Support
 */
export default function NavCard({
  title,
  subtitle,
  icon,
  badge,
  badgeColor = '#0F766E',
  onClick,
  isSubCard = false,
  extra,
  style = {}
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      className="nav-hub-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '1.5px solid #E2E8F0',
        padding: isSubCard ? '20px 22px' : '24px 26px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        minHeight: isSubCard ? 170 : 210,
        direction: 'rtl',
        textAlign: 'right',
        userSelect: 'none',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = '#0F766E';
        e.currentTarget.style.boxShadow =
          '0 12px 24px -4px rgba(15, 118, 110, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(15, 23, 42, 0.05)';
      }}
    >
      {/* Top Accent Strip on Hover Effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          height: 3,
          backgroundColor: '#0F766E',
          opacity: 0.85
        }}
      />

      {/* Card Header: Icon & Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12
        }}
      >
        {/* Prominent Icon Box */}
        <div
          style={{
            width: isSubCard ? 48 : 56,
            height: isSubCard ? 48 : 56,
            borderRadius: 14,
            backgroundColor: '#F0FDFA', // Light emerald tint (teal-50)
            border: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F766E', // Petrol emerald
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          {React.isValidElement(icon) ? (
            React.cloneElement(icon, {
              size: isSubCard ? 24 : 28,
              strokeWidth: 2.2,
              color: '#0F766E'
            })
          ) : (
            icon
          )}
        </div>

        {/* Badge or Child Count Indicator */}
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              backgroundColor: '#F0FDFA',
              color: badgeColor,
              border: `1px solid ${badgeColor}33`,
              whiteSpace: 'nowrap'
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Card Content: Title & Subtitle */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          style={{
            fontSize: isSubCard ? 16 : 18,
            fontWeight: 800,
            color: '#0F172A',
            margin: '0 0 8px 0',
            lineHeight: 1.35
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: '#475569',
              margin: 0,
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: isSubCard ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Optional Extra / Metric */}
      {extra && <div style={{ marginTop: 12 }}>{extra}</div>}

      {/* Card Footer: Action Indicator */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#0F766E'
          }}
        >
          {isSubCard ? 'فتح الصفحة' : 'استعراض الأقسام'}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0F766E',
            transition: 'transform 0.2s ease'
          }}
        >
          {/* RTL Arrow pointing left (forward in Arabic) */}
          <ArrowLeft size={14} />
        </div>
      </div>
    </div>
  );
}
