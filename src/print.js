import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { cellValue, escapeHtml, isValidEAN } from './core.js';

export function labelData(record, mapping) {
  return {
    name: cellValue(record, mapping.name),
    barcode: cellValue(record, mapping.barcode),
    price: cellValue(record, mapping.price),
    description: cellValue(record, mapping.description)
  };
}

export async function renderLabel(data, settings) {
  const code = (data.barcode || '').trim();
  if (!code) throw new Error('A selected row is missing a barcode.');
  if (settings.barcodeType === 'EAN13' && !isValidEAN(code)) {
    throw new Error('EAN-13 needs a valid 12-digit base or 13-digit code: ' + code);
  }
  let visual = '';
  if (settings.barcodeType === 'QR') {
    const qrUrl = await QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M', margin: 0, width: 256,
      color: { dark: '#111827', light: '#ffffff' }
    });
    visual = '<img class="qr" src="' + qrUrl + '" alt="QR code" />';
  } else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, code, {
      format: settings.barcodeType,
      displayValue: false,
      margin: 0,
      lineColor: '#101a2c',
      width: 1.4,
      height: 52
    });
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    visual = svg.outerHTML;
  }
  const size = Number(settings.fontSize) || 11;
  const name = escapeHtml(data.name);
  const price = escapeHtml(data.price);
  const desc = escapeHtml(data.description);
  const brand = escapeHtml(settings.brand);
  return `<article class="label" style="width:${settings.width}mm;height:${settings.height}mm;font-size:${size}px">
    ${brand ? `<div class="label-brand" dir="auto">${brand}</div>` : ''}
    ${settings.showName && name ? `<div class="label-name" dir="auto">${name}</div>` : ''}
    <div class="label-graphic ${settings.barcodeType === 'QR' ? 'label-graphic-qr' : ''}">${visual}</div>
    ${settings.showCode ? `<div class="label-code" dir="auto">${escapeHtml(code)}</div>` : ''}
    ${settings.showDescription && desc ? `<div class="label-description" dir="auto">${desc}</div>` : ''}
    ${settings.showPrice && price ? `<div class="label-price" dir="auto">${price} ${escapeHtml(settings.currency)}</div>` : ''}
  </article>`;
}

export const labelStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .label {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.3mm; padding: 1.5mm; overflow: hidden;
    font-family: Arial, Tahoma, sans-serif; color: #101a2c;
    line-height: 1.1; text-align: center; background: white;
  }
  .label-brand { font-size: .9em; font-weight: 700; max-width: 100%; overflow: hidden; white-space: nowrap; }
  .label-name { font-size: 1.05em; font-weight: 700; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .label-graphic { flex: 1 1 auto; min-height: 0; width: 96%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .label-graphic svg { display: block; width: 100%; max-width: 100%; height: 100%; }
  .label-graphic-qr { width: 100%; }
  .label-graphic .qr { width: auto; height: 100%; max-width: 100%; object-fit: contain; }
  .label-code { font-size: .87em; letter-spacing: .35px; max-width: 100%; word-break: break-all; }
  .label-description { max-width: 100%; font-size: .8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label-price { font-size: 1.05em; font-weight: 800; max-width: 100%; }
`;

export function printDocument(markupList, settings) {
  const width = Number(settings.width);
  const height = Number(settings.height);
  return `<!doctype html><html><head><meta charset="UTF-8"/><title>Excel Label Studio — Print</title>
    <style>
      @page { size: ${width}mm ${height}mm; margin: 0; }
      html,body { margin:0 !important; padding:0 !important; background:white; }
      ${labelStyles}
      .label { display:flex; break-after:page; page-break-after:always; }
      .label:last-child { break-after:auto; page-break-after:auto; }
      @media screen { .label { margin:16px; outline:1px solid #ccc; } }
    </style></head><body>${markupList.join('')}</body></html>`;
}

export async function printInBrowser(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Temporary label print document');
  frame.style.cssText = 'position:fixed;width:1px;height:1px;right:0;bottom:0;opacity:0;pointer-events:none;border:0';
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 320));
    await doc.fonts?.ready;
    await Promise.all(Array.from(doc.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((done) => {
        img.onload = done; img.onerror = done;
      })
    ));
    frame.contentWindow.focus();
    frame.contentWindow.print();
    // Browsers cannot reliably detect whether the user printed or cancelled.
    return { ok: true, error: '' };
  } finally {
    setTimeout(() => frame.remove(), 60_000);
  }
}
