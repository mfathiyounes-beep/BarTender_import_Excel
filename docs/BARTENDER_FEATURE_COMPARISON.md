# BarTender on-premises editions vs Excel Label Studio
Audit date: 2026-10-19

## Authoritative references
- https://www.bartendersoftware.com/product/pricing (edition overview and on-premises feature categories, checked 2026-10-19)
- https://help.seagullscientific.com/2022/en/content/Main_Display_Screen.htm (Designer toolbox, layout, toolbars)
- https://help.seagullscientific.com/2022/en/subsystems/gsm/content/GS_User_Databases.htm (database wizard, linked data-source objects)
- https://help.seagullscientific.com/2022/en/Content/Toolbox_DataSources_Pane.htm (database field toolbox)
- https://support.seagullscientific.com/hc/en-us/articles/360047474093-New-Database-Connectors-in-BarTender-2021

**Edition interpretation:** Official current marketing explicitly describes Starter as simple label design and broad printer support; Professional adds *dynamic data-driven templates* and advertises RFID; Automation adds *REST API/File Drop integrations and on-demand forms*. The public pricing feature matrix lists many detailed capabilities but its text extraction does not preserve the complete tier checkmark positions for all items. An **Unverified** tier entry deliberately means not independently established. Do not interpret an Unverified entry as a feature absence.

**Status legend for OUR application:** CODE-IMPLEMENTED = reviewed source exists, not fully runtime/hardware verified; PARTIAL = some functionality source exists; MISSING = no implementation; TEST-VERIFIED = specific isolated logic checks executed; NOT APPLICABLE = intentionally excluded from near-term scope. None mean parity with BarTender or physical printer signoff.

| Feature | Starter | Professional | Automation | Our status | Missing / notes | Priority | Verification gate |
|---|---|---|---|---|---|---|---|
| Local label designer | Confirmed | Confirmed | Confirmed | PARTIAL | Move/selection, layout and text; no full Designer feature set | P0 | E2E design/save/reopen |
| Windows printing | Confirmed | Confirmed | Confirmed | PARTIAL | Driver-specific output and spooling not hardware tested | P0 | Real Windows driver + two printers |
| Dynamic data-driven templates | Unverified | Confirmed | Confirmed | CODE-IMPLEMENTED | No joins/lookup advanced data | P0 | Reordered-columns, 100+ records |
| Excel/CSV source | On-premises feature matrix lists basic Excel/CSV, tier checkmarks unverified | Unverified | Unverified | PARTIAL | XLS/TSV, row/format edge cases | P0 | Fixtures with date, number, Arabic, leading zeros |
| Template/field positioning | Designer documented | Designer documented | Designer documented | CODE-IMPLEMENTED | Resize handles, rotation interaction, snapping | P0 | mm positioning screenshot/diff |
| Text formatting | Designer documented | Designer documented | Designer documented | PARTIAL | Rich text, advanced overflow and per-span styles missing | P0 | Unicode/RTL PDF and print comparison |
| Toolbox data sources | Documented | Documented | Documented | PARTIAL | Excel headers in editor, no drag source to object | P1 | Create bound object from data pane |
| Record navigation and previews | Documented | Documented | Documented | CODE-IMPLEMENTED | Print preview PDF proofing not completed | P1 | Navigate/print record test |
| Multiple templates + save/reload | Documented | Documented | Documented | PARTIAL | localStorage JSON only; versioning/crash recovery missing | P1 | App restart, migrate and backup |
| Undo/redo | Designer UI characteristic | Designer UI characteristic | Designer UI characteristic | CODE-IMPLEMENTED | Per-editor interaction smoke test pending | P1 | Drag/text edit undo/redo |
| Objects: graphics/shapes/tables | Feature matrix lists capabilities; individual tier details unverified | Unverified | Unverified | MISSING | Need object model and rendering backends | P2 | E2E PNG, shape, table print |
| 1D/2D barcodes | Confirmed simple barcode | Confirmed | Confirmed | MISSING | Previous barcode-only code removed in text edition | P2 | Scan test printed samples |
| RFID encoding | Not advertised in Starter summary | Advertised | Advertised | MISSING | Hardware, encoding and printer APIs | P3 | RFID hardware tests |
| Advanced connected databases | Tier detail unverified | Dynamic data advertised | Dynamic data advertised | MISSING | SQL, ODBC, workbook joins | P2 | Integration with synthetic DB |
| Print-time data entry forms | Tier detail unverified | Tier detail unverified | Advertised | MISSING | Form builder, validated prompts | P2 | Input-required print path |
| Label templates from data values | Tier detail unverified | Dynamic data advertised | Dynamic data advertised | PARTIAL | One template per print job, no conditional layout variation | P2 | Conditional template E2E |
| Printing history/reprint | Feature matrix, tier unclear | Unverified | Unverified | MISSING | Need persisted job model | P1 | Cancel/reprint/recovery |
| Print to PDF | Feature matrix lists native PDF for some tiers; tier unclear | Unverified | Unverified | MISSING | Can use OS printer dialog; no built-in export API | P1 | Multi-page PDF physical size |
| REST API / File Drop | Not in Starter marketing | Not in Professional marketing | Confirmed | MISSING | Must be opt-in, localhost authenticated, path sandbox | P3 | Security and file watcher tests |
| Local automation rules/queues | Not in Starter marketing | Not in Professional marketing | Automation marketed | MISSING | Scheduler, retries, job queue, audit | P3 | State-machine and failure tests |
| Remote/cloud printing, centralized roles, audit | Enterprise/cloud-dependent | Unverified | Unverified | NOT APPLICABLE | Not a single-PC local core need; opt-in later | P4 | Architecture/security review |
| Proprietary BTW format | BarTender-native | BarTender-native | BarTender-native | NOT APPLICABLE | No legal/verified .btw import/export | P4 | Supported interchange only |

## Scope
Target a similar **professional workflow** (menu/toolbox/canvas/data/properties/print), not copying proprietary branding, artwork, binary formats or paid features by circumventing licensing. Feature parity requires each acceptance test, documented limitations, and printer hardware validation. This matrix is an implementation comparison, not a vendor certification.
