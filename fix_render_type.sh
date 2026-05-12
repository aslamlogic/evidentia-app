#!/bin/bash
echo "🔧 Fixing 'unknown type: static' error. Switching to 'web' type..."

# 1. Corrected render.yaml (Component: L1 Provisioning)
cat > render.yaml << 'IAC'
services:
  - type: web
    name: evidentia-app
    buildCommand: "cd app && npm install --legacy-peer-deps --force && npm run build"
    startCommand: "npx serve app/out"
    envVars:
      - key: NODE_VERSION
        value: "20.10.0"
      - key: CI
        value: "false"
      - key: PRISMA_SKIP_POSTINSTALL_GENERATE
        value: "1"
      - key: NPM_CONFIG_LEGACY_PEER_DEPS
        value: "true"
IAC
echo "✅ render.yaml corrected (type: web, startCommand added)"

# 2. Push to resolve the Blueprint error
git add render.yaml
git commit -m "FIX: Render Blueprint. Changed type to 'web' and added startCommand." || true
git push origin main

echo "✅ Pushed. Render will retry automatically with the corrected Blueprint."
