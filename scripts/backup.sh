#!/usr/bin/env bash
set -euo pipefail

GIST_ID=${BACKUP_GIST_ID:-}
RELEASE_TAG=${BACKUP_RELEASE_TAG:-codespace-backups}
TARGETS=(${BACKUP_PATHS:-"$HOME/workspace" "$HOME/.config" /var/www})
LABEL=${1:-manual}
RUN_ONCE=${RUN_ONCE:-false}
INTERVAL_SECONDS=${INTERVAL_SECONDS:-1800}

backup_once() {
  local ts archive tmpdir
  ts=$(date +%Y-%m-%d_%H%M%S)
  tmpdir=$(mktemp -d)
  archive="$tmpdir/${ts}_${LABEL}.tar.gz"

  echo "[backup] Creating archive $archive..."
  tar -czf "$archive" "${TARGETS[@]}"

  mkdir -p backups
  cp "$archive" "backups/"
  echo "[backup] Local copy stored at backups/$(basename "$archive")"

  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    upload_to_gist "$archive" || echo "[backup] Gist upload skipped/failed"
    upload_to_release "$archive" || echo "[backup] Release upload skipped/failed"
  else
    echo "[backup] GITHUB_TOKEN not provided; remote upload skipped"
  fi

  rm -rf "$tmpdir"
}

upload_to_gist() {
  local archive=$1
  if [[ -z "$GIST_ID" ]]; then
    return 1
  fi
  command -v gh >/dev/null 2>&1 || return 1
  echo "[backup] Uploading to gist $GIST_ID..."
  gh api -X PATCH "/gists/$GIST_ID" \
    -f files[$(basename "$archive")].content="$(base64 -w0 "$archive")" \
    -f description="Codespace backup $(date -u)" >/dev/null
}

upload_to_release() {
  local archive=$1
  command -v gh >/dev/null 2>&1 || return 1
  local origin repo_path
  origin=$(git config --get remote.origin.url || true)
  [[ -z "$origin" ]] && return 1
  repo_path=${origin#*:}
  repo_path=${repo_path#https://github.com/}
  repo_path=${repo_path%.git}

  echo "[backup] Uploading to release $RELEASE_TAG on $repo_path..."
  gh release view "$RELEASE_TAG" --repo "$repo_path" >/dev/null 2>&1 || \
    gh release create "$RELEASE_TAG" --repo "$repo_path" --title "$RELEASE_TAG" --notes "Automated codespace backups" >/dev/null
  gh release upload "$RELEASE_TAG" "$archive" --repo "$repo_path" --clobber >/dev/null
}

echo "[backup] Targets: ${TARGETS[*]}"

if [[ "$RUN_ONCE" == "true" ]]; then
  backup_once
else
  echo "[backup] Starting loop every $INTERVAL_SECONDS seconds..."
  while true; do
    backup_once
    sleep "$INTERVAL_SECONDS"
  done
fi
