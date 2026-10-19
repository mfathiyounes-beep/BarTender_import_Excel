export const COLUMN_FIELDS = ['name', 'barcode', 'price', 'quantity', 'description'];
export const PRINT_BATCH_SIZE = 100;

export function normalizeTable(name, rows, chosenHeaderIndex = null) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const headIndex = Number.isInteger(chosenHeaderIndex) && chosenHeaderIndex >= 0
    ? chosenHeaderIndex
    : rows.findIndex((row) =>
      Array.isArray(row) && row.some((value) => String(value ?? '').trim()));
  if (headIndex < 0 || headIndex >= rows.length) return null;
  const headRow = rows[headIndex] || [];
  // A blank header must not silently discard populated cells to its right.
  const width = Math.min(40, Math.max(1, ...rows.slice(headIndex, headIndex + 201)
    .map((row) => Array.isArray(row) ? row.length : 0)));
  const used = new Map();
  const headers = Array.from({ length: width }, (_, i) => {
    let title = String(headRow[i] ?? '').trim() || 'Column ' + (i + 1);
    const seen = used.get(title.toLowerCase()) || 0;
    used.set(title.toLowerCase(), seen + 1);
    if (seen) title += ' (' + (seen + 1) + ')';
    return title;
  });
  const records = rows.slice(headIndex + 1, headIndex + 10001)
    .map((cells, i) => ({
      id: String(headIndex + 2 + i),
      cells: Array.from({ length: width }, (_, c) => String(cells?.[c] ?? '').trim())
    }))
    .filter(({ cells }) => cells.some(Boolean));
  const originalNames = headRow.slice(0, width).map((value) => String(value ?? '').trim().toLowerCase());
  const duplicateHeaders = originalNames.filter((value, index) =>
    value && originalNames.indexOf(value) !== index);
  return { name, headers, records, headerRow: headIndex + 1,
    duplicateHeaders: [...new Set(duplicateHeaders)] };
}

export function guessMapping(headers) {
  const phrases = {
    name: ['product name', 'product', 'item name', 'item', 'name', 'title', 'اسم المنتج', 'المنتج', 'الصنف', 'اسم'],
    barcode: ['barcode', 'bar code', 'ean', 'upc', 'sku', 'product code', 'code', 'باركود', 'باركود المنتج', 'الكود', 'كود'],
    price: ['price', 'sale price', 'selling price', 'unit price', 'السعر', 'سعر', 'الثمن'],
    quantity: ['quantity', 'copies', 'qty', 'count', 'الكمية', 'كمية', 'عدد'],
    description: ['description', 'details', 'notes', 'الوصف', 'وصف', 'ملاحظات']
  };
  const result = {};
  for (const [field, terms] of Object.entries(phrases)) {
    const h = headers.findIndex((name) =>
      terms.includes(String(name).toLowerCase().trim()));
    result[field] = h < 0 ? '' : String(h);
  }
  return result;
}

export function cellValue(record, mappingIndex) {
  if (mappingIndex === '' || mappingIndex === undefined || mappingIndex === null) return '';
  const i = Number(mappingIndex);
  return Number.isInteger(i) && i >= 0 ? String(record?.cells?.[i] ?? '') : '';
}

export function copyCount(record, mapping, useQuantity) {
  if (!useQuantity || mapping.quantity === '') return 1;
  const str = cellValue(record, mapping.quantity).trim();
  // Never reinterpret "0" as one copy: that would print unwanted labels.
  if (!str) return 0;
  const n = Number(str);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 1000) : 0;
}

export function printableRecords(records, selected, mapping) {
  return records.filter((row) => selected.has(row.id) && cellValue(row, mapping.barcode).trim());
}

export function totalLabels(records, mapping, useQuantity) {
  return records.reduce((sum, row) => sum + copyCount(row, mapping, useQuantity), 0);
}

export function makeBatch(records, mapping, useQuantity, start, limit = PRINT_BATCH_SIZE) {
  const batch = [];
  let offset = 0;
  for (const record of records) {
    const copies = copyCount(record, mapping, useQuantity);
    if (offset + copies <= start) { offset += copies; continue; }
    const begin = Math.max(0, start - offset);
    for (let i = begin; i < copies && batch.length < limit; i++) batch.push(record);
    offset += copies;
    if (batch.length >= limit) break;
  }
  return batch;
}

export function isValidEAN(value) {
  if (!/^\d{12,13}$/.test(value)) return false;
  if (value.length === 12) return true;
  const digits = [...value].map(Number);
  const sum = digits.slice(0, 12).reduce((n, d, i) => n + d * (i % 2 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === digits[12];
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
