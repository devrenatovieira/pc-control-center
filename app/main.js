const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const agentManager = require('./src/agent-manager');
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

async function validateTelegramConfig() {
  const config = await configStore.readConfig();
  const info = await systemInfo.collect();
  const message = [
    'Teste do PC Control Center',
    `PC: ${info.hostname}`,
    `SO: ${info.platform} ${info.release}`,
    'Status: conectado'
  ].join('\n');

  const result = await telegram.testConnection(config, message);
  return { ...result, hostname: info.hostname };
}

ipcMain.handle('telegram:test', async () => {
  try {
    const result = await validateTelegramConfig();
    return { ok: true, hostname: result.hostname, botUsername: result.botUsername };
  } catch (error) {
    return {
      ok: false,
      error: error.message || 'Falha ao testar conexão com Telegram.'
    };
  }
});

ipcMain.handle('setup:auto', async () => {
  const steps = [];

  function addStep(id, label, ok, detail = '') {
    steps.push({ id, label, ok, detail });
  }

  try {
    const publicConfig = await configStore.readPublicConfig();
    addStep('config', 'Configuração salva', publicConfig.configured, publicConfig.configPath);

    const telegramResult = await validateTelegramConfig();
    addStep(
      'telegram',
      'Telegram validado',
      true,
      telegramResult.botUsername ? `Bot @${telegramResult.botUsername}` : 'getMe e sendMessage concluídos'
    );

    const installResult = await agentManager.installAgent();
    addStep('installed', 'Agente instalado', Boolean(installResult.installed || installResult.ok), installResult.message || '');
    addStep('started', 'Agente iniciado', Boolean(installResult.running || installResult.ok), installResult.serviceName || installResult.taskName || '');
    addStep('connected', 'PC conectado', Boolean(installResult.ok), telegramResult.hostname);

    return {
      ok: Boolean(installResult.ok),
      hostname: telegramResult.hostname,
      steps,
      install: installResult
    };
  } catch (error) {
    addStep('error', 'Automação interrompida', false, error.message || 'Falha ao configurar automaticamente.');
    return {
      ok: false,
      steps,
      error: error.message || 'Falha ao configurar automaticamente.'
    };
  }
});

ipcMain.handle('agent:repair', async () => agentManager.installAgent());
ipcMain.handle('agent:restart', async () => agentManager.restartAgent());
ipcMain.handle('agent:logs', async () => agentManager.getLogs());

ipcMain.handle('pc:status', async () => {
  const info = await systemInfo.collect();
  const hasConfig = await configStore.hasConfig();

  return {
    ...info,
    connected: hasConfig
  };
});
