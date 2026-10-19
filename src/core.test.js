import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTable, guessMapping, cellValue, copyCount, makeBatch,
  isValidEAN, escapeHtml, printableRecords, totalLabels
} from './core.js';

test('normalization removes empty rows and disambiguates duplicate headers', () => {
  const sheet = normalizeTable('Products', [
    ['Name', 'Barcode', 'Barcode'],
    ['Cable', '000123', 'A'],
    ['', '', ''],
    ['Mouse', '000456', 'B']
  ]);
  assert.deepEqual(sheet.headers, ['Name', 'Barcode', 'Barcode (2)']);
  assert.equal(sheet.records.length, 2);
  assert.equal(sheet.records[0].cells[1], '000123');
});
test('mapping guesses product fields including Arabic', () => {
  assert.deepEqual(guessMapping(['الصنف', 'Barcode', 'السعر', 'كمية', 'الوصف']), {
    name: '0', barcode: '1', price: '2', quantity: '3', description: '4'
  });
});
test('quantities, selections, and batches handle offsets', () => {
  const sheet = normalizeTable('S', [
    ['name', 'code', 'qty'], ['A', 'AAA', '2'], ['B', 'BBB', '3'], ['C', '', '8']
  ]);
  const map = { name: '0', barcode: '1', price: '', quantity: '2', description: '' };
  const rows = printableRecords(sheet.records, new Set(sheet.records.map((r) => r.id)), map);
  assert.equal(rows.length, 2);
  assert.equal(cellValue(rows[0], map.barcode), 'AAA');
  assert.equal(copyCount(rows[0], map, true), 2);
  assert.equal(totalLabels(rows, map, true), 5);
  assert.deepEqual(makeBatch(rows, map, true, 1, 3).map((r) => r.cells[0]), ['A', 'B', 'B']);
});
test('EAN-13 checksum validation', () => {
  assert.equal(isValidEAN('4006381333931'), true);
  assert.equal(isValidEAN('4006381333930'), false);
  assert.equal(isValidEAN('400638133393'), true);
  assert.equal(isValidEAN('hello'), false);
});
test('HTML output escapes imported spreadsheet data', () => {
  assert.equal(escapeHtml('<script a="b">&</script>'), '&lt;script a=&quot;b&quot;&gt;&amp;&lt;/script&gt;');
});
