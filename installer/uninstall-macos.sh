#!/usr/bin/env bash
set -euo pipefail

PLIST_FILE="${HOME}/Library/LaunchAgents/com.pc-control-center.agent.plist"

if [ -f "$PLIST_FILE" ]; then
  launchctl unload "$PLIST_FILE" >/dev/null 2>&1 || true
  rm -f "$PLIST_FILE"
  echo "LaunchAgent removido: $PLIST_FILE"
else
  echo "LaunchAgent não encontrado: $PLIST_FILE"
fi
