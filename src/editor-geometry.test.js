import test from 'node:test';
import assert from 'node:assert/strict';
import { snapMm, moveField, resizeField } from './editor-geometry.js';

const field = { id: 'product', x: 2, y: 3, width: 35, height: 8 };
test('movement tracks physical millimeters independent of zoom', () => {
  assert.deepEqual(moveField(field, 4.2, 2.2, 50, 30), {
    ...field, x: 6, y: 5
  });
});
test('objects stay entirely inside print page after move', () => {
  const moved = moveField(field, 100, 100, 50, 30);
  assert.equal(moved.x, 15);
  assert.equal(moved.y, 22);
  const negative = moveField(field, -100, -100, 50, 30);
  assert.equal(negative.x, 0);
  assert.equal(negative.y, 0);
});
test('resize adjusts both dimensions with 0.5 mm precision', () => {
  const resized = resizeField(field, 3.8, 1.2, 50, 30);
  assert.equal(resized.width, 39);
  assert.equal(resized.height, 9);
});
test('resize never extends beyond label boundaries', () => {
  const result = resizeField(field, 200, 200, 50, 30);
  assert.equal(result.width, 48);
  assert.equal(result.height, 27);
  const small = resizeField(field, -200, -200, 50, 30);
  assert.equal(small.width, 1);
  assert.equal(small.height, 1);
});
test('5 mm snapping is deterministic for drag and resize', () => {
  assert.equal(snapMm(7.6, 5), 10);
  assert.equal(snapMm(7.4, 5), 5);
  const moved = moveField(field, 5.5, 7.1, 50, 30, 5);
  assert.equal(moved.x, 10);
  assert.equal(moved.y, 10);
  const resized = resizeField(field, 7.1, 7.1, 50, 30, 5);
  assert.equal(resized.width, 40);
  assert.equal(resized.height, 15);
});
test('geometry preserves custom text and data bindings', () => {
  const original = { ...field, columnKey: 'Product Name', prefix: 'SKU:', fontSize: 13 };
  const shifted = moveField(original, 1, 1, 50, 30);
  assert.equal(shifted.columnKey, 'Product Name');
  assert.equal(shifted.prefix, 'SKU:');
  assert.equal(shifted.fontSize, 13);
  assert.equal(original.x, 2);
});
