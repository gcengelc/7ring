import { db } from './db.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Yeni bildirim geldiğinde diğer öğrencilere push atar.
 *
 * Bildirimi atan kişiye gönderilmez. "Sadece yakın duraklar" tercihi
 * cihaz tarafında konum gerektirdiği için sunucu bunu şimdilik sessiz
 * bırakır: konum sunucuya gönderilmiyor, bu yüzden burada filtrelenemiyor.
 */
export async function notifySighting({ stopName, byEmail, minutesAgoLabel }) {
  const rows = db
    .prepare('SELECT push_token, sound FROM push_tokens WHERE email != ?')
    .all(byEmail);
  if (rows.length === 0) return;

  const messages = rows.map((row) => ({
    to: row.push_token,
    title: 'Ring görüldü',
    body: `${stopName} · ${minutesAgoLabel}`,
    sound: row.sound ? 'default' : null,
    priority: 'high',
    channelId: 'ring',
    data: { stopName },
  }));

  // Expo tek istekte en fazla 100 mesaj kabul eder.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const payload = await res.json();
      dropInvalidTokens(batch, payload);
    } catch (err) {
      console.error('Push gönderilemedi:', err.message);
    }
  }
}

/** Uygulaması silinmiş cihazların jetonlarını temizle. */
function dropInvalidTokens(batch, payload) {
  const tickets = payload?.data;
  if (!Array.isArray(tickets)) return;
  const remove = db.prepare('DELETE FROM push_tokens WHERE push_token = ?');
  tickets.forEach((ticket, i) => {
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      const token = batch[i]?.to;
      if (token) remove.run(token);
    }
  });
}
