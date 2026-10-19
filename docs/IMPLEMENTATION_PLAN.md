# Phased development plan — BarTender-class workflows, original implementation

Scope: independent Windows offline label designer. Text-only Excel labels are the top priority. Do **not** promise full BarTender parity without verified feature gates. Work on `main` with small tested commits as requested.

| Phase | Goal | Exit gate |
|---|---|---|
| P0 Audit/security & accurate Excel | Inventory, feature matrix, strict mapping/quantity/headers, dependency review | `npm test` + regression fixtures + reviewed audit |
| P1 Desktop designer | Functional menus, toolbox, data sources, canvas, properties, zoom/grid/undo/redo | E2E create/edit/save/restart/edit |
| P2 Text object engine | Position/size, fonts, line wrap/rotation, Arabic/English, clipping tests | Print/PDF coordinate golden fixtures |
| P3 Data connection wizard | XLSX/CSV/TSV/XLS, sheet/headers, sort/filter, identifier safety, refresh | 1000 synthetic rows + mixed-language tests |
| P4 Templates | Versioned storage, autosave, migration, library/search, portable export | Rename/upgrade/recover 50 templates |
| P5 Print reliability | Win driver detection, PDF export, job status, test print, queue/retry | Windows 10/11 tests, driver stock calibration |
| P6 Pro features | Image/shape/table/barcodes, validation/formula fields, data entry | Feature-by-feature integration tests |
| P7 Automation | Opt-in file-drop, authenticated localhost API, jobs/rules/retries | Security, path-sandbox, watchdog and restart tests |
| P8 Security/performance | Threat model, safe dependencies, large inputs, CSP, IPC, storage integrity | Security review + audit resolution |
| P9 Distribution | Signed/publisher verified if available, NSIS & portable EXE | Downloadable artifact, fresh-PC install/uninstall |
| P10 Quality & parity | Accessibility, E2E, visual regression, hardware, docs | Completed acceptance matrix with evidence |

## Priority of this audit pass
1. Fix high-risk wrong-label printing scenarios (silent incorrect column, zero quantity).
2. Preserve all data columns and report duplicates.
3. Improve the text-oriented desktop workflow without overclaiming.
4. Add regression tests and file-based implementation documentation.
5. Leave packaging/HW gates pending rather than incorrectly marking them complete.

## Next verifiable increments
- **Near-term A:** Windows `npm test` and `npm run build` after code updates; collect stack traces and fix. Resolve GitHub Actions runner/account failure.
- **Near-term B:** Playwright Electron E2E for sample import/template save/reload, font editing, drag/undo/redo, label snapshot and keyboard accessibility.
- **Near-term C:** Calibrate real Windows label-printer paper sizes and receipt of print job; add PDF-to-pixel comparison for 50×30 mm Arabic/English labels.
- **Near-term D:** Replace brittle monolithic `App.jsx` and per-origin localStorage with modular state architecture and persistent versioned template management.
- **Then:** Full BarTender-like toolbox, layers, images, shapes, barcode support, database wizard, job history and automation separately. Independent branding/assets only.

## No-surprise rules
- Preserve local saved templates under `excel-label-studio:text-templates:v1`; any migrations must read old objects.
- Do not execute Excel macros/formulas.
- Do not claim printer has physically printed when OS merely accepts a job.
- Do not assume security advisories fixed without `npm audit` evidence.
- Don't claim an installer exists until a Windows build actually creates it.
- No button enabled without a meaningful, wired action.
