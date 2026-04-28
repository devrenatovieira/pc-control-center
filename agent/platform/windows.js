const os = require('node:os');
const { runFile, trimOutput } = require('../utils/safe-exec');
const { LOG_DIR } = require('../utils/runtime');

const UNAVAILABLE = 'Comando ainda não disponível neste sistema.';

async function ps(script, timeout = 20000) {
  return runFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { timeout });
}

function ramPercent() {
  const total = os.totalmem();
  return total > 0 ? Math.round(((total - os.freemem()) * 100) / total) : 0;
}

async function status() {
  return [
    'Status do PC',
    `Hostname: ${os.hostname()}`,
    `SO: win32 ${os.release()} (${os.arch()})`,
    `CPU: ${await cpu()}`,
    `RAM: ${ramPercent()}%`,
    `Disco: ${await disco()}`,
    `Uptime: ${await uptime()}`
  ].join('\n');
}

async function cpu() {
  const result = await ps('(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average');
  return `${trimOutput(result.stdout || 'N/A')}%`;
}

async function ram() { return `RAM: ${ramPercent()}%`; }

async function disco() {
  const result = await ps("Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\" | ForEach-Object { [math]::Round((($_.Size-$_.FreeSpace)*100)/$_.Size) }");
  return `Disco: ${trimOutput(result.stdout || 'N/A')}%`;
}

async function rede() {
  return [
    'Rede',
    `Internet: ${await internet()}`,
    `Latência: ${await ping()}`,
    `IP local: ${await ip()}`
  ].join('\n');
}

async function ping() {
  const result = await ps('Test-Connection 8.8.8.8 -Count 1 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ResponseTime');
  return result.stdout.trim() ? `${result.stdout.trim()} ms` : 'sem conexão';
}

async function ip() {
  const result = await ps("(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1'} | Select-Object -First 1 -ExpandProperty IPAddress)");
  return `IP local: ${result.stdout.trim() || 'indisponível'}`;
}

async function internet() {
  const result = await ps('if (Test-Connection 8.8.8.8 -Count 1 -Quiet) { "online" } else { "offline" }');
  return result.stdout.trim() || 'offline';
}

async function bateria() {
  const result = await ps('$b=Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1; if ($b) { "Bateria: $($b.EstimatedChargeRemaining)%" } else { "Bateria: N/A" }');
  return result.stdout.trim() || 'Bateria: N/A';
}

async function conexao() {
  const result = await ps('(Get-NetAdapter | Where-Object Status -eq Up | Select-Object -First 1 -ExpandProperty Name)');
  return `Conexão: ${result.stdout.trim() || 'indeterminada'}`;
}

async function portas() {
  const result = await ps('Get-NetTCPConnection -State Listen | Select-Object -First 40 LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize | Out-String');
  return trimOutput(result.stdout || result.stderr);
}

async function processos() {
  const result = await ps('Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Id,ProcessName,CPU,WorkingSet | Format-Table -AutoSize | Out-String');
  return trimOutput(result.stdout || result.stderr);
}

async function uptime() {
  const result = await ps('(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | ForEach-Object { "{0} dias {1} horas {2} min" -f $_.Days,$_.Hours,$_.Minutes }');
  return `Uptime: ${result.stdout.trim() || 'indisponível'}`;
}

async function swap() {
  const result = await ps('Get-CimInstance Win32_PageFileUsage | Select-Object -First 1 | ForEach-Object { if ($_.AllocatedBaseSize -gt 0) { [math]::Round(($_.CurrentUsage*100)/$_.AllocatedBaseSize) } else { 0 } }');
  return `Swap em uso: ${result.stdout.trim() || '0'}%`;
}

async function logs() { return `Logs:\n${LOG_DIR}`; }
async function topcpu() {
  const result = await ps('Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Id,ProcessName,CPU,WorkingSet | Format-Table -AutoSize | Out-String');
  return trimOutput(result.stdout || result.stderr);
}
async function topmem() { return processos(); }

async function abrir(args) {
  const [program, ...rest] = String(args || '').trim().split(/\s+/).filter(Boolean);
  if (!program) return 'Uso: /abrir <programa> [args]';
  const result = await ps(`Start-Process -FilePath ${JSON.stringify(program)} -ArgumentList ${JSON.stringify(rest.join(' '))}`);
  return result.status === 0 ? `Abrindo ${program}.` : `Falha ao abrir ${program}: ${trimOutput(result.stderr)}`;
}

async function executeSensitive(action) {
  if (action === 'lock') {
    const result = await ps('rundll32.exe user32.dll,LockWorkStation');
    return result.status === 0 ? 'Tela bloqueada.' : trimOutput(result.stderr);
  }
  if (action === 'reboot') return (await ps('Restart-Computer -Force')).status === 0 ? 'Reiniciando.' : 'Falha ao reiniciar.';
  if (action === 'poweroff') return (await ps('Stop-Computer -Force')).status === 0 ? 'Desligando.' : 'Falha ao desligar.';
  if (action === 'suspend') return UNAVAILABLE;
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
  logs,
  mudo: async () => UNAVAILABLE,
  ping,
  portas,
  processos,
  ram,
  rede,
  screenshot: async () => UNAVAILABLE,
  ssh: async () => UNAVAILABLE,
  status,
  swap,
  topcpu,
  topmem,
  uptime,
  volume: async () => UNAVAILABLE,
  webcam: async () => UNAVAILABLE,
  wifi: async () => UNAVAILABLE
};
