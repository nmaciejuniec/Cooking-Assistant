// Cooking Assistant: Mac app shell (Electron).
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 420, minHeight: 600,
    title: 'Cooking Assistant', backgroundColor: '#FBF7F0',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // Links to recipe sources open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
}

// AI requests go through the app itself, so the browser's cross-site rules do not get in the way.
ipcMain.handle('anthropic', async (_e, { key, body }) => {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': String(key || ''), 'anthropic-version': '2023-06-01' },
      body: String(body || ''),
    });
    return { status: r.status, text: await r.text() };
  } catch (err) {
    return { status: 0, text: '', error: String(err && err.message || err) };
  }
});

// Downloads a recipe page for the "add from link" feature.
ipcMain.handle('fetchUrl', async (_e, url) => {
  try {
    if (!/^https?:\/\//i.test(String(url))) return { status: 0, text: '' };
    const r = await fetch(String(url), {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml', 'accept-language': 'pl,en;q=0.8,da;q=0.6',
      },
    });
    const text = await r.text();
    return { status: r.status, text: text.slice(0, 3000000) };
  } catch (err) {
    return { status: 0, text: '', error: String(err && err.message || err) };
  }
});

// Downloads a picture (recipe photo) and returns it as base64.
ipcMain.handle('fetchBinary', async (_e, url) => {
  try {
    if (!/^https?:\/\//i.test(String(url))) return { status: 0 };
    const r = await fetch(String(url), { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' } });
    if (!r.ok) return { status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 15000000) return { status: 413 };
    return { status: r.status, type: r.headers.get('content-type') || 'image/jpeg', b64: buf.toString('base64') };
  } catch (err) {
    return { status: 0, error: String(err && err.message || err) };
  }
});

app.whenReady().then(() => {
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
