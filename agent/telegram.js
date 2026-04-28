const https = require('node:https');

function sendMessage(config, text) {
  if (!config?.botToken || !config?.chatId) {
    return Promise.reject(new Error('Telegram não configurado.'));
  }

  const body = JSON.stringify({
    chat_id: config.chatId,
    text
  });

  const requestOptions = {
    hostname: 'api.telegram.org',
    path: `/bot${config.botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 15000
  };

  return new Promise((resolve, reject) => {
    const request = https.request(requestOptions, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({ ok: true });
          return;
        }

        reject(new Error(`Telegram retornou HTTP ${response.statusCode}: ${data}`));
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Tempo limite ao conectar no Telegram.'));
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

module.exports = {
  sendMessage
};
