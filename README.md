# PC Control Center

Painel desktop para configurar e instalar um agente Linux de monitoramento remoto via Telegram.

O projeto combina um app Electron, um agente local em Node.js e scripts de instalação para systemd. O MVP permite salvar a configuração do Telegram, testar a conexão, visualizar informações básicas do PC e preparar o agente para iniciar com o sistema.

## 📸 Demonstração

> Placeholder para imagem ou GIF da interface.

```text
docs/demo.gif
```

## 🚀 Instalação

### Requisitos

- Linux com systemd.
- Node.js 18 ou superior.
- npm.
- Uma conta no Telegram.
- Um bot criado pelo BotFather.
- O `CHAT_ID` do usuário, grupo ou canal que receberá as mensagens.

### Passo a passo

Clone o projeto:

```bash
git clone https://github.com/seu-usuario/pc-control-center.git
cd pc-control-center
```

Instale as dependências:

```bash
npm install
```

## ▶️ Rodar Aplicação

Inicie o app Electron:

```bash
npm start
```

O app abre uma interface com:

- tela inicial do sistema;
- tela de configuração do Telegram;
- status do PC atual;
- botão para testar conexão com Telegram;
- botão para consultar status do agente;
- orientação para instalar o agente.

## ⚙️ Configuração

Na tela `Telegram`, informe:

- `BOT_TOKEN`: token do bot criado no BotFather.
- `CHAT_ID`: ID do chat que receberá as mensagens.

Depois clique em `Salvar configuração`.

A configuração local é salva em:

```text
~/.config/pc-control-center/config.json
```

O arquivo é criado com permissão restrita:

```text
600
```

Depois de salvo, o token não é exibido novamente na tela.

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

## 🛠️ Instalação Como Serviço

Depois de configurar o Telegram pelo app, instale o agente como serviço systemd:

```bash
sudo ./installer/install-linux.sh
```

Inicie o serviço:

```bash
sudo systemctl start pc-control-center-agent@$USER.service
```

Verifique o status:

```bash
systemctl status pc-control-center-agent@$USER.service
```

O instalador:

- copia arquivos para `/opt/pc-control-center`;
- registra o serviço systemd;
- habilita o agente para iniciar com o PC;
- mantém o serviço rodando com o usuário atual.

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
│       └── config-store.js
├── agent/
│   ├── agent.js
│   ├── config.js
│   ├── system-info.js
│   └── telegram.js
├── installer/
│   ├── install-linux.sh
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
- O instalador apenas copia arquivos e configura o serviço systemd.

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

### Serviço systemd não inicia

Confira se a configuração existe para o usuário atual:

```bash
ls -l ~/.config/pc-control-center/config.json
```

Depois verifique os logs:

```bash
journalctl -u pc-control-center-agent@$USER.service -e
```

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
