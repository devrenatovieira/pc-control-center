const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const CONFIG_PATH = process.env.PCC_CONFIG_PATH || path.join(os.homedir(), '.config', 'pc-control-center', 'config.json');

async function readConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);

  if (!config.botToken || !config.chatId) {
    throw new Error('Configuração inválida: BOT_TOKEN e CHAT_ID são obrigatórios.');
  }

  return {
    botToken: String(config.botToken),
    chatId: String(config.chatId)
  };
}

module.exports = {
  CONFIG_PATH,
  readConfig
};
