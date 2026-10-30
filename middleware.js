import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PUBLICAS = ['/login', '/celular', '/demo-diretor', '/demo-comercial', '/demo-gestao', '/fluxo', '/mapa', '/diretor.webmanifest', '/comercial.webmanifest', '/gestao.webmanifest', '/financeiro.webmanifest', '/primeiro-acesso', '/cadastro', '/api/autentique'];

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  // as telas sabem qual endereço foi aberto (funções desligadas por acesso, ver lib/auth.js)
  const comCaminho = () => {
    const h = new Headers(request.headers);
    h.set('x-caminho', path);
    return NextResponse.next({ request: { headers: h } });
  };
  let response = comCaminho();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = comCaminho();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Só lê/renova a sessão do cookie (sem ida ao servidor a cada clique).
  // A conferência de verdade do login acontece nas telas (getSessao -> getUser).
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const publica = PUBLICAS.some((p) => path.startsWith(p));

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // depois do login volta para onde a pessoa queria ir (ex.: /financeiro no programa Rádio Financeiro)
    url.search = path !== '/' ? `?ir=${encodeURIComponent(path)}` : '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
