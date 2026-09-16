#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ ! -f web/vendor/three.module.js ] && [ ! -f node_modules/three/package.json ]; then npm install --no-audit --no-fund; fi
exec node scripts/start.mjs
