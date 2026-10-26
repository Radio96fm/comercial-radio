/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // gera o PDF do contrato no servidor
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    // o PDF é gerado no download e também ao enviar para assinatura (ação da página do contrato);
    // as fontes do pdfkit são carregadas dinamicamente e precisam ir junto
    outputFileTracingIncludes: {
      '/app/contratos/[id]/pdf': ['./public/logos/**', './node_modules/pdfkit/js/**'],
      '/app/contratos/[id]': ['./public/logos/**', './node_modules/pdfkit/js/**'],
    },
  },
  // o diretor comercial usa o sistema de verdade: os links antigos de demonstração levam ao login
  async redirects() {
    return [
      { source: '/demo-comercial', destination: '/login', permanent: false },
      { source: '/demo-gestao/:resto*', destination: '/login', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};
export default nextConfig;
