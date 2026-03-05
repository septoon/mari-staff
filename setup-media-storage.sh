#!/usr/bin/env bash
set -euo pipefail

MEDIA_ROOT="${MEDIA_ROOT:-/var/lib/mari-server/media}"
YEAR="$(date +%Y)"
MONTH="$(date +%m)"

ENTITIES=(
  specialists
  banners
  promos
  offers
  contacts
  content
)

run_maybe_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
    return
  fi

  if "$@" 2>/dev/null; then
    return
  fi

  sudo "$@"
}

run_maybe_sudo install -d -m 0755 "$MEDIA_ROOT"

for entity in "${ENTITIES[@]}"; do
  run_maybe_sudo install -d -m 0755 "$MEDIA_ROOT/$entity/$YEAR/$MONTH"
done

if [ -n "${MEDIA_OWNER:-}" ] && [ -n "${MEDIA_GROUP:-}" ]; then
  run_maybe_sudo chown -R "${MEDIA_OWNER}:${MEDIA_GROUP}" "$MEDIA_ROOT"
fi

echo "Media storage prepared at: $MEDIA_ROOT"
echo "Prepared entities: ${ENTITIES[*]}"
echo "Prepared period: $YEAR/$MONTH"
