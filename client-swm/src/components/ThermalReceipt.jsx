import React from 'react';
import { Button, Typography, Space } from 'antd';
import { PrinterOutlined, CloseOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Trophy } from 'lucide-react';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { printHtmlContent } from '../utils/printUtils';

const { Text } = Typography;

export default function ThermalReceipt({ invoice, onClose }) {
  if (!invoice) return null;

  const paymentBreakdown = typeof invoice.payment_breakdown === 'string'
    ? JSON.parse(invoice.payment_breakdown || '{}')
    : (invoice.payment_breakdown || {});

  const cashPaid = parseFloat(paymentBreakdown.cash || 0);
  const transferPaid = parseFloat(paymentBreakdown.bank_transfer || paymentBreakdown.transfer || 0);
  const walletPaid = parseFloat(paymentBreakdown.e_wallet || paymentBreakdown.wallet || 0);
  const cardPaid = parseFloat(paymentBreakdown.card || paymentBreakdown.visa || 0);
  const finalAmount = parseFloat(invoice.final_amount || 0);

  const handlePrint = () => {
    const el = document.getElementById('thermal-receipt-container');
    if (el) {
      printHtmlContent({
        title: `إيصال استلام - ${invoice.invoice_number}`,
        htmlContent: el.innerHTML,
        pageType: 'thermal'
      });
    } else {
      window.print();
    }
  };

  return (
    <div>
      {/* Top Action Bar (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <Button
            icon={<PrinterOutlined />}
            type="primary"
            size="large"
            onClick={handlePrint}
            className="btn-print"
            style={{
              flex: 1,
              backgroundColor: '#0B0F17',
              color: '#DFCA95',
              borderColor: '#C8A45C',
              fontWeight: 800,
              borderRadius: 8,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            طباعة الإيصال (80mm)
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            size="large"
            onClick={handlePrint}
            className="btn-print"
            style={{
              flex: 1,
              backgroundColor: '#0B0F17',
              color: '#DFCA95',
              borderColor: '#C8A45C',
              fontWeight: 800,
              borderRadius: 8,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            تصدير PDF
          </Button>
        </div>
        {onClose && (
          <Button
            size="middle"
            icon={<CheckCircleOutlined />}
            onClick={onClose}
            style={{
              width: '100%',
              borderRadius: 8,
              fontWeight: 700,
              height: 38,
              backgroundColor: '#F8FAFC',
              borderColor: '#CBD5E1',
              color: '#0F172A'
            }}
          >
            إغلاق وبدء فاتورة جديدة (Esc)
          </Button>
        )}
      </div>

      {/* 80mm Receipt Container */}
      <div
        id="thermal-receipt-container"
        style={{
          width: '74mm',
          maxWidth: '300px',
          margin: '0 auto',
          padding: '10px 8px',
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: "'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: '11px',
          lineHeight: 1.45,
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          direction: 'rtl',
          textAlign: 'right'
        }}
      >
        {/* Receipt Header */}
        <div style={{ textAlign: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1.5px dashed #334155' }}>
          <img
            src={yokaLogo}
            alt="Yoka Store"
            style={{ height: 42, maxWidth: 120, objectFit: 'contain', marginBottom: 4 }}
          />
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            شركة يوكا ستور (YOKA STORE)
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 800,
            color: (invoice.isReturn || invoice.status === 'returned' || invoice.invoice_number?.startsWith('RET-')) ? '#b91c1c' : '#15803d',
            background: (invoice.isReturn || invoice.status === 'returned' || invoice.invoice_number?.startsWith('RET-')) ? '#fee2e2' : '#f0fdf4',
            padding: '2px 10px',
            borderRadius: 6,
            marginTop: 4
          }}>
            {(invoice.isReturn || invoice.status === 'returned' || invoice.invoice_number?.startsWith('RET-'))
              ? 'إيصال مرتجع مبيعات (Return)'
              : 'إيصال استلام مبيعات (Sale)'}
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: 2 }}>
            {invoice.branch_name || 'الفرع الرئيسي'}
          </div>
          {invoice.branch_phone && (
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: 1 }}>
              خدمة العملاء: <span style={{ direction: 'ltr', display: 'inline-block' }}>{invoice.branch_phone}</span>
            </div>
          )}
        </div>

        {/* Invoice Metadata Box */}
        <div style={{ fontSize: '10.5px', background: '#f8fafc', padding: '6px 8px', borderRadius: 6, marginBottom: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>رقم الفاتورة / المرتجع:</span>
            <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '11.5px' }}>{invoice.invoice_number}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>التاريخ والوقت:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>
              {new Date(invoice.invoice_date || invoice.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>الكاشير:</span>
            <span style={{ fontWeight: 600 }}>{invoice.cashier_name || 'كاشير الفرع'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>العميل:</span>
            <span style={{ fontWeight: 600 }}>{invoice.customer_name || 'عميل نقدي'}</span>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #0f172a', color: '#0f172a' }}>
              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 800 }}>الصنف والمواصفات</th>
              <th style={{ textAlign: 'center', padding: '4px 0', width: '32px', fontWeight: 800 }}>الكمية</th>
              <th style={{ textAlign: 'left', padding: '4px 0', width: '60px', fontWeight: 800 }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                <td style={{ padding: '4px 0' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                  <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: 1 }}>
                    {item.variant_sku ? `${item.variant_sku} • ` : ''}
                    {item.quantity} × {parseFloat(item.final_unit_price || item.unit_price).toFixed(2)}
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '4px 0', fontWeight: 700, fontFamily: 'monospace' }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  {parseFloat(item.line_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary */}
        <div style={{ borderTop: '1.5px dashed #334155', paddingTop: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
            <span style={{ color: '#475569' }}>المجموع قبل الخصم:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{parseFloat(invoice.subtotal).toFixed(2)} ج.م</span>
          </div>

          {parseFloat(invoice.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b91c1c', padding: '2px 0' }}>
              <span>قيمة الخصم:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-{parseFloat(invoice.discount_amount).toFixed(2)} ج.م</span>
            </div>
          )}

          {parseFloat(invoice.points_discount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b45309', padding: '2px 0' }}>
              <span>خصم نقاط الولاء ({invoice.points_redeemed || 0} نقطة):</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-{parseFloat(invoice.points_discount).toFixed(2)} ج.م</span>
            </div>
          )}

          {parseFloat(invoice.tax_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', padding: '2px 0' }}>
              <span>ضريبة القيمة المضافة:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+{parseFloat(invoice.tax_amount).toFixed(2)} ج.م</span>
            </div>
          )}

          {/* Grand Net Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '14px',
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '6px 8px',
              borderRadius: 6,
              marginTop: 5,
              border: '1.5px solid #0f172a'
            }}
          >
            <span>الصافي المطلوب:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{finalAmount.toFixed(2)} ج.م</span>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div style={{ fontSize: '10px', background: '#f8fafc', padding: '5px 8px', borderRadius: 6, marginBottom: 8, border: '1px solid #e2e8f0' }}>
          {cashPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span style={{ color: '#475569' }}>نقداً (كاش):</span>
              <strong style={{ color: '#15803d', fontFamily: 'monospace' }}>{cashPaid.toFixed(2)} ج.م</strong>
            </div>
          )}
          {cardPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span style={{ color: '#475569' }}>بطاقة بنكية / فيزا:</span>
              <strong style={{ color: '#1d4ed8', fontFamily: 'monospace' }}>{cardPaid.toFixed(2)} ج.م</strong>
            </div>
          )}
          {transferPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span style={{ color: '#475569' }}>تحويل إنستاباي / بنكي:</span>
              <strong style={{ color: '#7c3aed', fontFamily: 'monospace' }}>{transferPaid.toFixed(2)} ج.م</strong>
            </div>
          )}
          {walletPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span style={{ color: '#475569' }}>محفظة إلكترونية:</span>
              <strong style={{ color: '#b45309', fontFamily: 'monospace' }}>{walletPaid.toFixed(2)} ج.م</strong>
            </div>
          )}
          {invoice.notes && (
            <div style={{ marginTop: 3, fontStyle: 'italic', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: 2 }}>
              ملاحظة: {invoice.notes}
            </div>
          )}
        </div>

        {/* Customer Loyalty & Points Accrual Block */}
        {((invoice.points_earned > 0) || (invoice.points_redeemed > 0) || (invoice.customer_points_balance !== undefined && invoice.customer_points_balance !== null)) && (
          <div style={{
            fontSize: '10px',
            background: '#fffdf5',
            padding: '6px 8px',
            borderRadius: 6,
            marginBottom: 8,
            border: '1px dashed #C8A45C',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Trophy size={11} style={{ color: '#b45309' }} /> برنامج ولاء العملاء (Yoka Points)
            </div>
            {invoice.customer_code && (
              <div style={{ color: '#475569', fontSize: '9px' }}>
                كود العميل: <strong>{invoice.customer_code}</strong>
              </div>
            )}
            {invoice.points_redeemed > 0 && (
              <div style={{ color: '#b45309' }}>
                تم استبدال: <strong>{invoice.points_redeemed}</strong> نقطة (خصم {parseFloat(invoice.points_discount || 0).toFixed(2)} ج.م)
              </div>
            )}
            {invoice.points_earned > 0 && (
              <div style={{ color: '#15803d' }}>
                نقاط مكتسبة بهذه الفاتورة: <strong>+{invoice.points_earned}</strong> نقطة
              </div>
            )}
            {invoice.customer_points_balance !== undefined && invoice.customer_points_balance !== null && (
              <div style={{ fontWeight: 700, color: '#0f172a', borderTop: '1px dashed #e2e8f0', marginTop: 3, paddingTop: 2 }}>
                رصيد نقاطك الحالي: <strong>{invoice.customer_points_balance}</strong> نقطة
              </div>
            )}
          </div>
        )}

        {/* Footer & Return Policy */}
        <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#64748b', borderTop: '1.5px dashed #334155', paddingTop: 6 }}>
          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 2, fontSize: '10.5px' }}>
            شكراً لزيارتكم وتسوقكم في YOKA STORE!
          </div>
          <div>الاستبدال والاسترجاع خلال 14 يوماً من تاريخ الفاتورة</div>
          <div>يشترط وجود أصل الفاتورة وأن تكون البضاعة بحالتها الأصلية</div>
          <div style={{ marginTop: 5, letterSpacing: '2px', fontWeight: 800, fontSize: '11px', color: '#0f172a', fontFamily: 'monospace' }}>
            *{invoice.invoice_number}*
          </div>
        </div>
      </div>
    </div>
  );
}
