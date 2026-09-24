import React from 'react';
import { Button, Typography, Divider } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ThermalReceipt({ invoice, onClose }) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentBreakdown = typeof invoice.payment_breakdown === 'string'
    ? JSON.parse(invoice.payment_breakdown || '{}')
    : (invoice.payment_breakdown || {});

  const cashPaid = parseFloat(paymentBreakdown.cash || 0);
  const transferPaid = parseFloat(paymentBreakdown.bank_transfer || paymentBreakdown.transfer || 0);
  const walletPaid = parseFloat(paymentBreakdown.e_wallet || paymentBreakdown.wallet || 0);
  const finalAmount = parseFloat(invoice.final_amount || 0);

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button icon={<PrinterOutlined />} type="primary" onClick={handlePrint}>
          طباعة الإيصال (80mm)
        </Button>
        {onClose && <Button onClick={onClose}>إغلاق</Button>}
      </div>

      <div
        id="thermal-receipt-container"
        style={{
          width: '78mm',
          maxWidth: '300px',
          margin: '0 auto',
          padding: '12px 8px',
          background: '#fff',
          color: '#000',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          lineHeight: 1.3,
          border: '1px dashed #ccc',
          direction: 'rtl'
        }}
      >
        {/* Receipt Header */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>YOKA STORE</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>يوكا ستور لملابس المحجبات</div>
          <div style={{ fontSize: '11px', color: '#333' }}>
            {invoice.branch_name || 'الفرع الرئيسي'}
          </div>
          {invoice.branch_phone && (
            <div style={{ fontSize: '11px', color: '#333' }}>
              هاتف: {invoice.branch_phone}
            </div>
          )}
        </div>

        <Divider dashed style={{ margin: '6px 0', borderColor: '#000' }} />

        {/* Invoice Info */}
        <div style={{ fontSize: '11px', marginBottom: 6 }}>
          <div>رقم الفاتورة: <strong>{invoice.invoice_number}</strong></div>
          <div>التاريخ: {new Date(invoice.invoice_date || invoice.created_at).toLocaleString('ar-EG')}</div>
          <div>الكاشير: {invoice.cashier_name || 'موظف مبيعات'}</div>
          <div>العميل: {invoice.customer_name || 'عميل نقدي'}</div>
        </div>

        <Divider dashed style={{ margin: '6px 0', borderColor: '#000' }} />

        {/* Items List */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'right', padding: '2px 0' }}>الصنف</th>
              <th style={{ textAlign: 'center', padding: '2px 0' }}>الكمية</th>
              <th style={{ textAlign: 'left', padding: '2px 0' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => (
              <tr key={idx} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '3px 0' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.product_name}</div>
                  <div style={{ fontSize: '10px', color: '#555' }}>
                    {item.variant_sku ? `كود: ${item.variant_sku}` : ''}
                    {item.quantity} × {parseFloat(item.final_unit_price || item.unit_price).toFixed(2)}
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '3px 0' }}>{item.quantity}</td>
                <td style={{ textAlign: 'left', padding: '3px 0', fontWeight: 'bold' }}>
                  {parseFloat(item.line_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Divider dashed style={{ margin: '6px 0', borderColor: '#000' }} />

        {/* Financial Summary */}
        <div style={{ fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>المجموع:</span>
            <span>{parseFloat(invoice.subtotal).toFixed(2)} ج.م</span>
          </div>

          {parseFloat(invoice.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>الخصم:</span>
              <span>-{parseFloat(invoice.discount_amount).toFixed(2)} ج.م</span>
            </div>
          )}

          {parseFloat(invoice.tax_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>الضريبة:</span>
              <span>+{parseFloat(invoice.tax_amount).toFixed(2)} ج.م</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '15px',
              marginTop: '4px',
              borderTop: '1px solid #000',
              paddingTop: '4px'
            }}
          >
            <span>الصافي المطلوب:</span>
            <span>{finalAmount.toFixed(2)} ج.م</span>
          </div>
        </div>

        <Divider dashed style={{ margin: '6px 0', borderColor: '#000' }} />

        {/* Payment breakdown */}
        <div style={{ fontSize: '11px' }}>
          {cashPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>مدفوع نقداً (خزينة):</span>
              <span>{cashPaid.toFixed(2)} ج.م</span>
            </div>
          )}
          {transferPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>تحويل بنكي / إنستاباي:</span>
              <span>{transferPaid.toFixed(2)} ج.م</span>
            </div>
          )}
          {walletPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>محفظة إلكترونية:</span>
              <span>{walletPaid.toFixed(2)} ج.م</span>
            </div>
          )}
          {invoice.notes && (
            <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: '10px' }}>
              ملاحظة: {invoice.notes}
            </div>
          )}
        </div>

        <Divider dashed style={{ margin: '8px 0', borderColor: '#000' }} />

        {/* Receipt Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: 8 }}>
          <div style={{ fontWeight: 'bold' }}>شكراً لتسوقكم في YOKA STORE</div>
          <div>البضاعة المباعة ترد وتستبدل خلال 14 يوماً</div>
          <div>يشترط وجود أصل الفاتورة والباركود سليم</div>
          <div style={{ marginTop: 4, letterSpacing: '2px', fontWeight: 'bold', fontSize: '12px' }}>
            * {invoice.invoice_number} *
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-container, #thermal-receipt-container * {
            visibility: visible;
          }
          #thermal-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 80mm !important;
            border: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
