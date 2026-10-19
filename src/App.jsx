import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine, FileSpreadsheet, UploadCloud, Printer, Search, Settings2,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, LayoutTemplate,
  Layers3, Table2, ShieldCheck, Eye, RefreshCw, ArrowRight, Info
} from 'lucide-react';
import { readSpreadsheet } from './importers.js';
import {
  normalizeTable, guessMapping, cellValue, printableRecords,
  totalLabels, makeBatch, copyCount, PRINT_BATCH_SIZE
} from './core.js';
import { labelData, renderLabel, printDocument, printInBrowser, labelStyles } from './print.js';
import './styles.css';

const DEFAULT_SETTINGS = {
  width: 50, height: 30, brand: '', barcodeType: 'CODE128',
  showName: true, showCode: true, showPrice: true, showDescription: false,
  fontSize: 11, currency: 'EGP', useQuantity: false
};
const FIELDS = [
  { key: 'name', title: 'Product name', description: 'Title printed above the barcode' },
  { key: 'barcode', title: 'Barcode / SKU', description: 'Required to generate each barcode' },
  { key: 'price', title: 'Price', description: 'Optional product price' },
  { key: 'quantity', title: 'Quantity', description: 'Copies per row (optional)' },
  { key: 'description', title: 'Description', description: 'Optional smaller text' }
];
const SAMPLE = [
  ['Product Name', 'Barcode', 'Price', 'Quantity', 'Description'],
  ['USB-C Cable', '123456789012', '150', '2', '1 meter braided'],
  ['Wireless Mouse', '987654321098', '325', '1', '2.4 GHz'],
  ['Laptop Stand', '456123789012', '790', '3', 'Adjustable aluminum'],
  ['Type-C Charger', '890123456789', '420', '2', 'Fast charging']
];

function PanelTitle({ icon: Icon, children, aside }) {
  return <div className="panel-title"><div className="panel-title-main"><Icon size={18}/><h2>{children}</h2></div>{aside}</div>;
}

function Notification({ notice, onClose }) {
  if (!notice) return null;
  const IsError = notice.type === 'error';
  return <div className={'notice ' + (IsError ? 'notice-error' : 'notice-success')} role="status">
    {IsError ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
    <span>{notice.text}</span>
    <button type="button" aria-label="Dismiss message" onClick={onClose}>×</button>
  </div>;
}

function Switch({ label, detail, checked, onChange }) {
  return <label className="switch-row">
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
    <input type="checkbox" className="switch-input" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
    <span className="switch-track" aria-hidden="true"/>
  </label>;
}

function App() {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState({ name: '', barcode: '', price: '', quantity: '', description: '' });
  const [selected, setSelected] = useState(new Set());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [filter, setFilter] = useState('');
  const [preview, setPreview] = useState({ html: '', error: '' });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [batchStart, setBatchStart] = useState(0);
  const [printers, setPrinters] = useState([]);
  const [printerName, setPrinterName] = useState('');

  const sheet = sheets[sheetIndex] || null;
  const records = sheet?.records || [];
  const visibleRecords = useMemo(() => {
    if (!filter.trim()) return records;
    const term = filter.trim().toLowerCase();
    return records.filter((row) => row.cells.some((value) => value.toLowerCase().includes(term)));
  }, [records, filter]);
  const printable = useMemo(
    () => printableRecords(records, selected, mapping),
    [records, selected, mapping]
  );
  const total = useMemo(
    () => totalLabels(printable, mapping, settings.useQuantity),
    [printable, mapping, settings.useQuantity]
  );
  const batches = Math.max(1, Math.ceil(total / PRINT_BATCH_SIZE));
  const currentBatch = total ? Math.floor(Math.min(batchStart, total - 1) / PRINT_BATCH_SIZE) + 1 : 1;
  const batchRows = useMemo(
    () => makeBatch(printable, mapping, settings.useQuantity, batchStart),
    [printable, mapping, settings.useQuantity, batchStart]
  );
  const previewRow = printable[0] || records.find((r) => cellValue(r, mapping.barcode)) || null;
  const previewCode = previewRow ? cellValue(previewRow, mapping.barcode) : '';
  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every((r) => selected.has(r.id));

  useEffect(() => {
    if (!window.labelDesktop) return;
    window.labelDesktop.getPrinters().then(setPrinters).catch(() => setPrinters([]));
  }, []);

  useEffect(() => { setBatchStart(0); }, [mapping, selected, settings.useQuantity, sheetIndex]);

  useEffect(() => {
    let cancelled = false;
    if (!previewRow || !previewCode) {
      setPreview({ html: '', error: '' });
      return undefined;
    }
    renderLabel(labelData(previewRow, mapping), settings)
      .then((html) => { if (!cancelled) setPreview({ html, error: '' }); })
      .catch((err) => { if (!cancelled) setPreview({ html: '', error: err.message }); });
    return () => { cancelled = true; };
  }, [previewRow, previewCode, mapping, settings]);

  function showNotice(type, text) { setNotice({ type, text }); }

  function loadSheets(nextSheets, name) {
    const next = nextSheets.filter((s) => s.records.length);
    if (!next.length) throw new Error('This file has no product rows.');
    setSheets(next);
    setFileName(name);
    setSheetIndex(0);
    setMapping(guessMapping(next[0].headers));
    setSelected(new Set(next[0].records.map((r) => r.id)));
    setFilter('');
    setBatchStart(0);
    showNotice('success', 'Imported ' + next.reduce((sum, s) => sum + s.records.length, 0) + ' rows from ' + next.length + ' sheet(s).');
  }

  async function importFile(file) {
    if (!file) return;
    setImporting(true);
    try {
      const nextSheets = await readSpreadsheet(file);
      loadSheets(nextSheets, file.name);
    } catch (error) {
      showNotice('error', error.message || 'The file could not be imported.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function changeSheet(index) {
    const next = sheets[index];
    if (!next) return;
    setSheetIndex(index);
    setMapping(guessMapping(next.headers));
    setSelected(new Set(next.records.map((r) => r.id)));
    setFilter('');
    setBatchStart(0);
  }

  function updateSettings(key, value) {
    setSettings((state) => ({ ...state, [key]: value }));
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of visibleRecords) {
        if (allVisibleSelected) next.delete(row.id); else next.add(row.id);
      }
      return next;
    });
  }

  async function handlePrint() {
    if (!batchRows.length) return showNotice('error', 'Select at least one row with a barcode.');
    if (settings.width < 20 || settings.width > 150 || settings.height < 15 || settings.height > 200) {
      return showNotice('error', 'Use a width of 20–150 mm and height of 15–200 mm.');
    }
    setBusy(true);
    try {
      const labels = [];
      for (const row of batchRows) {
        labels.push(await renderLabel(labelData(row, mapping), settings));
      }
      const html = printDocument(labels, settings);
      const result = window.labelDesktop
        ? await window.labelDesktop.print(html, settings.width, settings.height, printerName)
        : await printInBrowser(html);
      if (!result.ok) throw new Error(result.error || 'Printing failed or was cancelled.');
      showNotice('success', window.labelDesktop && printerName
        ? 'Sent ' + labels.length + ' labels to the selected Windows printer.'
        : 'Print request opened for ' + labels.length + ' labels. Confirm your printer and paper settings.');
    } catch (error) {
      showNotice('error', error.message || 'Printing failed.');
    } finally {
      setBusy(false);
    }
  }

  const previewScale = Math.min(2.0, 500 / (settings.width * 3.78));
  const hasValidMap = mapping.barcode !== '';

  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-symbol"><ScanLine size={26} strokeWidth={2.1}/></div>
        <div><h1>Excel Label <span>Studio</span></h1><p>Spreadsheet to barcode labels</p></div>
      </div>
      <div className="topbar-actions">
        <span className="offline-pill"><span className="offline-dot"/>PRIVATE &amp; OFFLINE</span>
        <button className="button button-primary top-print" disabled={!hasValidMap || !total || busy} onClick={handlePrint}>
          <Printer size={18}/>{busy ? 'Preparing labels…' : 'Print current batch'}<ArrowRight size={17}/>
        </button>
      </div>
    </header>

    <main className="layout">
      <aside className="sidebar">
        <section className="panel">
          <PanelTitle icon={UploadCloud} aside={<span className="step-tag">STEP 01</span>}>Import data</PanelTitle>
          <input ref={fileRef} className="hidden-input" type="file" accept=".xlsx,.csv" onChange={(e) => importFile(e.target.files?.[0])}/>
          <div
            className={'upload-zone ' + (fileName ? 'upload-zone-loaded' : '')}
            role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); importFile(e.dataTransfer.files?.[0]); }}
          >
            <div className="upload-icon"><FileSpreadsheet size={27}/></div>
            <strong>{importing ? 'Reading your spreadsheet…' : fileName || 'Drop Excel file here'}</strong>
            <span>{fileName ? 'Click to replace the workbook' : 'or click to browse your computer'}</span>
            <div className="file-formats"><span>XLSX</span><span>CSV</span><span>MAX 15 MB</span></div>
          </div>
          {!sheet && <button className="sample-button" onClick={() => loadSheets([normalizeTable('Example products', SAMPLE)], 'Sample products')}>Try with sample products <ArrowRight size={14}/></button>}
          {sheets.length > 1 && <label className="form-field"><span>Workbook sheet</span>
            <select value={sheetIndex} onChange={(e) => changeSheet(Number(e.target.value))}>
              {sheets.map((item, i) => <option key={i} value={i}>{item.name} ({item.records.length} rows)</option>)}
            </select>
          </label>}
        </section>

        <section className="panel">
          <PanelTitle icon={Layers3} aside={<span className="step-tag">STEP 02</span>}>Map Excel columns</PanelTitle>
          <p className="panel-hint">Connect your spreadsheet headings to fields on the label.</p>
          <div className="mapping-list">
            {FIELDS.map((field) => <label className="form-field" key={field.key}>
              <span>{field.title}{field.key === 'barcode' && <b className="required-star"> *</b>}</span>
              <select
                value={mapping[field.key]}
                disabled={!sheet}
                onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
              >
                <option value="">— Not mapped —</option>
                {sheet?.headers.map((header, i) => <option key={i} value={String(i)}>{header}</option>)}
              </select>
            </label>)}
          </div>
          {sheet && !hasValidMap && <p className="inline-warning"><AlertCircle size={15}/> Map a Barcode column to enable printing.</p>}
        </section>

        <section className="panel settings-panel">
          <PanelTitle icon={Settings2} aside={<span className="step-tag">STEP 03</span>}>Label settings</PanelTitle>
          <div className="dimension-grid">
            <label className="form-field"><span>Width (mm)</span><input type="number" min="20" max="150" step="1" value={settings.width} onChange={(e) => updateSettings('width', Number(e.target.value))}/></label>
            <label className="form-field"><span>Height (mm)</span><input type="number" min="15" max="200" step="1" value={settings.height} onChange={(e) => updateSettings('height', Number(e.target.value))}/></label>
          </div>
          <label className="form-field"><span>Barcode format</span>
            <select value={settings.barcodeType} onChange={(e) => updateSettings('barcodeType', e.target.value)}>
              <option value="CODE128">Code 128 · Recommended</option>
              <option value="EAN13">EAN-13 · Retail codes</option>
              <option value="QR">QR code</option>
            </select>
          </label>
          <label className="form-field"><span>Company / store name</span>
            <input type="text" maxLength={60} placeholder="Optional label header" value={settings.brand} onChange={(e) => updateSettings('brand', e.target.value)}/>
          </label>
          <div className="dimension-grid">
            <label className="form-field"><span>Font size (px)</span><input type="number" min="7" max="20" value={settings.fontSize} onChange={(e) => updateSettings('fontSize', Math.min(20, Math.max(7, Number(e.target.value))))}/></label>
            <label className="form-field"><span>Currency</span><input type="text" maxLength={12} value={settings.currency} onChange={(e) => updateSettings('currency', e.target.value)}/></label>
          </div>
          <div className="switch-list">
            <Switch label="Product name" checked={settings.showName} onChange={(v) => updateSettings('showName', v)}/>
            <Switch label="Barcode text" checked={settings.showCode} onChange={(v) => updateSettings('showCode', v)}/>
            <Switch label="Price" checked={settings.showPrice} onChange={(v) => updateSettings('showPrice', v)}/>
            <Switch label="Description" checked={settings.showDescription} onChange={(v) => updateSettings('showDescription', v)}/>
            <Switch label="Use Quantity as copies" detail="Each row prints its quantity" checked={settings.useQuantity} onChange={(v) => updateSettings('useQuantity', v)}/>
          </div>
        </section>
        <div className="privacy-note"><ShieldCheck size={18}/><span>Your spreadsheet never leaves your computer. No account or subscription.</span></div>
      </aside>

      <div className="workspace">
        <Notification notice={notice} onClose={() => setNotice(null)}/>
        <div className="workspace-heading"><div>
          <div className="eyebrow">LABEL PRINTING WORKSPACE</div>
          <h2>Prepare your labels</h2>
          <p>Import your products, customize their labels, and print in minutes.</p>
        </div><div className="small-version">v0.1 · Free Edition</div></div>

        <div className="stat-grid">
          <div className="stat-card"><div className="stat-icon stat-blue"><Table2 size={19}/></div><span>Imported rows</span><strong>{records.length.toLocaleString()}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-green"><CheckCircle2 size={19}/></div><span>Selected products</span><strong>{printable.length.toLocaleString()}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-purple"><LayoutTemplate size={19}/></div><span>Total labels</span><strong>{total.toLocaleString()}</strong></div>
          <div className="stat-card"><div className="stat-icon stat-orange"><Printer size={19}/></div><span>Print batches</span><strong>{total ? batches.toLocaleString() : '0'}</strong></div>
        </div>

        <section className="preview-panel">
          <div className="preview-top"><div><div className="section-eyebrow">LIVE DESIGN PREVIEW</div><h3><Eye size={18}/> Your label, before you print</h3></div>
            <div className="dimension-badge">{settings.width} × {settings.height} mm</div>
          </div>
          <div className="preview-canvas">
            <style>{labelStyles}</style>
            {preview.html ? <div className="preview-paper" style={{
              width: settings.width * 3.78 * previewScale,
              height: settings.height * 3.78 * previewScale
            }}>
              <div className="preview-scaled" style={{ transform: 'scale(' + previewScale + ')', transformOrigin: 'top left' }}
                dangerouslySetInnerHTML={{ __html: preview.html }}/>
            </div> :
              <div className="empty-preview"><LayoutTemplate size={34}/><strong>{preview.error || 'Your label preview will appear here'}</strong><span>{preview.error ? 'Check the barcode format or choose Code 128.' : 'Import a file and map the barcode column to begin.'}</span></div>}
          </div>
          <div className="preview-bottom"><span><span className="live-dot"/> Preview of the first printable product</span><span>Actual proportions · size in millimeters</span></div>
        </section>

        <section className="table-panel">
          <div className="table-toolbar">
            <div><div className="section-eyebrow">YOUR PRODUCT DATA</div><h3><FileSpreadsheet size={19}/> Imported records</h3></div>
            <div className="table-tools">
              <div className="search-box"><Search size={16}/><input aria-label="Search products" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search products…"/></div>
              <button className="button button-outline" disabled={!sheet || !visibleRecords.length} onClick={toggleVisible}>
                {allVisibleSelected ? 'Deselect visible' : 'Select visible'}
              </button>
            </div>
          </div>
          <div className="table-overflow">
            <table className="data-table">
              <thead><tr>
                <th className="check-col"><input aria-label="Select all visible rows" type="checkbox" disabled={!visibleRecords.length} checked={allVisibleSelected} onChange={toggleVisible}/></th>
                <th>#</th><th>Product</th><th>Barcode / SKU</th><th>Price</th><th>Copies</th>
              </tr></thead>
              <tbody>
                {!sheet ? <tr><td colSpan={6}><div className="empty-table"><FileSpreadsheet size={26}/><strong>No spreadsheet imported</strong><span>Upload an Excel file or try the sample data.</span></div></td></tr> :
                visibleRecords.length === 0 ? <tr><td colSpan={6}><div className="empty-table">No matching products.</div></td></tr> :
                visibleRecords.slice(0, 100).map((row, i) => {
                  const barcode = cellValue(row, mapping.barcode);
                  return <tr key={row.id} className={!barcode ? 'invalid-row' : ''}>
                    <td className="check-col"><input type="checkbox" aria-label={'Select row ' + row.id} checked={selected.has(row.id)} onChange={() => toggleRow(row.id)}/></td>
                    <td className="row-number">{row.id}</td>
                    <td className="product-cell"><strong dir="auto">{cellValue(row, mapping.name) || '—'}</strong>
                      {settings.showDescription && <small dir="auto">{cellValue(row, mapping.description)}</small>}</td>
                    <td><span className="code-chip" dir="auto">{barcode || 'Missing code'}</span></td>
                    <td className="price-cell" dir="auto">{cellValue(row, mapping.price) || '—'}</td>
                    <td>{copyCount(row, mapping, settings.useQuantity)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>{sheet ? 'Showing ' + Math.min(100, visibleRecords.length) + ' of ' + visibleRecords.length.toLocaleString() + ' matching rows' : 'Import .xlsx or .csv to begin'}{visibleRecords.length > 100 ? ' · Use search to narrow down' : ''}</span>
            <span>Rows without barcode data are skipped</span>
          </div>
        </section>

        <section className="print-panel">
          <div className="print-header">
            <div className="print-header-icon"><Printer size={23}/></div>
            <div><h3>Ready to print?</h3><p>Print in batches of {PRINT_BATCH_SIZE} labels for reliable results.</p></div>
          </div>
          {window.labelDesktop && <label className="form-field printer-field"><span>Destination printer</span>
            <select value={printerName} onChange={(e) => setPrinterName(e.target.value)}>
              <option value="">System print dialog · Choose printer</option>
              {printers.map((printer) => <option key={printer.name} value={printer.name}>{printer.displayName}{printer.isDefault ? ' (default)' : ''}</option>)}
            </select>
          </label>}
          <div className="print-bottom">
            <div className="batch-controls">
              <span className="batch-label">Batch {currentBatch} of {batches}</span>
              <button aria-label="Previous batch" title="Previous batch" disabled={batchStart === 0} onClick={() => setBatchStart((n) => Math.max(0, n - PRINT_BATCH_SIZE))}><ChevronLeft size={18}/></button>
              <button aria-label="Next batch" title="Next batch" disabled={batchStart + PRINT_BATCH_SIZE >= total} onClick={() => setBatchStart((n) => n + PRINT_BATCH_SIZE)}><ChevronRight size={18}/></button>
              <small>{total ? Math.min(batchStart + 1, total).toLocaleString() + '–' + Math.min(batchStart + PRINT_BATCH_SIZE, total).toLocaleString() + ' of ' + total.toLocaleString() : 'No labels selected'}</small>
            </div>
            <button className="button button-primary print-final" disabled={!hasValidMap || !total || busy} onClick={handlePrint}>
              <Printer size={19}/>{busy ? 'Preparing…' : 'Print ' + batchRows.length + ' labels'}<ArrowRight size={17}/>
            </button>
          </div>
          <p className="print-tip"><Info size={16}/> Confirm the label stock size in your printer driver. Test one label before printing a full batch.</p>
        </section>
        <footer className="footer"><span>Excel Label Studio · Free and open source</span><span><RefreshCw size={13}/> Independent of BarTender · No paid license required</span></footer>
      </div>
    </main>
  </div>;
}

export default App;
