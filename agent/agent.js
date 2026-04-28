#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readConfig, CONFIG_PATH } = require('./config');
const commands = require('./commands');
const telegram = require('./telegram');
const systemInfo = require('./system-info');
const { appendLog } = require('./utils/logger');
const { ensureRuntimeDirs, statePath } = require('./utils/runtime');

const STATE_DIR = process.env.PCC_STATE_DIR || path.join(os.homedir(), '.local', 'state', 'pc-control-center');
const STATE_PATH = process.env.PCC_STATE_PATH || statePath('agent-state.json');
const POLL_TIMEOUT_SECONDS = Number(process.env.PCC_AGENT_POLL_TIMEOUT_SECONDS || 25);
const RECONNECT_DELAY_MS = Number(process.env.PCC_AGENT_RECONNECT_DELAY_MS || 5000);

function printUsage() {
  console.log('Uso: node agent/agent.js --test|--status|--daemon');
}

async function sendTest() {
  const config = await readConfig();
  const info = await systemInfo.collect();
  const message = ['Teste do agente PC Control Center', systemInfo.formatStatus(info)].join('\n\n');
  await telegram.sendMessage(config, message);
  console.log(`Teste enviado com sucesso para o PC ${info.hostname}.`);
}

async function printStatus() {
  const info = await systemInfo.collect();
  console.log(systemInfo.formatStatus(info));
  console.log(`Configuração: ${CONFIG_PATH}`);
}

function sameChatId(messageChatId, configuredChatId) {
  return String(messageChatId) === String(configuredChatId);
}

async function ensureStateDir() {
  await ensureRuntimeDirs();
  await fs.mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
  await fs.chmod(STATE_DIR, 0o700).catch(() => {});
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeState(state) {
  await ensureStateDir();
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(STATE_PATH, 0o600).catch(() => {});
}

async function bootstrapOffset(config, state) {
  if (Number.isInteger(state.offset)) {
    return state.offset;
  }

  const updates = await telegram.getUpdates(config, { timeout: 0, limit: 1, offset: -1 });
  const latest = updates?.result?.[0]?.update_id;
  const offset = Number.isInteger(latest) ? latest + 1 : 0;
  await writeState({ ...state, offset, initializedAt: new Date().toISOString() });
  return offset;
}

async function runDaemon() {
  const config = await readConfig();
  let state = await readState();
  let offset = await bootstrapOffset(config, state);

  console.log(`Agente PC Control Center escutando Telegram. Estado: ${STATE_PATH}`);

  while (true) {
    try {
      const updates = await telegram.getUpdates(config, {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        limit: 20
      });

      for (const update of updates.result || []) {
        offset = update.update_id + 1;
        state = { ...state, offset, updatedAt: new Date().toISOString() };
        await writeState(state);

        const message = update.message;
        const callbackQuery = update.callback_query;

        if (message && !sameChatId(message.chat?.id, config.chatId)) {
          continue;
        }

        if (callbackQuery && !sameChatId(callbackQuery.message?.chat?.id, config.chatId)) {
          continue;
        }

        if (message?.text) {
          if (message.text.trim().startsWith('/')) {
            await commands.handleCommand(config, message.text);
          } else {
            await telegram.sendMessage(config, 'Envie /help para ver os comandos disponíveis.');
          }
        }

        if (callbackQuery) {
          await commands.handleCallback(config, callbackQuery);
        }
      }
    } catch (error) {
      console.error(`Falha no loop do agente: ${error.message}`);
      await appendLog('agent.log', `falha loop: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
    }
  }
}

async function main() {
  const command = process.argv[2];

  if (command === '--test') {
    await sendTest();
    return;
  }

  if (command === '--status') {
    await printStatus();
    return;
  }

  if (command === '--daemon') {
    await runDaemon();
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
