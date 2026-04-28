const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pcControlCenter', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (payload) => ipcRenderer.invoke('config:save', payload),
  testTelegram: () => ipcRenderer.invoke('telegram:test'),
  runAutoSetup: () => ipcRenderer.invoke('setup:auto'),
  repairAgent: () => ipcRenderer.invoke('agent:repair'),
  restartAgent: () => ipcRenderer.invoke('agent:restart'),
  getAgentLogs: () => ipcRenderer.invoke('agent:logs'),
  getPcStatus: () => ipcRenderer.invoke('pc:status')
});
