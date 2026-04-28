# PC Control Center

Painel desktop para configurar e instalar automaticamente um agente local de monitoramento remoto via Telegram.

O projeto combina um app Electron, um agente local em Node.js e instaladores para deixar o agente iniciando com o sistema. Depois que o usuário informa `BOT_TOKEN` e `CHAT_ID`, o app valida o Telegram, instala o agente, inicia o serviço/tarefa e mostra o status do PC.

## 📸 Demonstração

> Placeholder para imagem ou GIF da interface.

```text
docs/demo.gif
```

## 🚀 Instalação

### Requisitos

- Node.js 18 ou superior.
- npm.
- Uma conta no Telegram.
- Um bot criado pelo BotFather.
- O `CHAT_ID` do usuário, grupo ou canal que receberá as mensagens.
- Linux com systemd ou Windows com Agendador de Tarefas. macOS será suportado em versão futura.

### Passo a passo

```bash
git clone https://github.com/seu-usuario/pc-control-center.git
cd pc-control-center
npm install
npm start
```

Depois que o app abrir, informe `BOT_TOKEN` e `CHAT_ID` na tela Telegram e clique em `Salvar configuração`.

O app executa automaticamente:

- validação do `BOT_TOKEN` e `CHAT_ID`;
- `getMe` na API do Telegram;
- `sendMessage` de teste;
- instalação do agente;
- inicialização do agente;
- validação do PC conectado.

No Linux, o app pode pedir autorização de administrador para criar o serviço systemd. Autorize o prompt do sistema; não é necessário digitar comandos manualmente.

## ▶️ Interface

A interface mostra as etapas:

- `Configuração salva`;
- `Telegram validado`;
- `Agente instalado`;
- `Agente iniciado`;
- `PC conectado`.

Também há botões para:

- reparar instalação;
- reiniciar agente;
- ver logs.

## ⚙️ Configuração local

A configuração local é salva em:

```text
~/.config/pc-control-center/config.json
```

O arquivo é criado com permissão restrita:

```text
600
```

Depois de salvo, o token não é exibido novamente na tela.

O arquivo `.gitignore` já bloqueia `.env`, `config.json`, `.config/`, logs e arquivos `*.token`.

## 🧪 Testes do Agente

Ver status local do PC:

```bash
npm run agent:status
```

Enviar uma mensagem de teste para o Telegram:

```bash
npm run agent:test
```

O agente coleta:

- hostname;
- sistema operacional;
- arquitetura;
- CPU;
- quantidade de núcleos;
- RAM;
- uso do disco da partição `/`.

## 🤖 Comandos Telegram

Com o agente rodando, envie comandos pelo chat configurado:

```text
/start
/help
/status
```

O agente ignora mensagens de outros `chat_id`, salva o offset local e não responde mensagens antigas.

## 🛠️ Instalação automática

### Linux

O app usa `installer/install-linux.sh` para:

- copiar arquivos para `/opt/pc-control-center`;
- registrar o serviço systemd;
- habilitar o agente no boot;
- iniciar o serviço;
- validar `systemctl is-active`.

Serviço:

```text
pc-control-center-agent@$USER.service
```

### Windows

O app usa `installer/install-windows.ps1` para:

- criar a tarefa `PC Control Center Agent` no Agendador de Tarefas;
- iniciar o agente no login;
- iniciar a tarefa depois da configuração;
- validar a tarefa criada.

### macOS

O app informa que a instalação automática no macOS estará disponível em breve.

## 🧹 Desinstalação

Remova o serviço systemd:

```bash
sudo ./installer/uninstall-linux.sh
```

O script remove o serviço, mas mantém os arquivos instalados em:

```text
/opt/pc-control-center
```

Se quiser apagar os arquivos depois, remova o diretório manualmente.

## 📁 Estrutura do Projeto

```text
pc-control-center/
├── app/
│   ├── main.js
│   ├── preload.js
│   ├── renderer/
│   │   ├── index.html
│   │   ├── renderer.js
│   │   └── styles.css
│   └── src/
│       ├── agent-manager.js
│       └── config-store.js
├── agent/
│   ├── agent.js
│   ├── config.js
│   ├── system-info.js
│   └── telegram.js
├── installer/
│   ├── install-linux.sh
│   ├── install-windows.ps1
│   ├── pc-control-center-agent.service
│   └── uninstall-linux.sh
├── server/
│   └── README.md
├── package.json
└── README.md
```

## 🔐 Segurança

O projeto foi pensado para evitar exposição acidental do token do Telegram.

- O `BOT_TOKEN` não é exibido novamente depois de salvo.
- O `BOT_TOKEN` não deve ser publicado em issues, prints, logs ou commits.
- O arquivo de configuração local usa permissão `600`.
- O app e o agente não logam o token.
- O MVP não configura sudoers.
- O agente não executa comandos perigosos.
- O instalador copia arquivos e configura inicialização do agente, sem executar comandos remotos.

Nunca compartilhe este arquivo publicamente:

```text
~/.config/pc-control-center/config.json
```

## ⚠️ Problemas Comuns

### ⚠️ Erro comum (Electron sandbox)

Em algumas instalações Linux, o Electron pode falhar ao iniciar por causa das permissões do `chrome-sandbox`.

Solução:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

Depois tente iniciar novamente:

```bash
npm start
```

### `Telegram não configurado`

Esse erro acontece quando o arquivo de configuração ainda não existe ou está incompleto.

Abra o app e salve:

- `BOT_TOKEN`;
- `CHAT_ID`.

### `Node.js não encontrado`

Instale Node.js 18 ou superior antes de rodar o app ou instalar o serviço.

Verifique a versão:

```bash
node --version
```

### Instalação automática pede senha

No Linux, criar serviço systemd exige permissão de administrador. Autorize o prompt do sistema e use `Reparar instalação` se a primeira tentativa for interrompida.

### Serviço systemd não inicia

Confira se a configuração existe para o usuário atual:

```bash
ls -l ~/.config/pc-control-center/config.json
```

Depois verifique os logs:

```bash
journalctl -u pc-control-center-agent@$USER.service -e
```

Também é possível usar o botão `Ver logs` na interface.

## 🗺️ Roadmap

- Gerenciar múltiplos PCs na interface.
- Exibir lista de agentes instalados.
- Adicionar logs locais sem dados sensíveis.
- Criar backend opcional em `server/`.
- Adicionar autenticação para painel remoto.
- Melhorar empacotamento do app Electron.
- Criar telas de histórico, alertas e inventário.
- Suportar novos comandos seguros via Telegram.

## 👤 Autor

Projeto criado por `rvzindx`.

Se usar este projeto como base, mantenha os tokens fora do repositório e revise as permissões antes de instalar em máquinas reais.
