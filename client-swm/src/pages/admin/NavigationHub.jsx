import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  Compass,
  Sparkles,
  ChevronLeft,
  Grid,
  Layers,
  ArrowLeft,
  Store,
  ShieldCheck
} from 'lucide-react';
import { Typography, Tag, Input, Breadcrumb } from 'antd';
import NavCard from '../../components/NavCard';
import SellerPayrollAndExpenseCategoriesCards from '../../components/SellerPayrollAndExpenseCategoriesCards';
import {
  NAVIGATION_CATEGORIES,
  getCategoryById,
  getAllPages
} from './navigationData.jsx';

const { Title, Text } = Typography;

/**
 * Modern Navigation Hub for Yoka Store Admin (SWM)
 * Implements Root Category Cards & Sub-Hub Views with strict RTL & Eye-Comfort Palette
 */
export default function NavigationHub({
  currentUser,
  activeCategory = null,
  onSelectCategory,
  onSelectPage
}) {
  const [internalCategory, setInternalCategory] = useState(activeCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync if prop changes
  React.useEffect(() => {
    if (activeCategory !== undefined) {
      setInternalCategory(activeCategory);
    }
  }, [activeCategory]);

  const currentCategoryObj = useMemo(() => {
    return internalCategory ? getCategoryById(internalCategory) : null;
  }, [internalCategory]);

  // Handle Category selection
  const handleCategoryClick = (categoryId) => {
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
    setInternalCategory(categoryId);
    setSearchQuery('');
  };

  // Back to Main Hub
  const handleBackToMain = () => {
    if (onSelectCategory) {
      onSelectCategory(null);
    }
    setInternalCategory(null);
    setSearchQuery('');
  };

  // Filtered pages for global search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const allPages = getAllPages();
    return allPages.filter(
      (page) =>
        page.title.toLowerCase().includes(q) ||
        page.subtitle?.toLowerCase().includes(q) ||
        page.categoryTitle?.toLowerCase().includes(q) ||
        page.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const branchName =
    currentUser?.branchName || currentUser?.branch_name || 'الإدارة المركزية';

  return (
    <div
      style={{
        direction: 'rtl',
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
        paddingBottom: 48
      }}
    >
      {/* ─── HUB HEADER / HERO ────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1.5px solid #E2E8F0',
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative emerald gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            left: 0,
            height: 4,
            background: 'linear-gradient(90deg, #0F766E 0%, #14B8A6 50%, #0F766E 100%)'
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          {/* Header Texts / Breadcrumbs */}
          <div>
            {currentCategoryObj ? (
              <div>
                {/* Breadcrumbs for Sub-Hub */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    fontSize: 13,
                    color: '#64748B'
                  }}
                >
                  <button
                    onClick={handleBackToMain}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#0F766E',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>القائمة الرئيسية</span>
                  </button>
                  <ChevronLeft size={14} color="#94A3B8" />
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>
                    {currentCategoryObj.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0F766E'
                    }}
                  >
                    {React.isValidElement(currentCategoryObj.icon) &&
                      React.cloneElement(currentCategoryObj.icon, {
                        size: 22,
                        strokeWidth: 2.2,
                        color: '#0F766E'
                      })}
                  </div>
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: '#0F172A'
                      }}
                    >
                      {currentCategoryObj.title}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                      {currentCategoryObj.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0F766E',
                      backgroundColor: '#F0FDFA',
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: '1px solid #CCFBF1'
                    }}
                  >
                    <Sparkles size={13} color="#0F766E" />
                    <span>منظومة يوكا ستور المركزية</span>
                  </span>
                  <Tag color="cyan" style={{ borderRadius: 6, margin: 0 }}>
                    {branchName}
                  </Tag>
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#0F172A',
                    letterSpacing: '-0.02em'
                  }}
                >
                  مركز الملاحة وإدارة المنظومة
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#475569' }}>
                  اختر القطاع المطلوب للانتقال إلى وحدات الإدارة أو شاشات التشغيل والمراقبة
                </p>
              </div>
            )}
          </div>

          {/* Actions: Search or Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentCategoryObj ? (
              <button
                onClick={handleBackToMain}
                className="hub-back-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#FFFFFF',
                  color: '#0F766E',
                  border: '1.5px solid #0F766E',
                  borderRadius: 12,
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(15, 118, 110, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0FDFA';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Arrow pointing right in RTL means "back" */}
                <ArrowRight size={16} color="#0F766E" />
                <span>رجوع للقائمة الرئيسية</span>
              </button>
            ) : (
              <div style={{ width: 280, maxWidth: '100%' }}>
                <Input
                  prefix={<Search size={16} color="#94A3B8" style={{ marginLeft: 8 }} />}
                  placeholder="ابحث عن شاشة أو قسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{
                    borderRadius: 12,
                    padding: '8px 12px',
                    borderColor: '#CBD5E1',
                    fontSize: 13
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SEARCH RESULTS VIEW (IF ACTIVE) ─────────────────────────── */}
      {searchResults !== null ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              نتائج البحث ({searchResults.length})
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0F766E',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              إلغاء البحث والعودة
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: '48px 24px',
                textAlign: 'center',
                border: '1.5px solid #E2E8F0'
              }}
            >
              <Search size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: '0 0 6px' }}>
                لم يتم العثور على شاشات مطابقة
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                جرب البحث بكلمة أخرى مثل: المنتجات، المبيعات، الفروع، أو المخزون
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 18
              }}
            >
              {searchResults.map((item) => (
                <NavCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  badge={item.categoryTitle}
                  badgeColor="#0F766E"
                  isSubCard={true}
                  onClick={() => onSelectPage && onSelectPage(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : currentCategoryObj ? (
        /* ─── SUB-HUB VIEW (CHILD PAGES OF SELECTED CATEGORY) ──────── */
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid size={18} color="#0F766E" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                أقسام {currentCategoryObj.title}
              </h2>
            </div>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              {currentCategoryObj.children?.length} شاشات متوفرة
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20
            }}
          >
            {currentCategoryObj.children.map((child) => (
              <NavCard
                key={child.id}
                title={child.title}
                subtitle={child.subtitle}
                icon={child.icon}
                badge={child.badge}
                badgeColor="#0F766E"
                isSubCard={true}
                onClick={() => onSelectPage && onSelectPage(child.id)}
              />
            ))}
          </div>

          {currentCategoryObj.id === 'management' && (
            <div style={{ marginTop: 28 }}>
              <SellerPayrollAndExpenseCategoriesCards currentUser={currentUser} />
            </div>
          )}
        </div>
      ) : (
        /* ─── MAIN HUB VIEW (ROOT CATEGORY CARDS) ───────────────────── */
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={18} color="#0F766E" />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                القطاعات والوحدات الرئيسية
              </h2>
            </div>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              {NAVIGATION_CATEGORIES.length} قطاعات إدارية
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 22
            }}
          >
            {NAVIGATION_CATEGORIES.map((category) => (
              <NavCard
                key={category.id}
                title={category.title}
                subtitle={category.subtitle}
                icon={category.icon}
                badge={category.badge}
                badgeColor="#0F766E"
                isSubCard={false}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
