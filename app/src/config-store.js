const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const CONFIG_DIR = process.env.PCC_CONFIG_DIR || path.join(os.homedir(), '.config', 'pc-control-center');
const CONFIG_PATH = process.env.PCC_CONFIG_PATH || path.join(CONFIG_DIR, 'config.json');

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.chmod(CONFIG_DIR, 0o700);
}

function validateConfig(payload) {
  const botToken = String(payload?.botToken || '').trim();
  const chatId = String(payload?.chatId || '').trim();

  if (!botToken) {
    throw new Error('BOT_TOKEN é obrigatório.');
  }

  if (!chatId) {
    throw new Error('CHAT_ID é obrigatório.');
  }

  return {
    botToken,
    chatId,
    createdAt: payload?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function saveConfig(payload) {
  const existing = await readConfig().catch(() => ({}));
  const config = validateConfig({ ...existing, ...payload });

  await ensureConfigDir();
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(CONFIG_PATH, 0o600);

  return readPublicConfig();
}

async function readConfig() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  return validateConfig(config);
}

async function hasConfig() {
  try {
    await readConfig();
    return true;
  } catch {
    return false;
  }
}

async function readPublicConfig() {
  try {
    const config = await readConfig();
    return {
      configured: true,
      chatId: config.chatId,
      maskedBotToken: maskToken(config.botToken),
      configPath: CONFIG_PATH,
      updatedAt: config.updatedAt
    };
  } catch {
    return {
      configured: false,
      chatId: '',
      maskedBotToken: '',
      configPath: CONFIG_PATH,
      updatedAt: ''
    };
  }
}

module.exports = {
  CONFIG_PATH,
  hasConfig,
  readConfig,
  readPublicConfig,
  saveConfig
};
