import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileSpreadsheet, UploadCloud, Printer, Search, Settings2, CheckCircle2,
  AlertCircle, ChevronLeft, ChevronRight, LayoutTemplate, Table2,
  ShieldCheck, Eye, ArrowRight, Info, Plus, Save, Trash2,
  Download, FolderOpen, Move, Type, Columns3, Undo2, Redo2, ZoomIn, ZoomOut, Grid2X2, ArrowDownUp
} from 'lucide-react';
import { readSpreadsheet } from './importers.js';
import { normalizeTable, guessMapping, totalLabels, makeBatch, PRINT_BATCH_SIZE } from './core.js';
import {
  DEFAULT_TEXT_TEMPLATE, BUILTIN_TEMPLATES, EXAMPLE_HEADERS, EXAMPLE_ROW, TEMPLATE_STORAGE_KEY,
  headerKey, resolveColumnIndex, fieldText, missingColumns,
  printableTemplateRecords, sanitizeTemplate, generateTemplateId
} from './templates.js';
import { renderTextLabel, textPrintDocument, textLabelStyles, browserPrint } from './text-print.js';
import './styles.css';

const EXAMPLE_ROWS = [
  ['Product Name', 'Barcode', 'Price', 'Quantity', 'Description'],
  ['Wireless Mouse', '987654321098', '325', '1', '2.4 GHz'],
  ['USB-C Cable', '123456789012', '150', '2', 'Braided cable'],
  ['Laptop Stand', '456123789012', '790', '3', 'Adjustable']
];
const clone = (value) => JSON.parse(JSON.stringify(value));
const bounded = (number, min, max) => Math.max(min, Math.min(max, number));
const pxPerMm = 96 / 25.4;

function loadTemplates() {
  try {
    const stored = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.slice(0, 50).map(sanitizeTemplate).filter(Boolean)
      .filter((item) => !BUILTIN_TEMPLATES.some((builtin) => builtin.id === item.id));
  } catch { return []; }
}

function ButtonIcon({ icon: Icon, children, onClick, disabled = false, variant = 'soft' }) {
  return <button type="button" className={'studio-button studio-button-' + variant} onClick={onClick} disabled={disabled}>
    <Icon size={15}/>{children}
  </button>;
}

function MenuAction({ children, onClick, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={(event) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    onClick();
  }}>{children}</button>;
}

function SectionHeader({ icon: Icon, step, children }) {
  return <div className="panel-title"><div className="panel-title-main"><Icon size={18}/><h2>{children}</h2></div><span className="step-tag">{step}</span></div>;
}

export default function App() {
  const fileRef = useRef(null);
  const templateFileRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [sheets, setSheets] = useState([]);
  const [fileName, setFileName] = useState('');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [savedTemplates, setSavedTemplates] = useState(loadTemplates);
  const [activeId, setActiveId] = useState(DEFAULT_TEXT_TEMPLATE.id);
  const [draft, setDraft] = useState(() => clone(DEFAULT_TEXT_TEMPLATE));
  const [dirty, setDirty] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState('product');
  const [selection, setSelection] = useState(new Set());
  const [query, setQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [notice, setNotice] = useState(null);
  const [importing, setImporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [batchStart, setBatchStart] = useState(0);
  const [useQuantities, setUseQuantities] = useState(false);
  const [quantityColumn, setQuantityColumn] = useState('');
  const [printers, setPrinters] = useState([]);
  const [printerName, setPrinterName] = useState('');

  const sheet = sheets[sheetIndex] || null;
  const headers = sheet?.headers || EXAMPLE_HEADERS;
  const records = sheet?.records || [];
  const templates = [...BUILTIN_TEMPLATES, ...savedTemplates];
  const isBuiltin = BUILTIN_TEMPLATES.some((item) => item.id === activeId);
  const field = draft.fields.find((item) => item.id === selectedFieldId) || null;
  const missing = sheet ? missingColumns(draft, sheet.headers) : [];
  const orderedRecords = useMemo(() => {
    if (!Number.isInteger(sortColumn)) return records;
    return [...records].sort((left, right) => {
      const a = String(left.cells[sortColumn] ?? '');
      const b = String(right.cells[sortColumn] ?? '');
      const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [records, sortColumn, sortDirection]);
  const visibleRows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return orderedRecords;
    return orderedRecords.filter((row) => row.cells.some((cell) =>
      String(cell).toLocaleLowerCase().includes(search)));
  }, [orderedRecords, query]);
  const printable = useMemo(() =>
    sheet ? printableTemplateRecords(orderedRecords, selection, draft, sheet.headers) : [],
    [orderedRecords, selection, draft, sheet]);
  const qtyIndex = sheet && useQuantities
    ? sheet.headers.findIndex((h) => headerKey(h) === headerKey(quantityColumn)) : -1;
  const qtyMapping = { quantity: qtyIndex < 0 ? '' : String(qtyIndex) };
  const total = totalLabels(printable, qtyMapping, useQuantities && qtyIndex >= 0);
  const batchRows = makeBatch(printable, qtyMapping, useQuantities && qtyIndex >= 0, batchStart);
  const batches = Math.max(1, Math.ceil(total / PRINT_BATCH_SIZE));
  const currentBatch = total > 0 ? Math.floor(Math.min(batchStart, total - 1) / PRINT_BATCH_SIZE) + 1 : 1;
  const previewRecords = printable.length ? printable : records;
  const previewRow = previewRecords[bounded(previewIndex, 0, Math.max(0, previewRecords.length - 1))] || EXAMPLE_ROW;
  const previewExample = !sheet;
  const previewHtml = renderTextLabel(draft, headers, previewRow);
  const previewScale = Math.min(2, 450 / (draft.width * pxPerMm)) * zoom;
  const visibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selection.has(row.id));
  const mappingSummary = draft.fields.filter((x) => x.type === 'column').length;
  const previewWarning = sheet && missing.length && !printable.length;

  useEffect(() => {
    try { localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(savedTemplates)); }
    catch { /* browser storage may be disabled */ }
  }, [savedTemplates]);

  useEffect(() => { setBatchStart(0); }, [selection, sheetIndex, draft, useQuantities, quantityColumn]);
  useEffect(() => { setPreviewIndex(0); }, [selection, sheetIndex, fileName]);

  useEffect(() => {
    if (window.labelDesktop) {
      window.labelDesktop.getPrinters().then(setPrinters).catch(() => setPrinters([]));
    }
  }, []);

  const notify = (type, text) => setNotice({ type, text });

  function applyTemplate(nextId) {
    const match = templates.find((item) => item.id === nextId) || DEFAULT_TEXT_TEMPLATE;
    const next = clone(match);
    setActiveId(next.id);
    setDraft(next);
    setDirty(false);
    setSelectedFieldId(next.fields[0]?.id || '');
    historyRef.current = { past: [], future: [] };
    setHistoryVersion((n) => n + 1);
  }

  function snapshot() {
    const history = historyRef.current;
    history.past.push(clone(draft));
    if (history.past.length > 50) history.past.shift();
    history.future = [];
    setHistoryVersion((n) => n + 1);
  }

  function undoDraft() {
    const history = historyRef.current;
    if (!history.past.length) return;
    history.future.push(clone(draft));
    setDraft(history.past.pop());
    setDirty(true);
    setHistoryVersion((n) => n + 1);
  }

  function redoDraft() {
    const history = historyRef.current;
    if (!history.future.length) return;
    history.past.push(clone(draft));
    setDraft(history.future.pop());
    setDirty(true);
    setHistoryVersion((n) => n + 1);
  }

  function editDraft(transform) {
    const next = sanitizeTemplate(transform(draft));
    if (!next || JSON.stringify(next) === JSON.stringify(draft)) return;
    snapshot();
    setDraft(next);
    setDirty(true);
  }

  function setSize(key, value) {
    editDraft((previous) => ({ ...previous, [key]: value }));
  }

  function updateField(patch) {
    if (!field) return;
    editDraft((previous) => ({
      ...previous,
      fields: previous.fields.map((item) =>
        item.id === selectedFieldId ? { ...item, ...patch } : item)
    }));
  }

  function addField(type) {
    if (draft.fields.length >= 30) return notify('error', 'Maximum 30 fields per label.');
    const id = generateTemplateId();
    const available = sheet?.headers || EXAMPLE_HEADERS;
    const first = available[0] || '';
    editDraft((previous) => ({
      ...previous,
      fields: [...previous.fields, {
        id, type,
        label: type === 'text' ? 'Custom text' : (first || 'Excel column'),
        text: type === 'text' ? 'New text' : '',
        columnKey: type === 'column' ? first : '',
        autoField: '',
        x: 2, y: Math.min(2 + previous.fields.length * 5, previous.height - 5),
        width: Math.max(1, previous.width - 4), height: 5,
        fontSize: 12, bold: false, align: 'center',
        prefix: '', suffix: ''
      }]
    }));
    setSelectedFieldId(id);
  }

  function duplicateField() {
    if (!field || draft.fields.length >= 30) return;
    const id = generateTemplateId();
    editDraft((previous) => ({
      ...previous,
      fields: [...previous.fields, { ...field, id, label: field.label + ' copy',
        x: Math.min(previous.width - field.width, field.x + 2),
        y: Math.min(previous.height - field.height, field.y + 2) }]
    }));
    setSelectedFieldId(id);
  }

  function removeField() {
    if (!field) return;
    const next = draft.fields.filter((item) => item.id !== selectedFieldId);
    editDraft((previous) => ({ ...previous, fields: next }));
    setSelectedFieldId(next[0]?.id || '');
  }

  function saveTemplate() {
    const requested = String(draft.name || '').trim();
    if (!requested) return notify('error', 'Enter a template name first.');
    const isDefault = isBuiltin;
    const item = sanitizeTemplate({ ...draft, id: isDefault ? generateTemplateId() : activeId });
    if (isDefault && savedTemplates.length >= 50) return notify('error', 'Maximum 50 saved templates.');
    setSavedTemplates((previous) =>
      isDefault ? [...previous, item] :
      previous.some((template) => template.id === item.id)
        ? previous.map((template) => template.id === item.id ? item : template)
        : [...previous, item]);
    setActiveId(item.id);
    setDraft(item);
    setDirty(false);
    notify('success', 'Template "' + item.name + '" saved on this computer.');
  }

  function duplicateTemplate() {
    if (savedTemplates.length >= 50) return notify('error', 'Maximum 50 saved templates.');
    const item = sanitizeTemplate({
      ...draft, id: generateTemplateId(), name: draft.name + ' · Copy'
    });
    setSavedTemplates((previous) => [...previous, item]);
    setActiveId(item.id);
    setDraft(item);
    setDirty(false);
    notify('success', 'A copy has been saved. You can edit it independently.');
  }

  function deleteTemplate() {
    if (isBuiltin) return;
    const name = draft.name;
    if (!window.confirm('Delete saved template "' + name + '"?')) return;
    setSavedTemplates((previous) => previous.filter((item) => item.id !== activeId));
    applyTemplate(DEFAULT_TEXT_TEMPLATE.id);
    notify('success', 'Saved template deleted.');
  }

  function exportTemplate() {
    const output = JSON.stringify(sanitizeTemplate(draft), null, 2);
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (draft.name.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'label-template') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function importTemplate(file) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('Template file is too large.');
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.fields) || !parsed.fields.length)
        throw new Error('Not a valid text-label template.');
      const item = sanitizeTemplate({
        ...parsed, id: generateTemplateId(),
        name: (parsed.name || 'Imported template') + ' · Imported'
      });
      if (!item) throw new Error('Invalid template contents.');
      if (savedTemplates.length >= 50) throw new Error('Maximum 50 saved templates.');
      setSavedTemplates((previous) => [...previous, item]);
      setActiveId(item.id);
      setDraft(item);
      setSelectedFieldId(item.fields[0]?.id || '');
      setDirty(false);
      notify('success', 'Template imported. Excel columns will match by their header names.');
    } catch (error) { notify('error', error.message || 'Template import failed.'); }
    finally { if (templateFileRef.current) templateFileRef.current.value = ''; }
  }

  function applySheet(newSheets, name) {
    const data = newSheets.filter((s) => s?.records?.length);
    if (!data.length) throw new Error('No data rows were found.');
    setSheets(data);
    setSheetIndex(0);
    setFileName(name);
    setSelection(new Set(data[0].records.map((row) => row.id)));
    setQuery('');
    setSortColumn(null);
    const guessed = guessMapping(data[0].headers).quantity;
    setQuantityColumn(guessed === '' ? '' : data[0].headers[Number(guessed)]);
    notify('success', 'Imported ' + data.reduce((n, s) => n + s.records.length, 0) +
      ' data rows. Saved template positions are unchanged.');
  }

  async function loadFile(file) {
    if (!file) return;
    setImporting(true);
    try { applySheet(await readSpreadsheet(file), file.name); }
    catch (error) { notify('error', error.message || 'Unable to read spreadsheet.'); }
    finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function useExampleData() {
    const item = normalizeTable('Example sheet', EXAMPLE_ROWS);
    applySheet([{ ...item, sourceRows: EXAMPLE_ROWS }], 'Example products');
  }

  function chooseSheet(index) {
    const next = sheets[index];
    if (!next) return;
    setSheetIndex(index);
    setSelection(new Set(next.records.map((row) => row.id)));
    const guessed = guessMapping(next.headers).quantity;
    setQuantityColumn(guessed === '' ? '' : next.headers[Number(guessed)]);
    setQuery('');
    setSortColumn(null);
  }

  function chooseHeaderRow(rowNumber) {
    const updated = normalizeTable(sheet.name, sheet.sourceRows, rowNumber - 1);
    if (!updated || !updated.records.length) return notify('error', 'The chosen header row has no data below it.');
    setSheets((previous) => previous.map((item, index) =>
      index === sheetIndex ? { ...updated, sourceRows: sheet.sourceRows } : item));
    setSelection(new Set(updated.records.map((row) => row.id)));
    setSortColumn(null);
    const guessed = guessMapping(updated.headers).quantity;
    setQuantityColumn(guessed === '' ? '' : updated.headers[Number(guessed)]);
  }

  function toggleSort(index) {
    if (sortColumn === index) setSortDirection((dir) => dir === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(index); setSortDirection('asc'); }
  }

  function toggleVisible() {
    setSelection((previous) => {
      const next = new Set(previous);
      for (const row of visibleRows) {
        if (visibleSelected) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  function toggleRow(id) {
    setSelection((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function pointerDown(event) {
    const element = event.target.closest('[data-field-id]');
    if (!element || !canvasRef.current) return;
    const id = element.getAttribute('data-field-id');
    const targetField = draft.fields.find((item) => item.id === id);
    if (!targetField) return;
    event.preventDefault();
    setSelectedFieldId(id);
    snapshot();
    dragRef.current = {
      pointerId: event.pointerId, id,
      startX: event.clientX, startY: event.clientY,
      x: targetField.x, y: targetField.y,
      scale: previewScale
    };
    canvasRef.current.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    const dragging = dragRef.current;
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const dx = (event.clientX - dragging.startX) / (pxPerMm * dragging.scale);
    const dy = (event.clientY - dragging.startY) / (pxPerMm * dragging.scale);
    setDraft((previous) => sanitizeTemplate({
      ...previous,
      fields: previous.fields.map((item) => item.id !== dragging.id ? item : {
        ...item,
        x: Math.round(bounded(dragging.x + dx, 0, previous.width - item.width) * 2) / 2,
        y: Math.round(bounded(dragging.y + dy, 0, previous.height - item.height) * 2) / 2
      })
    }));
    setDirty(true);
  }

  function pointerUp(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  }

  async function exportPDF() {
    if (!window.labelDesktop?.exportPDF) return notify('error', 'PDF export is available in the Windows desktop app.');
    if (!sheet || !batchRows.length || missing.length) return notify('error', 'Import Excel and resolve missing field mappings first.');
    setPrinting(true);
    try {
      const html = textPrintDocument(batchRows.map((row) =>
        renderTextLabel(draft, sheet.headers, row)), draft);
      const result = await window.labelDesktop.exportPDF(html, draft.width, draft.height);
      if (result.cancelled) return;
      if (!result.ok) throw new Error(result.error || 'Could not export PDF.');
      notify('success', 'PDF exported: ' + result.filePath);
    } catch (error) { notify('error', error.message || 'PDF export failed.'); }
    finally { setPrinting(false); }
  }

  async function printBatch() {
    if (!sheet || !batchRows.length) return notify('error', 'Select rows with data for at least one mapped label field.');
    if (missing.length) return notify('error', 'Fix missing Excel columns: ' + missing.join(', '));
    setPrinting(true);
    try {
      const html = textPrintDocument(batchRows.map((row) =>
        renderTextLabel(draft, sheet.headers, row)), draft);
      const result = window.labelDesktop
        ? await window.labelDesktop.print(html, draft.width, draft.height, printerName)
        : await browserPrint(html);
      if (!result.ok) throw new Error(result.error || 'Print failed or was cancelled.');
      notify('success', printerName
        ? 'Sent ' + batchRows.length + ' labels to ' + printerName + '.'
        : 'Opened print for ' + batchRows.length + ' text-only labels.');
    } catch (error) { notify('error', error.message || 'Print failed.'); }
    finally { setPrinting(false); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-symbol"><Type size={26}/></div>
        <div><h1>Excel Label <span>Studio</span></h1><p>Custom text labels from Excel · Offline</p></div>
      </div>
      <div className="topbar-actions">
        <span className="offline-pill"><span className="offline-dot"/> TEXT-ONLY LABELS</span>
        <button className="button button-primary top-print" onClick={printBatch}
          disabled={!printable.length || missing.length > 0 || printing}>
          <Printer size={17}/>{printing ? 'Printing…' : 'Print labels'}<ArrowRight size={16}/>
        </button>
      </div>
    </header>

    <nav className="desktop-menu-bar" aria-label="Desktop application menu">
      <details><summary>File</summary><div className="desktop-menu-popover">
        <MenuAction onClick={() => { if (!dirty || window.confirm('Discard unsaved layout changes?')) applyTemplate(DEFAULT_TEXT_TEMPLATE.id); }}>New label</MenuAction>
        <MenuAction onClick={() => fileRef.current?.click()}>Open Excel / CSV…</MenuAction>
        <MenuAction onClick={saveTemplate}>Save template</MenuAction>
        <MenuAction onClick={duplicateTemplate}>Save As (copy)…</MenuAction>
        <MenuAction onClick={exportTemplate}>Export template…</MenuAction>
        <MenuAction onClick={() => templateFileRef.current?.click()}>Import template…</MenuAction>
      </div></details>
      <details><summary>Edit</summary><div className="desktop-menu-popover">
        <MenuAction onClick={undoDraft} disabled={!historyRef.current.past.length}>Undo</MenuAction>
        <MenuAction onClick={redoDraft} disabled={!historyRef.current.future.length}>Redo</MenuAction>
        <MenuAction onClick={duplicateField} disabled={!field || draft.fields.length >= 30}>Duplicate selected field</MenuAction>
        <MenuAction onClick={removeField} disabled={!field}>Delete selected field</MenuAction>
      </div></details>
      <details><summary>View</summary><div className="desktop-menu-popover">
        <MenuAction onClick={() => setShowGrid((v) => !v)}>{showGrid ? 'Hide' : 'Show'} grid</MenuAction>
        <MenuAction onClick={() => setZoom((v) => Math.min(2, v + .25))}>Zoom in</MenuAction>
        <MenuAction onClick={() => setZoom((v) => Math.max(.5, v - .25))}>Zoom out</MenuAction>
        <MenuAction onClick={() => setZoom(1)}>Actual zoom (100%)</MenuAction>
      </div></details>
      <details><summary>Insert</summary><div className="desktop-menu-popover">
        <MenuAction onClick={() => addField('text')}>Text object</MenuAction>
        <MenuAction onClick={() => addField('column')}>Excel field object</MenuAction>
      </div></details>
      <details><summary>Data</summary><div className="desktop-menu-popover">
        <MenuAction onClick={() => fileRef.current?.click()}>Import database file…</MenuAction>
        <MenuAction onClick={useExampleData}>Open sample data</MenuAction>
      </div></details>
      <details><summary>Print</summary><div className="desktop-menu-popover">
        <MenuAction onClick={printBatch} disabled={!sheet || !total || missing.length > 0 || printing}>Print current batch…</MenuAction>
        <MenuAction onClick={exportPDF} disabled={!window.labelDesktop?.exportPDF || !sheet || !total || missing.length > 0 || printing}>Export current batch as PDF…</MenuAction>
      </div></details>
    </nav>

    <main className="layout">
      <aside className="sidebar template-sidebar">
        <section className="panel">
          <SectionHeader icon={UploadCloud} step="01">Import spreadsheet</SectionHeader>
          <input className="hidden-input" ref={fileRef} type="file" accept=".xlsx,.csv,.tsv" onChange={(e) => loadFile(e.target.files?.[0])}/>
          <div className="upload-zone" role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files?.[0]); }}>
            <div className="upload-icon"><FileSpreadsheet size={25}/></div>
            <strong>{importing ? 'Reading file…' : fileName || 'Drop .xlsx, .csv or .tsv here'}</strong>
            <span>Click to browse · Excel stays on your PC</span>
            <div className="file-formats"><span>XLSX</span><span>CSV</span><span>TSV</span></div>
          </div>
          <button type="button" className="sample-button" onClick={useExampleData}>
            Load example spreadsheet <ArrowRight size={14}/>
          </button>
          {sheets.length > 1 && <label className="form-field sheet-picker"><span>Sheet</span>
            <select value={sheetIndex} onChange={(e) => chooseSheet(Number(e.target.value))}>
              {sheets.map((value, i) => <option key={i} value={i}>{value.name} · {value.records.length} rows</option>)}
            </select>
          </label>}
          {sheet && <label className="form-field sheet-picker"><span>Header row in Excel</span>
            <select value={sheet.headerRow} onChange={(e) => chooseHeaderRow(Number(e.target.value))}>
              {Array.from({ length: Math.min(20, Math.max(1, sheet.sourceRows.length - 1)) }, (_, i) =>
                <option key={i} value={i + 1}>Row {i + 1} — {sheet.sourceRows[i].filter(Boolean).slice(0, 2).join(' / ').slice(0, 65) || 'Empty'}</option>)}
            </select>
          </label>}
        </section>

        <section className="panel">
          <SectionHeader icon={LayoutTemplate} step="02">Reusable label template</SectionHeader>
          <label className="form-field"><span>Choose saved template</span>
            <select value={activeId} onChange={(e) => applyTemplate(e.target.value)}>
              {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="form-field template-name"><span>Template name {dirty && <em>· unsaved edits</em>}</span>
            <input value={draft.name} maxLength={100} onChange={(e) => editDraft((current) => ({ ...current, name: e.target.value }))}/>
          </label>
          <div className="template-actions">
            <ButtonIcon icon={Save} onClick={saveTemplate}>{isBuiltin ? 'Save as new' : 'Save changes'}</ButtonIcon>
            <ButtonIcon icon={Plus} onClick={duplicateTemplate}>Duplicate</ButtonIcon>
            <ButtonIcon icon={Download} onClick={exportTemplate}>Export</ButtonIcon>
            <ButtonIcon icon={FolderOpen} onClick={() => templateFileRef.current?.click()}>Import</ButtonIcon>
            <ButtonIcon icon={Trash2} variant="danger" disabled={isBuiltin} onClick={deleteTemplate}>Delete</ButtonIcon>
          </div>
          <input ref={templateFileRef} className="hidden-input" type="file" accept=".json,application/json" onChange={(e) => importTemplate(e.target.files?.[0])}/>
          <p className="panel-hint template-tip">Saved templates remember Excel column names and the position of every text field. Export JSON to use them on another PC.</p>
        </section>

        <section className="panel">
          <SectionHeader icon={Settings2} step="03">Label size &amp; layout</SectionHeader>
          <div className="dimension-grid">
            <label className="form-field"><span>Width · mm</span><input type="number" min="20" max="150" step="1" value={draft.width} onChange={(e) => setSize('width', Number(e.target.value))}/></label>
            <label className="form-field"><span>Height · mm</span><input type="number" min="15" max="200" step="1" value={draft.height} onChange={(e) => setSize('height', Number(e.target.value))}/></label>
          </div>
          <div className="fields-title"><strong>Fields on this label</strong><span>{draft.fields.length} / 30</span></div>
          <div className="field-list">
            {draft.fields.map((item) => {
              const absent = sheet && item.type === 'column' && resolveColumnIndex(sheet.headers, item) < 0;
              return <button type="button" key={item.id}
                className={'field-button ' + (selectedFieldId === item.id ? 'field-button-active' : '')}
                onClick={() => setSelectedFieldId(item.id)}>
                {item.type === 'text' ? <Type size={15}/> : <Columns3 size={15}/>}
                <span>{item.label || 'Unnamed field'}</span>
                {absent && <AlertCircle size={14} color="#d68542"/>}
              </button>;
            })}
          </div>
          <div className="add-actions">
            <ButtonIcon icon={Plus} onClick={() => addField('column')}>Excel column</ButtonIcon>
            <ButtonIcon icon={Plus} onClick={() => addField('text')}>Fixed text</ButtonIcon>
          </div>
          {field && <div className="field-editor">
            <div className="field-editor-heading"><strong>Edit selected field</strong>
              <button type="button" title="Delete field" onClick={removeField}><Trash2 size={16}/></button>
            </div>
            <label className="form-field"><span>Field label (editor name)</span>
              <input value={field.label} maxLength={80} onChange={(e) => updateField({ label: e.target.value })}/>
            </label>
            {field.type === 'column' ? <>
              <label className="form-field"><span>Excel column for this position</span>
                <select value={resolveColumnIndex(headers, field) >= 0 ? headers[resolveColumnIndex(headers, field)] : ''}
                  onChange={(e) => updateField({ columnKey: e.target.value, autoField: '' })}>
                  <option value="">— Choose Excel column —</option>
                  {headers.map((name, i) => <option key={i} value={name}>{name}</option>)}
                </select>
              </label>
              <div className="dimension-grid">
                <label className="form-field"><span>Before value</span><input value={field.prefix} maxLength={60} onChange={(e) => updateField({ prefix: e.target.value })} placeholder="EGP "/></label>
                <label className="form-field"><span>After value</span><input value={field.suffix} maxLength={60} onChange={(e) => updateField({ suffix: e.target.value })} placeholder=" EGP"/></label>
              </div>
            </> : <label className="form-field"><span>Fixed text</span>
              <input value={field.text} maxLength={300} onChange={(e) => updateField({ text: e.target.value })}/>
            </label>}
            <div className="dimension-grid">
              <label className="form-field"><span>X · mm</span><input type="number" step=".5" min="0" value={field.x} onChange={(e) => updateField({ x: Number(e.target.value) })}/></label>
              <label className="form-field"><span>Y · mm</span><input type="number" step=".5" min="0" value={field.y} onChange={(e) => updateField({ y: Number(e.target.value) })}/></label>
              <label className="form-field"><span>Width · mm</span><input type="number" step=".5" min="1" value={field.width} onChange={(e) => updateField({ width: Number(e.target.value) })}/></label>
              <label className="form-field"><span>Height · mm</span><input type="number" step=".5" min="1" value={field.height} onChange={(e) => updateField({ height: Number(e.target.value) })}/></label>
            </div>
            <div className="dimension-grid">
              <label className="form-field"><span>Font size · px</span><input type="number" min="6" max="36" value={field.fontSize} onChange={(e) => updateField({ fontSize: Number(e.target.value) })}/></label>
              <label className="form-field"><span>Alignment</span><select value={field.align} onChange={(e) => updateField({ align: e.target.value })}>
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select></label>
            </div>
            <label className="form-field"><span>Font family</span><select value={field.fontFamily || 'Arial'} onChange={(e) => updateField({ fontFamily: e.target.value })}>
              {['Arial', 'Tahoma', 'Segoe UI', 'Consolas', 'Times New Roman'].map((family) => <option key={family} value={family}>{family}</option>)}
            </select></label>
            <div className="dimension-grid">
              <label className="form-field"><span>Rotation</span><select value={field.rotation || 0} onChange={(e) => updateField({ rotation: Number(e.target.value) })}>
                {[0,90,180,270].map((n) => <option key={n} value={n}>{n}°</option>)}
              </select></label>
              <label className="checkbox-row"><input type="checkbox" checked={field.wrap !== false} onChange={(e) => updateField({ wrap: e.target.checked })}/> Wrap text</label>
            </div>
            <div className="text-format-checks">
              <label className="checkbox-row"><input type="checkbox" checked={field.bold} onChange={(e) => updateField({ bold: e.target.checked })}/> Bold</label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(field.italic)} onChange={(e) => updateField({ italic: e.target.checked })}/> Italic</label>
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(field.underline)} onChange={(e) => updateField({ underline: e.target.checked })}/> Underline</label>
            </div>
            {field.type === 'column' && sheet && resolveColumnIndex(sheet.headers, field) < 0 &&
              <div className="inline-warning"><AlertCircle size={15}/> Column not found. Choose the matching Excel header.</div>}
          </div>}
        </section>
        <div className="privacy-note"><ShieldCheck size={18}/><span>Offline and private. Excel is not uploaded anywhere. Templates are stored locally.</span></div>
      </aside>

      <div className="workspace">
        {notice && <div className={'notice notice-' + (notice.type === 'error' ? 'error' : 'success')} role="status">
          {notice.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
          <span>{notice.text}</span><button type="button" onClick={() => setNotice(null)}>×</button>
        </div>}
        <div className="workspace-heading"><div>
          <div className="eyebrow">DESIGN ONCE · REUSE WITH EVERY EXCEL FILE</div>
          <h2>Text-only label designer</h2>
          <p>Place Excel columns exactly where you want on the printed label.</p>
        </div><div className="small-version">Text mode · Offline</div></div>

        <div className="design-toolbar" role="toolbar" aria-label="Label designer tools">
          <button type="button" title="Undo" disabled={!historyRef.current.past.length} onClick={undoDraft}><Undo2 size={16}/> Undo</button>
          <button type="button" title="Redo" disabled={!historyRef.current.future.length} onClick={redoDraft}><Redo2 size={16}/> Redo</button>
          <span className="toolbar-separator"/>
          <button type="button" className={showGrid ? 'toolbar-selected' : ''} onClick={() => setShowGrid((v) => !v)} aria-pressed={showGrid}><Grid2X2 size={16}/> Grid</button>
          <span className="toolbar-separator"/>
          <button type="button" aria-label="Zoom out" disabled={zoom <= .5} onClick={() => setZoom((n) => Math.max(.5, Math.round((n - .25) * 100) / 100))}><ZoomOut size={16}/></button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((n) => Math.min(2, Math.round((n + .25) * 100) / 100))}><ZoomIn size={16}/></button>
          {dirty && <span className="toolbar-dirty">Unsaved changes</span>}
        </div>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-icon stat-blue"><Table2 size={19}/></div><span>Excel rows</span><strong>{records.length.toLocaleString()}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-green"><CheckCircle2 size={19}/></div><span>Selected rows with data</span><strong>{printable.length.toLocaleString()}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-purple"><Type size={19}/></div><span>Text fields</span><strong>{draft.fields.length}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-orange"><Printer size={19}/></div><span>Labels to print</span><strong>{total.toLocaleString()}</strong></div>
        </div>

        <section className="preview-panel">
          <div className="preview-top"><div><div className="section-eyebrow">REAL PRINT LAYOUT</div>
            <h3><Eye size={18}/> {previewExample ? 'Example: this is how it prints' : 'Live preview from your Excel'}</h3>
          </div><span className="dimension-badge">{draft.width} × {draft.height} mm</span></div>
          <div className={'preview-canvas text-preview-area ' + (showGrid ? 'preview-grid' : '')}>
            <style>{textLabelStyles}</style>
            <div className="preview-paper text-preview-paper" ref={canvasRef}
              style={{ width: draft.width * pxPerMm * previewScale, height: draft.height * pxPerMm * previewScale }}
              onPointerDown={pointerDown} onPointerMove={pointerMove}
              onPointerUp={pointerUp} onPointerCancel={pointerUp}>
              <div className="preview-scaled" style={{ transform: 'scale(' + previewScale + ')', transformOrigin: 'top left' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}/>
            </div>
          </div>
          <div className="preview-bottom">
            <span><span className="live-dot"/>{previewExample ? 'Sample: Wireless Mouse · 325 EGP' : 'First selected/available Excel row'}</span>
            <span className="preview-navigation"><button type="button" aria-label="Previous preview record" disabled={!previewRecords.length || previewIndex === 0} onClick={() => setPreviewIndex((n) => Math.max(0, n - 1))}><ChevronLeft size={15}/></button>
              Record {previewRecords.length ? Math.min(previewIndex + 1, previewRecords.length) : 0} / {previewRecords.length}
              <button type="button" aria-label="Next preview record" disabled={previewIndex + 1 >= previewRecords.length} onClick={() => setPreviewIndex((n) => n + 1)}><ChevronRight size={15}/></button>
            </span>
          </div>
          {previewWarning && <div className="inline-warning preview-warning">
            <AlertCircle size={15}/> No printable values found. Choose the correct Excel column for each field.</div>}
          {Boolean(sheet?.duplicateHeaders?.length) && <div className="inline-warning preview-warning"><AlertCircle size={15}/> Duplicate Excel headings detected: {sheet.duplicateHeaders.join(', ')}. Rename duplicate headings in Excel to avoid ambiguous bindings.</div>}
          {missing.length > 0 && <div className="inline-warning preview-warning">
            <AlertCircle size={15}/> Columns missing from this sheet: {missing.join(', ')}. Edit these fields in the left panel before printing.</div>}
        </section>

        <section className="table-panel">
          <div className="table-toolbar"><div>
            <div className="section-eyebrow">SPREADSHEET DATA · EXACT COLUMN VALUES</div>
            <h3><FileSpreadsheet size={19}/> Excel rows and columns</h3>
          </div><div className="table-tools">
            <div className="search-box"><Search size={16}/><input aria-label="Search Excel rows" placeholder="Search Excel data…" value={query} onChange={(e) => setQuery(e.target.value)}/></div>
            <button type="button" className="button button-outline" disabled={!visibleRows.length} onClick={toggleVisible}>
              {visibleSelected ? 'Deselect visible' : 'Select visible'}
            </button>
          </div></div>
          <div className="table-overflow"><table className="data-table wide-sheet-table">
            <thead><tr>
              <th className="check-col"><input type="checkbox" aria-label="Select visible rows" checked={visibleSelected} disabled={!visibleRows.length} onChange={toggleVisible}/></th>
              <th>Row</th>{headers.map((header, i) =>
                <th key={i}><button className="column-sort" type="button" onClick={() => toggleSort(i)} title={'Sort by ' + header}>
                  {header}<ArrowDownUp size={12}/>{sortColumn === i && (sortDirection === 'asc' ? '↑' : '↓')}
                </button></th>)}
            </tr></thead>
            <tbody>{!sheet ? <tr><td colSpan={headers.length + 2}>
              <div className="empty-table"><FileSpreadsheet size={26}/><strong>Preview shown above uses example values.</strong><span>Import Excel to see your real rows and column headers here.</span></div>
            </td></tr> : visibleRows.length === 0 ? <tr><td colSpan={headers.length + 2}><div className="empty-table">No matching rows</div></td></tr> :
              visibleRows.slice(0, 100).map((row) => <tr key={row.id}>
                <td className="check-col"><input type="checkbox" aria-label={'Select Excel row ' + row.id} checked={selection.has(row.id)} onChange={() => toggleRow(row.id)}/></td>
                <td className="row-number">{row.id}</td>
                {headers.map((header, i) => <td key={i} dir="auto" title={row.cells[i]}>{row.cells[i] || '—'}</td>)}
              </tr>)}
            </tbody>
          </table></div>
          <div className="table-footer">
            <span>{sheet ? 'Showing ' + Math.min(100, visibleRows.length) + ' of ' + visibleRows.length.toLocaleString() + ' matching rows · Scroll horizontally for all columns' : 'Import .xlsx, .csv or .tsv to begin'}</span>
            <span>{mappingSummary} dynamic columns mapped to label positions</span>
          </div>
        </section>

        <section className="print-panel">
          <div className="print-header"><div className="print-header-icon"><Printer size={23}/></div>
            <div><h3>Print your text labels</h3><p>Uses the same layout as the preview. Print up to {PRINT_BATCH_SIZE} at a time.</p></div>
          </div>
          <div className="print-options">
            {window.labelDesktop && <label className="form-field"><span>Windows printer</span>
              <select value={printerName} onChange={(e) => setPrinterName(e.target.value)}>
                <option value="">System print dialog</option>
                {printers.map((item) => <option key={item.name} value={item.name}>{item.displayName}{item.isDefault ? ' (default)' : ''}</option>)}
              </select>
            </label>}
            <label className="form-field"><span>Quantity column (optional)</span>
              <select value={quantityColumn} disabled={!sheet} onChange={(e) => setQuantityColumn(e.target.value)}>
                <option value="">— None —</option>{sheet?.headers.map((h, i) => <option value={h} key={i}>{h}</option>)}
              </select>
            </label>
            <label className="checkbox-row copies-control"><input type="checkbox" checked={useQuantities} onChange={(e) => setUseQuantities(e.target.checked)}/> Print copies from Quantity column</label>
          </div>
          <div className="print-bottom"><div className="batch-controls">
            <span className="batch-label">Batch {currentBatch} of {batches}</span>
            <button type="button" title="Previous batch" disabled={batchStart === 0} onClick={() => setBatchStart((n) => Math.max(0, n - PRINT_BATCH_SIZE))}><ChevronLeft size={18}/></button>
            <button type="button" title="Next batch" disabled={batchStart + PRINT_BATCH_SIZE >= total} onClick={() => setBatchStart((n) => n + PRINT_BATCH_SIZE)}><ChevronRight size={18}/></button>
            <small>{total ? Math.min(batchStart + 1, total) + '–' + Math.min(batchStart + PRINT_BATCH_SIZE, total) + ' of ' + total : 'No labels selected'}</small>
          </div><div className="print-action-group">
            {Boolean(window.labelDesktop?.exportPDF) && <button type="button" className="button button-outline" disabled={!sheet || !total || missing.length > 0 || printing} onClick={exportPDF}>
              <Download size={17}/> Export PDF
            </button>}
            <button type="button" className="button button-primary print-final" disabled={!sheet || !total || missing.length > 0 || printing} onClick={printBatch}>
              <Printer size={18}/>{printing ? 'Preparing…' : 'Print ' + batchRows.length + ' labels'}<ArrowRight size={16}/>
            </button>
          </div></div>
          <p className="print-tip"><Info size={16}/> Make sure your printer stock size is {draft.width} × {draft.height} mm, margins are 0, and scaling is 100%. Print one test label first.</p>
        </section>
        <footer className="footer"><span>Excel Label Studio · Free and offline</span><span>Text labels · Saved reusable templates · No BarTender license needed</span></footer>
      </div>
    </main>
  </div>;
}
