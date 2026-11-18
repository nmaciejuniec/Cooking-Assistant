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

// Recipe pages and pictures may only come from the public internet, never from the home network or this Mac.
const dns = require('node:dns').promises;
const netmod = require('node:net');
function privateIp(ip) {
  if (netmod.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privateIp(x.slice(7));
  return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb');
}
async function publicUrl(u) {
  let url; try { url = new URL(String(u)); } catch (e) { return false; }
  if (!/^https?:$/.test(url.protocol)) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$|\.local$|\.lan$|\.home$|\.internal$/i.test(host)) return false;
  try { const addrs = netmod.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }); return addrs.length > 0 && !addrs.some(a => privateIp(a.address)); } catch (e) { return false; }
}
async function safeFetch(url, opts) {
  let u = String(url);
  for (let i = 0; i < 6; i++) {
    if (!(await publicUrl(u))) throw new Error('blocked address');
    const r = await fetch(u, Object.assign({}, opts, { redirect: 'manual' }));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u).toString(); continue; }
    return r;
  }
  throw new Error('too many redirects');
}
ipcMain.handle('fetchUrl', async (_e, url) => {
  try {
    if (!/^https?:\/\//i.test(String(url))) return { status: 0, text: '' };
    const r = await safeFetch(String(url), {
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
    const r = await safeFetch(String(url), { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' } });
    if (!r.ok) return { status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 15000000) return { status: 413 };
    return { status: r.status, type: r.headers.get('content-type') || 'image/jpeg', b64: buf.toString('base64') };
  } catch (err) {
    return { status: 0, error: String(err && err.message || err) };
  }
});

// ---- home Wi-Fi sync: finds other Cooking Assistant devices (Bonjour) and moves encrypted messages over TCP.
// The page encrypts and decrypts everything; this part never sees recipes in plain form.
const net = require('node:net');
const lan = { server: null, bonjour: null, browser: null, pending: new Map(), seq: 0, sender: null, refresh: null, allowed: new Set() };
const MAX_FRAME = 48 * 1024 * 1024;
function frame(str) { const b = Buffer.from(String(str), 'utf8'); const h = Buffer.alloc(4); h.writeUInt32BE(b.length); return Buffer.concat([h, b]); }
function readFrame(sock, ms) {
  return new Promise((resolve, reject) => {
    const chunks = []; let got = 0, need = -1, done = false;
    const end = (err, val) => { if (done) return; done = true; clearTimeout(t); err ? reject(err) : resolve(val); };
    const t = setTimeout(() => { end(new Error('timeout')); sock.destroy(); }, ms);
    sock.on('data', (d) => {
      chunks.push(d); got += d.length;
      if (need < 0 && got >= 4) { const head = Buffer.concat(chunks); chunks.length = 0; chunks.push(head); need = head.readUInt32BE(0); if (need > MAX_FRAME) { end(new Error('too big')); sock.destroy(); return; } }
      if (need >= 0 && got > 4 + need) { end(new Error('too long')); sock.destroy(); return; }
      if (need >= 0 && got === 4 + need) end(null, Buffer.concat(chunks).subarray(4).toString('utf8'));
    });
    sock.on('error', (e) => end(e));
    sock.on('close', () => end(new Error('closed')));
  });
}
function lanStop() {
  clearInterval(lan.refresh); lan.refresh = null;
  try { if (lan.browser) lan.browser.stop(); } catch (e) { }
  try { if (lan.bonjour) { lan.bonjour.unpublishAll(); lan.bonjour.destroy(); } } catch (e) { }
  try { if (lan.server) lan.server.close(); } catch (e) { }
  lan.browser = lan.bonjour = lan.server = null;
}
ipcMain.handle('lanStart', async (e, { netId, deviceId }) => {
  lanStop();
  lan.allowed = new Set();
  lan.sender = e.sender;
  lan.server = net.createServer(async (sock) => {
    try {
      sock.setTimeout(8000, () => sock.destroy()); // a sender that goes quiet is dropped quickly
      const data = await readFrame(sock, 120000);
      sock.setTimeout(0);
      const id = ++lan.seq;
      const reply = await new Promise((res) => { lan.pending.set(id, res); setTimeout(() => res(null), 90000); if (!lan.sender.isDestroyed()) lan.sender.send('lan-request', { id, data }); });
      lan.pending.delete(id);
      if (reply) sock.end(frame(reply)); else sock.destroy();
    } catch (err) { sock.destroy(); }
  });
  lan.server.maxConnections = 3; // more are refused, so nobody on the network can pile up memory
  await new Promise((res, rej) => { lan.server.once('error', rej); lan.server.listen(0, res); });
  const port = lan.server.address().port;
  const { Bonjour } = require('bonjour-service');
  lan.bonjour = new Bonjour();
  lan.bonjour.publish({ name: 'ca-' + deviceId, type: 'cookassist', port, txt: { n: String(netId), d: String(deviceId), v: '1' } });
  const seen = (svc) => {
    const t = (svc && svc.txt) || {};
    if (t.n !== netId || !t.d || t.d === deviceId) return;
    const host = (svc.addresses || []).find(a => /^\d+\.\d+\.\d+\.\d+$/.test(a)) || (svc.referer && svc.referer.address);
    if (host && lan.sender && !lan.sender.isDestroyed()) { lan.allowed.add(host + ':' + svc.port); lan.sender.send('lan-peer', { deviceId: t.d, host, port: svc.port }); }
  };
  lan.browser = lan.bonjour.find({ type: 'cookassist' }, seen);
  lan.refresh = setInterval(() => { try { lan.browser.update(); } catch (err) { } }, 30000);
  return { port };
});
ipcMain.handle('lanStop', async () => { lanStop(); return true; });
ipcMain.on('lanReply', (_e, { id, data }) => { const r = lan.pending.get(id); if (r) r(data ? String(data) : null); });
ipcMain.handle('lanRequest', async (_e, { host, port, data }) => new Promise((resolve) => {
  // only devices of this household network that Bonjour found, never any host the page names
  if (!lan.allowed.has(String(host) + ':' + Number(port))) { resolve({ error: 'unknown device' }); return; }
  const sock = net.connect({ host: String(host), port: Number(port) });
  const t = setTimeout(() => { sock.destroy(); resolve({ error: 'timeout' }); }, 6000);
  sock.once('error', (err) => { clearTimeout(t); resolve({ error: String(err.message) }); });
  sock.once('connect', () => {
    clearTimeout(t);
    sock.write(frame(data));
    readFrame(sock, 90000).then((d) => { resolve({ data: d }); sock.end(); }, (err) => resolve({ error: String(err.message) }));
  });
}));
app.on('before-quit', lanStop);

app.whenReady().then(() => {
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
