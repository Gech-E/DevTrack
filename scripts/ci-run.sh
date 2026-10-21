#!/usr/bin/env bash
# Runs a command, streams its output as usual, and on failure also publishes the relevant part of
# that output as a GitHub Actions annotation (readable from the run summary and the checks API).
#
# Usage: scripts/ci-run.sh <title> <command...>
set -uo pipefail

title="${1:?title}"
shift

log="$(mktemp)"
NO_COLOR=1 FORCE_COLOR=0 "$@" 2>&1 | tee "$log"
status="${PIPESTATUS[0]}"

if [ "$status" -ne 0 ]; then
  "$(dirname "$0")/ci-annotate.sh" error "${title} failed" "$log" 9000
fi

exit "$status"
