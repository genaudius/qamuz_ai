/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We don't need output: 'export' if we are doing full-stack with API routes
  // Tailwind v4 uses standard css imports, but Next.js usually likes experimental optimizations.
};

export default nextConfig;
