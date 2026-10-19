'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('labelDesktop', {
  getPrinters: () => ipcRenderer.invoke('label:get-printers'),
  print: (html, widthMm, heightMm, printerName) =>
    ipcRenderer.invoke('label:print', { html, widthMm, heightMm, printerName }),
  exportPDF: (html, widthMm, heightMm) =>
    ipcRenderer.invoke('label:export-pdf', { html, widthMm, heightMm })
});
