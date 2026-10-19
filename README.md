# Excel Label Studio

A free, self-contained Excel/CSV-to-label application for Windows (and a browser-based local preview). It is **independent of Seagull BarTender**: it does not change BarTender, unlock database connections, or bypass licensing restrictions.

## Features

- Import `.xlsx` Excel workbooks (multiple sheets) and `.csv` files without uploading them anywhere.
- Automatically suggest column mapping for Product Name, Barcode, Price, Description, and Quantity; change any mapping manually.
- Design labels with custom sizes in millimeters, optional company name and price, Code 128, EAN-13, or QR codes.
- Select rows, search imported data, and preview actual label content.
- Print labels in batches of 100 with optional per-row quantities. Print thousands of labels in consecutive batches without creating one enormous job.
- Choose a Windows printer in the packaged desktop app, or use the operating system print dialog. No account, subscription, database, or internet connection is required after installation.
- Import-only data stays in local application memory and is cleared when you close the app.

## Quick start

Install [Node.js 20+](https://nodejs.org/), then:

```bash
npm install
npm run desktop:dev
```

For web development: `npm run dev` and open the Vite address. For the actual Windows desktop application:

```bash
npm run dist:win
```

Run the generated Windows installer in `release/`. You can also download the installer artifact from the latest successful GitHub Actions run. The first install needs internet for npm or for downloading the installer, but the installed app runs offline.

## Printing

1. Connect your USB / network barcode printer and **install the manufacturer's Windows printer driver**.
2. Import an Excel `.xlsx` workbook (or `.csv`). Choose a sheet.
3. Map at least the **Barcode** column. The barcode data must be nonempty. For EAN-13, codes must have 12 or 13 digits and valid EAN checksums.
4. Set the actual roll label dimensions (e.g. 50 × 30 mm) and preview them.
5. Select rows, optionally enable **Use Quantity as Copies**, and print one batch at a time.
6. Choose an installed printer for direct printing in the desktop app, or select **System print dialog**. In the system dialog, set the printer's stock/label size, scaling **100%**, margins **none**, and disable headers/footers.

Some printer drivers override custom sizes; define the label stock in Windows Printer Properties if labels are clipped. Test one label before bulk printing.

### Important limitations

- Excel **`.xlsx`**, not legacy **`.xls`**. In Excel, use **Save As → .xlsx** or export CSV for old files.
- Only the first row of each sheet is treated as the header; merged-cell and complex Excel formulas are not evaluated. Formula cells use cached results, if provided by Excel.
- Leading zeros should ideally be stored as **Text** in Excel. Simple numeric formats such as `000000` are supported.
- Print batches have 100 labels each to prevent overloading inexpensive printers. A successful print call means the OS accepted the print request, not that every physical label has emerged.
- BarTender `.btw` files are proprietary and are not imported. Recreate the desired label layout in this app.
- Printing requires a working printer driver and is not hardware-tested with every model.

## Developer commands

```bash
npm test             # Node tests for mapping, quantity, and batching
npm run build        # Browser production build
npm run desktop      # Electron using the built frontend
npm run dist:win      # Windows .exe installer (build on Windows)
```

The Electron process uses context isolation, sandboxed renderers, and a minimal print-only IPC bridge. Imported spreadsheets are processed locally. The embedded Windows installer is not code-signed; Windows may display an unverified publisher warning.

## Sample

Start with [sample/products.csv](sample/products.csv). Use **Code 128** for arbitrary product codes; **EAN-13** for properly formatted retail EAN codes.

## License

MIT license — free to use, modify, and distribute.
