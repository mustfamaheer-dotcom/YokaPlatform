/**
 * High-Quality Modern Print & PDF Utility for Yoka Store Platform
 * Handles A4 Portrait, A4 Landscape, and 80mm Thermal Receipt printing with pixel-perfect alignment.
 */

export function printHtmlContent({
  title = 'مستند يوكا ستور',
  htmlContent = '',
  pageType = 'a4', // 'a4' | 'a4-landscape' | 'thermal'
  customCss = ''
}) {
  const isThermal = pageType === 'thermal';
  const isLandscape = pageType === 'a4-landscape';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('title', title);
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Cannot access iframe document for printing');
    return;
  }

  const printStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: ${isThermal ? '80mm auto' : (isLandscape ? 'A4 landscape' : 'A4 portrait')};
      margin: ${isThermal ? '3mm 4mm' : '8mm 10mm'};
    }

    body {
      font-family: 'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #ffffff;
      font-size: ${isThermal ? '11px' : '12px'};
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-wrapper {
      width: 100%;
      max-width: ${isThermal ? '74mm' : (isLandscape ? '280mm' : '195mm')};
      margin: 0 auto;
      padding: ${isThermal ? '2px 0' : '4px'};
    }

    /* Modern Document Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .doc-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .doc-logo {
      height: 48px;
      max-width: 120px;
      object-fit: contain;
    }

    .doc-brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      letter-spacing: -0.2px;
    }

    .doc-brand-sub {
      font-size: 11.5px;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }

    .doc-brand-meta {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
    }

    .doc-badge-box {
      text-align: left;
    }

    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      padding: 5px 14px;
      border-radius: 6px;
      letter-spacing: -0.2px;
    }

    .doc-badge-danger {
      background: #dc2626 !important;
    }

    .doc-badge-success {
      background: #16a34a !important;
    }

    .doc-badge-blue {
      background: #2563eb !important;
    }

    .doc-ref-text {
      margin-top: 5px;
      font-size: 12px;
      color: #1e293b;
      font-weight: 700;
      font-family: 'Inter', monospace;
    }

    .doc-date-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Meta Info Grids */
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: grid;
      gap: 8px 16px;
    }

    .meta-grid-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .meta-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .meta-grid-4 {
      grid-template-columns: repeat(4, 1fr);
    }

    @media print {
      .meta-grid-2 { grid-template-columns: repeat(2, 1fr); }
      .meta-grid-3 { grid-template-columns: repeat(3, 1fr); }
      .meta-grid-4 { grid-template-columns: repeat(4, 1fr); }
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-item.span-2 {
      grid-column: span 2;
    }

    .meta-item.span-3 {
      grid-column: span 3;
    }

    .meta-item.span-4 {
      grid-column: span 4;
    }

    .meta-label {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 600;
    }

    .meta-val {
      font-size: 12.5px;
      color: #0f172a;
      font-weight: 700;
    }

    /* Table Styles */
    table.print-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: ${isThermal ? '10.5px' : '11.5px'};
    }

    table.print-table thead {
      display: table-header-group;
    }

    table.print-table tr {
      page-break-inside: avoid;
    }

    table.print-table th {
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700;
      padding: 7px 8px;
      border: 1px solid #0f172a;
      text-align: right;
      white-space: nowrap;
    }

    table.print-table th.center, table.print-table td.center {
      text-align: center;
    }

    table.print-table th.left, table.print-table td.left {
      text-align: left;
    }

    table.print-table td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      vertical-align: middle;
    }

    table.print-table tbody tr:nth-child(even) {
      background: #f8fafc !important;
    }

    table.print-table tfoot td {
      background: #f1f5f9 !important;
      font-weight: 700;
      padding: 8px;
      border: 1px solid #94a3b8;
      color: #0f172a;
    }

    .num-cell {
      font-family: 'Inter', monospace;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }

    /* Summary Card */
    .summary-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }

    .summary-card {
      width: ${isThermal ? '100%' : '340px'};
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 11.5px;
      color: #475569;
    }

    .summary-row.total {
      border-top: 2px solid #0f172a;
      margin-top: 6px;
      padding-top: 6px;
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }

    .summary-row.paid {
      color: #16a34a;
      font-weight: 700;
    }

    .summary-row.due {
      color: #dc2626;
      font-weight: 700;
    }

    /* Waybill Specific Elements */
    .waybill-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #ffffff;
    }

    .waybill-carrier-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0284c7;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .waybill-cod-box {
      background: #fef2f2;
      border: 2px dashed #dc2626;
      border-radius: 8px;
      padding: 10px 14px;
      text-align: center;
      margin-bottom: 14px;
    }

    .waybill-cod-amount {
      font-size: 20px;
      font-weight: 900;
      color: #dc2626;
      font-family: 'Inter', sans-serif;
    }

    /* Signatures Section */
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
    }

    .signatures-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .signatures-grid-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .sign-box {
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 55px;
    }

    .sign-role {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 26px;
    }

    .sign-line {
      border-top: 1px solid #475569;
      padding-top: 4px;
      font-size: 10.5px;
      color: #64748b;
    }

    /* Document Footer */
    .doc-footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Thermal Specific Compact Styles */
    .thermal-header {
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #475569;
    }

    .thermal-divider {
      border: 0;
      border-top: 1px dashed #475569;
      margin: 6px 0;
    }

    .badge-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .badge-amber { background: #fef3c7; color: #b45309; }

    /* Barcode Simulator */
    .barcode-line {
      font-family: 'Libre Barcode 128', 'Courier New', monospace;
      font-size: 26px;
      letter-spacing: 2px;
      text-align: center;
      color: #000000;
      margin: 4px 0;
    }

    ${customCss}
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="print-wrapper">
          ${htmlContent}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Wait for images and fonts to render before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }
  }, 400);
}

/**
 * Helper to print a specific DOM element or ref directly
 */
export function printElement(element, options = {}) {
  if (!element) return;
  const content = element.innerHTML || '';
  printHtmlContent({
    title: options.title || 'مستند يوكا ستور',
    htmlContent: content,
    pageType: options.pageType || 'a4',
    customCss: options.customCss || ''
  });
}
