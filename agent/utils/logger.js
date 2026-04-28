const fs = require('node:fs/promises');
const { ensureRuntimeDirs, logPath } = require('./runtime');

function timestamp() {
  return new Date().toISOString();
}

async function appendLog(name, message) {
  await ensureRuntimeDirs();
  await fs.appendFile(logPath(name), `[${timestamp()}] ${message}\n`, { mode: 0o600 });
}

module.exports = {
  appendLog,
  timestamp
};
