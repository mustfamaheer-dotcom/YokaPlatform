import React, { useState, useEffect } from 'react';
import { Checkbox, InputNumber, Table, Tag, Space, Typography, Card } from 'antd';

const { Text } = Typography;

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_COLORS = ['Black', 'White', 'Navy', 'Red', 'Green', 'Beige', 'Grey'];

export default function VariantMatrix({ productCode = 'PRD', basePrice = 0, onChange }) {
  const [selectedSizes, setSelectedSizes] = useState(['M', 'L', 'XL']);
  const [selectedColors, setSelectedColors] = useState(['Black', 'Navy']);
  const [modifiers, setModifiers] = useState({});

  useEffect(() => {
    // Generate Cartesian product of Colors x Sizes
    const variants = selectedColors.flatMap((color) =>
      selectedSizes.map((size) => {
        const key = `${color}-${size}`;
        const priceModifier = modifiers[key] || 0;
        const sku = `${productCode || 'PRD'}-${color.toUpperCase().slice(0, 3)}-${size}`;
        return {
          key,
          sku,
          color,
          size,
          price_modifier: priceModifier,
          final_price: Number(basePrice || 0) + Number(priceModifier)
        };
      })
    );

    if (onChange) {
      onChange(variants);
    }
  }, [selectedColors, selectedSizes, modifiers, productCode, basePrice]);

  const handleModifierChange = (key, val) => {
    setModifiers((prev) => ({
      ...prev,
      [key]: val || 0
    }));
  };

  const columns = [
    {
      title: 'اللون (Color)',
      dataIndex: 'color',
      key: 'color',
      render: (color) => <Tag color="blue">{color}</Tag>
    },
    {
      title: 'المقاس (Size)',
      dataIndex: 'size',
      key: 'size',
      render: (size) => <Tag color="green">{size}</Tag>
    },
    {
      title: 'رمز الصنف (SKU)',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku) => <Text code>{sku}</Text>
    },
    {
      title: 'فارق السعر (Modifier)',
      dataIndex: 'price_modifier',
      key: 'price_modifier',
      render: (_, record) => (
        <InputNumber
          size="middle"
          value={modifiers[record.key] || 0}
          prefix="+"
          suffix="ج.م"
          onChange={(val) => handleModifierChange(record.key, val)}
          style={{ width: 130 }}
        />
      )
    },
    {
      title: 'السعر النهائي',
      key: 'final_price',
      render: (_, record) => {
        const mod = modifiers[record.key] || 0;
        const total = (Number(basePrice) || 0) + Number(mod);
        return <Text strong style={{ color: '#16a34a' }}>{total.toFixed(2)} ج.م</Text>;
      }
    }
  ];

  const dataSource = selectedColors.flatMap((color) =>
    selectedSizes.map((size) => ({
      key: `${color}-${size}`,
      color,
      size,
      sku: `${productCode || 'PRD'}-${color.toUpperCase().slice(0, 3)}-${size}`
    }))
  );

  return (
    <Card
      size="small"
      title="مصفوفة المتغيرات (Variant Matrix Generator)"
      style={{ marginTop: 12, backgroundColor: '#fafafa', border: '1px solid #e5e7eb' }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>
          1. المقاسات المتاحة (Sizes):
        </Text>
        <Checkbox.Group
          options={DEFAULT_SIZES}
          value={selectedSizes}
          onChange={(vals) => setSelectedSizes(vals)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>
          2. الألوان المتاحة (Colors):
        </Text>
        <Checkbox.Group
          options={DEFAULT_COLORS}
          value={selectedColors}
          onChange={(vals) => setSelectedColors(vals)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text type="secondary">
            إجمالي المتغيرات المتولدة تلقائياً: <strong>{dataSource.length}</strong> صنف
          </Text>
        </div>
        <Table
          size="small"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ y: 220 }}
          bordered
        />
      </div>
    </Card>
  );
}
