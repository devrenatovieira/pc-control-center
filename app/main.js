const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const configStore = require('./src/config-store');
const telegram = require('../agent/telegram');
const systemInfo = require('../agent/system-info');

app.setName('pc-control-center');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: '#f7f7f2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('config:get', async () => configStore.readPublicConfig());

ipcMain.handle('config:save', async (_event, payload) => {
  const saved = await configStore.saveConfig(payload);
  return saved;
});

ipcMain.handle('telegram:test', async () => {
  const config = await configStore.readConfig();
  const info = await systemInfo.collect();
  const message = [
    'Teste do PC Control Center',
    `PC: ${info.hostname}`,
    `SO: ${info.platform} ${info.release}`,
    `Status: conectado`
  ].join('\n');

  await telegram.sendMessage(config, message);
  return { ok: true, hostname: info.hostname };
});

ipcMain.handle('pc:status', async () => {
  const info = await systemInfo.collect();
  const hasConfig = await configStore.hasConfig();

  return {
    ...info,
    connected: hasConfig
  };
});
