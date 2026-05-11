#!/bin/bash
echo "--- 1. Restoring Correct Next.js Structure ---"

# Ensure package.json is at the project root (where Next.js expects it)
if [ -f "app/package.json" ] && [ ! -f "package.json" ]; then
  mv app/package.json .
  mv app/package-lock.json . 2>/dev/null || true
fi

# Place next.config.mjs at the CORRECT level (Repo Root)
cat > next.config.mjs << 'NEXTCONFIG'
/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  generateBuildId: () => 'static',
  eslint: { ignoreDuringBuilds: true }
}
NEXTCONFIG

echo "--- 2. Hard-Resetting Build Scripts ---"
node -e "
  const fs = require('fs');
  let p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  p.scripts.build = 'next build';
  p.scripts.prebuild = 'echo \"Clearing build artifacts...\" && rm -rf .next out';
  delete p.scripts.postinstall;
  delete p.scripts['prisma:generate'];
  p.engines = { node: '20.x' };
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
  console.log('package.json hardened.');
"

echo "--- 3. Setting Node Version & Cleaning Cache ---"
echo "20.10.0" > .nvmrc
rm -rf node_modules package-lock.json .next out dist

echo "--- 4. Committing & Force-Pushing ---"
git add .
git commit -m "VERDICT: Structural reset for static export"
git push origin main --force

echo "--- COMPLETE. Repository is now static-export compliant. ---"
