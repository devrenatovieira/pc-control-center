#!/usr/bin/env bash
set -euo pipefail
TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-${USER:-}}}"
[ -n "$TARGET_USER" ] || {
  echo "Usuário alvo não informado." >&2
  exit 1
}
exec /usr/bin/systemctl restart "pc-control-center-agent@${TARGET_USER}.service"
