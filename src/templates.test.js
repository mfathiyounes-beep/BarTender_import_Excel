import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEXT_TEMPLATE, EXAMPLE_HEADERS, EXAMPLE_ROW, resolveColumnIndex,
  fieldText, missingColumns, printableTemplateRecords, sanitizeTemplate
} from './templates.js';
import { renderTextLabel, textPrintDocument } from './text-print.js';

test('default label requires no barcode at all', () => {
  assert.equal(DEFAULT_TEXT_TEMPLATE.fields.length, 2);
  const headers = ['Product Name', 'Price'];
  const row = { id: '2', cells: ['Mouse', '325'] };
  const chosen = printableTemplateRecords([row], new Set(['2']), DEFAULT_TEXT_TEMPLATE, headers);
  assert.equal(chosen.length, 1);
  assert.deepEqual(missingColumns(DEFAULT_TEXT_TEMPLATE, headers), []);
  assert.match(renderTextLabel(DEFAULT_TEXT_TEMPLATE, headers, row), /Mouse/);
  assert.match(renderTextLabel(DEFAULT_TEXT_TEMPLATE, headers, row), /325 EGP/);
});

test('saved text fields rebind to moved Excel columns by heading', () => {
  const field = { type: 'column', columnKey: 'Item Name', autoField: '', prefix: 'Item: ', suffix: '' };
  assert.equal(resolveColumnIndex(['Price', 'item  name', 'Quantity'], field), 1);
  assert.equal(fieldText(field, ['Price', 'item  name', 'Quantity'], { cells: ['30', 'Cable', '2'] }), 'Item: Cable');
});

test('if a saved column disappears, never silently substitute another column', () => {
  const saved = { fields: [{ type: 'column', label: 'Serial', columnKey: 'Serial Number', autoField: '' }] };
  assert.deepEqual(missingColumns(saved, ['Price', 'SKU']), ['Serial']);
});

test('Excel values cannot inject markup or CSS through label rendering', () => {
  const template = sanitizeTemplate({
    ...DEFAULT_TEXT_TEMPLATE,
    fields: [{ ...DEFAULT_TEXT_TEMPLATE.fields[0], columnKey: 'Product Name', autoField: '' }]
  });
  const html = renderTextLabel(template, ['Product Name'], { cells: ['<img src=x onerror=alert(1)>'] });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /left:2\.00mm/);
  const print = textPrintDocument([html], template);
  assert.match(print, /@page\{size:50mm 30mm;margin:0\}/);
  assert.match(print, /<article class="text-label"/);
});

test('fixed text plus mapped data print independently in the same position', () => {
  const template = sanitizeTemplate({
    ...DEFAULT_TEXT_TEMPLATE,
    fields: [
      { id: 'static', type: 'text', text: 'MADE IN EGYPT', x: 0, y: 0, width: 50, height: 5 },
      { id: 'dynamic', type: 'column', columnKey: 'Product Name', x: 2, y: 10, width: 40, height: 7 }
    ]
  });
  const html = renderTextLabel(template, ['Product Name'], { cells: ['Cables'] });
  assert.match(html, /MADE IN EGYPT/);
  assert.match(html, /Cables/);
  assert.match(html, /top:10\.00mm/);
});

test('imported or invalid coordinates and font sizes are bounded', () => {
  const template = sanitizeTemplate({
    width: 70, height: 40,
    fields: [{ id: 'a', type: 'column', columnKey: 'Item', x: -100, y: 2000, width: 900, height: 900, fontSize: 500 }]
  });
  const f = template.fields[0];
  assert.equal(f.x, 0);
  assert.ok(f.y <= template.height);
  assert.ok(f.width <= template.width);
  assert.equal(f.fontSize, 36);
});

test('sample preview comes from the exact sample data', () => {
  const html = renderTextLabel(DEFAULT_TEXT_TEMPLATE, EXAMPLE_HEADERS, EXAMPLE_ROW);
  assert.match(html, /Wireless Mouse/);
  assert.match(html, /325 EGP/);
});
