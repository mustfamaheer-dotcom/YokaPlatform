import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Table,
  InputNumber,
  Checkbox,
  Space,
  Typography,
  Tag,
  Divider,
  Row,
  Col,
  Card,
  Radio,
  Tooltip
} from 'antd';
import {
  PrinterOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  TagsOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Lightbulb } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import BarcodeImage from './BarcodeImage';
import { printHtmlContent } from '../utils/printUtils';
import { generateValidEAN13 } from '../utils/barcode';

const { Text, Title } = Typography;

export const formatStickerHeader = (item) => {
  if (!item) return '';

  let name = String(item.product_name || item.sku || '').trim();
  let color = item.color ? String(item.color).trim() : '';
  let size = item.size ? String(item.size).trim() : '';

  // If color or size is missing, check if they are in parentheses e.g. "اسم الصنف (أسود / XL)"
  const parenMatch = name.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!color && !size) {
      const tokens = inside.split(/[\/\-–]/).map(t => t.trim()).filter(Boolean);
      if (tokens.length >= 2) {
        color = tokens[0];
        size = tokens[1];
      } else if (tokens.length === 1) {
        color = tokens[0];
      }
    }
  }

  const parts = [name, color, size].filter(Boolean);
  return parts.join(' - ');
};

export default function BarcodePrintModal({
  open,
  onClose,
  invoiceData = null,
  itemsData = []
}) {
  const [printList, setPrintList] = useState([]);
  const stickerSize = '38x25'; // Standard thermal sticker roll size (38mm x 25mm)

  // Extract all variant rows from items
  useEffect(() => {
    if (!open) return;

    const list = [];
    const sourceItems = itemsData.length > 0 ? itemsData : (invoiceData?.items || []);

    const resolveNumericBarcode = (primary, fallback, idSeed = null) => {
      const p = String(primary || '').trim();
      if (/^\d{12,14}$/.test(p)) return p;
      const f = String(fallback || '').trim();
      if (/^\d{12,14}$/.test(f)) return f;
      if (p) return p;
      if (f) return f;
      return generateValidEAN13('622');
    };

    sourceItems.forEach((it, itIdx) => {
      const prodName = it.product_name || `صنف #${it.product_id}`;
      const baseBarcode = it.barcode || it.product_barcode || '';

      if (it.variantRows && Array.isArray(it.variantRows) && it.variantRows.length > 0) {
        it.variantRows.forEach((v, vIdx) => {
          const rawQty = parseInt(v.quantity, 10);
          const qty = (!isNaN(rawQty) && rawQty > 0) ? rawQty : (parseInt(it.quantity, 10) || 1);
          if (v.enabled !== false) {
            const finalBarcode = resolveNumericBarcode(v.barcode, baseBarcode, v.variant_id || v.id);
            list.push({
              key: `${itIdx}-${vIdx}-${v.sku || v.variant_sku || v.variant_id || v.id || Math.random()}`,
              product_name: prodName,
              sku: v.sku || v.variant_sku || it.product_code || '',
              color: v.color || it.color || '',
              size: v.size || it.size || '',
              barcode: finalBarcode,
              price: parseFloat(v.selling_price) || parseFloat(it.selling_price) || 0,
              quantity: qty,
              selected: true
            });
          }
        });
      } else {
        // Flat invoice item without variantRows
        const qty = parseInt(it.quantity, 10) || 1;
        const finalBarcode = resolveNumericBarcode(it.barcode || it.variant_barcode, it.product_barcode || baseBarcode, it.id || it.product_id);
        list.push({
          key: `${itIdx}-${it.id || it.product_id || Math.random()}`,
          product_name: prodName,
          sku: it.variant_sku || it.sku || it.product_code || '',
          color: it.color || '',
          size: it.size || '',
          barcode: finalBarcode,
          price: parseFloat(it.selling_price) || 0,
          quantity: qty,
          selected: true
        });
      }
    });

    setPrintList(list);
  }, [open, itemsData, invoiceData]);

  const handleUpdateItem = (key, field, val) => {
    setPrintList(prev => prev.map(item => item.key === key ? { ...item, [field]: val } : item));
  };

  const handleSelectAll = (checked) => {
    setPrintList(prev => prev.map(item => ({ ...item, selected: checked })));
  };

  const totalStickersToPrint = printList
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);

  // Generate printable HTML for standard thermal barcode printer (35x25 mm)
  const handlePrint = () => {
    const activeItems = printList.filter(item => item.selected && item.quantity > 0);
    if (activeItems.length === 0) return;

    // Generates high-density vector barcode SVG calibrated for 38x25mm thermal print resolution
    const generateBarcodeSvgHtml = (barcodeVal) => {
      const clean = String(barcodeVal || '').trim();
      if (!clean) return '';

      // Dimensions calibrated for 38x25mm physical label width and header + price layout
      const barWidth = 1.55;
      const barHeight = 44;
      const fontSize = 10;

      let format = 'CODE128';
      if (/^\d{13}$/.test(clean)) {
        format = 'EAN13';
      } else if (/^\d{12}$/.test(clean)) {
        format = 'UPC';
      } else if (/^\d{8}$/.test(clean)) {
        format = 'EAN8';
      }

      const renderSvg = (targetFormat) => {
        const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svgNode, clean, {
          format: targetFormat,
          width: barWidth,
          height: barHeight,
          displayValue: true,
          fontSize,
          margin: 1,
          textMargin: 0.5,
          font: 'Cairo, Inter, monospace'
        });
        // Remove fixed px attributes so SVG scales cleanly within the designated physical container
        svgNode.removeAttribute('width');
        svgNode.removeAttribute('height');
        svgNode.setAttribute('class', 'barcode-svg');
        return svgNode.outerHTML;
      };

      try {
        return renderSvg(format);
      } catch (err) {
        try {
          return renderSvg('CODE128');
        } catch (e) {
          console.warn('Barcode SVG generation error:', e);
          return `<svg class="barcode-svg" jsbarcode-value="${clean}" jsbarcode-format="CODE128" jsbarcode-width="${barWidth}" jsbarcode-height="${barHeight}" jsbarcode-fontsize="${fontSize}" jsbarcode-margin="1" jsbarcode-textmargin="0.5"></svg>`;
        }
      }
    };

    let stickersHtml = '';

    activeItems.forEach(item => {
      const count = parseInt(item.quantity, 10) || 1;
      const cleanBarcode = String(item.barcode).trim();
      const barcodeSvgHtml = generateBarcodeSvgHtml(cleanBarcode);
      const headerText = formatStickerHeader(item);
      const priceText = item.price > 0 ? `${item.price.toLocaleString()} ج.م` : '';

      for (let i = 0; i < count; i++) {
        stickersHtml += `
          <div class="barcode-sticker">
            ${headerText ? `<div class="sticker-header" title="${headerText}">${headerText}</div>` : ''}
            <div class="sticker-barcode-box">
              ${barcodeSvgHtml}
            </div>
            ${priceText ? `<div class="sticker-price">${priceText}</div>` : ''}
          </div>
        `;
      }
    });

    const customCss = `
      @page {
        size: 38mm 25mm;
        margin: 0mm;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
        direction: rtl;
        text-align: center;
        background: #ffffff;
      }

      .print-wrapper {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 0;
        padding: 0;
        width: 100%;
        max-width: none;
      }

      .barcode-sticker {
        width: 38mm;
        height: 25mm;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        text-align: center;
        margin: 0 auto;
        padding: 0.8mm 1mm 1mm 1mm;
        page-break-after: always;
        page-break-inside: avoid;
      }

      .sticker-header {
        font-size: 7.5pt;
        font-weight: 700;
        color: #000000;
        max-width: 36mm;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.15;
        margin: 0 auto 0.4mm auto;
        direction: rtl;
        text-align: center;
      }

      .sticker-barcode-box {
        margin: 0;
        line-height: 1;
        width: 100%;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        overflow: hidden;
      }

      .sticker-barcode-box svg {
        width: 98%;
        max-width: 36mm;
        height: 13.5mm !important;
        max-height: 14mm;
        display: block;
        margin: 0 auto;
      }

      .sticker-price {
        font-size: 9.5pt;
        font-weight: 900;
        color: #000000;
        margin-top: 0.4mm;
        line-height: 1;
        text-align: center;
        letter-spacing: 0.5px;
      }
    `;

    // Inject fallback script in case any non-hydrated svg is present
    const htmlWithJsBarcode = `
      ${stickersHtml}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.addEventListener('load', function() {
          try {
            if (typeof JsBarcode !== 'undefined') {
              JsBarcode('.barcode-svg:empty').init();
            }
          } catch(e) {
            console.error(e);
          }
        });
      </script>
    `;

    printHtmlContent({
      title: `طباعة ملصقات الباركود (${totalStickersToPrint} ملصق)`,
      htmlContent: htmlWithJsBarcode,
      pageType: 'thermal',
      customCss
    });
  };

  const sampleItem = printList.find(i => i.selected) || printList[0];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '96%' }}>
          <Space align="middle">
            <BarcodeOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>طباعة ملصقات الباركود للقطع المستلمة (Barcode Labels)</span>
          </Space>
          <Tag color="blue" style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px' }}>
            إجمالي الملصقات: {totalStickersToPrint} ملصق
          </Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={860}
      footer={[
        <Button key="cancel" onClick={onClose}>إلغاء</Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          disabled={totalStickersToPrint === 0}
          onClick={handlePrint}
          className="btn-print"
          style={{ backgroundColor: '#0B0F17', color: '#DFCA95', borderColor: '#C8A45C', fontWeight: 700, height: 38 }}
        >
          طباعة {totalStickersToPrint} ملصق باركود الآن
        </Button>
      ]}
      destroyOnHidden
    >
      <div style={{ padding: '4px 0' }}>
        {/* Controls Row */}
        <Card size="small" style={{ background: '#f8fafc', marginBottom: 14, borderRadius: 8, borderColor: '#e2e8f0' }}>
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>مقاس ورق الملصقات:</div>
              <Tag
                color="gold"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 6,
                  borderColor: '#C8A45C',
                  color: '#0B0F17',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                🏷️ 38 × 25 مم (حراري موحد)
              </Tag>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                باركود عملاق يملأ مساحة الملصق لأسرع قراءة بالماسح
              </div>
            </Col>

            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>تنسيق الملصق:</div>
              <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#334155' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>🏷️ بيانات كاملة بالملصق</div>
                <div>في الأعلى <strong>الموديل - اللون - المقاس</strong>، وفي المنتصف <strong>الباركود</strong>، وفي الأسفل <strong>السعر</strong>.</div>
              </div>
            </Col>

            {/* Live Sticker Preview Card */}
            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                <EyeOutlined style={{ marginLeft: 4 }} />
                معاينة شكل الملصق (38 × 25 مم):
              </div>
              {sampleItem ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px dashed #2563eb',
                    borderRadius: 6,
                    padding: '6px 8px 5px 8px',
                    textAlign: 'center',
                    width: 190,
                    height: 125,
                    margin: '0 auto',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#0f172a',
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                      width: '100%',
                      direction: 'rtl'
                    }}
                    title={formatStickerHeader(sampleItem)}
                  >
                    {formatStickerHeader(sampleItem) || 'اسم الصنف - اللون - المقاس'}
                  </div>

                  <div style={{ margin: '0', width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <BarcodeImage
                      value={sampleItem.barcode}
                      height={40}
                      width={1.35}
                      fontSize={10}
                      margin={1}
                    />
                  </div>
                  {sampleItem.price > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#000000', lineHeight: 1, marginTop: 2 }}>
                      {sampleItem.price.toLocaleString()} ج.م
                    </div>
                  )}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>لا توجد عناصر للمعاينة</Text>
              )}
            </Col>
          </Row>
        </Card>

        {/* Selection Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Button
              size="small"
              icon={printList.every(i => i.selected) ? <BorderOutlined /> : <CheckSquareOutlined />}
              onClick={() => handleSelectAll(!printList.every(i => i.selected))}
            >
              {printList.every(i => i.selected) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              عدد التركيبات: {printList.length} | عدد القطع الإجمالي: {totalStickersToPrint} قطعة
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Lightbulb size={12} /> يتم تعيين عدد الملصقات تلقائياً بناءً على عدد القطع المشتراة في الفاتورة.
          </Text>
        </div>

        {/* Variants List Table */}
        <Table
          size="small"
          dataSource={printList}
          rowKey="key"
          pagination={{ pageSize: 8 }}
          bordered
          columns={[
            {
              title: 'تضمين',
              dataIndex: 'selected',
              key: 'selected',
              width: 60,
              align: 'center',
              render: (selected, record) => (
                <Checkbox
                  checked={selected}
                  onChange={e => handleUpdateItem(record.key, 'selected', e.target.checked)}
                />
              )
            },
            {
              title: 'اسم الصنف / الموديل',
              dataIndex: 'product_name',
              key: 'product_name',
              render: (name, record) => (
                <div>
                  <Text strong style={{ fontSize: 13 }}>{name}</Text>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    الباركود: <code style={{ color: '#097', fontWeight: 600 }}>{record.barcode}</code>
                    {record.sku ? <span style={{ marginRight: 8, color: '#64748b' }}>| كود: <strong>{record.sku}</strong></span> : null}
                  </div>
                </div>
              )
            },
            {
              title: 'اللون',
              dataIndex: 'color',
              key: 'color',
              width: 110,
              render: (col) => col ? <Tag color="purple">{col}</Tag> : <Text type="secondary">—</Text>
            },
            {
              title: 'المقاس',
              dataIndex: 'size',
              key: 'size',
              width: 90,
              render: (s) => s ? <Tag color="blue" style={{ fontWeight: 600 }}>{s}</Tag> : <Text type="secondary">—</Text>
            },
            {
              title: 'سعر البيع',
              dataIndex: 'price',
              key: 'price',
              width: 100,
              render: (p) => p > 0 ? `${parseFloat(p).toLocaleString()} ج.م` : '—'
            },
            {
              title: 'عدد الملصقات (القطع)',
              dataIndex: 'quantity',
              key: 'quantity',
              width: 140,
              align: 'center',
              render: (qty, record) => (
                <InputNumber
                  min={1}
                  max={9999}
                  value={qty}
                  disabled={!record.selected}
                  onChange={val => handleUpdateItem(record.key, 'quantity', val || 1)}
                  style={{ width: 100 }}
                  suffix="ملصق"
                />
              )
            }
          ]}
        />
      </div>
    </Modal>
  );
}
