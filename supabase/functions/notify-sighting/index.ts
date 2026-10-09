/**
 * Yeni bildirim geldiğinde diğer öğrencilere push atar — server/src/push.js'in
 * Supabase karşılığı.
 *
 * public.sightings üzerindeki tetikleyici (migration → private.notify_sighting)
 * her eklemede bu fonksiyonu pg_net ile çağırır. İstek kullanıcı JWT'si değil,
 * Vault'taki paylaşılan sırla gelir; bu yüzden fonksiyon --no-verify-jwt ile
 * yayınlanır ve sırrı kendisi doğrular.
 *
 * Bildirimi atan kişiye gönderilmez. "Sadece yakın duraklar" tercihi konum
 * gerektirdiği ve konum sunucuya gönderilmediği için burada filtrelenmez.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Payload {
  sighting_id: string;
  stop_id: string;
  user_id: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('NOTIFY_SIGHTING_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as Payload | null;
  if (!payload?.stop_id || !payload.user_id) {
    return new Response('bad request', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const [stopRes, tokensRes] = await Promise.all([
    supabase.from('stops').select('name').eq('id', payload.stop_id).single(),
    supabase.from('push_tokens').select('push_token, sound').neq('user_id', payload.user_id),
  ]);
  if (stopRes.error || tokensRes.error) {
    console.error('Push alıcıları okunamadı:', stopRes.error ?? tokensRes.error);
    return new Response('db error', { status: 500 });
  }

  const stopName = stopRes.data.name as string;
  const messages = tokensRes.data.map((row) => ({
    to: row.push_token as string,
    title: 'Ring görüldü',
    body: `${stopName} · şimdi`,
    sound: row.sound ? 'default' : null,
    priority: 'high',
    channelId: 'ring',
    data: { stopName },
  }));

  // Expo tek istekte en fazla 100 mesaj kabul eder.
  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const body = (await res.json()) as { data?: ExpoTicket[] };
      body.data?.forEach((ticket, j) => {
        if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          invalid.push(batch[j].to);
        }
      });
    } catch (err) {
      console.error('Push gönderilemedi:', err instanceof Error ? err.message : err);
    }
  }

  // Uygulaması silinmiş cihazların jetonlarını temizle.
  if (invalid.length > 0) {
    await supabase.from('push_tokens').delete().in('push_token', invalid);
  }

  return Response.json({ sent: messages.length, dropped: invalid.length });
});
