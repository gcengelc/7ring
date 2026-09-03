/**
 * Doğrulama kodu gönderimi.
 *
 * SMTP_* değişkenleri tanımlıysa gerçek e-posta gider; tanımlı değilse kod
 * sunucu günlüğüne yazılır. Geliştirme sırasında bu yeterlidir, üretimde
 * SMTP ayarlanmadan servis başlatılmamalıdır (bkz. index.js açılış uyarısı).
 */
const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

let transport = null;

async function getTransport() {
  if (!hasSmtp) return null;
  if (transport) return transport;
  const { createTransport } = await import('nodemailer');
  transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export async function sendCode(email, code) {
  const t = await getTransport();
  if (!t) {
    console.log(`[posta yok] ${email} için doğrulama kodu: ${code}`);
    return;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM ?? 'Ring Nerede <noreply@ringnerede.app>',
    to: email,
    subject: `Ring Nerede doğrulama kodun: ${code}`,
    text: [
      `Doğrulama kodun: ${code}`,
      '',
      'Kod 10 dakika geçerli. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.',
    ].join('\n'),
  });
}

export const smtpConfigured = hasSmtp;
