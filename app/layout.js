import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './globals.css';

export const metadata = {
  title: 'Comercial · 96 FM & Rádio do Agro',
  description: 'Programas, patrocínios, visitas e contratos do departamento comercial.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Comercial', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
