'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { COOKIE_RADIO } from '@/lib/radio';

export async function trocarRadio(id) {
  if (!/^[0-9a-f-]{36}$/.test(String(id))) return;
  cookies().set(COOKIE_RADIO, id, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}
