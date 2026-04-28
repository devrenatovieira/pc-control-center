#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pc-control-center"
INSTALL_DIR="/opt/${APP_NAME}"
SERVICE_TEMPLATE="${APP_NAME}-agent@.service"
TARGET_USER="${SUDO_USER:-$USER}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo ./installer/uninstall-linux.sh"
  exit 1
fi

systemctl disable --now "${APP_NAME}-agent@${TARGET_USER}.service" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_TEMPLATE}"
systemctl daemon-reload

echo "Serviço removido."
echo "Arquivos instalados permanecem em ${INSTALL_DIR}."
echo "Remova manualmente o diretório se desejar apagar a instalação."
