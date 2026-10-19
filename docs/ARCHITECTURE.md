# Excel Label Studio — architecture and security boundaries

## Current offline execution model
```text
Local .xlsx / .csv ------> React renderer (ExcelJS / PapaParse)
                                 |
                        normalized sheets, headers, rows
                                 |
                        selected records + saved template
                                 |
                     strict header-based field resolution
                                 |
                   textPrintDocument (escaped HTML + mm CSS)
                                 |
       browser print dialog OR Electron preload IPC (no Node)
                                 |
                      Electron main -> Windows printer driver
                                 |
                           physical printer
```

The renderer runs in a sandboxed Electron BrowserWindow with `contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`; preload exposes **only** printer list and print IPC. Renderer does not hold filesystem write privileges. The main process validates job size, mm dimensions and selected installed printer.

## Data model (current)
```text
Worksheet { name, headerRow, headers: string[], records: [{id,cells:string[]}],
            sourceRows:string[][], duplicateHeaders:string[] }
Template { id, name, width:mm, height:mm, fields: Field[] }
Field { id, type:column|text, label, columnKey, autoField,
        text, prefix, suffix, x:mm, y:mm, width:mm, height:mm,
        fontSize:px, bold, italic, underline, wrap,
        fontFamily, rotation:0|90|180|270, align }
```
Column bindings use exact normalized header names when `columnKey` is present, independent of the incoming column order. Missing headers block batch printing. Fixed text is not tied to a barcode.

## Single source of truth
`src/templates.js` normalizes untrusted JSON and resolves fields. `src/text-print.js` generates the **same label HTML** for both preview and printing. Drag/position units are millimeters; the canvas is displayed with a CSS 96px/in reference scale and a zoom transform. This is not yet a calibrated driver-level WYSIWYG guarantee.

## Data retention
- Imported row contents: renderer memory, discarded when app exits.
- Templates: per-user Electron localStorage key `excel-label-studio:text-templates:v1`.
- Portable template backup/transfer: JSON export/import, sanitized on import.
- Print job HTML: transient file in OS temp directory, unlinked after IPC request.
- No network API, cloud database, or telemetry in the app code.

## Planned v1 architecture (not implemented)
Split App into document manager, toolbox/layers, canvas engine, properties inspector, data-source wizard, record-browser, print manager, and automation service. Use a versioned schema with migrations, recoverable local persistence (IndexedDB/SQLite), immutable editor history, job tracking, typed IPC contracts, and PDF snapshot tests before enabling automation. Automations should run under authenticated localhost IPC/API only and never scan arbitrary user directories without permission.

## Trust boundaries and tests
- Untrusted workbook and CSV -> bounded parse + formula cache only, no macro execution.
- Untrusted template JSON -> schema sanitization, control print resource usage, escaping.
- IPC -> only main window may request; validate printer and job size; prohibit arbitrary renderer file write.
- Web links -> external HTTPS only, never expose local file paths through link handling.
- Windows printer -> only claims OS delivery, not physical output.
- Local service, if added -> bind loopback, authenticated, off by default, hard-coded allowed file roots, rate limits and audit log.

## Compatibility
Windows 10/11 planned; Node.js required for **building**, not for installed EXE. Packaging configured for NSIS installer and portable EXE but is not verified until local build/CI succeeds. BarTender `.btw` files are proprietary and not imported.


## PDF export path (source-implemented)
An explicit user click sends the current bounded batch of label HTML through `label:export-pdf` IPC. The main process uses the same validation as print, displays a native Save dialog, loads transient local print HTML in a sandboxed hidden window and calls `webContents.printToPDF` at `widthMm/25.4` × `heightMm/25.4` inches with `preferCSSPageSize`. It writes only the destination the user chose and cleans up the temporary HTML. PDF output and print-calibration tests remain pending.
