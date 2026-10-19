import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { normalizeTable } from './core.js';

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 10000;
const MAX_COLUMNS = 40;

// Read the underlying value, not formulas as source code or scientific-notation formatting.
// Excel does not store more than 15 significant digits accurately in numeric cells.
// Product IDs with leading zeros or very long numbers should be formatted as Text in Excel.
export function excelCellText(cell) {
  let value = cell.value;
  if (value == null) return '';
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((v) => v.text ?? '').join('');
    if ('result' in value) value = value.result;
    else if ('text' in value) value = value.text;
    else if ('error' in value) return '';
    else return String(cell.text || '');
  }
  if (value == null) return '';
  if (typeof value === 'number') {
    const format = String(cell.numFmt || '');
    const firstSection = format.split(';')[0];
    // Excel's padded integer formats, for example "000000".
    if (Number.isSafeInteger(value) && /^0{2,}$/.test(firstSection)) {
      return String(value).padStart(firstSection.length, '0');
    }
    return String(value);
  }
  return String(value);
}

export async function readSpreadsheet(file) {
  if (!file) throw new Error('Choose an Excel .xlsx file or .csv file.');
  if (file.size > MAX_BYTES) throw new Error('File is larger than 15 MB. Split it into smaller files.');
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    const contents = (await file.text()).replace(/^\uFEFF/, '');
    const result = Papa.parse(contents, { skipEmptyLines: 'greedy', dynamicTyping: false });
    if (result.errors.length) {
      const err = result.errors[0];
      throw new Error('CSV error near row ' + (Number(err.row) + 1) + ': ' + err.message);
    }
    const rows = result.data.slice(0, MAX_ROWS + 20)
      .map((cells) => cells.slice(0, MAX_COLUMNS).map((value) => String(value ?? '')));
    const sheet = normalizeTable(file.name, rows);
    if (!sheet || !sheet.records.length) throw new Error('The CSV has no product rows.');
    return [{ ...sheet, sourceRows: rows }];
  }

  if (extension !== 'xlsx') {
    throw new Error('Only .xlsx and .csv are supported. Save legacy .xls files as .xlsx first.');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('This workbook could not be opened. Ensure it is a valid, unencrypted .xlsx file.');
  }
  const sheets = [];
  for (const worksheet of workbook.worksheets) {
    const rows = [];
    const width = Math.min(MAX_COLUMNS, Math.max(1, worksheet.columnCount || 1));
    for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, MAX_ROWS + 20); rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      rows.push(Array.from({ length: width }, (_, index) => excelCellText(row.getCell(index + 1))));
    }
    const sheet = normalizeTable(worksheet.name, rows);
    if (sheet && sheet.records.length) sheets.push({ ...sheet, sourceRows: rows });
  }
  if (!sheets.length) throw new Error('No populated sheets with data rows were found.');
  return sheets;
}
