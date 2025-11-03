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
  // Headers de segurança - permitir recursos necessários para MercadoPago SDK e Google Fonts
  async headers() {
    // CSP para desenvolvimento e produção - permitir MercadoPago SDK, Mercado Livre e Google Fonts
    const cspValue = "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://apis.google.com https://firebase.googleapis.com https://sdk.mercadopago.com https://vercel.live; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.mercadopago.com https://*.mercadopago.com https://sdk.mercadopago.com https://api.mercadolibre.com https://*.mercadolibre.com https://www.mercadolibre.com; " +
      "frame-src 'self' https://www.mercadolibre.com https://*.mercadolibre.com;";
    
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspValue,
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

