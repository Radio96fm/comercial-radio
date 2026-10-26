import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PUBLICAS = ['/login', '/celular', '/demo-diretor', '/demo-comercial', '/demo-gestao', '/diretor.webmanifest', '/comercial.webmanifest', '/primeiro-acesso', '/cadastro', '/api/autentique'];

export async function middleware(request) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Só lê/renova a sessão do cookie (sem ida ao servidor a cada clique).
  // A conferência de verdade do login acontece nas telas (getSessao -> getUser).
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path.startsWith(p));

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|svg|ico)$).*)'],
};
