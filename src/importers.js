import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { normalizeTable } from './core.js';

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 10001;

function excelCellText(cell) {
  let value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((x) => x.text || '').join('');
    if ('result' in value) value = value.result;
    else if ('text' in value) value = value.text;
    else if ('error' in value) return '';
  }
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isInteger(value) &&
      /^0{2,}$/.test(cell.numFmt || '')) {
    return String(value).padStart(cell.numFmt.length, '0');
  }
  return String(value);
}

export async function readSpreadsheet(file) {
  if (!file) throw new Error('Choose an Excel or CSV file.');
  if (file.size > MAX_BYTES) throw new Error('File is larger than 15 MB. Split it into smaller workbooks.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const contents = (await file.text()).replace(/^\uFEFF/, '');
    const result = Papa.parse(contents, { skipEmptyLines: 'greedy' });
    if (result.errors.length) {
      throw new Error('CSV error at row ' + (result.errors[0].row + 1) + ': ' + result.errors[0].message);
    }
    const sheet = normalizeTable(file.name, result.data.slice(0, MAX_ROWS + 1));
    if (!sheet) throw new Error('The CSV file has no data.');
    return [sheet];
  }
  if (extension !== 'xlsx') {
    throw new Error('Only .xlsx and .csv are supported. Save old .xls files as .xlsx in Excel.');
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await file.arrayBuffer()));
  const sheets = [];
  for (const worksheet of workbook.worksheets) {
    const rows = [];
    const width = Math.min(40, Math.max(1, worksheet.columnCount || 1));
    for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, MAX_ROWS + 1); rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      rows.push(Array.from({ length: width }, (_, i) => excelCellText(row.getCell(i + 1))));
    }
    const result = normalizeTable(worksheet.name, rows);
    if (result) sheets.push(result);
  }
  if (!sheets.length) throw new Error('No populated worksheets were found.');
  return sheets;
}
