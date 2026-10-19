# Implementation checklist — evidence-driven

**Only check an item after its required validation is performed.** Source changes below may exist while the task remains unchecked for full runtime readiness.

## Phase 0 — Audit
- [x] Review tracked source, config, test, and distribution files and document limitations.
- [x] Compare key edition marketing claims with official Seagull Software documentation and record unsupported detail as Unverified.
- [x] Create architecture, feature-gap matrix and phased implementation plan.
- [x] Fix strict header matching so a missing field does not print a different column (source change and isolated logic check).
- [x] Fix zero/invalid quantity silently treated as one copy (source change and logic regression test).
- [x] Preserve later spreadsheet columns with blank header cells; report duplicate headings (source change).
- [ ] Run actual `npm test` / `npm run build` on a full installed dependency tree and resolve failures.
- [ ] Collect and resolve dependency audit advisories with reviewed `npm audit --json`.
- [ ] Get GitHub Actions runner executing jobs (previous runs failed with zero steps / no runner).
- [ ] Establish baseline screenshot, Windows print sample, and exact printer calibration.

## Phase 1 — Desktop layout / UX
- [x] Source implementation: functional File/Edit/View/Insert/Data/Print desktop menus.
- [x] Source implementation: undo/redo state for field modifications and drag snapshots.
- [x] Source implementation: grid and zoom controls and record navigation.
- [x] Source implementation: field duplication and font/italic/underline/rotation/wrap property editors.
- [ ] Run Electron E2E for all enabled menu commands and keyboard accessibility.
- [ ] Add real ruler, resize handles, snapping, grouping, layers, tool palettes, proper shortcuts.
- [ ] Split oversized `App.jsx` into tested designer/data/print components.

## Phase 2 — Text-only labels
- [x] Source implementation: no barcode required; exact header name binding and field positioning in mm.
- [x] Source implementation: common sanitized renderer shared by preview and print.
- [ ] Compare Arabic/English, mixed-direction, rotated and multiline text in PDF snapshots.
- [ ] Test actual thermal printer clipping, position tolerances, and stock margins.

## Phase 3 — Data sources
- [x] Source implementation: .xlsx/.csv, sheet picker, header picker, visible data rows.
- [ ] Full XLS/TSV + Unicode encoding, full-date/number formatting and precision warnings.
- [ ] Sorting/filtering/refresh wizard, saved connections and connection diagnostics.
- [ ] Large-workbook memory/performance and malformed Excel fuzzing.

## Phase 4 — Templates
- [x] Source implementation: basic localStorage JSON save/edit/duplicate/export/import/delete.
- [ ] Storage error messages, versioned durable persistence and template recovery/history.
- [ ] Template groups/categories, favorites and ready-made designs.

## Phase 5 — Printing
- [x] Source implementation: Windows printer enumeration, manual system dialog and 100-label batches.
- [ ] Driver tests, reprint/job log, timeout/error recovery, PDF export, calibration wizard.
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
- [ ] Successful Windows build and uploaded EXE artifacts.
- [ ] Fresh Windows 10/11 machine installs, launches, saves, prints and uninstalls correctly.

## Phase 10 — QA
- [x] Add regression tests for Excel sample/formula, column-name matching, quantity validation, HTML escaping.
- [ ] Full `node --test` and web/Electron build on Windows or CI.
- [ ] Playwright Electron UX, integrated printer simulator, PDF compare, accessibility and physical printer tests.

## Known blockers
- GitHub Actions runs currently fail before steps begin; no installation artifact available from CI.
- No real Windows printer/driver access in this agent environment.
- Full npm dependency install and npm audit cannot be performed without package registry/network access. The user's last npm install reported 20 advisories on an older dependency tree.

**Maintainer signoff criteria:** confirm exact `npm test`, `npm run build`, `npm run dist:win` exit status, visually verify text labels against imported Excel, archive sample test print and machine/printer details, then update checkboxes.
