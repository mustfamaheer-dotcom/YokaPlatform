import React from 'react';
import { Button, Typography, Space, Row, Col } from 'antd';
import { PrinterOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import yokaLogo from '../assets/yokaStoreTransparent.png';
import { printHtmlContent } from '../utils/printUtils';

const { Text } = Typography;

export default function DispatchNoteA4({ transfer, onClose }) {
  if (!transfer) return null;

  const handlePrint = () => {
    const el = document.getElementById('dispatch-note-print-area');
    if (el) {
      printHtmlContent({
        title: `إذن صرف وتوزيع - ${transfer.transfer_number}`,
        htmlContent: el.innerHTML,
        pageType: 'a4'
      });
    } else {
      window.print();
    }
  };

  const items = transfer.items || [];

  return (
    <div>
      {/* Action Bar (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={handlePrint} style={{ backgroundColor: '#0f172a' }}>
            طباعة إذن الصرف (A4)
          </Button>
          <Button size="large" icon={<FilePdfOutlined />} onClick={handlePrint}>
            حفظ كملف PDF
          </Button>
        </Space>
        {onClose && <Button onClick={onClose}>إغلاق</Button>}
      </div>

      {/* Printable A4 Container */}
      <div
        id="dispatch-note-print-area"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={yokaLogo}
              alt="Yoka Store Logo"
              style={{ height: 50, maxWidth: 120, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#0f172a' }}>
                شركة يوكا ستور (YOKA STORE)
              </h1>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                للملابس الجاهزة والمحجبات — الإدارة العامة وسلاسل الإمداد
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                نظام إدارة المخازن وحركة البضائع (Yoka SWM)
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
                fontSize: '14px',
                letterSpacing: '-0.2px'
              }}
            >
              إذن صرف وتوزيع بضاعة
            </div>
            <div style={{ marginTop: 5, fontSize: '12px', color: '#334155', fontWeight: 700 }}>
              رقم الإذن: <strong style={{ color: '#0f172a', fontSize: '13px', fontFamily: 'monospace' }}>{transfer.transfer_number}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
              التاريخ: {dayjs(transfer.transfer_date).format('YYYY-MM-DD')}
            </div>
          </div>
        </div>

        {/* Transfer Information Meta Grid */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <Row gutter={[16, 10]}>
            <Col span={12}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>المخزن / الفرع المُرسِل (الجهة الصارفة): </span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {transfer.from_branch_name} ({transfer.from_branch_code})
                </div>
              </div>
              {transfer.from_branch_address && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 1 }}>
                  العنوان: {transfer.from_branch_address}
                </div>
              )}
            </Col>

            <Col span={12}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>المخزن / الفرع المُستقبِل (الجهة المستلمة): </span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                  {transfer.to_branch_name} ({transfer.to_branch_code})
                </div>
              </div>
              {transfer.to_branch_address && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: 1 }}>
                  العنوان: {transfer.to_branch_address}
                </div>
              )}
            </Col>

            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>وقت وتاريخ الصرف: </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                {dayjs(transfer.transfer_date).format('YYYY-MM-DD')} {dayjs(transfer.created_at).format('HH:mm')}
              </div>
            </Col>

            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>مسؤول النقل / السائق: </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                {transfer.driver_name || 'مندوب النقل الداخلي'}
              </div>
            </Col>

            <Col span={8}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>رقم السيارة / وسيلة النقل: </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                {transfer.vehicle_number || 'نقل الفرع'}
              </div>
            </Col>

            <Col span={12}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>حرر بواسطة: </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: 1 }}>
                {transfer.created_by_name || transfer.created_by_username || 'إدارة النظام'}
              </div>
            </Col>

            <Col span={12}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>حالة الإذن: </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginTop: 1 }}>
                منقول ومكتمل — تم ترحيل أرصدة المخازن آلياً
              </div>
            </Col>

            {transfer.notes && (
              <Col span={24}>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 4 }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ملاحظات الصرف والتسليم: </span>
                  <span style={{ fontSize: '12px', color: '#334155' }}>{transfer.notes}</span>
                </div>
              </Col>
            )}
          </Row>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: 16 }}>
          <table
            className="print-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right',
              fontSize: '11.5px'
            }}
          >
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '32px', textAlign: 'center' }}>م</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '120px', textAlign: 'center' }}>كود الصنف</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '130px', textAlign: 'center' }}>الباركود</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a' }}>بيان الصنف والمواصفات</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '60px', textAlign: 'center' }}>الوحدة</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '90px', textAlign: 'center' }}>الكمية المنصرفة</th>
                <th style={{ padding: '7px 8px', border: '1px solid #0f172a', width: '130px' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
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
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                    {item.product_code || item.master_product_code}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>
                    {item.variant_sku || item.barcode || '-'}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.product_name}</div>
                    {(item.color || item.size) && (
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: 1 }}>
                        اللون: {item.color || '-'} | المقاس: {item.size || '-'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                    قطعة
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '11px' }}>
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                <td colSpan={4} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                  إجمالي الكميات المنصرفة:
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                  {items.length} صنف
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', color: '#16a34a', fontFamily: 'monospace' }}>
                  {transfer.total_units} قطعة
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Declarations Notice */}
        <div style={{ fontSize: '11px', color: '#475569', marginBottom: 20, padding: '7px 12px', background: '#f8fafc', borderRight: '3px solid #0f172a', borderRadius: '0 6px 6px 0' }}>
          <strong>إقرار استلام:</strong> يُقر المستلم بالفرع بأنه تسلم البضاعة الموضحة أعلاه بحالة جيدة وسليمة تماماً ومطابقة للكميات والمواصفات المذكورة في هذا الإذن، وتم إدراجها بالكامل ضمن العهدة المخزنية للفرع المستلم.
        </div>

        {/* Official Signatures Grid */}
        <div style={{ marginTop: 24, borderTop: '1px dashed #94a3b8', paddingTop: 14 }}>
          <Row gutter={16}>
            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 34, fontSize: '11.5px', color: '#334155' }}>أمين المخزن المُرسِل</div>
              <div style={{ borderTop: '1px solid #475569', width: '85%', margin: '0 auto', paddingTop: 4, fontSize: '10.5px', color: '#64748b' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 34, fontSize: '11.5px', color: '#334155' }}>مسؤول النقل / السائق</div>
              <div style={{ borderTop: '1px solid #475569', width: '85%', margin: '0 auto', paddingTop: 4, fontSize: '10.5px', color: '#64748b' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 34, fontSize: '11.5px', color: '#334155' }}>مستلم الفرع / المحل</div>
              <div style={{ borderTop: '1px solid #475569', width: '85%', margin: '0 auto', paddingTop: 4, fontSize: '10.5px', color: '#64748b' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 34, fontSize: '11.5px', color: '#334155' }}>اعتماد إدارة التشغيل</div>
              <div style={{ borderTop: '1px solid #475569', width: '85%', margin: '0 auto', paddingTop: 4, fontSize: '10.5px', color: '#64748b' }}>
                الختم والاعتماد: ............
              </div>
            </Col>
          </Row>
        </div>

        {/* Footer print note */}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>منظومة Yoka SWM لإدارة سلاسل الإمداد والمستودعات</span>
          <span>تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
}
