#!/usr/bin/env bash
set -uo pipefail
TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-${USER:-}}}"
[ -n "$TARGET_USER" ] || {
  echo "Usuário alvo não informado." >&2
  exit 1
}
/usr/bin/systemctl status "pc-control-center-agent@${TARGET_USER}.service" --no-pager || true
