const { z } = require('zod');

/**
 * 1. Supplier Creation Schema (Exactly 5 fields)
 */
const createSupplierSchema = z.object({
  supplier_name: z.string().trim().min(1, 'اسم المورد مطلوب'),
  contact_person: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  opening_balance: z.coerce.number().min(0, 'الرصيد الافتتاحي لا يمكن أن يكون سالباً').default(0)
});

/**
 * 2. Multi-tender Payment Breakdown Item (Strictly Cash, Bank Transfer, E-Wallet)
 */
const paymentBreakdownItemSchema = z.object({
  method: z.string().trim().optional(),
  payment_method: z.string().trim().optional(),
  method_name: z.string().trim().optional(),
  amount: z.coerce.number().min(0, 'مبلغ وسيلة الدفع يجب ألا يكون سالباً'),
  details: z.string().trim().optional().nullable()
}).refine(data => {
  const m = data.method || data.payment_method;
  return ['cash', 'bank_transfer', 'e_wallet'].includes(m);
}, {
  message: 'وسيلة الدفع المسموح بها فقط: نقداً، تحويل بنكي، أو محفظة إلكترونية'
});

/**
 * 3. Supplier Payment Schema (No receipt number, strictly Cash/Bank Transfer/E-Wallet/Split)
 */
const supplierPaymentSchema = z.object({
  amount: z.coerce.number().positive('مبلغ الدفعة يجب أن يكون أكبر من صفر').optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'e_wallet', 'split']).default('cash'),
  payment_breakdown: z.array(paymentBreakdownItemSchema).optional().nullable(),
  payment_date: z.string().trim().optional(),
  notes: z.string().trim().optional().nullable(),
  invoice_id: z.coerce.number().int().positive().optional().nullable(),
  direction: z.string().trim().default('payment')
});

/**
 * 4. Purchase Invoice Item Schema
 */
const purchaseItemSchema = z.object({
  product_id: z.coerce.number().int().positive('معرف المنتج غير صحيح'),
  variant_id: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
  unit_cost: z.coerce.number().min(0, 'سعر التكلفة يجب أن يكون صفراً أو أكثر'),
  selling_price: z.coerce.number().min(0, 'سعر البيع النهائي يجب أن يكون صفراً أو أكثر').optional().nullable(),
  discount_pct: z.coerce.number().min(0).max(100).default(0),
  discount_amount: z.coerce.number().min(0).optional()
});

/**
 * 5. Purchase Invoice Schema
 */
const createPurchaseInvoiceSchema = z.object({
  supplier_id: z.coerce.number().int().positive('يرجى تحديد المورد'),
  warehouse_branch_id: z.coerce.number().int().positive('يرجى تحديد مستودع الاستلام'),
  invoice_number: z.string().trim().optional().nullable(),
  invoice_date: z.string().trim().optional(),
  due_date: z.string().trim().optional().nullable(),
  subtotal: z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  shipping_cost: z.coerce.number().min(0).default(0),
  paid_amount: z.coerce.number().min(0).default(0),
  payment_method: z.enum(['cash', 'bank_transfer', 'e_wallet', 'split']).default('cash'),
  payment_breakdown: z.array(paymentBreakdownItemSchema).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل في الفاتورة')
});

/**
 * 6. Purchase Return (Supplier Return) Schema
 */
const returnItemSchema = z.object({
  product_id: z.coerce.number().int().positive('معرف المنتج مطلوب'),
  variant_id: z.coerce.number().int().positive().optional().nullable(),
  purchase_item_id: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().int().positive('كمية المرتجع يجب أن تكون أكبر من صفر'),
  unit_cost: z.coerce.number().min(0, 'سعر التكلفة للمرتجع مطلوب'),
  product_name: z.string().optional(),
  product_code: z.string().optional()
});

const createPurchaseReturnSchema = z.object({
  invoice_id: z.coerce.number().int().positive().optional().nullable(),
  supplier_id: z.coerce.number().int().positive('يرجى تحديد المورد'),
  warehouse_branch_id: z.coerce.number().int().positive('يرجى تحديد مستودع المرتجع'),
  return_date: z.string().trim().optional(),
  total_amount: z.coerce.number().min(0).optional(),
  refund_amount: z.coerce.number().min(0).default(0),
  refund_method: z.enum(['cash', 'bank_transfer', 'e_wallet', 'split', 'balance_credit']).default('cash'),
  payment_breakdown: z.array(paymentBreakdownItemSchema).optional().nullable(),
  reason: z.string().trim().optional().nullable(),
  items: z.array(returnItemSchema).min(1, 'يجب تحديد صنف واحد على الأقل للإرجاع')
});

/**
 * 7. Product Creation Schema
 */
const createProductSchema = z.object({
  product_code: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional().nullable(),
  product_name: z.string().trim().min(1, 'اسم المنتج مطلوب'),
  category_id: z.coerce.number().int().positive('يرجى اختيار القسم'),
  sub_category_id: z.coerce.number().int().positive().optional().nullable(),
  brand: z.string().trim().optional().nullable(),
  material: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  size: z.string().trim().optional().nullable(),
  cost_price: z.coerce.number().min(0, 'سعر التكلفة مطلوب'),
  selling_price: z.coerce.number().min(0, 'سعر البيع مطلوب'),
  wholesale_price: z.coerce.number().min(0).optional().nullable(),
  sale_price: z.coerce.number().min(0).optional().nullable(),
  reorder_level: z.coerce.number().int().min(0).default(5),
  is_ecom_listed: z.boolean().default(false),
  variants: z.array(z.object({
    sku: z.string().optional(),
    color: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    price_modifier: z.coerce.number().optional().default(0)
  })).optional().default([])
});

/**
 * Express middleware helper for Zod validation
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: err.errors.map(e => e.message).join(' | '),
          errors: err.errors
        });
      }
      return res.status(400).json({ success: false, message: 'خطأ في التحقق من البيانات المدخلة' });
    }
  };
}

module.exports = {
  createSupplierSchema,
  supplierPaymentSchema,
  createPurchaseInvoiceSchema,
  createPurchaseReturnSchema,
  createProductSchema,
  paymentBreakdownItemSchema,
  validate
};
