#!/usr/bin/env bash
set -euo pipefail

APP_STATE_DIR="${PCC_STATE_DIR:-${HOME}/.local/state/pc-control-center}"
LOG_DIR="${PCC_LOG_DIR:-${APP_STATE_DIR}/logs}"
IMG="${LOG_DIR}/webcam.jpg"

mkdir -p "$LOG_DIR"

if ! command -v fswebcam >/dev/null 2>&1; then
  echo "fswebcam não encontrado." >&2
  exit 1
fi

fswebcam -r 1280x720 --no-banner "$IMG" >/dev/null 2>&1

[ -s "$IMG" ] || {
  echo "Imagem da webcam não foi criada ou está vazia." >&2
  exit 1
}

printf '%s\n' "$IMG"
