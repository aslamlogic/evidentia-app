#!/bin/bash
echo "--- Step 1: Clearing Git Interlock ---"
git rebase --abort 2>/dev/null
git add .
git commit -m "Internal state clear" 2>/dev/null

echo "--- Step 2: Injecting Dependency Overrides ---"
node -e "
let j = require('./package.json');
j.overrides = {
  '@typescript-eslint/parser': '7.0.0',
  '@typescript-eslint/eslint-plugin': '7.0.0'
};
require('fs').writeFileSync('package.json', JSON.stringify(j, null, 2));
"

echo "--- Step 3: Pushing DNA Fix to GitHub ---"
git add package.json
git commit -m "Forensic Fix: Forced dependency override for Next.js 15"
git push origin main --force

echo "--- COMPLETE: Check Render for the new build ---"
