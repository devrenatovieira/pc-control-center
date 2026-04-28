#!/usr/bin/env bash
set -u
set -o pipefail
export LC_ALL=C

TARGET_USER="${PCC_TARGET_USER:-${SUDO_USER:-${USER:-}}}"
HOME_USUARIO="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
LOG_DIR="${HOME_USUARIO}/.local/state/pc-control-center/logs"
LOG_FILE="${LOG_DIR}/limpeza.log"

[ -n "$TARGET_USER" ] && [ -n "$HOME_USUARIO" ] || {
  echo "Usuário alvo inválido." >&2
  exit 1
}

limpar_cache_seguro() {
  local dir="$1"
  case "$dir" in
    "$HOME_USUARIO"/.cache/*) ;;
    *)
      printf '[%s] Ignorando caminho fora de cache seguro: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$dir"
      return 0
      ;;
  esac

  [ -d "$dir" ] || return 0
  /usr/bin/find "$dir" -type f -delete
  /usr/bin/find "$dir" -depth -type d -empty -delete
}

mkdir -p "$LOG_DIR"

{
  printf '[%s] Iniciando limpeza segura do sistema.\n' "$(date '+%Y-%m-%d %H:%M:%S')"
  status=0
  /usr/bin/apt autoclean -y || status=$?
  /usr/bin/apt autoremove -y || status=$?
  limpar_cache_seguro "$HOME_USUARIO/.cache/thumbnails"
  limpar_cache_seguro "$HOME_USUARIO/.cache/fontconfig"
  limpar_cache_seguro "$HOME_USUARIO/.cache/pip"
  limpar_cache_seguro "$HOME_USUARIO/.cache/npm"
  printf '[%s] Limpeza finalizada. Status: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$status"
  exit "$status"
} 2>&1 | /usr/bin/tee -a "$LOG_FILE"

exit "${PIPESTATUS[0]}"
