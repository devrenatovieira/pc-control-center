#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pc-control-center"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_FILE="${PLIST_DIR}/com.pc-control-center.agent.plist"
NODE_BIN="$(command -v node || true)"

if [ -z "$NODE_BIN" ]; then
  echo "Node.js não encontrado. Instale Node.js antes de instalar o agente." >&2
  exit 1
fi

mkdir -p "$PLIST_DIR"

cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pc-control-center.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_DIR}/agent/agent.js</string>
    <string>--daemon</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${HOME}/.local/state/${APP_NAME}/logs/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/.local/state/${APP_NAME}/logs/launchd.err.log</string>
</dict>
</plist>
EOF

mkdir -p "${HOME}/.local/state/${APP_NAME}/logs"
launchctl unload "$PLIST_FILE" >/dev/null 2>&1 || true
launchctl load "$PLIST_FILE"

echo "LaunchAgent instalado: $PLIST_FILE"
