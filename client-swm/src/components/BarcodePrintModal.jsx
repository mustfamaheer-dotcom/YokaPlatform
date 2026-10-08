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
import BarcodeImage from './BarcodeImage';
import { printHtmlContent } from '../utils/printUtils';

const { Text, Title } = Typography;

export default function BarcodePrintModal({
  open,
  onClose,
  invoiceData = null,
  itemsData = []
}) {
  const [printList, setPrintList] = useState([]);
  const [showPrice, setShowPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [stickerSize, setStickerSize] = useState('38x25'); // '38x25' | '50x30' | 'sheet'

  // Extract all variant rows from items
  useEffect(() => {
    if (!open) return;

    const list = [];
    const sourceItems = itemsData.length > 0 ? itemsData : (invoiceData?.items || []);

    sourceItems.forEach((it, itIdx) => {
      const prodName = it.product_name || `صنف #${it.product_id}`;
      const baseBarcode = it.barcode || it.product_code || '';

      if (it.variantRows && Array.isArray(it.variantRows) && it.variantRows.length > 0) {
        it.variantRows.forEach((v, vIdx) => {
          const qty = parseInt(v.quantity, 10);
          if (qty > 0 && v.enabled !== false) {
            list.push({
              key: `${itIdx}-${vIdx}-${v.sku || v.variant_id || Math.random()}`,
              product_name: prodName,
              color: v.color || '',
              size: v.size || '',
              barcode: v.barcode || v.sku || baseBarcode || `BC-${Date.now()}`,
              price: parseFloat(v.selling_price) || parseFloat(it.selling_price) || 0,
              quantity: qty,
              selected: true
            });
          }
        });
      } else if (it.quantity && parseInt(it.quantity, 10) > 0) {
        // Flat invoice item without variantRows
        list.push({
          key: `${itIdx}-${it.id || Math.random()}`,
          product_name: prodName,
          color: it.color || '',
          size: it.size || '',
          barcode: it.barcode || it.product_code || baseBarcode || `BC-${Date.now()}`,
          price: parseFloat(it.selling_price) || 0,
          quantity: parseInt(it.quantity, 10),
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

  // Generate printable HTML for thermal barcode printers or sheet
  const handlePrint = () => {
    const activeItems = printList.filter(item => item.selected && item.quantity > 0);
    if (activeItems.length === 0) return;

    let stickersHtml = '';

    activeItems.forEach(item => {
      const count = parseInt(item.quantity, 10) || 1;
      const cleanBarcode = String(item.barcode).trim();
      const variantDesc = [item.color ? `اللون: ${item.color}` : '', item.size ? `المقاس: ${item.size}` : ''].filter(Boolean).join(' | ');

      for (let i = 0; i < count; i++) {
        stickersHtml += `
          <div class="barcode-sticker ${stickerSize}">
            ${showStoreName ? '<div class="sticker-store">YOKA STORE</div>' : ''}
            <div class="sticker-name">${item.product_name}</div>
            ${variantDesc ? `<div class="sticker-variant">${variantDesc}</div>` : ''}
            <div class="sticker-barcode-box">
              <svg class="barcode-svg" jsbarcode-value="${cleanBarcode}" jsbarcode-format="CODE128" jsbarcode-width="1.3" jsbarcode-height="26" jsbarcode-fontsize="10" jsbarcode-margin="2"></svg>
            </div>
            ${showPrice && item.price > 0 ? `<div class="sticker-price">السعر: ${item.price.toLocaleString()} ج.م</div>` : ''}
          </div>
        `;
      }
    });

    const isThermal38 = stickerSize === '38x25';
    const isThermal50 = stickerSize === '50x30';

    const customCss = `
      @page {
        size: ${isThermal38 ? '38mm 25mm' : (isThermal50 ? '50mm 30mm' : 'A4 portrait')};
        margin: ${stickerSize === 'sheet' ? '8mm' : '0mm'};
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
        gap: ${stickerSize === 'sheet' ? '3mm' : '0'};
        padding: 0;
        width: 100%;
        max-width: none;
      }

      .barcode-sticker {
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        page-break-after: ${stickerSize === 'sheet' ? 'auto' : 'always'};
        page-break-inside: avoid;
      }

      .barcode-sticker.38x25 {
        width: 38mm;
        height: 25mm;
        padding: 1mm 1.5mm;
      }

      .barcode-sticker.50x30 {
        width: 50mm;
        height: 30mm;
        padding: 1.5mm 2mm;
      }

      .barcode-sticker.sheet {
        width: 48mm;
        height: 28mm;
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        padding: 1.5mm;
      }

      .sticker-store {
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0f172a;
        line-height: 1;
        margin-bottom: 1px;
      }

      .sticker-name {
        font-size: 9px;
        font-weight: 700;
        color: #000000;
        line-height: 1.1;
        max-width: 95%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sticker-variant {
        font-size: 8px;
        font-weight: 600;
        color: #334155;
        line-height: 1;
        margin: 1px 0;
      }

      .sticker-barcode-box {
        margin: 0;
        line-height: 1;
      }

      .sticker-barcode-box svg {
        max-width: 100%;
        height: auto;
        display: block;
      }

      .sticker-price {
        font-size: 9px;
        font-weight: 800;
        color: #000000;
        margin-top: 1px;
        line-height: 1;
      }
    `;

    // Inject JsBarcode script inside printed iframe to auto-render svg
    const htmlWithJsBarcode = `
      ${stickersHtml}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <script>
        window.addEventListener('load', function() {
          try {
            JsBarcode('.barcode-svg').init();
          } catch(e) {
            console.error(e);
          }
        });
      </script>
    `;

    printHtmlContent({
      title: `طباعة ملصقات الباركود (${totalStickersToPrint} ملصق)`,
      htmlContent: htmlWithJsBarcode,
      pageType: stickerSize === 'sheet' ? 'a4' : 'thermal',
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
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>مقاس ورق الملصقات:</div>
              <Radio.Group value={stickerSize} onChange={e => setStickerSize(e.target.value)} size="small">
                <Radio.Button value="38x25">38 × 25 مم (حراري)</Radio.Button>
                <Radio.Button value="50x30">50 × 30 مم (حراري)</Radio.Button>
                <Radio.Button value="sheet">ورق A4 شبكة</Radio.Button>
              </Radio.Group>
            </Col>

            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>خيارات الملصق:</div>
              <Space direction="vertical" size={2}>
                <Checkbox checked={showPrice} onChange={e => setShowPrice(e.target.checked)}>
                  إظهار سعر البيع المقترح
                </Checkbox>
                <Checkbox checked={showStoreName} onChange={e => setShowStoreName(e.target.checked)}>
                  إظهار اسم المتجر (YOKA STORE)
                </Checkbox>
              </Space>
            </Col>

            {/* Live Sticker Preview Card */}
            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                <EyeOutlined style={{ marginLeft: 4 }} />
                معاينة شكل الملصق الحقيقي:
              </div>
              {sampleItem ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px dashed #2563eb',
                    borderRadius: 6,
                    padding: '6px 8px',
                    textAlign: 'center',
                    maxWidth: 190,
                    margin: '0 auto',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {showStoreName && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a', letterSpacing: 0.5 }}>
                      YOKA STORE
                    </div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sampleItem.product_name}
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>
                    {[sampleItem.color ? `اللون: ${sampleItem.color}` : '', sampleItem.size ? `المقاس: ${sampleItem.size}` : ''].filter(Boolean).join(' | ')}
                  </div>
                  <div style={{ margin: '2px 0' }}>
                    <BarcodeImage value={sampleItem.barcode} height={26} width={1.2} fontSize={9} />
                  </div>
                  {showPrice && sampleItem.price > 0 && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#15803d' }}>
                      السعر: {sampleItem.price.toLocaleString()} ج.م
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
                    كود الباركود: <code>{record.barcode}</code>
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
                  style={{ width: 90 }}
                  addonAfter="استيكر"
                />
              )
            }
          ]}
        />
      </div>
    </Modal>
  );
}
