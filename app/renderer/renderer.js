const api = window.pcControlCenter;

const navButtons = document.querySelectorAll('.nav-button');
const screens = document.querySelectorAll('.screen');
const configForm = document.querySelector('#config-form');
const botTokenInput = document.querySelector('#bot-token');
const chatIdInput = document.querySelector('#chat-id');
const configSummary = document.querySelector('#config-summary');
const configMessage = document.querySelector('#config-message');
const testTelegramButton = document.querySelector('#test-telegram');
const refreshStatusButton = document.querySelector('#refresh-status');
const repairAgentButton = document.querySelector('#repair-agent');
const restartAgentButton = document.querySelector('#restart-agent');
const viewLogsButton = document.querySelector('#view-logs');
const connectionPill = document.querySelector('#connection-pill');
const statusList = document.querySelector('#status-list');
const setupSteps = document.querySelector('#setup-steps');
const logsOutput = document.querySelector('#logs-output');

const defaultSetupSteps = [
  ['config', 'Configuração salva'],
  ['telegram', 'Telegram validado'],
  ['installed', 'Agente instalado'],
  ['started', 'Agente iniciado'],
  ['connected', 'PC conectado']
];

function setMessage(text, isError = false) {
  configMessage.textContent = text;
  configMessage.classList.toggle('error', isError);
}

function getErrorMessage(error, fallback) {
  if (error?.message) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

function renderSetupSteps(steps = []) {
  const merged = defaultSetupSteps.map(([id, label]) => {
    return steps.find((step) => step.id === id) || { id, label, ok: null, detail: '' };
  });

  const extraSteps = steps.filter((step) => !defaultSetupSteps.some(([id]) => id === step.id));
  setupSteps.replaceChildren();

  [...merged, ...extraSteps].forEach((step) => {
    const item = document.createElement('li');
    const state = step.ok === true ? 'done' : step.ok === false ? 'failed' : 'pending';
    item.className = state;
    item.textContent = `${state === 'done' ? '✓' : state === 'failed' ? '!' : '•'} ${step.label}`;

    if (step.detail) {
      const detail = document.createElement('span');
      detail.textContent = step.detail;
      item.append(detail);
    }

    setupSteps.append(item);
  });
}

function showScreen(screenId) {
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === screenId);
  });

  screens.forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });
}

function renderStatus(status) {
  connectionPill.textContent = status.connected ? 'conectado' : 'desconectado';
  connectionPill.classList.toggle('connected', status.connected);
  connectionPill.classList.toggle('disconnected', !status.connected);

  const rows = [
    ['Hostname', status.hostname],
    ['Sistema', `${status.platform} ${status.release}`],
    ['CPU', status.cpuModel],
    ['Núcleos', String(status.cpuCount)],
    ['RAM', `${status.totalMemoryGb} GB total / ${status.freeMemoryGb} GB livre`],
    ['Disco', status.disk || 'Não identificado'],
    ['Preparado para múltiplos PCs', 'Sim']
  ];

  statusList.replaceChildren();

  rows.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    statusList.append(dt, dd);
  });
}

async function loadConfig() {
  const config = await api.getConfig();
  chatIdInput.value = config.chatId || '';
  botTokenInput.value = '';

  if (config.configured) {
    configSummary.textContent = `Configuração salva em ${config.configPath}. Token: ${config.maskedBotToken}`;
  } else {
    configSummary.textContent = `Nenhuma configuração salva. O arquivo será criado em ${config.configPath}.`;
  }
}

async function runAutoSetup() {
  renderSetupSteps([{ id: 'config', label: 'Configuração salva', ok: true }]);
  setMessage('Validando Telegram e preparando o agente...');

  const result = await api.runAutoSetup();
  renderSetupSteps(result.steps || []);

  if (!result.ok) {
    throw new Error(result.error || result.install?.message || 'Falha na configuração automática.');
  }

  setMessage(`Automação concluída. PC conectado: ${result.hostname}.`);
  return result;
}

async function refreshStatus() {
  refreshStatusButton.disabled = true;
  try {
    const status = await api.getPcStatus();
    renderStatus(status);
  } finally {
    refreshStatusButton.disabled = false;
  }
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.screen));
});

configForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Salvando...');

  try {
    await api.saveConfig({
      botToken: botTokenInput.value,
      chatId: chatIdInput.value
    });

    botTokenInput.value = '';
    await loadConfig();
    await runAutoSetup();
    await refreshStatus();
  } catch (error) {
    setMessage(error.message || 'Falha ao salvar configuração.', true);
  }
});

testTelegramButton.addEventListener('click', async () => {
  testTelegramButton.disabled = true;
  setMessage('Testando conexão...');

  try {
    const result = await api.testTelegram();
    if (!result?.ok) {
      throw new Error(result?.error || 'Falha ao testar Telegram.');
    }

    const botInfo = result.botUsername ? ` Bot: @${result.botUsername}.` : '';
    setMessage(`Conexão com Telegram validada e mensagem enviada pelo PC ${result.hostname}.${botInfo}`);
    await refreshStatus();
  } catch (error) {
    setMessage(getErrorMessage(error, 'Falha ao testar Telegram.'), true);
  } finally {
    testTelegramButton.disabled = false;
  }
});

refreshStatusButton.addEventListener('click', refreshStatus);

repairAgentButton.addEventListener('click', async () => {
  repairAgentButton.disabled = true;
  setMessage('Reparando instalação...');

  try {
    const result = await api.repairAgent();
    setMessage(result.ok ? result.message || 'Instalação reparada.' : result.message || 'Falha ao reparar instalação.', !result.ok);
    await refreshStatus();
  } catch (error) {
    setMessage(getErrorMessage(error, 'Falha ao reparar instalação.'), true);
  } finally {
    repairAgentButton.disabled = false;
  }
});

restartAgentButton.addEventListener('click', async () => {
  restartAgentButton.disabled = true;
  setMessage('Reiniciando agente...');

  try {
    const result = await api.restartAgent();
    setMessage(result.ok ? result.message || 'Agente reiniciado.' : result.message || 'Falha ao reiniciar agente.', !result.ok);
    await refreshStatus();
  } catch (error) {
    setMessage(getErrorMessage(error, 'Falha ao reiniciar agente.'), true);
  } finally {
    restartAgentButton.disabled = false;
  }
});

viewLogsButton.addEventListener('click', async () => {
  viewLogsButton.disabled = true;

  try {
    const result = await api.getAgentLogs();
    logsOutput.hidden = false;
    logsOutput.textContent = result.logs || 'Sem logs disponíveis.';
    setMessage(result.ok ? 'Logs carregados.' : 'Falha ao carregar logs.', !result.ok);
  } catch (error) {
    setMessage(getErrorMessage(error, 'Falha ao carregar logs.'), true);
  } finally {
    viewLogsButton.disabled = false;
  }
});

renderSetupSteps();

loadConfig()
  .then(refreshStatus)
  .catch((error) => setMessage(error.message || 'Falha ao carregar configuração.', true));
