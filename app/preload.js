const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pcControlCenter', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (payload) => ipcRenderer.invoke('config:save', payload),
  testTelegram: () => ipcRenderer.invoke('telegram:test'),
  getPcStatus: () => ipcRenderer.invoke('pc:status')
});
