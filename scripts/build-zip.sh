#!/usr/bin/env bash
# Build the publishable Chrome Web Store package (manifest at the zip root).
# Usage: bash scripts/build-zip.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/zen-google-v${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

# Ship only the runtime extension files. Everything else (docs, tests, scripts,
# node_modules, .git, .claude, _metadata, the store-only icon, the GitHub Pages
# files) is deliberately excluded.
zip -r -X "$OUT" \
  manifest.json \
  background.js \
  lib \
  rules \
  css \
  content \
  popup \
  options \
  icons/icon16.png \
  icons/icon32.png \
  icons/icon48.png \
  icons/icon128.png \
  -x "*.DS_Store" >/dev/null

echo "Built $OUT"
echo "--- contents ---"
unzip -l "$OUT"
