# Implementation checklist — evidence-driven

**Only check an item after its required validation is performed.** Source changes below may exist while the task remains unchecked for full runtime readiness.

## Phase 0 — Audit
- [x] Review tracked source, config, test, and distribution files and document limitations.
- [x] Compare key edition marketing claims with official Seagull Software documentation and record unsupported detail as Unverified.
- [x] Create architecture, feature-gap matrix and phased implementation plan.
- [x] Fix strict header matching so a missing field does not print a different column (source change and isolated logic check).
- [x] Fix zero/invalid quantity silently treated as one copy (source change and logic regression test).
- [x] Preserve later spreadsheet columns with blank header cells; report duplicate headings (source change).
- [x] Full dependency installation, `npm test`, and `npm run build` passed in GitHub Actions (run 39273573305; repeated on later revisions).
- [ ] Collect and resolve dependency audit advisories with reviewed `npm audit --json`.
- [x] GitHub Actions runners execute the verification and Windows installer jobs (run 39273573305).
- [ ] Establish baseline screenshot, Windows print sample, and exact printer calibration.

## Phase 1 — Desktop layout / UX
- [x] Source implementation: functional File/Edit/View/Insert/Data/Print desktop menus.
- [x] Source implementation: undo/redo state for field modifications and drag snapshots.
- [x] Source implementation: grid and zoom controls and record navigation.
- [x] Source implementation: field duplication and font/italic/underline/rotation/wrap property editors.
- [ ] Run Electron E2E for all enabled menu commands and keyboard accessibility.
- [x] Source + unit tests: on-canvas resize handles, field movement and optional 5 mm snapping.
- [ ] Add real ruler, group/layers, alignment guides, palettes and more keyboard operations.
- [ ] Split oversized `App.jsx` into tested designer/data/print components.

## Phase 2 — Text-only labels
- [x] Source implementation: no barcode required; exact header name binding and field positioning in mm.
- [x] Source implementation: common sanitized renderer shared by preview and print.
- [ ] Compare Arabic/English, mixed-direction, rotated and multiline text in PDF snapshots.
- [ ] Test actual thermal printer clipping, position tolerances, and stock margins.

## Phase 3 — Data sources
- [x] Source implementation: .xlsx/.csv, sheet picker, header picker, visible data rows.
- [x] Source implementation: TSV UTF-8 import, including Arabic text and blank row locations.
- [ ] Full XLS + Unicode encoding, full-date/number formatting and precision warnings.
- [x] Source implementation: sorting of Excel rows and sort-respecting print order.
- [ ] Advanced filters/refresh wizard, saved connections and connection diagnostics.
- [ ] Large-workbook memory/performance and malformed Excel fuzzing.

## Phase 4 — Templates
- [x] Source implementation: basic localStorage JSON save/edit/duplicate/export/import/delete.
- [x] Source + unit tests: versioned localStorage envelope, previous-good backup recovery, error surfacing and full-library JSON import/export.
- [ ] Durable transactional file-backed template storage, autosave, crash recovery and version history.
- [ ] Template groups/categories, favorites and ready-made designs.

## Phase 5 — Printing
- [x] Source implementation: Windows printer enumeration, manual system dialog and 100-label batches.
- [x] Source implementation: native batch PDF export via Save dialog.
- [ ] Driver tests, reprint/job log, timeout/error recovery, PDF layout tests, calibration wizard.
- [ ] Physical printer evidence. Pending for every model.

## Phase 6 — Professional capabilities
- [ ] Images, shapes, tables, optional barcode objects, data formatting, formulas, forms.

## Phase 7 — Automation capabilities
- [ ] Secure localhost API, file watchers, job queue, rules, credentials, retry and audit logs.

## Phase 8 — Reliability/security
- [x] Source implementation: reduce script CSP by dropping inline React refresh plugin.
- [ ] Verify compiled CSP and Electron renderer behavior in dev/production.
- [ ] Security review of file:// print path, malformed template imports, dependency tree and event routing.
- [ ] E2E offline/no network traffic tests.

## Phase 9 — Distribution
- [x] Source packaging configuration includes NSIS installer and portable targets.
- [x] Windows NSIS and portable builds succeeded; artifact uploaded in run 39273573305 (v0.3), verified packaging jobs in later runs.
- [ ] Fresh Windows 10/11 machine installs, launches, saves, prints and uninstalls correctly.

## Phase 10 — QA
- [x] Add regression tests for Excel sample/formula, column-name matching, quantity validation, HTML escaping.
- [x] Full Node test suite and Vite production build passed in GitHub Actions (run 39273573305; later revisions include new template and geometry tests).
- [ ] Playwright Electron UX, integrated printer simulator, PDF compare, accessibility and physical printer tests.

## Known blockers
- Previous GitHub Actions scheduling failures have been resolved; Windows installers now build. Future run failures should be reviewed separately.
- No real Windows printer/driver access in this agent environment.
- GitHub Actions can now install packages and run npm audits. Production dependency audit is uploaded as a separate report (moderate threshold); inspect that report and development-tooling advisories before declaring audit clean.

**Maintainer signoff criteria:** confirm exact `npm test`, `npm run build`, `npm run dist:win` exit status, visually verify text labels against imported Excel, archive sample test print and machine/printer details, then update checkboxes.

### Recent source additions (all require desktop E2E gates)
- [x] Source: File/Edit/View/Insert/Data/Print menu wiring and Ctrl+O/S/P/Z/Y keyboard shortcuts.
- [x] Source: four built-in text-only label examples and guarded save-as.
- [x] Source: Excel/CSV/TSV importer with header picker and reorder-resistant names.
- [x] Source: batch PDF export through native Electron Save dialog.
- [ ] Verify PDF dimensions with generated PDF page metadata and Windows print calibration.
- [ ] Verify Vite native JSX build, Electron CSP and production runtime.

## Phase 4 continuation — current source branch
- [x] Added `src/template-library.js` with validated envelope migration, recoverable previous-good copy, and explicit save failure reporting.
- [x] Added `src/template-library.test.js` for corrupt/missing storage, schema versions, duplicate IDs, quotas, and backups.
- [x] Added `src/editor-geometry.js` / `src/editor-geometry.test.js` for zoom-independent movement, bounded resize, and optional snapping.
- [x] Added selected-field on-canvas resize handle and confirmation when discarding unsaved edits (source only).
- [x] Block batch printing when duplicate Excel header labels would make columns ambiguous (source only).
- [ ] Electron-level E2E tests for drag/resize, templates restored across restarts, and PDF export.
- [ ] Real hardware print calibration and documented results by printer model.
