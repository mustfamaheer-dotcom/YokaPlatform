import React from 'react';
import { Button, Typography, Space, Divider, Row, Col } from 'antd';
import { PrinterOutlined, FilePdfOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import yokaLogo from '../assets/yokaStoreTransparent.png';

const { Title, Text } = Typography;

export default function DispatchNoteA4({ transfer, onClose }) {
  if (!transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = transfer.items || [];

  return (
    <div>
      {/* Action Bar (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={handlePrint} style={{ backgroundColor: '#1e293b' }}>
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
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px 28px',
          background: '#fff',
          color: '#0f172a',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontSize: '13px',
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
              style={{ height: 52, maxWidth: 120, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>
                شركة يوكا ستور (YOKA STORE)
              </h1>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                للملابس الجاهزة والمحجبات - الإدارة العامة والمستودعات
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                نظام إدارة سلاسل التوريد والمخازن (Yoka SWM)
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                display: 'inline-block',
                border: '2px solid #0f172a',
                padding: '6px 14px',
                borderRadius: 6,
                fontWeight: 'bold',
                fontSize: '15px',
                background: '#f8fafc'
              }}
            >
              إذن صرف وتوزيع بضاعة
            </div>
            <div style={{ marginTop: 4, fontSize: '12px', color: '#475569' }}>
              رقم الإذن: <strong style={{ color: '#0f172a', fontSize: '14px' }}>{transfer.transfer_number}</strong>
            </div>
          </div>
        </div>

        {/* Transfer Information Meta Grid */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <div>
                <Text type="secondary">المخزن / الفرع المُرسِل (الجهة الصارفة): </Text>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  {transfer.from_branch_name} ({transfer.from_branch_code})
                </strong>
              </div>
              {transfer.from_branch_address && (
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  العنوان: {transfer.from_branch_address}
                </div>
              )}
            </Col>

            <Col span={12}>
              <div>
                <Text type="secondary">المخزن / الفرع المُستقبِل (الجهة المستلمة): </Text>
                <strong style={{ fontSize: '14px', color: '#16a34a' }}>
                  {transfer.to_branch_name} ({transfer.to_branch_code})
                </strong>
              </div>
              {transfer.to_branch_address && (
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  العنوان: {transfer.to_branch_address}
                </div>
              )}
            </Col>

            <Col span={8}>
              <Text type="secondary">تاريخ ووقت الصرف: </Text>
              <strong>{dayjs(transfer.transfer_date).format('YYYY-MM-DD')} {dayjs(transfer.created_at).format('HH:mm')}</strong>
            </Col>

            <Col span={8}>
              <Text type="secondary">مسؤول النقل / السائق: </Text>
              <strong>{transfer.driver_name || 'مندوب النقل الداخلي'}</strong>
            </Col>

            <Col span={8}>
              <Text type="secondary">رقم السيارة / وسيلة النقل: </Text>
              <strong>{transfer.vehicle_number || 'نقل الفرع'}</strong>
            </Col>

            <Col span={12}>
              <Text type="secondary">حرر بواسطة (مسؤول الإدارة): </Text>
              <strong>{transfer.created_by_name || transfer.created_by_username || 'إدارة النظام'}</strong>
            </Col>

            <Col span={12}>
              <Text type="secondary">حالة الإذن: </Text>
              <strong style={{ color: '#16a34a' }}>منقول ومكتمل (تم تعديل أرصدة المخازن)</strong>
            </Col>

            {transfer.notes && (
              <Col span={24}>
                <Text type="secondary">ملاحظات الصرف والتسليم: </Text>
                <span>{transfer.notes}</span>
              </Col>
            )}
          </Row>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: 16 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right',
              fontSize: '12px'
            }}
          >
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff' }}>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '35px', textAlign: 'center' }}>م</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '120px' }}>كود الصنف</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '130px' }}>الباركود</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a' }}>بيان الصنف والمواصفات</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '70px', textAlign: 'center' }}>الوحدة</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '90px', textAlign: 'center' }}>الكمية المنصرفة</th>
                <th style={{ padding: '8px 10px', border: '1px solid #0f172a', width: '140px' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                    borderBottom: '1px solid #cbd5e1'
                  }}
                >
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                    {item.product_code || item.master_product_code}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#475569' }}>
                    {item.variant_sku || item.barcode || '-'}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    {(item.color || item.size) && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        اللون: {item.color || '-'} | المقاس: {item.size || '-'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    قطعة
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '11px' }}>
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                <td colSpan={4} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                  إجمالي الكميات المنصرفة:
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                  {items.length} صنف
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '15px', color: '#16a34a' }}>
                  {transfer.total_units} قطعة
                </td>
                <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Declarations and Accountability Notice */}
        <div style={{ fontSize: '11px', color: '#475569', marginBottom: 20, padding: '6px 10px', background: '#f8fafc', borderRight: '3px solid #2563eb' }}>
          * إقرار استلام: يُقر المستلم بالفرع بأنه تسلم البضاعة الموضحة أعلاه بحالة جيدة ومطابقة للكميات والمواصفات المذكورة في هذا الإذن، وتم إدراجها ضمن العهدة المخزنية للفرع.
        </div>

        {/* Official Signatures Grid */}
        <div style={{ marginTop: 24, borderTop: '1px dashed #94a3b8', paddingTop: 14 }}>
          <Row gutter={16}>
            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 40, fontSize: '12px' }}>أمين المخزن المُرسِل</div>
              <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: '11px' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 40, fontSize: '12px' }}>مسؤول النقل / السائق</div>
              <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: '11px' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 40, fontSize: '12px' }}>مستلم الفرع / المحل</div>
              <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: '11px' }}>
                التوقيع: .....................
              </div>
            </Col>

            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 40, fontSize: '12px' }}>اعتماد إدارة التشغيل</div>
              <div style={{ borderTop: '1px solid #334155', width: '80%', margin: '0 auto', paddingTop: 4, fontSize: '11px' }}>
                الختم والتوقيع: ............
              </div>
            </Col>
          </Row>
        </div>

        {/* Footer print note */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
          تم إصدار هذا الإذن إلكترونياً عبر منظومة Yoka SWM - تاريخ الطباعة: {dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>

      {/* Print Style Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #dispatch-note-print-area, #dispatch-note-print-area * {
            visibility: visible !important;
          }
          #dispatch-note-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            padding: 10mm 12mm !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
