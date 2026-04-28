const os = require('node:os');
const telegram = require('../telegram');
const confirmations = require('../security/confirmations');
const { appendLog } = require('../utils/logger');
const { logPath, ensureRuntimeDirs } = require('../utils/runtime');
const { isVeryDangerous, needsConfirmation, runFile, runShell, trimOutput } = require('../utils/safe-exec');

const platforms = {
  linux: require('../platform/linux'),
  win32: require('../platform/windows'),
  darwin: require('../platform/macos')
};

const UNAVAILABLE = 'Comando ainda não disponível neste sistema.';
const SENSITIVE_LABELS = {
  poweroff: 'desligar',
  reboot: 'reiniciar',
  suspend: 'suspender',
  lock: 'bloquear tela',
  cleanup: 'limpeza do sistema',
  upgrade: 'upgrade do sistema'
};

function currentPlatform() {
  return platforms[process.platform] || null;
}

function parseCommand(text) {
  const trimmed = String(text || '').trim();
  const [rawCommand = '', ...rest] = trimmed.split(/\s+/);
  return {
    command: rawCommand.split('@')[0].toLowerCase(),
    args: rest.join(' ').trim()
  };
}

function mainMenuMarkup() {
  return {
    inline_keyboard: [
      [
        { text: 'Sistema', callback_data: 'cat:sistema' },
        { text: 'Rede', callback_data: 'cat:rede' }
      ],
      [
        { text: 'Processos', callback_data: 'cat:processos' },
        { text: 'Segurança', callback_data: 'cat:seguranca' }
      ],
      [
        { text: 'Arquivos', callback_data: 'cat:arquivos' },
        { text: 'Controle', callback_data: 'cat:controle' }
      ],
      [
        { text: 'Ações', callback_data: 'cat:acoes' },
        { text: 'Outros', callback_data: 'cat:outros' }
      ]
    ]
  };
}

function categoryMarkup(category) {
  const rows = {
    sistema: [['/status', '/cpu', '/ram'], ['/disco', '/swap', '/uptime'], ['/bateria']],
    rede: [['/rede', '/ping'], ['/ip', '/internet', '/conexao'], ['/portas', '/ssh']],
    processos: [['/processos', '/topcpu', '/topmem']],
    seguranca: [['/bloquear']],
    arquivos: [['/logs', '/arquivo bot'], ['/arquivo screenshot']],
    controle: [['/screenshot', '/webcam'], ['/volume', '/mudo', '/brilho'], ['/wifi', '/bluetooth']],
    acoes: [['/desligar', '/reiniciar'], ['/suspender', '/limpeza'], ['/upgrade']],
    outros: [['/abrir', '/cmd']]
  }[category] || [];

  return {
    inline_keyboard: [
      ...rows.map((row) => row.map((text) => ({ text, callback_data: `cmd:${text}` }))),
      [{ text: 'Voltar', callback_data: 'menu:main' }]
    ]
  };
}

function helpText() {
  return [
    'PC Control Center',
    '',
    `Sistema atual: ${process.platform}`,
    '',
    'Sistema:',
    '/status, /cpu, /ram, /disco, /swap, /uptime, /bateria',
    '',
    'Rede:',
    '/rede, /ping, /ip, /internet, /conexao, /portas, /ssh',
    '',
    'Processos:',
    '/processos, /topcpu, /topmem',
    '',
    'Arquivos e mídia:',
    '/logs, /arquivo <tipo>, /screenshot, /webcam',
    '',
    'Controle:',
    '/abrir <programa> [args], /cmd <comando>, /volume [0-100], /mudo, /brilho [0-100], /wifi on|off, /bluetooth on|off',
    '',
    'Ações sensíveis:',
    '/bloquear, /desligar, /reiniciar, /suspender, /limpeza, /upgrade, /confirmar <codigo>',
    '',
    'Ações sensíveis exigem confirmação por código ou botão. Sudo/admin genérico é bloqueado.'
  ].join('\n');
}

async function sendText(config, text) {
  if (text) await telegram.sendMessage(config, text);
}

async function recordHistory(text) {
  await ensureRuntimeDirs();
  await require('node:fs/promises').appendFile(logPath('history.log'), `[${new Date().toISOString()}] ${text}\n`, { mode: 0o600 });
}

function blocksAdmin(command) {
  const normalized = String(command || '').toLowerCase();
  return normalized === 'sudo' ||
    normalized.startsWith('sudo ') ||
    normalized.includes(' start-process ') && normalized.includes('-verb runas') ||
    normalized.startsWith('runas ') ||
    normalized.includes('do shell script') && normalized.includes('administrator privileges');
}

async function executeCommand(config, command, alreadyConfirmed = false) {
  if (!command) return sendText(config, 'Uso: /cmd <comando>');
  if (isVeryDangerous(command)) return sendText(config, 'Comando muito perigoso recusado.');
  if (blocksAdmin(command)) return sendText(config, 'Comando administrativo genérico bloqueado. Use apenas ações mapeadas pelo agente.');

  if (needsConfirmation(command) && !alreadyConfirmed) {
    await confirmations.request(config, 'cmd', command, 'comando sensível');
    return;
  }

  let result;
  if (process.platform === 'win32') {
    result = await runFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]);
  } else {
    result = await runShell(command);
  }

  await sendText(config, `Status: ${result.status}\n${trimOutput(`${result.stdout}\n${result.stderr}`)}`);
}

async function executeSensitive(config, pending) {
  if (pending.action === 'cmd') {
    await executeCommand(config, pending.payload, true);
    return;
  }

  const platform = currentPlatform();
  if (!platform?.executeSensitive) return sendText(config, UNAVAILABLE);
  await sendText(config, await platform.executeSensitive(pending.action, pending.payload));
}

async function handleCommand(config, text) {
  const platform = currentPlatform();
  const { command, args } = parseCommand(text);
  await recordHistory(text);
  await appendLog('agent.log', `comando recebido platform=${process.platform} command=${command} args=${args}`);

  if (!platform) return sendText(config, UNAVAILABLE);

  switch (command) {
    case '/start':
    case '/help':
      await telegram.sendMessageWithMarkup(config, helpText(), mainMenuMarkup());
      return;
    case '/status':
      return sendText(config, await platform.status());
    case '/cpu':
      return sendText(config, await platform.cpu());
    case '/ram':
      return sendText(config, await platform.ram());
    case '/disco':
      return sendText(config, await platform.disco());
    case '/rede':
      return sendText(config, await platform.rede());
    case '/ping':
      return sendText(config, await platform.ping());
    case '/ip':
      return sendText(config, await platform.ip());
    case '/internet':
      return sendText(config, await platform.internet());
    case '/bateria':
      return sendText(config, await platform.bateria());
    case '/conexao':
      return sendText(config, await platform.conexao());
    case '/portas':
      return sendText(config, await platform.portas());
    case '/processos':
      return sendText(config, await platform.processos());
    case '/ssh':
      return sendText(config, await platform.ssh());
    case '/logs':
      return sendText(config, await platform.logs());
    case '/uptime':
      return sendText(config, await platform.uptime());
    case '/swap':
      return sendText(config, await platform.swap());
    case '/screenshot':
      return sendText(config, await platform.screenshot(config));
    case '/webcam':
      return sendText(config, await platform.webcam(config));
    case '/bloquear':
      return confirmations.request(config, 'lock', '', SENSITIVE_LABELS.lock);
    case '/arquivo':
      return sendText(config, await platform.arquivo(config, args));
    case '/cmd':
      return executeCommand(config, args);
    case '/abrir':
      return sendText(config, await platform.abrir(args));
    case '/desligar':
      return confirmations.request(config, 'poweroff', '', SENSITIVE_LABELS.poweroff);
    case '/reiniciar':
      return confirmations.request(config, 'reboot', '', SENSITIVE_LABELS.reboot);
    case '/suspender':
      return confirmations.request(config, 'suspend', '', SENSITIVE_LABELS.suspend);
    case '/confirmar': {
      const result = await confirmations.verify(args);
      if (!result.ok) return sendText(config, result.message);
      return executeSensitive(config, result.pending);
    }
    case '/volume':
      return sendText(config, await platform.volume(args));
    case '/mudo':
      return sendText(config, await platform.mudo(args));
    case '/brilho':
      return sendText(config, await platform.brilho(args));
    case '/wifi':
      return sendText(config, await platform.wifi(args));
    case '/bluetooth':
      return sendText(config, await platform.bluetooth(args));
    case '/topcpu':
      return sendText(config, await platform.topcpu());
    case '/topmem':
      return sendText(config, await platform.topmem());
    case '/limpeza':
      return confirmations.request(config, 'cleanup', '', SENSITIVE_LABELS.cleanup);
    case '/upgrade':
      return confirmations.request(config, 'upgrade', '', SENSITIVE_LABELS.upgrade);
    default:
      return sendText(config, 'Comando desconhecido. Use /help para ver as opções.');
  }
}

async function handleCallback(config, callbackQuery) {
  const data = callbackQuery.data || '';
  const messageId = callbackQuery.message?.message_id;

  if (data === 'menu:main') {
    await telegram.answerCallbackQuery(config, callbackQuery.id);
    await telegram.editMessageText(config, messageId, 'Escolha uma categoria:', mainMenuMarkup());
    return;
  }

  if (data.startsWith('cat:')) {
    const category = data.slice(4);
    await telegram.answerCallbackQuery(config, callbackQuery.id);
    await telegram.editMessageText(config, messageId, `Categoria: ${category}`, categoryMarkup(category));
    return;
  }

  if (data.startsWith('cmd:')) {
    const command = data.slice(4);
    await telegram.answerCallbackQuery(config, callbackQuery.id, `Executando ${command}`);
    await handleCommand(config, command);
    return;
  }

  if (data.startsWith('cf:')) {
    const [, expiresAt, code] = data.split(':');
    if (Date.now() > Number(expiresAt || 0)) {
      await confirmations.clear();
      await telegram.answerCallbackQuery(config, callbackQuery.id, 'Código expirado.');
      await telegram.editMessageText(config, messageId, 'Código expirado.', { inline_keyboard: [] });
      return;
    }

    await telegram.answerCallbackQuery(config, callbackQuery.id, 'Confirmando...');
    await telegram.editMessageText(config, messageId, 'Confirmação recebida. Executando...', { inline_keyboard: [] });
    const result = await confirmations.verify(code);
    if (!result.ok) return sendText(config, result.message);
    await executeSensitive(config, result.pending);
    return;
  }

  await telegram.answerCallbackQuery(config, callbackQuery.id, 'Opção desconhecida.');
}

module.exports = {
  handleCallback,
  handleCommand,
  helpText
};
