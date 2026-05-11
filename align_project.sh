#!/bin/bash
echo "Aligning project files for Render..."
mkdir -p app
mv package.json app/ 2>/dev/null
mv package-lock.json app/ 2>/dev/null
mv next.config.mjs app/ 2>/dev/null
mv next.config.js app/ 2>/dev/null
mv tsconfig.json app/ 2>/dev/null

cat << 'INNER_EOF' > app/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};
export default nextConfig;
INNER_EOF

echo "Alignment complete."
