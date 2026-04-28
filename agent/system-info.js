const { execFile } = require('node:child_process');
const os = require('node:os');
const util = require('node:util');

const execFileAsync = util.promisify(execFile);

function bytesToGb(bytes) {
  return Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10;
}

async function getDiskInfo() {
  try {
    const { stdout } = await execFileAsync('df', ['-h', '/']);
    const [, line] = stdout.trim().split('\n');
    if (!line) return '';

    const parts = line.split(/\s+/);
    return `${parts[2]} usado de ${parts[1]} (${parts[4]}) em /`;
  } catch {
    return '';
  }
}

async function collect() {
  const cpus = os.cpus();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model || 'CPU não identificada',
    cpuCount: cpus.length,
    totalMemoryGb: bytesToGb(os.totalmem()),
    freeMemoryGb: bytesToGb(os.freemem()),
    disk: await getDiskInfo()
  };
}

function formatStatus(info) {
  return [
    `PC: ${info.hostname}`,
    `SO: ${info.platform} ${info.release} (${info.arch})`,
    `CPU: ${info.cpuModel}`,
    `Núcleos: ${info.cpuCount}`,
    `RAM: ${info.totalMemoryGb} GB total / ${info.freeMemoryGb} GB livre`,
    `Disco: ${info.disk || 'não identificado'}`
  ].join('\n');
}

module.exports = {
  collect,
  formatStatus
};
