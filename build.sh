#!/usr/bin/env bash
set -e

npx esbuild main.js --bundle --minify --outfile=bundle.js

# Auto-bump the ?v=N cache-buster in puzzle-suite.html
HTML=puzzle-suite.html
CURRENT=$(grep -oP 'bundle\.js\?v=\K[0-9]+' "$HTML" | head -1)
if [ -n "$CURRENT" ]; then
  NEXT=$((CURRENT + 1))
  sed -i "s/bundle\.js?v=${CURRENT}/bundle.js?v=${NEXT}/" "$HTML"
  echo "Cache version: v${CURRENT} → v${NEXT}"
fi
