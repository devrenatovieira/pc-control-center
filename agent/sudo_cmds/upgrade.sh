#!/usr/bin/env bash
set -u
set -o pipefail
export LC_ALL=C

TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-${USER:-}}}"
HOME_USUARIO="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
LOG_DIR="${HOME_USUARIO}/.local/state/pc-control-center/logs"
LOG_FILE="${LOG_DIR}/upgrade.log"

[ -n "$TARGET_USER" ] && [ -n "$HOME_USUARIO" ] || {
  echo "Usuário alvo inválido." >&2
  exit 1
}

mkdir -p "$LOG_DIR"

{
  printf '[%s] Iniciando upgrade do sistema.\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  status=0
  /usr/bin/apt update || status=$?
  if [ "$status" -eq 0 ]; then
    /usr/bin/apt upgrade -y || status=$?
  fi
  printf '[%s] Upgrade finalizado. Status: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$status"
  exit "$status"
} 2>&1 | /usr/bin/tee -a "$LOG_FILE"

exit "${PIPESTATUS[0]}"
