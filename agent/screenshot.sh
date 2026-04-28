#!/usr/bin/env bash
set -euo pipefail

APP_STATE_DIR="${PCC_STATE_DIR:-${HOME}/.local/state/pc-control-center}"
LOG_DIR="${PCC_LOG_DIR:-${APP_STATE_DIR}/logs}"
IMG="${LOG_DIR}/screenshot.png"
UID_ATUAL="$(id -u)"
DISPLAY="${DISPLAY:-:0}"
XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/${UID_ATUAL}}"
DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR}/bus}"

export DISPLAY XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
mkdir -p "$LOG_DIR"

if command -v gnome-screenshot >/dev/null 2>&1; then
  gnome-screenshot -f "$IMG" >/dev/null 2>&1
elif command -v scrot >/dev/null 2>&1; then
  scrot "$IMG" >/dev/null 2>&1
elif command -v import >/dev/null 2>&1; then
  import -window root "$IMG" >/dev/null 2>&1
else
  echo "Nenhuma ferramenta de screenshot encontrada: instale gnome-screenshot, scrot ou imagemagick." >&2
  exit 1
fi

[ -s "$IMG" ] || {
  echo "Screenshot não foi criado ou está vazio." >&2
  exit 1
}

printf '%s\n' "$IMG"
