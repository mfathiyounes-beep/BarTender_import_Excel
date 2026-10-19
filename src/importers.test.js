import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readSpreadsheet } from './importers.js';
import { normalizeTable } from './core.js';

test('imports Excel workbook sheets with headers and accurate raw data', async () => {
  const wb = new ExcelJS.Workbook();
  const products = wb.addWorksheet('Products');
  products.addRow(['Product Name', 'Serial', 'Price', 'Quantity']);
  products.addRow(['Mouse', 1234, 325, 2]);
  products.getCell('B2').numFmt = '000000';
  products.addRow(['Keyboard', '000789', 500, 1]);
  const second = wb.addWorksheet('Stock');
  second.addRow(['SKU', 'Name']);
  second.addRow(['S-01', 'Cable']);

  const data = await wb.xlsx.writeBuffer();
  const file = { name: 'products.xlsx', size: data.byteLength, arrayBuffer: async () => data };
  const sheets = await readSpreadsheet(file);
  assert.equal(sheets.length, 2);
  assert.deepEqual(sheets[0].headers, ['Product Name', 'Serial', 'Price', 'Quantity']);
  assert.equal(sheets[0].records[0].cells[1], '001234');
  assert.equal(sheets[0].records[1].cells[1], '000789');
  assert.equal(sheets[0].records[0].cells[2], '325');
  assert.equal(sheets[1].records[0].cells[0], 'S-01');
});

test('reads formula cached results and rich text without displaying formula source', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Formula');
  ws.addRow(['Description', 'Price']);
  ws.addRow([{ richText: [{ text: 'Great ' }, { text: 'item' }] }, { formula: '200+125', result: 325 }]);
  const data = await wb.xlsx.writeBuffer();
  const file = { name: 'formula.xlsx', size: data.byteLength, arrayBuffer: async () => data };
  const sheets = await readSpreadsheet(file);
  assert.equal(sheets[0].records[0].cells[0], 'Great item');
  assert.equal(sheets[0].records[0].cells[1], '325');
});

test('CSV preserves leading zeros and quoted commas', async () => {
  const csv = 'Name,Code,Price\n"Cable, USB",000123,150\nMouse,000007,325';
  const file = { name: 'items.csv', size: csv.length, text: async () => csv };
  const [sheet] = await readSpreadsheet(file);
  assert.equal(sheet.records[0].cells[0], 'Cable, USB');
  assert.equal(sheet.records[0].cells[1], '000123');
  assert.equal(sheet.records[1].cells[1], '000007');
});

test('re-selecting header row recovers Excel tables with a report title above headers', () => {
  const rows = [['Inventory as of October 2026'], ['', ''], ['Product', 'Price'], ['Cable', '150']];
  const sheet = normalizeTable('Export', rows, 2);
  assert.deepEqual(sheet.headers, ['Product', 'Price']);
  assert.equal(sheet.records[0].id, '4');
  assert.equal(sheet.records[0].cells[0], 'Cable');
});

test('rejects unsupported workbook formats and oversized files', async () => {
  await assert.rejects(() => readSpreadsheet({ name: 'data.xls', size: 100 }), /Only .xlsx and .csv/);
  await assert.rejects(() => readSpreadsheet({ name: 'big.csv', size: 20 * 1024 * 1024 }), /15 MB/);
});
