const os = require('node:os');
const path = require('node:path');
const telegram = require('../telegram');
const { LOG_DIR, logPath } = require('../utils/runtime');
const { runFile, runShell, trimOutput } = require('../utils/safe-exec');

const UNAVAILABLE = 'Comando ainda não disponível neste sistema.';

function ramPercent() {
  const total = os.totalmem();
  return total > 0 ? Math.round(((total - os.freemem()) * 100) / total) : 0;
}

async function status() {
  return [
    'Status do Mac',
    `Hostname: ${os.hostname()}`,
    `SO: darwin ${os.release()} (${os.arch()})`,
    `CPU: ${await cpu()}`,
    `RAM: ${ramPercent()}%`,
    `Disco: ${await disco()}`,
    `Uptime: ${await uptime()}`
  ].join('\n');
}

async function cpu() {
  const result = await runShell("ps -A -o %cpu | awk '{s+=$1} END {printf \"%.0f%%\", s}'");
  return result.stdout.trim() || 'CPU: N/A';
}

async function ram() { return `RAM: ${ramPercent()}%`; }

async function disco() {
  const result = await runFile('df', ['-P', '/']);
  const line = result.stdout.trim().split('\n')[1] || '';
  return `Disco: ${(line.trim().split(/\s+/)[4] || 'N/A')}`;
}

async function rede() {
  return ['Rede', `Internet: ${await internet()}`, `Latência: ${await ping()}`, await ip(), `Conexão: ${await conexao()}`].join('\n');
}

async function ping() {
  const result = await runShell("ping -c 1 -W 2000 8.8.8.8 2>/dev/null | awk -F'time=' '/time=/{print $2}' | awk '{print $1}'");
  return result.stdout.trim() ? `${result.stdout.trim()} ms` : 'sem conexão';
}

async function ip() {
  const result = await runShell("ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true");
  return `IP local: ${result.stdout.trim() || 'indisponível'}`;
}

async function internet() {
  const result = await runFile('ping', ['-c', '1', '-W', '2000', '8.8.8.8']);
  return result.status === 0 ? 'online' : 'offline';
}

async function bateria() {
  const result = await runShell("pmset -g batt | grep -Eo '[0-9]+%' | head -n 1");
  return result.stdout.trim() ? `Bateria: ${result.stdout.trim()}` : 'Bateria: N/A';
}

async function conexao() {
  const result = await runShell("route get default 2>/dev/null | awk '/interface:/ {print $2}'");
  return result.stdout.trim() || 'indeterminada';
}

async function portas() {
  const result = await runShell('lsof -nP -iTCP -sTCP:LISTEN | head -n 40');
  return trimOutput(result.stdout || result.stderr);
}

async function processos() {
  const result = await runShell('ps -axo pid,user,%mem,%cpu,comm -r | head -n 11');
  return trimOutput(result.stdout || result.stderr);
}

async function uptime() {
  const result = await runShell('uptime | sed "s/^.* up /up /; s/, [0-9]* users.*//"');
  return result.stdout.trim() || 'indisponível';
}

async function swap() {
  const result = await runShell('sysctl vm.swapusage 2>/dev/null');
  return result.stdout.trim() || 'Swap: N/A';
}

async function screenshot(config) {
  const file = logPath('screenshot.png');
  const result = await runFile('screencapture', ['-x', file], { timeout: 30000 });
  if (result.status !== 0) return `Não foi possível capturar screenshot: ${trimOutput(result.stderr)}`;
  await telegram.sendPhoto(config, file, 'Screenshot da tela');
  return '';
}

async function abrir(args) {
  const [program, ...rest] = String(args || '').trim().split(/\s+/).filter(Boolean);
  if (!program) return 'Uso: /abrir <programa> [args]';
  const result = await runFile('open', ['-a', program, ...rest], { timeout: 10000 });
  return result.status === 0 ? `Abrindo ${program}.` : `Falha ao abrir ${program}: ${trimOutput(result.stderr)}`;
}

async function executeSensitive(action) {
  if (action === 'lock') return (await runShell('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend')).status === 0 ? 'Tela bloqueada.' : UNAVAILABLE;
  if (action === 'suspend') return (await runFile('pmset', ['sleepnow'])).status === 0 ? 'Suspensão solicitada.' : UNAVAILABLE;
  return UNAVAILABLE;
}

module.exports = {
  UNAVAILABLE,
  abrir,
  arquivo: async () => UNAVAILABLE,
  bateria,
  bluetooth: async () => UNAVAILABLE,
  brilho: async () => UNAVAILABLE,
  conexao,
  cpu,
  disco,
  executeSensitive,
  internet,
  ip,
  logs: async () => `Logs:\n${LOG_DIR}`,
  mudo: async () => UNAVAILABLE,
  ping,
  portas,
  processos,
  ram,
  rede,
  screenshot,
  ssh: async () => UNAVAILABLE,
  status,
  swap,
  topcpu: processos,
  topmem: processos,
  uptime,
  volume: async () => UNAVAILABLE,
  webcam: async () => UNAVAILABLE,
  wifi: async () => UNAVAILABLE
};
