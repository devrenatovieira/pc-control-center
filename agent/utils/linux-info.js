const fs = require('node:fs/promises');
const os = require('node:os');
const { runFile, runShell, trimOutput } = require('./safe-exec');

async function readFirstExisting(paths) {
  for (const item of paths) {
    try {
      return await fs.readFile(item, 'utf8');
    } catch {
      // tenta o próximo caminho
    }
  }

  return '';
}

async function cpuPercent() {
  function snapshot() {
    const cpus = os.cpus();
    return cpus.reduce(
      (acc, cpu) => {
        const times = cpu.times;
        acc.idle += times.idle;
        acc.total += times.user + times.nice + times.sys + times.idle + times.irq;
        return acc;
      },
      { idle: 0, total: 0 }
    );
  }

  const first = snapshot();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const second = snapshot();
  const idle = second.idle - first.idle;
  const total = second.total - first.total;

  if (total <= 0) return 0;
  return Math.round((100 * (total - idle)) / total);
}

function ramPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  return total > 0 ? Math.round(((total - free) * 100) / total) : 0;
}

async function swapPercent() {
  const raw = await fs.readFile('/proc/meminfo', 'utf8').catch(() => '');
  const total = Number(raw.match(/^SwapTotal:\s+(\d+)/m)?.[1] || 0);
  const free = Number(raw.match(/^SwapFree:\s+(\d+)/m)?.[1] || 0);
  return total > 0 ? Math.round(((total - free) * 100) / total) : 0;
}

async function diskPercent() {
  const result = await runFile('df', ['-P', '/']);
  const line = result.stdout.trim().split('\n')[1] || '';
  const usage = line.trim().split(/\s+/)[4] || '';
  return usage.replace('%', '') || 'N/A';
}

async function temperatureText() {
  const sensors = await runShell("command -v sensors >/dev/null 2>&1 && sensors | awk 'match($0, /\\+([0-9]+(\\.[0-9]+)?)°C/, a) { if (a[1] > max) max = a[1] } END { if (max != \"\") printf \"%.0f\", max }'");
  if (sensors.stdout.trim()) return sensors.stdout.trim();

  const zones = await runShell("for f in /sys/class/thermal/thermal_zone*/temp; do [ -r \"$f\" ] && cat \"$f\"; done | awk '{ v=int($1/1000); if (v>max) max=v } END { if (max) print max }'");
  return zones.stdout.trim() || 'N/A';
}

async function uptimeText() {
  const result = await runShell('uptime -p 2>/dev/null | sed "s/^up //"');
  return result.stdout.trim() || 'indisponível';
}

async function localIp() {
  const hostname = await runShell("hostname -I 2>/dev/null | awk '{print $1}'");
  if (hostname.stdout.trim()) return hostname.stdout.trim();

  const route = await runShell("ip route get 8.8.8.8 2>/dev/null | awk '/src/ { for (i=1;i<=NF;i++) if ($i==\"src\") { print $(i+1); exit } }'");
  return route.stdout.trim() || 'indisponível';
}

async function publicIp() {
  const result = await runShell('command -v curl >/dev/null 2>&1 && curl -fsS --max-time 6 https://api.ipify.org');
  return result.stdout.trim() || 'indisponível';
}

async function latency() {
  const result = await runShell("ping -c 1 -W 2 8.8.8.8 2>/dev/null | awk -F'time=' '/time=/{print $2}' | awk '{print $1}'");
  return result.stdout.trim() ? `${result.stdout.trim()} ms` : 'sem conexão';
}

async function internetStatus() {
  const result = await runShell('ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1');
  return result.status === 0 ? 'online' : 'offline';
}

async function connectionType() {
  const result = await runShell('iface="$(ip route 2>/dev/null | awk \'/^default/ {print $5; exit}\')"; [ -n "$iface" ] || exit 2; if [ -d "/sys/class/net/${iface}/wireless" ]; then printf "Wi-Fi (%s)" "$iface"; else printf "Cabo (%s)" "$iface"; fi');
  return result.stdout.trim() || 'indeterminada';
}

async function batteryText() {
  const raw = await readFirstExisting(['/sys/class/power_supply/BAT0/capacity', '/sys/class/power_supply/BAT1/capacity']);
  return raw.trim() ? `Bateria: ${raw.trim()}%` : 'Bateria: N/A';
}

async function openPorts() {
  const result = await runShell('if command -v ss >/dev/null 2>&1; then ss -tulpen 2>/dev/null | sed -n "1,40p"; elif command -v netstat >/dev/null 2>&1; then netstat -tulpen 2>/dev/null | sed -n "1,40p"; else echo "ss/netstat não encontrados"; fi');
  return trimOutput(result.stdout || result.stderr);
}

async function processesByMemory() {
  const result = await runShell('ps -eo pid,user,%mem,%cpu,comm --sort=-%mem | head -n 11');
  return trimOutput(result.stdout || result.stderr);
}

async function topCpu() {
  const result = await runShell('ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 11');
  return trimOutput(result.stdout || result.stderr);
}

async function topMem() {
  return processesByMemory();
}

async function sshLog() {
  const result = await runShell('[ -r /var/log/auth.log ] && tail -n 20 /var/log/auth.log || { [ -r /var/log/syslog ] && tail -n 20 /var/log/syslog || true; }');
  return trimOutput(result.stdout || 'Nenhuma falha SSH registrada.');
}

async function screenLockStatus() {
  const user = process.env.USER || os.userInfo().username;
  const result = await runShell(`session="$(loginctl list-sessions --no-legend 2>/dev/null | awk -v user="${user}" '$3 == user { print $1; exit }')"; [ -n "$session" ] && loginctl show-session "$session" -p LockedHint 2>/dev/null | cut -d= -f2`);
  const value = result.stdout.trim();
  if (value === 'yes') return 'Tela: bloqueada';
  if (value === 'no') return 'Tela: desbloqueada';
  return 'Tela: não foi possível detectar';
}

async function networkSummary() {
  return [
    'Rede',
    `Internet: ${await internetStatus()}`,
    `Latência: ${await latency()}`,
    `IP local: ${await localIp()}`,
    `IP público: ${await publicIp()}`,
    `Conexão: ${await connectionType()}`
  ].join('\n');
}

async function statusSummary() {
  return [
    'Status do PC',
    `Hostname: ${os.hostname()}`,
    `SO: ${os.platform()} ${os.release()} (${os.arch()})`,
    `CPU: ${await cpuPercent()}%`,
    `RAM: ${ramPercent()}%`,
    `Disco: ${await diskPercent()}%`,
    `Swap: ${await swapPercent()}%`,
    `Temperatura: ${await temperatureText()}C`,
    `Internet: ${await internetStatus()}`,
    `Latência: ${await latency()}`,
    `IP local: ${await localIp()}`,
    `IP público: ${await publicIp()}`,
    `Conexão: ${await connectionType()}`,
    `Uptime: ${await uptimeText()}`,
    await screenLockStatus()
  ].join('\n');
}

module.exports = {
  batteryText,
  connectionType,
  cpuPercent,
  diskPercent,
  internetStatus,
  latency,
  localIp,
  networkSummary,
  openPorts,
  processesByMemory,
  publicIp,
  ramPercent,
  screenLockStatus,
  sshLog,
  statusSummary,
  swapPercent,
  topCpu,
  topMem,
  uptimeText
};
