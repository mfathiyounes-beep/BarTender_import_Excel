import { guessMapping } from './core.js';

export const TEMPLATE_STORAGE_KEY = 'excel-label-studio:text-templates:v1';

export const DEFAULT_TEXT_TEMPLATE = {
  id: 'text-default',
  name: 'Text only · Product label',
  width: 50,
  height: 30,
  fields: [
    { id: 'product', type: 'column', label: 'Product', columnKey: 'Product Name', autoField: 'name', x: 2, y: 3, width: 46, height: 10, fontSize: 15, bold: true, align: 'center', prefix: '', suffix: '' },
    { id: 'price', type: 'column', label: 'Price', columnKey: 'Price', autoField: 'price', x: 2, y: 17, width: 46, height: 9, fontSize: 18, bold: true, align: 'center', prefix: '', suffix: ' EGP' }
  ]
};

export const BUILTIN_TEMPLATES = [
  DEFAULT_TEXT_TEMPLATE,
  {
    id: 'builtin-shelf',
    name: 'Shelf / Stock label',
    width: 70, height: 35,
    fields: [
      { id: 'shelf-title', type: 'text', label: 'Header', text: 'INVENTORY', x: 2, y: 2, width: 66, height: 5, fontSize: 10, bold: true, align: 'center' },
      { id: 'shelf-name', type: 'column', label: 'Product name', columnKey: 'Product Name', x: 2, y: 9, width: 66, height: 12, fontSize: 18, bold: true, align: 'center' },
      { id: 'shelf-price', type: 'column', label: 'Price', columnKey: 'Price', suffix: ' EGP', x: 2, y: 23, width: 66, height: 10, fontSize: 16, bold: true, align: 'center' }
    ]
  },
  {
    id: 'builtin-serial',
    name: 'Serial number label',
    width: 60, height: 25,
    fields: [
      { id: 'serial-title', type: 'column', label: 'Product name', columnKey: 'Product Name', x: 2, y: 2, width: 56, height: 8, fontSize: 13, bold: true, align: 'center' },
      { id: 'serial-value', type: 'column', label: 'Serial', columnKey: 'Serial', prefix: 'SN: ', x: 2, y: 12, width: 56, height: 9, fontSize: 14, bold: true, align: 'center' }
    ]
  },
  {
    id: 'builtin-address',
    name: 'Shipping address',
    width: 100, height: 60,
    fields: [
      { id: 'address-label', type: 'text', label: 'Title', text: 'SHIP TO', x: 4, y: 3, width: 92, height: 7, fontSize: 14, bold: true, align: 'left' },
      { id: 'address-recipient', type: 'column', label: 'Recipient', columnKey: 'Recipient', x: 4, y: 13, width: 92, height: 10, fontSize: 18, bold: true, align: 'left' },
      { id: 'address-street', type: 'column', label: 'Address', columnKey: 'Address', x: 4, y: 26, width: 92, height: 17, fontSize: 14, bold: false, align: 'left' },
      { id: 'address-city', type: 'column', label: 'City', columnKey: 'City', x: 4, y: 46, width: 92, height: 9, fontSize: 13, bold: true, align: 'left' }
    ]
  }
];

export const EXAMPLE_HEADERS = ['Product Name', 'Barcode', 'Price', 'Quantity', 'Description'];
export const EXAMPLE_ROW = { id: 'example', cells: ['Wireless Mouse', '987654321098', '325', '1', '2.4 GHz'] };

export function headerKey(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/[\s_\-–]+/g, ' ');
}

export function resolveColumnIndex(headers, field) {
  if (field?.type !== 'column' || !Array.isArray(headers)) return -1;
  const wanted = headerKey(field.columnKey);
  if (wanted) {
    // Saved bindings are exact: never silently print an unrelated field.
    return headers.findIndex((name) => headerKey(name) === wanted);
  }
  // Legacy templates with no explicit header may still use auto-guessing.
  if (field.autoField) {
    const guessed = guessMapping(headers)[field.autoField];
    if (guessed !== '' && guessed !== undefined) return Number(guessed);
  }
  return -1;
}

export function fieldText(field, headers, record) {
  if (field.type === 'text') return String(field.text ?? '');
  const index = resolveColumnIndex(headers, field);
  if (index < 0) return '';
  const value = record?.cells?.[index];
  if (value === null || value === undefined || String(value).trim() === '') return '';
  return String(field.prefix || '') + String(value) + String(field.suffix || '');
}

export function missingColumns(template, headers) {
  return template.fields.filter((field) => field.type === 'column' && resolveColumnIndex(headers, field) < 0)
    .map((field) => field.label || field.columnKey || 'Unnamed field');
}

export function printableTemplateRecords(records, selected, template, headers) {
  return records.filter((record) => template.fields.length > 0 && selected.has(record.id) &&
    record.cells.some((value) => String(value).trim()) &&
    (template.fields.some((field) => field.type === 'column' && fieldText(field, headers, record).trim()) ||
    template.fields.some((field) => field.type === 'text' && String(field.text || '').trim()) ||
    !template.fields.some((field) => field.type === 'column')));
}

function finiteClamp(value, low, high, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(low, Math.min(high, num)) : fallback;
}

export function sanitizeTemplate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const width = finiteClamp(candidate.width, 20, 150, 50);
  const height = finiteClamp(candidate.height, 15, 200, 30);
  const rawFields = Array.isArray(candidate.fields) ? candidate.fields : [];
  if (rawFields.length > 30) return null;
  const fields = rawFields.map((item, index) => {
    const src = item && typeof item === 'object' ? item : {};
    const x = finiteClamp(src.x, 0, width - 1, 2);
    const y = finiteClamp(src.y, 0, height - 1, 2);
    return {
      id: String(src.id || 'field-' + index).slice(0, 80),
      type: src.type === 'text' ? 'text' : 'column',
      label: String(src.label ?? 'Field').slice(0, 80),
      columnKey: String(src.columnKey || '').slice(0, 150),
      autoField: ['name', 'price', 'barcode', 'quantity', 'description'].includes(src.autoField) ? src.autoField : '',
      text: String(src.text || '').slice(0, 300),
      prefix: String(src.prefix || '').slice(0, 60),
      suffix: String(src.suffix || '').slice(0, 60),
      x, y,
      width: finiteClamp(src.width, 1, width - x, Math.max(1, width - x)),
      height: finiteClamp(src.height, 1, height - y, 5),
      fontSize: finiteClamp(src.fontSize, 6, 36, 12),
      bold: Boolean(src.bold),
      italic: Boolean(src.italic),
      underline: Boolean(src.underline),
      fontFamily: ['Arial', 'Tahoma', 'Segoe UI', 'Consolas', 'Times New Roman'].includes(src.fontFamily)
        ? src.fontFamily : 'Arial',
      wrap: src.wrap !== false,
      rotation: [0, 90, 180, 270].includes(Number(src.rotation)) ? Number(src.rotation) : 0,
      align: ['left', 'center', 'right'].includes(src.align) ? src.align : 'center'
    };
  });
  return {
    id: String(candidate.id || 'template').slice(0, 100),
    name: String(candidate.name || 'My template').slice(0, 100),
    width, height, fields
  };
}

export function generateTemplateId() {
  return 'template-' + (globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + Math.random().toString(36).slice(2));
}
