const { execFile } = require('node:child_process');
const util = require('node:util');
const { appendLog } = require('./logger');

const execFileAsync = util.promisify(execFile);

function isLinux() {
  return process.platform === 'linux';
}

function linuxOnly() {
  return 'Comando disponível apenas no Linux.';
}

function normalizeCommand(command) {
  return String(command || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isVeryDangerous(command) {
  const normalized = normalizeCommand(command);
  return [
    'rm -rf /',
    'rm -rf /*',
    ':(){ :|: & };:',
    ':(){:|:&};:',
    'mkfs',
    'wipefs',
    'dd if=',
    'dd of='
  ].some((pattern) => normalized.includes(pattern));
}

function blocksGenericSudo(command) {
  const normalized = normalizeCommand(command);
  return normalized === 'sudo' || normalized.startsWith('sudo ');
}

function needsConfirmation(command) {
  const normalized = normalizeCommand(command);
  return [
    'systemctl start',
    'systemctl stop',
    'systemctl restart',
    'systemctl enable',
    'systemctl disable',
    'systemctl reload',
    'apt remove',
    'apt purge',
    'shutdown',
    'reboot',
    'poweroff',
    'suspend'
  ].some((pattern) => normalized.includes(pattern)) ||
    normalized.startsWith('rm ') ||
    normalized.includes(' rm ') ||
    normalized.startsWith('mv ') ||
    normalized.includes(' mv ') ||
    normalized.startsWith('chmod ') ||
    normalized.includes(' chmod ') ||
    normalized.startsWith('chown ') ||
    normalized.includes(' chown ');
}

async function runFile(command, args = [], options = {}) {
  const startedAt = Date.now();

  try {
    const result = await execFileAsync(command, args, {
      timeout: options.timeout || 20000,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      cwd: options.cwd,
      env: {
        ...process.env,
        ...(options.env || {})
      }
    });

    await appendLog('commands.log', `status=0 command=${command} args=${JSON.stringify(args)} ms=${Date.now() - startedAt}`);
    return {
      status: 0,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  } catch (error) {
    await appendLog('commands.log', `status=${error.code || 1} command=${command} args=${JSON.stringify(args)} ms=${Date.now() - startedAt} error=${error.message}`);
    return {
      status: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message
    };
  }
}

async function runShell(command, options = {}) {
  return runFile('bash', ['-lc', command], options);
}

function trimOutput(output, max = 3500) {
  const text = String(output || '').trim() || 'Sem saída.';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n... saída truncada.`;
}

module.exports = {
  blocksGenericSudo,
  isLinux,
  isVeryDangerous,
  linuxOnly,
  needsConfirmation,
  normalizeCommand,
  runFile,
  runShell,
  trimOutput
};
