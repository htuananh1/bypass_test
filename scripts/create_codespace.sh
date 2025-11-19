#!/usr/bin/env bash
set -euo pipefail

REPO_ARG=${1:-}
BRANCH=${2:-main}
MACHINE=${MACHINE:-standardLinux}
TIMEOUT=${TIMEOUT:-6h}

if [[ -z "$REPO_ARG" ]]; then
  ORIGIN_URL=$(git config --get remote.origin.url || true)
  if [[ -z "$ORIGIN_URL" ]]; then
    echo "Usage: $0 <owner/repo> [branch]" >&2
    exit 1
  fi
  REPO_ARG=${ORIGIN_URL#https://github.com/}
  REPO_ARG=${REPO_ARG#git@github.com:}
  REPO_ARG=${REPO_ARG%.git}
fi

echo "Tạo Codespace nhanh cho $REPO_ARG (branch $BRANCH, timeout $TIMEOUT)..."
gh codespace create \
  --repo "$REPO_ARG" \
  --branch "$BRANCH" \
  --idle-timeout "$TIMEOUT" \
  --machine "$MACHINE"

echo "Codespace đã tạo. Đặt tên vào biến CODESPACE_NAME để dùng ở bước kế tiếp."
