/**
 * Apple incelemesi için tek adres. E-posta göndermez; magic link jetonunu
 * istemciye verir, istemci bunu oturuma çevirir. Başka hiçbir adrese
 * jeton üretilmez.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const REVIEWER_EMAIL = '7ringbackup@gmail.com';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email ?? '').trim().toLowerCase();
  if (email !== REVIEWER_EMAIL) {
    return Response.json({ error: 'Bu e-posta adresiyle giriş yapılamıyor.' }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: REVIEWER_EMAIL,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return Response.json({ error: 'Giriş yapılamadı.' }, { status: 500 });
  }

  return Response.json({ token_hash: tokenHash });
});
