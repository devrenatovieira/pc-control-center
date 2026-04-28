#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-${USER:-}}}"
SESSION_ID="${XDG_SESSION_ID:-}"

if [ -z "$SESSION_ID" ] && [ -n "$TARGET_USER" ]; then
  SESSION_ID="$(/usr/bin/loginctl list-sessions --no-legend 2>/dev/null | awk -v user="$TARGET_USER" '$3 == user { print $1; exit }')"
fi

if [ -z "$SESSION_ID" ]; then
  echo "Não foi possível identificar a sessão ativa para bloqueio." >&2
  exit 1
fi

exec /usr/bin/loginctl lock-session "$SESSION_ID"
