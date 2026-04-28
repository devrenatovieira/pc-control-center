# PC Control Center

Aplicativo Electron para configurar um agente Linux de monitoramento remoto via Telegram.

## Estrutura

```text
pc-control-center/
├── app/
├── agent/
├── installer/
├── server/
└── README.md
```

## Requisitos

- Linux com systemd para instalação no boot.
- Node.js 18 ou superior.
- npm.
- Um bot do Telegram criado no BotFather.
- `CHAT_ID` do destino que receberá mensagens.

## Instalar dependências

```bash
npm install
```

## Rodar o app Electron

```bash
npm start
```

Na tela Telegram, informe:

- `BOT_TOKEN`
- `CHAT_ID`

A configuração local é salva em:

```text
~/.config/pc-control-center/config.json
```

O arquivo é criado com permissão `600`, e o token não é exibido novamente depois de salvo.

## Testar Telegram pelo app

Use o botão `Testar conexão com Telegram` na tela Telegram.

Também é possível testar pelo terminal:

```bash
npm run agent:test
```

## Ver status do agente manualmente

```bash
npm run agent:status
```

O agente coleta:

- hostname
- sistema operacional
- CPU
- RAM
- disco da partição `/`

## Instalar agente no boot

Depois de salvar a configuração pelo app:

```bash
sudo ./installer/install-linux.sh
sudo systemctl start pc-control-center-agent@$USER.service
```

Ver status do serviço:

```bash
systemctl status pc-control-center-agent@$USER.service
```

O serviço roda como seu usuário e lê:

```text
~/.config/pc-control-center/config.json
```

## Remover serviço

```bash
sudo ./installer/uninstall-linux.sh
```

O script remove o serviço systemd, mas mantém os arquivos em `/opt/pc-control-center`.

## Segurança no MVP

- O `BOT_TOKEN` não é logado pelo app nem pelo agente.
- A configuração é gravada com permissão `600`.
- Não há configuração de sudoers.
- O agente não executa comandos perigosos.
- O instalador apenas copia arquivos, registra serviço systemd e habilita o serviço.

## Próximos passos previstos

- Cadastro de múltiplos PCs.
- Tela para listar agentes instalados.
- Logs locais do agente sem dados sensíveis.
- Backend opcional em `server/` para inventário centralizado.
