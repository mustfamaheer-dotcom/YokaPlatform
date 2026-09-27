import React from 'react';
import { Button, Space, Row, Col } from 'antd';
import { PrinterOutlined, FilePdfOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { printHtmlContent } from '../utils/printUtils';

export default function ShippingWaybillA4({ order, onClose }) {
  if (!order) return null;

  const addr = order.shipping_address || {};
  const isCod = order.payment_method === 'cod';
  const isPaid = order.payment_status === 'paid';
  const totalAmount = parseFloat(order.total_amount || 0);

  const handlePrint = () => {
    const el = document.getElementById('shipping-waybill-print-area');
    if (el) {
      printHtmlContent({
        title: `بوليصة شحن - ${order.order_number}`,
        htmlContent: el.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  return (
    <div>
      {/* Action Bar (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={handlePrint} style={{ backgroundColor: '#0f172a' }}>
            طباعة بوليصة الشحن (A4)
          </Button>
          <Button size="large" icon={<FilePdfOutlined />} onClick={handlePrint}>
            حفظ كملف PDF
          </Button>
        </Space>
        {onClose && <Button icon={<CloseOutlined />} onClick={onClose}>إغلاق</Button>}
      </div>

      {/* Printable Waybill Container */}
      <div
        id="shipping-waybill-print-area"
        style={{
          width: '100%',
          maxWidth: '820px',
          margin: '0 auto',
          padding: '24px 28px',
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: "'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: '12px',
          lineHeight: 1.5,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          direction: 'rtl'
        }}
      >
        {/* Header with Logo and Titles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={yokaLogo}
              alt="Yoka Store Logo"
              style={{ height: 48, maxWidth: 120, objectFit: 'contain' }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                شركة يوكا ستور — YOKA STORE
              </h1>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                قسم شحن وتوصيل طلبات المتجر الإلكتروني (E-Commerce Fulfillment)
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                خدمة العملاء والشكاوى: 01000000000 • الموقع: yokastore.com
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                display: 'inline-block',
                background: '#0f172a',
                color: '#ffffff',
                padding: '5px 14px',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: '13px'
              }}
            >
              بوليصة شحن وتجهيز طرود
            </div>
            <div style={{ marginTop: 5, fontSize: '12px', color: '#334155', fontWeight: 700 }}>
              رقم الطلب: <strong style={{ color: '#0f172a', fontSize: '13.5px', fontFamily: 'monospace' }}>#{order.order_number}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
              تاريخ الطلب: {dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>

        {/* Courier & Tracking Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontSize: '12px' }}>
              شركة الشحن: {order.shipping_carrier || 'مندوب التوصيل'}
            </div>
            {order.tracking_number && (
              <div style={{ fontSize: '12px', color: '#334155' }}>
                رقم التتبع / البوليصة: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{order.tracking_number}</strong>
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#475569' }}>
              عدد الطرود: <strong style={{ color: '#0f172a' }}>{order.parcel_count || 1} طرد</strong>
            </div>
          </div>

          <div style={{ textAlign: 'left', fontSize: '11px', color: '#64748b' }}>
            محضر الشحنة: <strong style={{ color: '#0f172a' }}>{order.packed_by_name || 'مستودع المتجر'}</strong>
          </div>
        </div>

        {/* Recipient & COD High-Visibility Grid */}
        <Row gutter={14} style={{ marginBottom: 14 }}>
          {/* Recipient Address Card */}
          <Col span={15}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', height: '100%' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                بيانات المستلم وعنوان التوصيل (DELIVERY DESTINATION)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginBottom: 3 }}>
                {addr.recipient_name || order.customer_name || 'عميل المتجر'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8', marginBottom: 6, fontFamily: 'monospace' }}>
                هاتف: {addr.phone || order.phone || '-'}
                {addr.alternative_phone && ` / ${addr.alternative_phone}`}
              </div>
              <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                <strong>المحافظة والمدينة:</strong> {addr.governorate || '-'} — {addr.city || '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#1e293b', marginTop: 3 }}>
                <strong>العنوان التفصيلي:</strong> {addr.street_address || ''} {addr.building_apartment ? `— عمارة/شقة: ${addr.building_apartment}` : ''}
              </div>
              {order.customer_notes && (
                <div style={{ marginTop: 6, padding: '4px 8px', background: '#fef3c7', borderRight: '3px solid #d97706', borderRadius: '0 4px 4px 0', fontSize: '11px', color: '#92400e' }}>
                  <strong>تعليمات التسليم:</strong> {order.customer_notes}
                </div>
              )}
            </div>
          </Col>

          {/* Payment & Collection Alert Box */}
          <Col span={9}>
            <div
              style={{
                border: isCod ? '2px dashed #dc2626' : '2px solid #16a34a',
                background: isCod ? '#fef2f2' : '#f0fdf4',
                borderRadius: 8,
                padding: '12px 14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: isCod ? '#b91c1c' : '#15803d', textTransform: 'uppercase' }}>
                  {isCod ? 'تحصيل عند الاستلام (COD)' : 'مدفوع إلكترونياً (PRE-PAID)'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: 4 }}>
                  {isCod ? 'المبلغ المطلوب تحصيله نقداً:' : 'حالة الدفع:'}
                </div>
              </div>

              <div style={{ margin: '8px 0' }}>
                {isCod ? (
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace' }}>
                    {totalAmount.toLocaleString()} ج.م
                  </div>
                ) : (
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>
                    تم السداد بالكامل
                  </div>
                )}
                {isCod && (
                  <div style={{ fontSize: '10.5px', color: '#991b1b', fontWeight: 600 }}>
                    شامل ثمن المنتجات + مصاريف الشحن
                  </div>
                )}
              </div>

              <div style={{ fontSize: '10.5px', color: isCod ? '#b91c1c' : '#15803d', borderTop: `1px dashed ${isCod ? '#fca5a5' : '#bbf7d0'}`, paddingTop: 4 }}>
                {isCod ? 'يرجى تحصيل المبلغ قبل تسليم الطرد' : 'لا يُحصّل أي مبلغ من المستلم'}
              </div>
            </div>
          </Col>
        </Row>

        {/* Order Items Table */}
        <table
          className="print-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'right',
            fontSize: '11px',
            marginBottom: 12
          }}
        >
          <thead>
            <tr style={{ background: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '30px', textAlign: 'center' }}>م</th>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '110px', textAlign: 'center' }}>كود المنتج</th>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a' }}>اسم الصنف ومواصفات المقاس واللون</th>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '55px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '85px', textAlign: 'left' }}>سعر الوحدة</th>
              <th style={{ padding: '6px 8px', border: '1px solid #0f172a', width: '95px', textAlign: 'left' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, idx) => (
              <tr
                key={item.id || idx}
                style={{
                  background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: '1px solid #cbd5e1'
                }}
              >
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                  {item.product_code || item.variant_sku || '-'}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                  {(item.color || item.size || item.variant_desc) && (
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {item.variant_desc || `اللون: ${item.color || '-'} | المقاس: ${item.size || '-'}`}
                    </div>
                  )}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontFamily: 'monospace' }}>
                  {parseFloat(item.unit_price).toLocaleString()} ج.م
                </td>
                <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, fontFamily: 'monospace' }}>
                  {parseFloat(item.line_total || (item.quantity * item.unit_price)).toLocaleString()} ج.م
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary & Signatures Row */}
        <Row gutter={16}>
          {/* Signatures & Delivery Acknowledgment */}
          <Col span={14}>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '10.5px', color: '#475569', lineHeight: 1.4 }}>
                <strong>إقرار استلام الشحنة:</strong> يُقر العميل المستلم بأنه استلم الطرد بحالة سليمة ومغلقة، بعد مراجعة بيانات البوليصة والمبلغ المسدد.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px dashed #94a3b8' }}>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155', marginBottom: 24 }}>توقيع مندوب التوصيل</div>
                  <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: '10px', color: '#64748b' }}>........................</div>
                </div>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155', marginBottom: 24 }}>توقيع العميل المستلم</div>
                  <div style={{ borderTop: '1px solid #475569', paddingTop: 2, fontSize: '10px', color: '#64748b' }}>........................</div>
                </div>
              </div>
            </div>
          </Col>

          {/* Financial Totals */}
          <Col span={10}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0', color: '#475569' }}>
                <span>مجموع المنتجات:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{parseFloat(order.subtotal || 0).toLocaleString()} ج.م</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0', color: '#475569' }}>
                <span>تكلفة الشحن والتوصيل:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {parseFloat(order.shipping_cost || 0) === 0 ? 'مجاناً' : `${parseFloat(order.shipping_cost).toLocaleString()} ج.م`}
                </span>
              </div>
              {parseFloat(order.discount_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0', color: '#b91c1c' }}>
                  <span>خصم كوبون:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>-{parseFloat(order.discount_amount).toLocaleString()} ج.م</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #0f172a', marginTop: 6, paddingTop: 6, fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>
                <span>الإجمالي الكلي:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{totalAmount.toLocaleString()} ج.م</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Footer */}
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>بوليصة شحن إلكترونية صادرة من منظومة متجر Yoka Store</span>
          <span>تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
}
