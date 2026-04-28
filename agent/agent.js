#!/usr/bin/env node
const { readConfig, CONFIG_PATH } = require('./config');
const telegram = require('./telegram');
const systemInfo = require('./system-info');

const DAEMON_INTERVAL_MS = Number(process.env.PCC_AGENT_INTERVAL_MS || 5 * 60 * 1000);

function printUsage() {
  console.log('Uso: node agent/agent.js --test|--status|--daemon');
}

async function sendTest() {
  const config = await readConfig();
  const info = await systemInfo.collect();
  const message = ['Teste do agente PC Control Center', systemInfo.formatStatus(info)].join('\n\n');
  await telegram.sendMessage(config, message);
  console.log(`Teste enviado com sucesso para o PC ${info.hostname}.`);
}

async function printStatus() {
  const info = await systemInfo.collect();
  console.log(systemInfo.formatStatus(info));
  console.log(`Configuração: ${CONFIG_PATH}`);
}

async function runDaemon() {
  const config = await readConfig();

  async function tick() {
    const info = await systemInfo.collect();
    const message = ['Status do agente PC Control Center', systemInfo.formatStatus(info)].join('\n\n');
    await telegram.sendMessage(config, message);
    console.log(`Status enviado para ${info.hostname} em ${new Date().toISOString()}.`);
  }

  await tick();
  setInterval(() => {
    tick().catch((error) => {
      console.error(`Falha ao enviar status: ${error.message}`);
    });
  }, DAEMON_INTERVAL_MS);
}

async function main() {
  const command = process.argv[2];

  if (command === '--test') {
    await sendTest();
    return;
  }

  if (command === '--status') {
    await printStatus();
    return;
  }

  if (command === '--daemon') {
    await runDaemon();
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
