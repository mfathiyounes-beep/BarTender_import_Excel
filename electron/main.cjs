'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1060,
    minHeight: 650,
    backgroundColor: '#101a30',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (url !== currentUrl) event.preventDefault();
  });
  if (process.env.ELECTRON_START_URL && !app.isPackaged) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function verifyCaller(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('Printing is only available from the application window.');
  }
}

ipcMain.handle('label:get-printers', async (event) => {
  verifyCaller(event);
  const printers = await mainWindow.webContents.getPrintersAsync();
  return printers.map(({ name, displayName, isDefault }) => ({
    name, displayName: displayName || name, isDefault: Boolean(isDefault)
  }));
});

async function validatePrintPayload(event, payload) {
  verifyCaller(event);
  const { html, widthMm, heightMm, printerName } = payload || {};
  if (typeof html !== 'string' || html.length < 1 || html.length > 12_000_000) {
    throw new Error('Print job is empty or too large. Use smaller batches.');
  }
  if (!Number.isFinite(widthMm) || widthMm < 20 || widthMm > 150 ||
      !Number.isFinite(heightMm) || heightMm < 15 || heightMm > 200) {
    throw new Error('Label dimensions are out of range.');
  }
  if (printerName) {
    const printers = await mainWindow.webContents.getPrintersAsync();
    if (!printers.some((printer) => printer.name === printerName)) {
      throw new Error('The chosen printer is no longer available.');
    }
  }
  return { html, widthMm, heightMm, printerName };
}

async function withPrintWindow(payload, show, operation) {
  const temporaryPath = path.join(os.tmpdir(), 'excel-label-' + randomUUID() + '.html');
  let printWindow;
  try {
    await fs.writeFile(temporaryPath, payload.html, { encoding: 'utf8', flag: 'wx' });
    printWindow = new BrowserWindow({
      width: 800, height: 700, show,
      webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true }
    });
    printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    printWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    await printWindow.loadFile(temporaryPath);
    return await operation(printWindow.webContents);
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.destroy();
    await fs.unlink(temporaryPath).catch(() => {});
  }
}

ipcMain.handle('label:print', async (event, request) => {
  const payload = await validatePrintPayload(event, request);
  return withPrintWindow(payload, !payload.printerName, (webContents) =>
    new Promise((resolve) => {
      webContents.print({
        silent: Boolean(payload.printerName),
        printBackground: true,
        ...(payload.printerName ? { deviceName: payload.printerName } : {}),
        margins: { marginType: 'none' },
        pageSize: { width: Math.round(payload.widthMm * 1000),
          height: Math.round(payload.heightMm * 1000) }
      }, (success, failureReason) => {
        resolve({ ok: success, error: success ? '' :
          (failureReason || 'Printing was cancelled or failed.') });
      });
    }));
});

ipcMain.handle('label:export-pdf', async (event, request) => {
  const payload = await validatePrintPayload(event, request);
  const destination = await dialog.showSaveDialog(mainWindow, {
    title: 'Export labels to PDF',
    defaultPath: 'Excel Label Studio Labels.pdf',
    buttonLabel: 'Save PDF',
    filters: [{ name: 'PDF documents', extensions: ['pdf'] }]
  });
  if (destination.canceled || !destination.filePath) return { ok: false, cancelled: true };
  return withPrintWindow(payload, false, async (webContents) => {
    const pdf = await webContents.printToPDF({
      printBackground: true, displayHeaderFooter: false,
      pageSize: { width: payload.widthMm / 25.4, height: payload.heightMm / 25.4 },
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    if (pdf.length < 100) throw new Error('PDF rendering returned empty output.');
    await fs.writeFile(destination.filePath, pdf);
    return { ok: true, filePath: destination.filePath };
  });
});
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
