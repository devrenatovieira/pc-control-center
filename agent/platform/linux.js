const path = require('node:path');
const telegram = require('../telegram');
const linuxInfo = require('../utils/linux-info');
const { LOG_DIR, PROJECT_DIR, SUDO_CMDS_DIR, logPath } = require('../utils/runtime');
const { runFile, runShell, trimOutput } = require('../utils/safe-exec');

const UNAVAILABLE = 'Comando ainda não disponível neste sistema.';
const ALLOWED_PROGRAMS = new Set(['firefox', 'google-chrome', 'chromium', 'code', 'gedit', 'gnome-terminal', 'kgx', 'konsole', 'nautilus', 'xdg-open']);

function graphicalEnv() {
  const uid = process.getuid?.() || 1000;
  const display = process.env.DISPLAY || ':0';
  const xdgRuntime = process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`;
  return {
    DISPLAY: display,
    XDG_RUNTIME_DIR: xdgRuntime,
    DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || `unix:path=${xdgRuntime}/bus`
  };
}

function wrapperPath(name) {
  return path.join(SUDO_CMDS_DIR, `${name}.sh`);
}

async function runSudoWrapper(name, args = [], timeout = 20000) {
  return runFile('sudo', ['-n', wrapperPath(name), ...args], { timeout });
}

async function status() { return linuxInfo.statusSummary(); }
async function cpu() { return `CPU: ${await linuxInfo.cpuPercent()}%`; }
async function ram() { return `RAM: ${linuxInfo.ramPercent()}%`; }
async function disco() { return `Disco: ${await linuxInfo.diskPercent()}%`; }
async function rede() { return linuxInfo.networkSummary(); }
async function ping() { return `Latência: ${await linuxInfo.latency()}`; }
async function ip() { return `IP local: ${await linuxInfo.localIp()}\nIP público: ${await linuxInfo.publicIp()}`; }
async function internet() { return `Internet: ${await linuxInfo.internetStatus()}`; }
async function bateria() { return linuxInfo.batteryText(); }
async function conexao() { return `Conexão: ${await linuxInfo.connectionType()}`; }
async function portas() { return linuxInfo.openPorts(); }
async function processos() { return linuxInfo.processesByMemory(); }
async function ssh() { return linuxInfo.sshLog(); }
async function logs() { return `Logs:\n${LOG_DIR}\nagent.log\ncommands.log\nsecurity.log\nhistory.log`; }
async function uptime() { return `Uptime: ${await linuxInfo.uptimeText()}`; }
async function swap() { return `Swap em uso: ${await linuxInfo.swapPercent()}%`; }
async function topcpu() { return linuxInfo.topCpu(); }
async function topmem() { return linuxInfo.topMem(); }

async function screenshot(config) {
  const script = path.join(PROJECT_DIR, 'agent', 'screenshot.sh');
  const result = await runFile('bash', [script], { timeout: 30000, env: graphicalEnv() });
  const image = result.stdout.trim().split('\n').pop();
  if (!image) return `Não foi possível capturar screenshot: ${trimOutput(result.stderr)}`;
  await telegram.sendPhoto(config, image, 'Screenshot da tela');
  return '';
}

async function webcam(config) {
  const script = path.join(PROJECT_DIR, 'agent', 'webcam.sh');
  const result = await runFile('bash', [script], { timeout: 30000 });
  const image = result.stdout.trim().split('\n').pop();
  if (!image) return `Não foi possível capturar webcam: ${trimOutput(result.stderr)}`;
  await telegram.sendPhoto(config, image, 'Foto da webcam');
  return '';
}

async function arquivo(config, type) {
  const map = {
    monitoramento: logPath('monitoramento.log'),
    alertas: logPath('alertas.log'),
    ssh: logPath('ssh.log'),
    portas: logPath('portas.log'),
    processos: logPath('processos.log'),
    bot: logPath('agent.log'),
    screenshot: logPath('screenshot.png')
  };

  if (!map[type]) return 'Uso: /arquivo monitoramento|alertas|ssh|portas|processos|bot|screenshot';
  if (type === 'screenshot') return screenshot(config);

  try {
    await telegram.sendDocument(config, map[type], type);
    return '';
  } catch {
    return `Arquivo ainda não existe: ${map[type]}`;
  }
}

async function abrir(args) {
  const [program, ...programArgs] = String(args || '').trim().split(/\s+/).filter(Boolean);
  if (!program) return 'Uso: /abrir <programa> [args]';
  if (!ALLOWED_PROGRAMS.has(program)) return `Programa não permitido: ${program}`;

  const result = await runFile('nohup', [program, ...programArgs], { timeout: 5000, env: graphicalEnv() });
  return result.status === 0 ? `Abrindo ${program}.` : `Falha ao abrir ${program}: ${trimOutput(result.stderr)}`;
}

async function volume(args) {
  if (!args) {
    const result = await runShell('if command -v pactl >/dev/null 2>&1; then pactl get-sink-volume @DEFAULT_SINK@ | awk -F/ \'{gsub(/%/,"",$2); print "Volume: " $2 "%"}\'; elif command -v amixer >/dev/null 2>&1; then amixer get Master | awk -F"[][]" \'/%/ { print "Volume: " $2; exit }\'; else echo "Volume: N/A"; fi');
    return trimOutput(result.stdout || result.stderr);
  }
  if (!/^\d{1,3}$/.test(args) || Number(args) > 100) return 'Uso: /volume ou /volume 0-100';
  const result = await runShell(`if command -v pactl >/dev/null 2>&1; then pactl set-sink-volume @DEFAULT_SINK@ ${Number(args)}%; elif command -v amixer >/dev/null 2>&1; then amixer -q sset Master ${Number(args)}%; else exit 1; fi`);
  return result.status === 0 ? `Volume ajustado para ${Number(args)}%.` : 'Não foi possível ajustar o volume.';
}

async function mudo() {
  const result = await runShell('if command -v pactl >/dev/null 2>&1; then pactl set-sink-mute @DEFAULT_SINK@ toggle; elif command -v amixer >/dev/null 2>&1; then amixer -q sset Master toggle; else exit 1; fi');
  return result.status === 0 ? 'Mudo alternado.' : 'Não foi possível alternar o mudo.';
}

async function brilho(args) {
  if (!args) {
    const result = await runShell('for f in /sys/class/backlight/*/brightness; do [ -r "$f" ] || continue; max="$(cat "${f%brightness}max_brightness")"; cur="$(cat "$f")"; [ "$max" -gt 0 ] && echo "Brilho: $((cur * 100 / max))%" && exit 0; done; echo "Brilho: N/A"');
    return trimOutput(result.stdout);
  }
  if (!/^\d{1,3}$/.test(args) || Number(args) > 100) return 'Uso: /brilho ou /brilho 0-100';
  const result = await runShell(`command -v brightnessctl >/dev/null 2>&1 && brightnessctl set ${Number(args)}%`);
  return result.status === 0 ? `Brilho ajustado para ${Number(args)}%.` : 'Não foi possível ajustar o brilho.';
}

async function wifi(args) {
  if (!['on', 'off'].includes(args)) return 'Uso: /wifi on|off';
  const result = await runShell(`nmcli radio wifi ${args}`);
  return result.status === 0 ? `Wi-Fi ${args === 'off' ? 'desativado' : 'ativado'}.` : 'Não foi possível alterar Wi-Fi.';
}

async function bluetooth(args) {
  if (!['on', 'off'].includes(args)) return 'Uso: /bluetooth on|off';
  const result = await runShell(`if command -v bluetoothctl >/dev/null 2>&1; then bluetoothctl power ${args}; elif command -v rfkill >/dev/null 2>&1; then rfkill ${args === 'off' ? 'block' : 'unblock'} bluetooth; else exit 1; fi`);
  return result.status === 0 ? `Bluetooth ${args === 'off' ? 'desativado' : 'ativado'}.` : 'Não foi possível alterar Bluetooth.';
}

async function executeSensitive(action, payload) {
  const map = {
    poweroff: ['desligar', [], 20000],
    reboot: ['reiniciar', [], 20000],
    suspend: ['suspender', [], 20000],
    lock: ['lock', [], 20000],
    cleanup: ['limpeza', [], 60 * 60 * 1000],
    upgrade: ['upgrade', [], 60 * 60 * 1000]
  };
  const item = map[action];
  if (!item) return UNAVAILABLE;
  const result = await runSudoWrapper(item[0], item[1], item[2]);
  return `Status: ${result.status}\n${trimOutput(`${result.stdout}\n${result.stderr}`)}`;
}

module.exports = {
  UNAVAILABLE,
  abrir,
  arquivo,
  bateria,
  bluetooth,
  brilho,
  conexao,
  cpu,
  disco,
  executeSensitive,
  internet,
  ip,
  logs,
  mudo,
  ping,
  portas,
  processos,
  ram,
  rede,
  screenshot,
  ssh,
  status,
  swap,
  topcpu,
  topmem,
  uptime,
  volume,
  webcam,
  wifi
};
