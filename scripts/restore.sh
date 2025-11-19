#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <archive path or url> <target_dir>" >&2
  exit 1
fi

SOURCE=$1
TARGET=$2
mkdir -p "$TARGET"

fetch_if_needed() {
  local src=$1
  if [[ -f "$src" ]]; then
    echo "$src"
    return
  fi
  local tmp
  tmp=$(mktemp)
  echo "[restore] Downloading $src ..."
  curl -fsSL "$src" -o "$tmp"
  echo "$tmp"
}

ARCHIVE=$(fetch_if_needed "$SOURCE")
tar -xzf "$ARCHIVE" -C "$TARGET"

echo "[restore] Data restored into $TARGET"
