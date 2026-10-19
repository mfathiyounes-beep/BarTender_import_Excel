# Excel Label Studio — Text-Only Label Designer

Free, offline Windows desktop application. Import Excel products, arrange **text from any Excel columns anywhere on your label**, save the layout as a **reusable template**, then print text-only labels without BarTender.

This is an **independent** application; it does not modify BarTender or bypass any paid BarTender features.

## Windows: download or create the EXE

The commands below run in PowerShell from your cloned repository, for example:

```powershell
cd C:\Users\YOUSSEF\Desktop\freebar\BarTender_import_Excel
git pull origin main
npm install
npm test
npm run desktop:dev
```

`npm run desktop:dev` **opens the app for development**; it does **not** create an EXE installer. Close it using `Ctrl+C` in PowerShell before building.

To build both an installer EXE and a portable EXE, run:

```powershell
npm run dist:win
explorer .\release
```

Your results appear in:

```text
C:\Users\YOUSSEF\Desktop\freebar\BarTender_import_Excel\release\
```

Look for an `Excel Label Studio Setup 0.4.0.exe` **installer** and a portable `Excel Label Studio 0.4.0.exe` (exact filenames can vary slightly with electron-builder). The installer installs the app on another Windows PC; the portable EXE runs without installation. **The receiving PC does not need Node.js or BarTender**.

The Windows computer doing the build needs an internet connection for initial Electron downloads. The installed application can subsequently operate offline.

## How to design and save a label

1. Click **Load example spreadsheet** or import your `.xlsx` / `.csv`.
2. If the spreadsheet starts with a report title, select the actual **Header row in Excel**. Choose the sheet if your workbook has several.
3. Start from **Text only · Product label**. The default sample shows:
   ```text
   +------------------------------------------------+
   |                                                |
   |                 Wireless Mouse                 |
   |                                                |
   |                    325 EGP                     |
   |                                                |
   +------------------------------------------------+
   ```
   The actual preview renders the label at its specified proportions (by default, 50 x 30 mm). **No barcode is generated or required**.
4. Set the physical label width and height in millimeters.
5. Under **Fields on this label**, click a field, select the **Excel column for this position**, then change its font, alignment, prefix/suffix, or X/Y coordinates.
6. **Drag text in the preview** to move it, or set precise X, Y, width, and height (mm).
7. Use **+ Excel column** to place another spreadsheet value. Use **+ Fixed text** for a title or static note.
8. Enter a template name, click **Save as new** (or **Save changes** after selecting your saved template).
9. Next time, import a new Excel file and select your saved template. The **position is preserved** and fields find columns by their **header names** rather than column numbers. If a column is missing, a warning appears: map it or delete the field before printing.
10. For another computer use **Export** to save the template as `.json` and **Import** in the other app. Templates otherwise stay in your local browser/Electron data storage.

**Example:** A label can contain a product title at X=2mm / Y=3mm, a price at X=2mm / Y=17mm, and an optional serial number at any other position. When you import different products, *each Excel row prints a separate label* using those locations.

## Excel input

Example `sample/products.csv`:

| Product Name | Barcode | Price | Quantity | Description |
|---|---|---:|---:|---|
| USB-C Cable | 123456789012 | 150 | 2 | 1 meter braided |
| Wireless Mouse | 987654321098 | 325 | 1 | 2.4 GHz |

Even though the sample contains a `Barcode` column, **text-only labels don't need it**. Map whichever columns you wish, e.g. patient name, item size, batch number, date, address, or serial number.

- Supports **Excel .xlsx** and **CSV**; for old `.xls` use Excel's **Save As → .xlsx**.
- Supports multiple worksheets and manually chosen header row (first 20 rows).
- Reads **actual Excel cell data**, rich text, and cached formula results. It does not calculate Excel formulas itself.
- Preserves text-valued identifiers and simple numeric zero-padding formats (e.g. `000000`). In Excel, format serials and identifiers as **Text** so Excel doesn't strip leading zeros or round long numeric strings.
- Up to **15 MB**, **10,000 rows**, and **40 columns** per worksheet are processed. For large files, split into several workbooks.
- Up to **30 label fields** and **50 saved templates**.
- Search your spreadsheet rows; browse full imported columns by scrolling the table horizontally.

## Printing

1. Install your manufacturer's **Windows printer driver**, set the stock width and height in Windows printer preferences.
2. Print the first 1–2 rows to verify orientation and size.
3. Select your Windows printer or choose **System print dialog**.
4. Choose which rows to print. If you want a specific Excel quantity to control copies, select the **Quantity column** and tick **Print copies from Quantity column**.
5. Print batches up to 100 labels. Move to the next batch with the navigation buttons.

For thermal label printers, set **100% scaling**, **zero margins**, and no page headers/footers in the print dialog. Many printer drivers override software paper settings, so verify dimensions in the Windows driver too.

**Printer safety:** A successful Windows print call only means the system accepted the job; it does not confirm that every physical label printed successfully.

## Dev / tests

```powershell
npm install
npm test
npm run build
npm run desktop:dev
npm run dist:win
```

All imported spreadsheets are parsed on-device, no account, cloud database, or internet needed for printing. The Electron desktop IPC bridge only exposes installed printer names and sending a print job. Template JSON is restricted to supported fields before use; spreadsheet text is escaped before being inserted into printable HTML.

## About npm warnings

`npm install` sometimes shows **deprecated dependencies and security findings** from the packaging toolchain. These warnings do not mean installation failed. Use `npm audit` for the exact dependency paths; do not blindly run `npm audit fix --force` because it can break Electron/Vite. Security audits and native printer smoke tests should be performed before distributing binaries broadly.

This project is MIT licensed. See [LICENSE](LICENSE).


## Designer improvements in v0.3.0

The desktop workspace now includes functional **File, Edit, View, Insert, Data, and Print** menus; field duplication; undo/redo with Ctrl+Z / Ctrl+Y; Ctrl+S for template save, Ctrl+O for import and Ctrl+P to print. Zoom controls (50–200%), optional grid, per-record navigation, and clickable Excel column sorting help review your data before printing.

Text fields support Arial, Tahoma, Segoe UI, Consolas or Times New Roman, plus bold, italic, underline, wrapping and 0°/90°/180°/270° rotation. These features need PDF/physical-print regression testing before being considered print-calibrated.

The built-in reusable layouts are **Product label**, **Shelf / Stock label**, **Serial number label**, and **Shipping address**. The latter layouts expect their matching Excel headings (e.g. Serial, Recipient, Address, City); mismatches must be mapped explicitly, never automatically replaced with unrelated data.

Supports **.xlsx, .csv and .tsv**, including tab-separated Arabic values. The same safe document renderer is used for preview, native Windows printing and **Export PDF**. PDF export is available in the installed Electron desktop application under the Print menu; a Save dialog writes the batch to a chosen .pdf file. PDF export remains runtime-unverified on Windows.

This is original software with a BarTender-inspired professional workflow, **not a pixel-identical BarTender copy**. Full Automation/Professional feature parity is tracked in `docs/BARTENDER_FEATURE_COMPARISON.md` and `docs/TASKS.md`.

## v0.4 — Safer template storage and visual resizing

- Existing user templates are migrated **without deleting or silently resetting them**. The original localStorage key remains compatible with older v0.2/v0.3 saved template arrays.
- Saved template libraries now use a versioned envelope (`version: 2`) and retain the previous known-good library as a recovery copy.
- Failed or blocked storage writes show an error instead of falsely claiming the template was saved. Both damaged primary and backup data are preserved rather than overwritten.
- Use **Back up all** to export every user template to portable JSON. Use **Import JSON** to merge the backup into another installation without overwriting existing templates.
- The selected text object now has an on-canvas **resize handle**. Optionally enable **Snap 5 mm** to keep object positioning aligned to a fixed physical grid. Manual numerical X/Y/size inputs remain available.
- Duplicate spreadsheet headers now **block printing** until corrected. This prevents selecting the wrong values when identical Excel column headings appear.
- Unsaved edits trigger a discard confirmation when switching templates or leaving the application.

### How to test these changes
1. Launch v0.4. Import `sample/products.csv` and preview a 50 × 30 mm label.
2. Create a new text field, resize it using the bottom-right handle, move it, then Undo and Redo.
3. Turn on **Grid** and **Snap 5 mm**; move/resize the field and inspect its X/Y/width/height values.
4. Save a template, close and reopen the application, and choose the saved template.
5. Click **Back up all** to produce a .json backup. Import that JSON on a second Windows installation.
6. Print one label from a text-only template, then compare the physical stock dimensions and PDF output.

**Verification scope:** Automated project tests, Vite build and EXE packaging are CI-verified; on-canvas Electron interaction, PDF rendering, and actual printer output still require machine-level testing. Do not treat a successful OS print call as physical confirmation.
