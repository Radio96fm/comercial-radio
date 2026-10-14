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
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* aplica o tema salvo antes de desenhar a tela (sem "piscar") */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('tema')==='claro'){document.documentElement.dataset.theme='light';var m=document.querySelector('meta[name=\"theme-color\"]');m&&m.setAttribute('content','#f4f2ee')}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
