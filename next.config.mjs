/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  generateBuildId: () => 'static',
  eslint: { ignoreDuringBuilds: true }
}
