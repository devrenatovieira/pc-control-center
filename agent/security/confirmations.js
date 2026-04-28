const fs = require('node:fs/promises');
const telegram = require('../telegram');
const { appendLog } = require('../utils/logger');
const { ensureRuntimeDirs, statePath } = require('../utils/runtime');

const PENDING_PATH = statePath('pending-action.json');
const CONFIRMATION_TTL_MS = 30 * 1000;

function generateCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

function confirmationMarkup(code, expiresAt) {
  const options = [code];

  while (options.length < 4) {
    const candidate = generateCode();
    if (!options.includes(candidate)) options.push(candidate);
  }

  options.sort(() => Math.random() - 0.5);

  return {
    inline_keyboard: [
      options.slice(0, 2).map((item) => ({ text: item, callback_data: `cf:${expiresAt}:${item}` })),
      options.slice(2, 4).map((item) => ({ text: item, callback_data: `cf:${expiresAt}:${item}` }))
    ]
  };
}

async function request(config, action, payload, label) {
  await ensureRuntimeDirs();

  const code = generateCode();
  const expiresAt = Date.now() + CONFIRMATION_TTL_MS;
  const pending = { action, payload, label, code, expiresAt, platform: process.platform };

  await fs.writeFile(PENDING_PATH, `${JSON.stringify(pending, null, 2)}\n`, { mode: 0o600 });
  await appendLog('security.log', `confirmacao solicitada action=${action} platform=${process.platform} label=${label}`);

  await telegram.sendMessageWithMarkup(
    config,
    `Ação sensível: ${label}\nConfirme em até 30 segundos.\nCódigo: ${code}`,
    confirmationMarkup(code, expiresAt)
  );
}

async function read() {
  try {
    return JSON.parse(await fs.readFile(PENDING_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function clear() {
  await fs.rm(PENDING_PATH, { force: true });
}

async function verify(code) {
  const pending = await read();

  if (!pending) {
    return { ok: false, message: 'Nenhuma ação pendente.' };
  }

  if (Date.now() > pending.expiresAt) {
    await clear();
    return { ok: false, message: 'Código expirado.' };
  }

  if (String(code) !== String(pending.code)) {
    await clear();
    await appendLog('security.log', `confirmacao recusada action=${pending.action} motivo=codigo_incorreto`);
    return { ok: false, message: 'Código incorreto. Gere uma nova confirmação.' };
  }

  await clear();
  await appendLog('security.log', `confirmacao aceita action=${pending.action} platform=${pending.platform}`);
  return { ok: true, pending };
}

module.exports = {
  clear,
  request,
  verify
};
