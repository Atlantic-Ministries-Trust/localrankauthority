#!/usr/bin/env bash
# Builds the site's pages into docs/. Cloudflare Pages runs this on every push (build command: bash design/build.sh).
# The main branch gets the live build; every other branch (staging, experiments) gets the staging build,
# which shows the "Staging preview" banner and the draft notes.
# Run it yourself the same way: bash design/build.sh  (or LRA_LIVE=1 bash design/build.sh for the live build).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${CF_PAGES_BRANCH:-}" = "main" ]; then export LRA_LIVE=1; fi
MODE=staging; [ "${LRA_LIVE:-}" = "1" ] && MODE=live
echo "Building the $MODE site with $(python3 --version)"
python3 design/_towns.py
python3 design/_build.py
python3 design/_lp.py
python3 design/_stage.py
