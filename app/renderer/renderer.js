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
const installAgentButton = document.querySelector('#install-agent');
const connectionPill = document.querySelector('#connection-pill');
const statusList = document.querySelector('#status-list');

function setMessage(text, isError = false) {
  configMessage.textContent = text;
  configMessage.classList.toggle('error', isError);
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
    await refreshStatus();
    setMessage('Configuração salva com permissão restrita.');
  } catch (error) {
    setMessage(error.message || 'Falha ao salvar configuração.', true);
  }
});

testTelegramButton.addEventListener('click', async () => {
  testTelegramButton.disabled = true;
  setMessage('Testando conexão...');

  try {
    const result = await api.testTelegram();
    setMessage(`Mensagem enviada pelo PC ${result.hostname}.`);
    await refreshStatus();
  } catch (error) {
    setMessage(error.message || 'Falha ao testar Telegram.', true);
  } finally {
    testTelegramButton.disabled = false;
  }
});

refreshStatusButton.addEventListener('click', refreshStatus);

installAgentButton.addEventListener('click', () => {
  showScreen('status');
  navigator.clipboard?.writeText('sudo ./installer/install-linux.sh');
  alert('Execute no terminal: sudo ./installer/install-linux.sh');
});

loadConfig()
  .then(refreshStatus)
  .catch((error) => setMessage(error.message || 'Falha ao carregar configuração.', true));
