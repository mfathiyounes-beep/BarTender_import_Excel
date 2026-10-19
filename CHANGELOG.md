# Changelog

## 0.4.0 — Designer layout and resilient saved templates
- Versioned local template library with previous-good recovery snapshot and legacy array compatibility.
- Explicit storage failure alerts and full JSON library export/merge, preserving user-created templates.
- Text object visual resize handle, selected bounding box and optional physical 5 mm grid snapping.
- Geometry unit tests for movement, resizing, page bounds and snap precision.
- Block ambiguous duplicate Excel column headings before printing.
- Confirm unsaved changes before discarding/replacing a working template.
- CI production dependency audit report (informational); manual Windows printer validation remains pending.

## 0.3.0 — Excel data source and Windows packaging
- Custom text fields, price and product labels; four built-in templates.
- Excel .xlsx, CSV and TSV import; header-row selection, strict binding, sorting and record preview.
- Designer menus, zoom, grid, undo/redo, font styling and re-orderable labels.
- Windows printer enumeration, batch printing, native PDF export.
- GitHub Actions builds verified NSIS installer and portable Windows EXE in run 39273573305.

This is an independent label designer inspired by familiar desktop design workflows, not a copy of proprietary BarTender assets or software. Features not listed as implemented remain tracked in docs/TASKS.md.
