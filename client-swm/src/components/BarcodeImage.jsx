import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeImage({
  value,
  width = 1.6,
  height = 45,
  displayValue = true,
  fontSize = 13,
  margin = 8,
  lineColor = '#000000',
  background = '#ffffff',
  style = {}
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value || String(value).trim() === '') return;

    const trimmed = String(value).trim();
    // Auto-detect format: if exactly 13 digits and valid EAN, try EAN13, otherwise CODE128
    let format = 'CODE128';
    if (/^\d{13}$/.test(trimmed)) {
      format = 'EAN13';
    } else if (/^\d{12}$/.test(trimmed)) {
      format = 'UPC';
    } else if (/^\d{8}$/.test(trimmed)) {
      format = 'EAN8';
    }

    try {
      JsBarcode(svgRef.current, trimmed, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        margin,
        lineColor,
        background,
        font: 'Cairo, Inter, monospace'
      });
    } catch (err) {
      try {
        // Fallback to CODE128 if EAN13 checksum fails or characters don't match
        JsBarcode(svgRef.current, trimmed, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          lineColor,
          background,
          font: 'Cairo, Inter, monospace'
        });
      } catch (e) {
        console.warn('Barcode fallback generation failed:', e);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin, lineColor, background]);

  if (!value || String(value).trim() === '') {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background,
        borderRadius: 8,
        padding: '4px 8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...style
      }}
    >
      <svg ref={svgRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
    </div>
  );
}
