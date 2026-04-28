#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pc-control-center"
INSTALL_DIR="/opt/${APP_NAME}"
SERVICE_TEMPLATE="${APP_NAME}-agent@.service"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-$USER}}"
SERVICE_NAME="${APP_NAME}-agent@${TARGET_USER}.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo ./installer/install-linux.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale Node.js antes de instalar o agente."
  exit 1
fi

install -d -m 755 "${INSTALL_DIR}"
cp -a "${SOURCE_DIR}/app" "${INSTALL_DIR}/"
cp -a "${SOURCE_DIR}/agent" "${INSTALL_DIR}/"
cp -a "${SOURCE_DIR}/server" "${INSTALL_DIR}/"
cp -a "${SOURCE_DIR}/package.json" "${INSTALL_DIR}/"

install -m 644 "${SOURCE_DIR}/installer/pc-control-center-agent.service" "/etc/systemd/system/${SERVICE_TEMPLATE}"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"

echo "Instalação concluída em ${INSTALL_DIR}."
echo "Serviço habilitado e iniciado: ${SERVICE_NAME}"
