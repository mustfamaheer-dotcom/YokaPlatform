import React from 'react';
import {
  ShoppingBag,
  PackageCheck,
  TrendingUp,
  Layers,
  ClipboardCheck,
  SlidersHorizontal,
  ArrowLeftRight,
  Receipt,
  Truck,
  Wallet,
  Landmark,
  BarChart3,
  FileSpreadsheet,
  BookOpenCheck,
  Store,
  Users
} from 'lucide-react';

/**
 * Structured Navigation Registry for Yoka SWM Admin Platform
 * Provides two levels:
 * - Category (Root Cards for Navigation Hub)
 * - Child Modules (Sub-Cards for Sub-Hub and Direct Pages)
 */
export const NAVIGATION_CATEGORIES = [
  {
    id: 'ecom',
    title: 'المتجر الإلكتروني (E-Commerce)',
    subtitle: 'إدارة طلبات الأونلاين، مخزون مستودع الويب، وتحليلات المتجر',
    icon: <ShoppingBag />,
    badge: '3 أقسام',
    children: [
      {
        id: 'orders',
        title: 'طلبات المتجر الإلكتروني',
        subtitle: 'متابعة حالات الطلبات، الشحن، وبوالص التوصيل والتجهيز',
        icon: <ShoppingBag />,
        badge: 'الطلبات'
      },
      {
        id: 'ecom_inventory',
        title: 'مخزون المتجر الإلكتروني',
        subtitle: 'أرصدة المستودع المخصص للطلبات الرقمية وحجز الكميات',
        icon: <PackageCheck />,
        badge: 'المستودع'
      },
      {
        id: 'ecom_analytics',
        title: 'إحصائيات المتجر الإلكتروني',
        subtitle: 'تحليلات حركة الزوار، المبيعات الرقمية، ومتوسط قيمة السلة',
        icon: <TrendingUp />,
        badge: 'تحليلات'
      }
    ]
  },
  {
    id: 'inventory',
    title: 'إدارة المخزون والأصناف',
    subtitle: 'دليل المجموعات والأصناف، المقاسات والألوان، الجرد الفعلي وسندات التسوية',
    icon: <Layers />,
    badge: '3 أقسام',
    children: [
      {
        id: 'groups_items',
        title: 'المجموعات والأصناف',
        subtitle: 'شجرة التصنيفات، المقاسات، الألوان، ومواصفات الأصناف',
        icon: <Layers />,
        badge: 'التصنيفات'
      },
      {
        id: 'stock_audit',
        title: 'الجرد الفعلي وسندات التسوية',
        subtitle: 'الجرد الميداني والمطابقة الفورية، معالجة العجز والزيادة، واعتماد سندات التسوية',
        icon: <ClipboardCheck />,
        badge: 'الجرد والتسوية'
      },
      {
        id: 'transfers',
        title: 'أذونات الصرف والتحويل',
        subtitle: 'التحويل بين الفروع والمستودعات وسندات استلام البضائع',
        icon: <ArrowLeftRight />,
        badge: 'التحويلات'
      }
    ]
  },
  {
    id: 'purchases',
    title: 'المشتريات والتوريد',
    subtitle: 'فواتير الشراء، حسابات الموردين، وتكاليف استلام البضائع',
    icon: <Receipt />,
    badge: 'قسمين',
    children: [
      {
        id: 'purchases',
        title: 'فواتير المشتريات والتوريد',
        subtitle: 'تسجيل ومراجعة فواتير الشراء، تكلفة الوحدة، ودفعات الموردين',
        icon: <Receipt />,
        badge: 'الفواتير'
      },
      {
        id: 'suppliers',
        title: 'الموردين والحسابات',
        subtitle: 'دليل الموردين، كشوف الحسابات التفصيلية، والأرصدة الدائنة',
        icon: <Truck />,
        badge: 'الموردين'
      }
    ]
  },
  {
    id: 'finance',
    title: 'المالية والخزائن',
    subtitle: 'إدارة الخزينة المركزية، حركة النقدية والسيولة، وتسوية الرواتب والمصروفات',
    icon: <Wallet />,
    badge: 'قسمان',
    children: [
      {
        id: 'treasury_admin',
        title: 'الخزينة المركزية والتحويلات',
        subtitle: 'حركة السيولة المركزية، التحويلات البنكية، وتصفير الخزائن',
        icon: <Landmark />,
        badge: 'المركزية'
      },
      {
        id: 'payroll_expenses',
        title: 'مسير الرواتب وبنود المصروفات',
        subtitle: 'تسوية مرتبات وعمولات البائعين، السلف والخصومات، وإدارة بنود مصروفات الفروع',
        icon: <Wallet />,
        badge: 'الرواتب'
      }
    ]
  },
  {
    id: 'analytics',
    title: 'التحليلات والتقارير الرقابية',
    subtitle: 'تحليلات المبيعات المركزية، يومية الفروع، واليوميات الإدارية',
    icon: <BarChart3 />,
    badge: '3 تقارير',
    children: [
      {
        id: 'sales_reports',
        title: 'تحليلات المبيعات والإيرادات المركزية',
        subtitle: 'الرسوم البيانية، مقارنة أداء الفروع، تقييم البائعين، وسجل المرتجعات',
        icon: <BarChart3 />,
        badge: 'المبيعات'
      },
      {
        id: 'branches_daily',
        title: 'يومية الفروع المجمعة',
        subtitle: 'كشف الحساب اليومي الشامل لمبيعات ومصروفات ونقدية كل فرع',
        icon: <FileSpreadsheet />,
        badge: 'اليومية'
      },
      {
        id: 'admin_journals',
        title: 'اليوميات الإدارية والرقابة',
        subtitle: 'سجلات التدقيق الإداري، دفتر المصروفات، والعمليات المخزنية',
        icon: <BookOpenCheck />,
        badge: 'اليوميات'
      }
    ]
  },
  {
    id: 'management',
    title: 'إدارة النظام والفروع',
    subtitle: 'هيكل الفروع والمستودعات، حسابات المستخدمين، وتعيين الصلاحيات',
    icon: <Store />,
    badge: 'قسمان',
    children: [
      {
        id: 'branches',
        title: 'الفروع والمستودعات',
        subtitle: 'إدارة الفروع، نقاط البيع، والمستودعات وتعيين الصلاحيات',
        icon: <Store />,
        badge: 'الفروع'
      },
      {
        id: 'users',
        title: 'المستخدمين والصلاحيات',
        subtitle: 'إدارة حسابات المديرين، المشرفين، والبائعين وصلاحيات الوصول',
        icon: <Users />,
        badge: 'المستخدمين'
      }
    ]
  }
];

/**
 * Quick helper to lookup category by ID
 */
export function getCategoryById(id) {
  return NAVIGATION_CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Flat list of all leaf pages for quick search
 */
export function getAllPages() {
  const pages = [];
  NAVIGATION_CATEGORIES.forEach((cat) => {
    cat.children.forEach((child) => {
      pages.push({
        ...child,
        categoryId: cat.id,
        categoryTitle: cat.title
      });
    });
  });
  return pages;
}
