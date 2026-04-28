const { execFile } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const util = require('node:util');

const execFileAsync = util.promisify(execFile);
const ROOT_DIR = path.join(__dirname, '..', '..');
const LINUX_INSTALLER = path.join(ROOT_DIR, 'installer', 'install-linux.sh');
const WINDOWS_INSTALLER = path.join(ROOT_DIR, 'installer', 'install-windows.ps1');
const MACOS_INSTALLER = path.join(ROOT_DIR, 'installer', 'install-macos.sh');
const SERVICE_NAME = `pc-control-center-agent@${os.userInfo().username}.service`;
const TASK_NAME = 'PC Control Center Agent';
const MACOS_LABEL = 'com.pc-control-center.agent';

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: ROOT_DIR,
    windowsHide: true,
    timeout: options.timeout || 120000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      ...(options.env || {})
    }
  });
}

async function commandExists(command) {
  try {
    if (process.platform === 'win32') {
      await run('where', [command], { timeout: 10000 });
      return true;
    }

    await run('bash', ['-lc', `command -v ${command}`], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function formatOutput(error) {
  const parts = [
    error.message,
    error.stdout && `stdout: ${error.stdout.trim()}`,
    error.stderr && `stderr: ${error.stderr.trim()}`
  ].filter(Boolean);

  return parts.join('\n');
}

function manualInstallCommand() {
  return 'sudo env PCC_TARGET_USER=$USER bash installer/install-linux.sh';
}

async function installLinux() {
  const envArgs = ['env', `PCC_TARGET_USER=${os.userInfo().username}`, 'bash', LINUX_INSTALLER];

  try {
    if (await commandExists('pkexec')) {
      await run('pkexec', envArgs, { timeout: 180000 });
    } else {
      await run('sudo', ['-n', 'env', `PCC_TARGET_USER=${os.userInfo().username}`, 'bash', LINUX_INSTALLER], { timeout: 180000 });
    }
  } catch (error) {
    const output = formatOutput(error);
    const canceled = /cancel|dismiss|not authorized|authentication|pkexec/i.test(output);
    return {
      ok: false,
      needsPrivilege: true,
      message: [
        'A instalação do serviço systemd precisa de permissão de administrador.',
        canceled ? 'O prompt de autorização foi cancelado ou recusado.' : 'Autorize o prompt de senha do sistema e tente "Reparar instalação".',
        `Fallback manual: ${manualInstallCommand()}`,
        output
      ].join('\n')
    };
  }

  return validateLinux();
}

async function validateLinux() {
  try {
    const { stdout } = await run('systemctl', ['is-active', SERVICE_NAME], { timeout: 15000 });
    const active = stdout.trim() === 'active';

    return {
      ok: active,
      installed: true,
      running: active,
      serviceName: SERVICE_NAME,
      message: active ? `Serviço ${SERVICE_NAME} ativo.` : `Serviço ${SERVICE_NAME} não está ativo.`
    };
  } catch (error) {
    return {
      ok: false,
      installed: false,
      running: false,
      serviceName: SERVICE_NAME,
      message: `Não foi possível validar o serviço ${SERVICE_NAME}: ${formatOutput(error)}`
    };
  }
}

async function restartLinux() {
  try {
    if (await commandExists('pkexec')) {
      await run('pkexec', ['systemctl', 'restart', SERVICE_NAME], { timeout: 60000 });
    } else {
      await run('sudo', ['-n', 'systemctl', 'restart', SERVICE_NAME], { timeout: 60000 });
    }
  } catch (error) {
    return {
      ok: false,
      message: `Não foi possível reiniciar o serviço. Autorize o prompt do sistema e tente novamente.\nFallback manual: ${manualInstallCommand()}\n${formatOutput(error)}`
    };
  }

  return validateLinux();
}

async function logsLinux() {
  try {
    const { stdout } = await run('journalctl', ['-u', SERVICE_NAME, '-n', '120', '--no-pager'], { timeout: 20000 });
    return { ok: true, logs: stdout || 'Sem logs recentes.' };
  } catch (error) {
    return { ok: false, logs: formatOutput(error) };
  }
}

async function installWindows() {
  try {
    await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', WINDOWS_INSTALLER], {
      timeout: 120000
    });
  } catch (error) {
    return {
      ok: false,
      message: `Falha ao criar tarefa no Agendador de Tarefas: ${formatOutput(error)}`
    };
  }

  return validateWindows();
}

async function installMacos() {
  try {
    await run('bash', [MACOS_INSTALLER], { timeout: 120000 });
    return validateMacos();
  } catch (error) {
    return {
      ok: false,
      message: `Falha ao instalar LaunchAgent no macOS: ${formatOutput(error)}`
    };
  }
}

async function validateMacos() {
  try {
    await run('launchctl', ['list', MACOS_LABEL], { timeout: 15000 });
    return {
      ok: true,
      installed: true,
      running: true,
      taskName: MACOS_LABEL,
      message: `LaunchAgent "${MACOS_LABEL}" carregado.`
    };
  } catch (error) {
    return {
      ok: false,
      installed: false,
      running: false,
      taskName: MACOS_LABEL,
      message: `Não foi possível validar o LaunchAgent "${MACOS_LABEL}": ${formatOutput(error)}`
    };
  }
}

async function validateWindows() {
  try {
    await run('schtasks.exe', ['/Query', '/TN', TASK_NAME], { timeout: 15000 });
    return {
      ok: true,
      installed: true,
      running: true,
      taskName: TASK_NAME,
      message: `Tarefa "${TASK_NAME}" criada.`
    };
  } catch (error) {
    return {
      ok: false,
      installed: false,
      running: false,
      taskName: TASK_NAME,
      message: `Não foi possível validar a tarefa "${TASK_NAME}": ${formatOutput(error)}`
    };
  }
}

async function restartWindows() {
  try {
    await run('schtasks.exe', ['/Run', '/TN', TASK_NAME], { timeout: 30000 });
    return validateWindows();
  } catch (error) {
    return { ok: false, message: `Não foi possível iniciar a tarefa: ${formatOutput(error)}` };
  }
}

async function logsWindows() {
  return {
    ok: true,
    logs: 'Logs locais do agente para Windows ainda não foram implementados. Valide a tarefa pelo Agendador de Tarefas.'
  };
}

async function installAgent() {
  if (process.platform === 'linux') return installLinux();
  if (process.platform === 'win32') return installWindows();
  if (process.platform === 'darwin') return installMacos();

  return { ok: false, message: `Sistema operacional não suportado: ${process.platform}.` };
}

async function restartAgent() {
  if (process.platform === 'linux') return restartLinux();
  if (process.platform === 'win32') return restartWindows();
  if (process.platform === 'darwin') {
    try {
      await run('launchctl', ['kickstart', '-k', `gui/${process.getuid()}/${MACOS_LABEL}`], { timeout: 30000 });
      return validateMacos();
    } catch (error) {
      return { ok: false, message: `Não foi possível reiniciar o LaunchAgent: ${formatOutput(error)}` };
    }
  }
  return { ok: false, message: 'Reinício automático não disponível neste sistema.' };
}

async function getLogs() {
  if (process.platform === 'linux') return logsLinux();
  if (process.platform === 'win32') return logsWindows();
  if (process.platform === 'darwin') {
    return { ok: true, logs: `Logs em ~/.local/state/pc-control-center/logs/ e status via launchctl list ${MACOS_LABEL}.` };
  }
  return { ok: false, logs: 'Logs automáticos não disponíveis neste sistema.' };
}

module.exports = {
  getLogs,
  installAgent,
  restartAgent,
  validateMacos,
  validateLinux,
  validateWindows
};
