#!/usr/bin/env bash
# Turns a log file into a GitHub Actions annotation so failures are visible on the run summary
# and via the checks API without downloading raw logs.
#
# Jest/Playwright logs start at the first "FAIL"/failure marker; everything else uses the tail.
#
# Usage: scripts/ci-annotate.sh <error|warning|notice> <title> <file> [max-chars]
set -euo pipefail

level="${1:?level}"
title="${2:?title}"
file="${3:?file}"
max="${4:-6000}"

[ -f "$file" ] || exit 0

python3 - "$level" "$title" "$file" "$max" <<'PY'
import re
import sys

level, title, path, limit = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
text = open(path, errors="replace").read()
text = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)

markers = [m.start() for m in (re.search(p, text) for p in (r"\bFAIL\b", r"\bFailed\b|\[chromium\]", r"error TS\d+")) if m]
if markers:
    text = text[min(markers):][:limit]
else:
    text = text[-limit:]

text = text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
print(f"::{level} title={title}::{text}")
PY
