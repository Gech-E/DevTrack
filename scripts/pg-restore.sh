#!/usr/bin/env bash
# Restores a dump produced by scripts/pg-backup.sh into the database named by DATABASE_URL.
#
# Usage:   DATABASE_URL=postgresql://... scripts/pg-restore.sh path/to/devtrack-<timestamp>.dump
#
# This DROPS and recreates every object in the dump. Point it at a scratch database first to
# rehearse a restore; an untested backup is only a hope.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
dump="${1:?Pass the path of the dump file}"

if [ ! -f "${dump}" ]; then
  echo "No such file: ${dump}" >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="${DATABASE_URL%%\?*}" "${dump}"

echo "Restore from ${dump} finished"
