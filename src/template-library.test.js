import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATE_BACKUP_KEY, TEMPLATE_LIBRARY_KIND, TEMPLATE_LIBRARY_VERSION,
  readTemplateLibrary, writeTemplateLibrary, validateLibraryImport,
  exportTemplateLibrary
} from './template-library.js';
import { TEMPLATE_STORAGE_KEY, DEFAULT_TEXT_TEMPLATE } from './templates.js';

function storage(initial = {}, rejectWrites = false) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem(key, value) {
      if (rejectWrites) throw new Error('Quota exceeded');
      values.set(key, String(value));
    },
    values
  };
}
const template = (id, name = 'My label') => ({ ...DEFAULT_TEXT_TEMPLATE, id, name });

test('legacy template arrays migrate to versioned storage without losing data', () => {
  const disk = storage({ [TEMPLATE_STORAGE_KEY]: JSON.stringify([template('my-old')]) });
  assert.deepEqual(readTemplateLibrary(disk).templates.map((x) => x.id), ['my-old']);
  writeTemplateLibrary(disk, [template('my-old'), template('another')]);
  const current = JSON.parse(disk.getItem(TEMPLATE_STORAGE_KEY));
  assert.equal(current.kind, TEMPLATE_LIBRARY_KIND);
  assert.equal(current.version, TEMPLATE_LIBRARY_VERSION);
  assert.deepEqual(current.templates.map((x) => x.id), ['my-old', 'another']);
  assert.equal(JSON.parse(disk.getItem(TEMPLATE_BACKUP_KEY))[0].id, 'my-old');
});

test('previous-good copy recovers when latest library is damaged', () => {
  const disk = storage();
  writeTemplateLibrary(disk, [template('one')]);
  writeTemplateLibrary(disk, [template('one'), template('two')]);
  disk.setItem(TEMPLATE_STORAGE_KEY, '{garbled');
  const loaded = readTemplateLibrary(disk);
  assert.equal(loaded.recovered, true);
  assert.equal(loaded.blocked, false);
  assert.deepEqual(loaded.templates.map((x) => x.id), ['one']);
  writeTemplateLibrary(disk, loaded.templates);
  assert.equal(readTemplateLibrary(disk).templates[0].id, 'one');
});

test('primary and backup corruption never silently discards saved templates', () => {
  const disk = storage({
    [TEMPLATE_STORAGE_KEY]: '{bad',
    [TEMPLATE_BACKUP_KEY]: '{also-bad'
  });
  assert.equal(readTemplateLibrary(disk).blocked, true);
  assert.throws(() => writeTemplateLibrary(disk, [template('new')]), /Cannot save/);
  assert.equal(disk.getItem(TEMPLATE_STORAGE_KEY), '{bad');
});

test('storage quota failures preserve previously committed library', () => {
  const disk = storage();
  writeTemplateLibrary(disk, [template('old')]);
  const before = disk.getItem(TEMPLATE_STORAGE_KEY);
  const restricted = { getItem: disk.getItem, setItem: () => { throw Error('Quota exceeded'); } };
  assert.throws(() => writeTemplateLibrary(restricted, [template('new')]), /Quota exceeded/);
  assert.equal(disk.getItem(TEMPLATE_STORAGE_KEY), before);
});

test('valid library exports/imports round trip but reject bad version', () => {
  const raw = exportTemplateLibrary([template('my-001')]);
  const restored = validateLibraryImport(JSON.parse(JSON.stringify(raw)));
  assert.equal(restored.length, 1);
  assert.equal(restored[0].name, 'My label');
  assert.throws(() => validateLibraryImport({ ...raw, version: 999 }), /Unsupported/);
});

test('built-in IDs and duplicate IDs cannot overwrite user templates', () => {
  assert.throws(() => exportTemplateLibrary([template('text-default')]), /invalid or duplicate/);
  assert.throws(() => exportTemplateLibrary([template('duplicate'), template('duplicate')]), /invalid or duplicate/);
});

test('never persist more than fifty templates', () => {
  const tooMany = Array.from({ length: 51 }, (_, i) => template('id-' + i));
  assert.throws(() => exportTemplateLibrary(tooMany), /oversized/);
});

test('empty new installation returns a writable empty collection', () => {
  const current = readTemplateLibrary(storage());
  assert.deepEqual(current.templates, []);
  assert.equal(current.blocked, false);
  assert.equal(current.warning, '');
});
