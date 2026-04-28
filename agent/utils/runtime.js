const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const APP_NAME = 'pc-control-center';
const CONFIG_DIR = process.env.PCC_CONFIG_DIR || path.join(os.homedir(), '.config', APP_NAME);
const STATE_DIR = process.env.PCC_STATE_DIR || path.join(os.homedir(), '.local', 'state', APP_NAME);
const LOG_DIR = process.env.PCC_LOG_DIR || path.join(STATE_DIR, 'logs');
const PROJECT_DIR = path.join(__dirname, '..', '..');
const SUDO_CMDS_DIR = process.env.PCC_SUDO_CMDS_DIR || path.join(PROJECT_DIR, 'agent', 'sudo_cmds');

async function ensureDir(dir, mode = 0o700) {
  await fs.mkdir(dir, { recursive: true, mode });
  await fs.chmod(dir, mode).catch(() => {});
}

async function ensureRuntimeDirs() {
  await ensureDir(CONFIG_DIR);
  await ensureDir(STATE_DIR);
  await ensureDir(LOG_DIR);
}

function statePath(name) {
  return path.join(STATE_DIR, name);
}

function logPath(name) {
  return path.join(LOG_DIR, name);
}

module.exports = {
  APP_NAME,
  CONFIG_DIR,
  LOG_DIR,
  PROJECT_DIR,
  STATE_DIR,
  SUDO_CMDS_DIR,
  ensureRuntimeDirs,
  logPath,
  statePath
};
