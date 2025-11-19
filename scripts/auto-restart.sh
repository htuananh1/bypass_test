#!/usr/bin/env bash
set -euo pipefail

MAX_MINUTES=${MAX_RUNTIME_MINUTES:-360}
SLEEP_SECONDS=${SLEEP_SECONDS:-300}
BACKUP_SCRIPT=${BACKUP_SCRIPT:-$(dirname "$0")/backup.sh}
BACKUP_LABEL=${BACKUP_LABEL:-auto}

echo "[auto-restart] Watching uptime, max ${MAX_MINUTES} minutes"

while true; do
  uptime_minutes=$(awk '{print int($1/60)}' /proc/uptime)
  if [[ $uptime_minutes -ge $MAX_MINUTES ]]; then
    echo "[auto-restart] Uptime ${uptime_minutes}m reached, running backup and recreating codespace..."
    RUN_ONCE=true "$BACKUP_SCRIPT" "$BACKUP_LABEL" || echo "[auto-restart] backup failed"
    if command -v gh >/dev/null 2>&1; then
      CURRENT=$(gh codespace list --json name,state --limit 1 | jq -r '.[0].name' 2>/dev/null || true)
      if [[ -n "$CURRENT" ]]; then
        gh codespace delete -c "$CURRENT" -f || true
      fi
      gh codespace create --idle-timeout 6h --machine largeMachine || true
    fi
    exit 0
  fi
  sleep "$SLEEP_SECONDS"
done
