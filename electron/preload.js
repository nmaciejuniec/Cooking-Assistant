const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  platform: 'mac',
  anthropic: (key, body) => ipcRenderer.invoke('anthropic', { key, body }),
  fetchUrl: (url) => ipcRenderer.invoke('fetchUrl', url),
  fetchBinary: (url) => ipcRenderer.invoke('fetchBinary', url),
  lanStart: (o) => ipcRenderer.invoke('lanStart', o),
  lanStop: () => ipcRenderer.invoke('lanStop'),
  lanRequest: (o) => ipcRenderer.invoke('lanRequest', o),
  lanReply: (o) => ipcRenderer.send('lanReply', o),
  onLan: (cb) => {
    ipcRenderer.on('lan-peer', (_e, d) => cb('peer', d));
    ipcRenderer.on('lan-request', (_e, d) => cb('request', d));
  },
});
