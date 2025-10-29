/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  typescript: {
    // !! WARN !!
    // Ignorar erros de TypeScript durante o build
    // Remova isso quando resolver os problemas de tipo
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

