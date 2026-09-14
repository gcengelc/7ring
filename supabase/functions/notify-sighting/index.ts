/**
 * Yeni bildirim düştüğünde push gönderen Edge Function.
 *
 * Tetikleyici: Database Webhook (public.sightings → INSERT). Webhook'un
 * başlığına `x-webhook-secret` eklenir; WEBHOOK_SECRET ile eşleşmeyen
 * istekler reddedilir, çünkü fonksiyon uç noktası herkese açıktır.
 *
 * Kurulum: supabase functions deploy notify-sighting
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo tek istekte en fazla 100 mesaj alır. */
const BATCH = 100;

interface SightingRow {
  id: string;
  stop_id: string;
  user_id: string;
  by_name: string;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  const payload = (await req.json()) as { type?: string; record?: SightingRow };
  const row = payload.record;
  if (payload.type !== 'INSERT' || !row) return new Response('ignored', { status: 200 });

  // service_role: push_tokens tablosu RLS ile kapalı, webhook'un okuması gerek.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const [{ data: stop }, { data: tokens }] = await Promise.all([
    supabase.from('stops').select('name').eq('id', row.stop_id).single(),
    // Bildirimi atan kişiye kendi bildirimini göndermeyiz.
    supabase.from('push_tokens').select('push_token, sound').neq('user_id', row.user_id),
  ]);

  if (!tokens?.length) return new Response('no subscribers', { status: 200 });

  const messages = tokens.map((t) => ({
    to: t.push_token,
    title: 'Ring görüldü',
    body: `${stop?.name ?? 'Bir durak'} — ${row.by_name} bildirdi`,
    sound: t.sound ? 'default' : null,
    channelId: 'ring',
    priority: 'high',
    data: { stopId: row.stop_id },
  }));

  const failures: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + BATCH)),
    });
    if (!res.ok) failures.push(`${res.status} ${await res.text()}`);
  }

  if (failures.length > 0) {
    console.error('Expo push hatası:', failures.join(' | '));
    return new Response('partial failure', { status: 502 });
  }

  return new Response('ok', { status: 200 });
});
