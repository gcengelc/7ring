/**
 * Ring Nerede servisi — node:http + node:sqlite, harici çatı yok.
 *
 * Uç noktalar (istemcideki src/api/http.ts ile birebir):
 *   POST /auth/request-code  { email }
 *   POST /auth/verify        { email, code }        -> { token }
 *   GET  /sightings                                 -> { sightings }
 *   POST /sightings          { stopId }             -> { sighting }
 *   POST /push/register      { pushToken, nearbyOnly, sound }
 *   POST /push/unregister    { pushToken }
 *   GET  /health
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

import { db, pruneOldRows } from './db.js';
import { sendCode, smtpConfigured } from './mail.js';
import { notifySighting } from './push.js';

const PORT = Number(process.env.PORT ?? 4000);
const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? '@std.yeditepe.edu.tr';
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
/** Aynı kişi aynı durağı bu süre içinde iki kez bildiremez. */
const REPORT_COOLDOWN_MS = 60 * 1000;

/** Duraklar istemcideki src/data/stops.ts ile aynı olmalı. */
const STOPS = new Map(
  [
    ['ust', 'Üst Kapı'],
    ['meydan', 'Meydan'],
    ['rekt', 'Rektörlük'],
    ['gsf', 'GSF Arka Kapı'],
    ['sosyal', 'Sosyal Tesis'],
    ['alt', 'Alt Kapı'],
    ['festival', 'Festival Alanı'],
    ['yurt', 'Erkek/Kız Yurdu'],
    ['kuzey', 'Kuzey Kız Yurdu'],
  ].map(([id, name]) => [id, name])
);

/* ── yardımcılar ──────────────────────────────────────────────────── */

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

const fail = (res, status, message) => json(res, status, { error: message });

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error('too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Öğrenci e-postasını doğrula ve tek biçime indirge. */
function normalizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLocaleLowerCase('tr-TR');
  if (!email.endsWith(MAIL_DOMAIN)) return null;
  const local = email.slice(0, -MAIL_DOMAIN.length);
  if (!/^[a-z0-9._-]{3,}$/.test(local)) return null;
  return email;
}

/** Kullanıcıya gösterilen kısa ad: e-postanın @ öncesi. */
const shortName = (email) => email.slice(0, email.indexOf('@'));

function authenticate(req) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const row = db.prepare('SELECT email FROM sessions WHERE token = ?').get(sha256(token));
  return row ? row.email : null;
}

function agoLabel(minutes) {
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  return `${Math.round(minutes / 60)} sa önce`;
}

/* ── uç noktalar ──────────────────────────────────────────────────── */

async function requestCode(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!email) return fail(res, 400, 'Geçerli bir öğrenci e-postası gir.');

  const now = Date.now();
  const existing = db.prepare('SELECT sent_at FROM codes WHERE email = ?').get(email);
  if (existing && now - existing.sent_at < CODE_RESEND_MS) {
    return fail(res, 429, 'Yeni kod için bir dakika bekle.');
  }

  const code = String(randomInt(0, 10000)).padStart(4, '0');
  db.prepare(
    `INSERT INTO codes (email, code_hash, expires_at, attempts, sent_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       sent_at = excluded.sent_at`
  ).run(email, sha256(code), now + CODE_TTL_MS, now);

  await sendCode(email, code);
  return json(res, 200, { ok: true });
}

async function verifyCode(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!email || !/^\d{4}$/.test(code)) return fail(res, 400, 'Kod 4 haneli olmalı.');

  const row = db
    .prepare('SELECT code_hash, expires_at, attempts FROM codes WHERE email = ?')
    .get(email);
  if (!row) return fail(res, 400, 'Önce doğrulama kodu iste.');
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM codes WHERE email = ?').run(email);
    return fail(res, 400, 'Kodun süresi doldu. Yeni kod iste.');
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    return fail(res, 429, 'Çok fazla denedin. Yeni kod iste.');
  }

  const given = Buffer.from(sha256(code));
  const stored = Buffer.from(row.code_hash);
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
    db.prepare('UPDATE codes SET attempts = attempts + 1 WHERE email = ?').run(email);
    return fail(res, 400, 'Kod hatalı.');
  }

  db.prepare('DELETE FROM codes WHERE email = ?').run(email);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, email, created_at) VALUES (?, ?, ?)').run(
    sha256(token),
    email,
    Date.now()
  );
  return json(res, 200, { token });
}

function listSightings(res) {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const rows = db
    .prepare('SELECT id, stop_id, email, at FROM sightings WHERE at >= ? ORDER BY at DESC')
    .all(dayAgo);
  return json(res, 200, {
    sightings: rows.map((r) => ({
      id: r.id,
      stopId: r.stop_id,
      at: r.at,
      by: shortName(r.email),
    })),
  });
}

async function createSighting(req, res, email) {
  const body = await readJson(req);
  const stopId = typeof body.stopId === 'string' ? body.stopId : '';
  const stopName = STOPS.get(stopId);
  if (!stopName) return fail(res, 400, 'Böyle bir durak yok.');

  const now = Date.now();
  const recent = db
    .prepare('SELECT at FROM sightings WHERE email = ? AND stop_id = ? ORDER BY at DESC LIMIT 1')
    .get(email, stopId);
  if (recent && now - recent.at < REPORT_COOLDOWN_MS) {
    return fail(res, 429, 'Bu durağı az önce bildirdin.');
  }

  const id = `r${now.toString(36)}${randomBytes(3).toString('hex')}`;
  db.prepare('INSERT INTO sightings (id, stop_id, email, at) VALUES (?, ?, ?, ?)').run(
    id,
    stopId,
    email,
    now
  );

  // Push gönderimi isteği bekletmesin.
  void notifySighting({ stopName, byEmail: email, minutesAgoLabel: agoLabel(0) });

  return json(res, 201, {
    sighting: { id, stopId, at: now, by: 'sen' },
  });
}

async function registerPush(req, res, email) {
  const body = await readJson(req);
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken : '';
  if (!pushToken.startsWith('ExponentPushToken') && !pushToken.startsWith('ExpoPushToken')) {
    return fail(res, 400, 'Geçersiz bildirim jetonu.');
  }
  db.prepare(
    `INSERT INTO push_tokens (push_token, email, nearby_only, sound, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(push_token) DO UPDATE SET
       email = excluded.email,
       nearby_only = excluded.nearby_only,
       sound = excluded.sound,
       updated_at = excluded.updated_at`
  ).run(pushToken, email, body.nearbyOnly ? 1 : 0, body.sound ? 1 : 0, Date.now());
  return json(res, 200, { ok: true });
}

async function unregisterPush(req, res, email) {
  const body = await readJson(req);
  db.prepare('DELETE FROM push_tokens WHERE push_token = ? AND email = ?').run(
    String(body.pushToken ?? ''),
    email
  );
  return json(res, 200, { ok: true });
}

/* ── yönlendirme ──────────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const route = `${req.method} ${url.pathname}`;

  try {
    if (route === 'GET /health') return json(res, 200, { ok: true, smtp: smtpConfigured });
    if (route === 'POST /auth/request-code') return await requestCode(req, res);
    if (route === 'POST /auth/verify') return await verifyCode(req, res);

    // Buradan sonrası oturum ister.
    const email = authenticate(req);
    if (!email) return fail(res, 401, 'Oturumun sona ermiş. Tekrar giriş yap.');

    if (route === 'GET /sightings') return listSightings(res);
    if (route === 'POST /sightings') return await createSighting(req, res, email);
    if (route === 'POST /push/register') return await registerPush(req, res, email);
    if (route === 'POST /push/unregister') return await unregisterPush(req, res, email);

    return fail(res, 404, 'Böyle bir adres yok.');
  } catch (err) {
    console.error(route, err);
    return fail(res, 500, 'Sunucuda bir sorun var. Birazdan tekrar dene.');
  }
});

setInterval(() => pruneOldRows(), 60 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`Ring Nerede servisi http://localhost:${PORT}`);
  if (!smtpConfigured) {
    console.warn(
      'UYARI: SMTP tanımlı değil. Doğrulama kodları e-posta yerine bu günlüğe yazılacak. ' +
        'Üretimde SMTP_HOST/SMTP_USER/SMTP_PASS tanımlayın.'
    );
  }
});
