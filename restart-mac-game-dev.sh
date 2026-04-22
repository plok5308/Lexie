#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/apps/mac_game"

pkill -f "vite" 2>/dev/null || true
sleep 1

exec npm run dev
