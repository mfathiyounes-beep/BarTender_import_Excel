// Millimeter-space geometry helpers shared by canvas interactions and tests.
// Keep positioning independent of CSS zoom so a 50x30mm design is repeatable.
const finite = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

export function snapMm(value, step = 0.5) {
  const n = finite(value);
  const s = step > 0 ? step : 0.5;
  return Math.round(n / s) * s;
}

export function moveField(field, dxMm, dyMm, pageWidth, pageHeight, step = 0.5) {
  const width = clamp(finite(field.width, 1), 1, pageWidth);
  const height = clamp(finite(field.height, 1), 1, pageHeight);
  return {
    ...field,
    x: clamp(snapMm(finite(field.x) + finite(dxMm), step), 0, pageWidth - width),
    y: clamp(snapMm(finite(field.y) + finite(dyMm), step), 0, pageHeight - height)
  };
}

export function resizeField(field, dxMm, dyMm, pageWidth, pageHeight, step = 0.5) {
  const x = clamp(finite(field.x), 0, pageWidth - 1);
  const y = clamp(finite(field.y), 0, pageHeight - 1);
  return {
    ...field,
    width: clamp(snapMm(finite(field.width, 1) + finite(dxMm), step), 1, pageWidth - x),
    height: clamp(snapMm(finite(field.height, 1) + finite(dyMm), step), 1, pageHeight - y)
  };
}
