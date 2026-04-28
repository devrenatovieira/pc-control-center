const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const CONFIG_PATH = process.env.PCC_CONFIG_PATH || path.join(os.homedir(), '.config', 'pc-control-center', 'config.json');

function pickConfigValue(config, keys) {
  for (const key of keys) {
    if (config?.[key] !== undefined && config[key] !== null) {
      const value = String(config[key]).trim();
      if (value) return value;
    }
  }

  return '';
}

async function readConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  const botToken = String(pickConfigValue(config, ['botToken', 'bot_token', 'BOT_TOKEN'])).trim();
  const chatId = String(pickConfigValue(config, ['chatId', 'chat_id', 'CHAT_ID'])).trim();

  if (!botToken || !chatId) {
    throw new Error('Configuração inválida: BOT_TOKEN e CHAT_ID são obrigatórios.');
  }

  return {
    botToken,
    chatId
  };
}

module.exports = {
  CONFIG_PATH,
  readConfig
};
