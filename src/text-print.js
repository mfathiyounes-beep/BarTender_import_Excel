import { escapeHtml } from './core.js';
import { fieldText } from './templates.js';

function mm(value) {
  return Number(value).toFixed(2) + 'mm';
}

export function renderTextLabel(template, headers, record) {
  const parts = template.fields.map((field) => {
    const rawValue = fieldText(field, headers, record);
    const value = escapeHtml(rawValue);
    const style = [
      'left:' + mm(field.x),
      'top:' + mm(field.y),
      'width:' + mm(field.width),
      'height:' + mm(field.height),
      'font-size:' + Number(field.fontSize) + 'px',
      'font-family:' + JSON.stringify(field.fontFamily || 'Arial'),
      'font-weight:' + (field.bold ? 700 : 400),
      'font-style:' + (field.italic ? 'italic' : 'normal'),
      'text-decoration:' + (field.underline ? 'underline' : 'none'),
      'white-space:' + (field.wrap === false ? 'nowrap' : 'pre-wrap'),
      'transform:rotate(' + Number(field.rotation || 0) + 'deg)',
      'text-align:' + field.align
    ].join(';');
    return '<div class="text-label-field" data-field-id="' + escapeHtml(field.id) +
      '" style="' + style + '" dir="auto">' + value + '</div>';
  });
  return '<article class="text-label" style="width:' + mm(template.width) +
    ';height:' + mm(template.height) + '">' + parts.join('') + '</article>';
}

export const textLabelStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  .text-label { position: relative; flex: none; background: #fff; color: #000; overflow: hidden;
    font-family: Arial, Tahoma, "Segoe UI", sans-serif; box-sizing: border-box; }
  .text-label-field { position: absolute; padding: 0; margin: 0; overflow: hidden;
    white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.1;
    display: block; color: #000; font-family: Arial, Tahoma, "Segoe UI", sans-serif; }
`;

export function textPrintDocument(labels, template) {
  const w = Number(template.width);
  const h = Number(template.height);
  return '<!doctype html><html><head><meta charset="UTF-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">' +
    '<title>Text labels</title><style>' +
    '@page{size:' + w + 'mm ' + h + 'mm;margin:0}' +
    'html,body{margin:0;padding:0;background:#fff}' + textLabelStyles +
    '.text-label{break-after:page;page-break-after:always}' +
    '.text-label:last-child{break-after:auto;page-break-after:auto}' +
    '</style></head><body>' + labels.join('') + '</body></html>';
}

export async function browserPrint(html) {
  const frame = document.createElement('iframe');
  frame.title = 'Temporary print document';
  frame.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none';
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    await doc.fonts?.ready;
    frame.contentWindow.focus();
    frame.contentWindow.print();
    return { ok: true, error: '' };
  } finally {
    // The browser does not expose print completion; allow the system dialog to close first.
    setTimeout(() => frame.remove(), 60_000);
  }
}
