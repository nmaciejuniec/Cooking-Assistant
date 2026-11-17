const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  platform: 'mac',
  anthropic: (key, body) => ipcRenderer.invoke('anthropic', { key, body }),
  fetchUrl: (url) => ipcRenderer.invoke('fetchUrl', url),
});
