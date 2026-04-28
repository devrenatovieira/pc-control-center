const dns = require('node:dns');
const https = require('node:https');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const telegramHttpsAgent = new https.Agent({
  family: 4
});

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function sanitizeMessage(message, botToken) {
  if (!message) return '';
  let sanitized = String(message);

  if (botToken) {
    sanitized = sanitized.split(botToken).join(maskToken(botToken));
  }

  sanitized = sanitized.replace(/\/bot[^/\s]+/g, '/bot********');
  return sanitized;
}

function flattenError(error, botToken) {
  if (!error) return 'Erro desconhecido.';

  if (error instanceof AggregateError) {
    const messages = error.errors
      .map((item) => flattenError(item, botToken))
      .filter(Boolean);

    return messages.length ? messages.join(' | ') : sanitizeMessage(error.message, botToken);
  }

  const code = error.code ? `${error.code}: ` : '';
  const message = sanitizeMessage(error.message || String(error), botToken);
  return `${code}${message}`.trim();
}

function normalizeConfig(config) {
  const botToken = String(config?.botToken || config?.bot_token || config?.BOT_TOKEN || '').trim();
  const chatId = String(config?.chatId || config?.chat_id || config?.CHAT_ID || '').trim();

  return { botToken, chatId };
}

function validateBotToken(botToken) {
  if (!botToken) {
    throw new Error('BOT_TOKEN é obrigatório.');
  }

  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) {
    throw new Error('BOT_TOKEN inválido. Verifique o token do BotFather.');
  }
}

function validateChatId(chatId) {
  if (!chatId) {
    throw new Error('CHAT_ID é obrigatório.');
  }

  if (!/^-?\d+$/.test(chatId) && !/^@[A-Za-z0-9_]{5,32}$/.test(chatId)) {
    throw new Error('CHAT_ID inválido. Use um ID numérico ou @usuario/@canal.');
  }
}

function telegramRequest(config, method, payload) {
  const { botToken } = normalizeConfig(config);
  validateBotToken(botToken);

  const body = payload ? JSON.stringify(payload) : '';
  const requestOptions = {
    hostname: 'api.telegram.org',
    path: `/bot${botToken}/${method}`,
    method: payload ? 'POST' : 'GET',
    headers: {},
    agent: telegramHttpsAgent,
    family: 4,
    timeout: 15000
  };

  if (payload) {
    requestOptions.headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
  }

  return new Promise((resolve, reject) => {
    const request = https.request(requestOptions, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        let parsed;

        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = null;
        }

        if (response.statusCode >= 200 && response.statusCode < 300 && parsed?.ok !== false) {
          resolve(parsed || { ok: true });
          return;
        }

        const description = parsed?.description || data || 'sem detalhes';
        reject(new Error(`Telegram ${method} retornou HTTP ${response.statusCode}: ${description}`));
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Tempo limite ao conectar no Telegram.'));
    });

    request.on('error', (error) => {
      reject(new Error(flattenError(error, botToken)));
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

async function getMe(config) {
  try {
    return await telegramRequest(config, 'getMe');
  } catch (error) {
    throw new Error(`Falha no getMe: ${flattenError(error, normalizeConfig(config).botToken)}`);
  }
}

async function sendMessage(config, text) {
  const normalized = normalizeConfig(config);
  validateBotToken(normalized.botToken);
  validateChatId(normalized.chatId);

  try {
    return await telegramRequest(normalized, 'sendMessage', {
      chat_id: normalized.chatId,
      text
    });
  } catch (error) {
    throw new Error(`Falha no sendMessage: ${flattenError(error, normalized.botToken)}`);
  }
}

async function testConnection(config, text) {
  const normalized = normalizeConfig(config);
  validateBotToken(normalized.botToken);
  validateChatId(normalized.chatId);

  const me = await getMe(normalized);
  const sent = await sendMessage(normalized, text);

  return {
    ok: true,
    botUsername: me?.result?.username || '',
    messageId: sent?.result?.message_id || null
  };
}

module.exports = {
  getMe,
  sendMessage,
  testConnection
};
