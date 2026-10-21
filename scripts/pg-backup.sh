#!/usr/bin/env bash
# Logical backup of the DevTrack database with pg_dump (custom format, compressed).
#
# Usage:   DATABASE_URL=postgresql://... scripts/pg-backup.sh [backup-dir] [retention-days]
# Default: ./backups, keep 14 days.
#
# This is a safety net for self-hosted setups. A managed Postgres with point-in-time recovery is
# the better primary defence; keep this as an independent, off-platform copy.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

backup_dir="${1:-./backups}"
retention_days="${2:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${backup_dir}/devtrack-${timestamp}.dump"

mkdir -p "${backup_dir}"
umask 077

# Prisma-style URLs carry "?schema=public", which libpq does not understand.
pg_dump --format=custom --no-owner --no-privileges \
  --dbname="${DATABASE_URL%%\?*}" --file="${target}"

# A dump that cannot be listed is not a backup.
pg_restore --list "${target}" >/dev/null

find "${backup_dir}" -name 'devtrack-*.dump' -type f -mtime "+${retention_days}" -delete

echo "Backup written to ${target} ($(du -h "${target}" | cut -f1))"
