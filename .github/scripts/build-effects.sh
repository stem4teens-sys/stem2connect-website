#!/usr/bin/env bash
# GitHub Actions rebuilds only the added visual enhancements.
set -euo pipefail
cd "$(dirname "$0")/../.."
npm exec --yes --package=esbuild@0.28.2 -- esbuild \
  scene-worker.js observatory-worker.js edge-decorations.js --bundle --splitting --format=esm \
  --minify --target=es2022 --outdir=assets/runtime \
  --entry-names='[name]' --chunk-names='shared-[hash]' --legal-comments=linked
npm exec --yes --package=esbuild@0.28.2 -- esbuild \
  observatory-loader.js --bundle --minify --format=esm --target=es2022 \
  --outfile=observatory-entry.js
cat motion.css polish.css observatory.css | \
  npm exec --yes --package=esbuild@0.28.2 -- esbuild \
  --loader=css --minify --target=es2022 > enhancements.css
