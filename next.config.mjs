/** @type {import('next').NextConfig} */
const nextConfig = {
  // Versión visible al pie: commit con el que Vercel construyó la web (en local, "local").
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
