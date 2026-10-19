# Source inspection and production readiness audit
Date: 2026-10-19. Repository: `yousseffekryk98-droid/BarTender_import_Excel`, branch `main`.

## Executive summary
Small, offline-oriented React/Vite + Electron application, optimized for **Excel/CSV text-only labels**. This is not a BarTender replacement at Professional/Automation feature parity. Source implementations exist for importing  .xlsx, .csv and .tsv, multi-sheet selection, fixed/Excel text positions, editable template JSON in localStorage, 100-label print batches and Windows printer enumeration/printing. Real Windows printing, packaging, E2E UI behavior and full security audit have **not** passed verification.

## File-by-file inventory (reviewed)
- `package.json` — Vite/Electron deps, two Windows build targets (NSIS/portable), no lockfile committed.
- `vite.config.js` — relative base for packaged file:// renderer, native JSX transformation.
- `index.html` — root document, CSP policy; script-src self after security hardening.
- `electron/main.cjs` — sandboxed BrowserWindows, temporary HTML print job, printer IPC, Windows drivers.
- `electron/preload.cjs` — minimal printer enumeration/print bridge.
- `src/main.jsx` — React root.
- `src/App.jsx` — main designer, import, mapping, template CRUD, form, preview, selection, print and menu actions; still monolithic and needs component decomposition.
- `src/core.js` — row normalization, field guessing, quantities and bounded batching.
- `src/core.test.js` — table, EAN helper (legacy), mappings, escaping, quantity/batch tests.
- `src/templates.js` — header matching, safe template normalization, text and column binding.
- `src/templates.test.js` — strict mapping, printable examples, markup escaping, bounds.
- `src/text-print.js` — absolute positioned text renderer and print page HTML with mm dimensions.
- `src/importers.js` — ExcelJS and Papa Parse, cached formula results, CSV reading.
- `src/importers.test.js` — XLSX/CSV regression tests using programmatic workbooks.
- `src/styles.css` — desktop shell and designer layout, editor controls, responsive styles.
- `.github/workflows/windows.yml` — Linux verification and Windows packaging jobs.
- `.gitignore`, `LICENSE`, `README.md`, `sample/products.csv` — project metadata, installation and sample.

## Confirmed source problems found and corrected
1. **Wrong column printed**: `resolveColumnIndex` could fall back to a guessed semantic column even though an explicit saved column header was missing. Fixed: explicit name always resolves exactly or reports missing; reordering still works.
2. **Unexpected print copy**: `copyCount` treated zero, negative, missing, invalid quantity as one. Fixed: zero labels (unless quantity printing explicitly off).
3. **Truncated columns**: `normalizeTable` used only the header row's width, hiding values in later columns. Fixed: considers first 200 data rows and creates placeholder headings.
4. **Duplicate column headings**: now reports collisions for user correction; duplicate headings are NOT silently treated as the same field.
5. **Missing designer controls**: added functional desktop menus, undo/redo, grid, zoom, record navigation, richer text options, object duplication, warning displays. All UI functionality awaits desktop smoke testing.
6. **Over-permissive script CSP**: removed inline React Refresh JS path and set script-src self; package uses Vite native JSX. Requires production build verification.

## Remaining critical risks
- **Windows runner status:** GitHub Actions jobs execute successfully now. Run 39273573305 passed npm tests, Vite build, NSIS packaging, portable packaging and artifact upload. Physical installation/printer testing remains open.
- **Real hardware not validated**: Electron `print` returns OS submission result, not physical print completion. Page size / fonts / driver stock must be tested on label printer hardware.
- **npm audit**: user's Windows log displayed 20 vulnerabilities (6 moderate, 13 high, 1 critical) on the previous dependency tree. Full `npm audit --json` output is needed to attribute advisories; do not run `npm audit fix --force` blindly. After package edits rerun install, audit and classify direct/transitive impact.
- **Workbook limits**: .xlsx and .csv only, 15 MB maximum, 40 columns and around 10,000 records per sheet; more advanced data handling absent. Excel numeric identifiers longer than 15 digits may already be rounded before import.
- **Browser storage**: saved templates are localStorage-only, per Windows app origin and user profile, with no transactions or version history. Storage errors are not currently surfaced. Export JSON for backup.
- **Data model**: one page/label template with text object array only; no layers, images, tables, group operations, printer-aware layout, print-job DB.
- **Preview fidelity**: CSS mm sizing matches print-document units, but print drivers may scale or clip. Arabic glyph fallback and rotated-text bounding boxes require tests.
- **Security testing**: Electron IPC and template import validation are partially guarded, but file:// HTML printing, dependency advisories, untrusted workbook memory use and cross-window navigation require dedicated threat modeling.
- **Testing:** Real GitHub Actions runs have verified Node unit tests, Vite production build, and Windows EXE packaging. Remaining: Electron GUI workflows, native PDF output, installation and physical printer evidence.

## Immediate verification on user's Windows machine
```powershell
git pull origin main
npm install
npm test
npm run build
npm audit --omit=dev
npm run desktop:dev
npm run dist:win
```
On EXE failure inspect full PowerShell output; expected binaries under `release/` only after builder success. Test a single 50×30 mm label before production runs. Keep import samples synthetic; never upload private spreadsheets in bug reports without redaction.


## Follow-up implementation (same audit session)
- Added native Windows PDF export using Electron's `webContents.printToPDF` and Save dialog; uses label page dimensions in inches and `preferCSSPageSize` to align with mm stylesheet. This is **source-implemented and NOT runtime-verified**.
- Added user-selectable sorting to Excel table; print records follow the same chosen ordering.
- Added built-in shelf, serial-number and address text templates with safe save-as behavior.
- Added functional desktop menu and keyboard shortcuts, more text formatting and a visible grid overlay.
- Added TSV import, with blank line preservation for source-row numbering.
- Removed unused React refresh plugin, switching to native Vite JSX transform for `script-src 'self'`.
- Offline test harness: 17 isolated tests from `src/core.test.js` and `src/templates.test.js` passed by evaluating dependency-free source. This is **not** a substitute for `npm test` on Node with project dependencies, React build, Electron E2E or a real printer.

## v0.4 follow-up: persistence and canvas controls
- Historical template arrays still load under the original localStorage key. New writes are versioned; last valid contents are backed up before changing the primary.
- Damaged template JSON triggers recovery from the backup copy, or a storage-blocking error if both versions are unreadable. Template CRUD only updates UI state after a successful synchronous storage write.
- Full user-template backup/merge JSON workflow, with duplicate-safe imported IDs and 50-template limit. File-backed persistence remains future work.
- Pure `editor-geometry` helpers bound movement/resizing to label millimeters and optional 5 mm snapping.
- The label editor displays a selection rectangle and resize grip. These editor controls do not appear in the print HTML.
- Printing now refuses sheets with duplicate column headings, avoiding accidental ambiguous field selection.
- Follow-up GitHub Actions verified installation, tests and frontend build. The production dependency report is captured as an artifact; physical hardware and UI E2E validation are not yet proven.
