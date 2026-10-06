/**
 * Giriş kodu e-posta şablonunu barındırılan Supabase projesine yazar.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-email-templates.mjs <proje-ref>
 *
 * Erişim jetonu: supabase.com/dashboard/account/tokens. Yalnızca konu, gövde
 * ve OTP ayarları değişir; SMTP dahil diğer Auth ayarlarına dokunulmaz.
 * Yeni kullanıcıya "confirmation", kayıtlı kullanıcıya "magic link" şablonu
 * gittiği için ikisine de aynı şablon yazılır.
 */
import { readFileSync } from 'node:fs';

const ref = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('Kullanım: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-email-templates.mjs <proje-ref>');
  process.exit(1);
}

const html = readFileSync(new URL('../supabase/templates/otp.html', import.meta.url), 'utf8');
const subject = 'Ring Nerede giriş kodun';

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mailer_subjects_confirmation: subject,
    mailer_templates_confirmation_content: html,
    mailer_subjects_magic_link: subject,
    mailer_templates_magic_link_content: html,
    mailer_otp_length: 6,
    mailer_otp_exp: 600,
  }),
});

const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`Başarısız (${res.status}):`, body?.message ?? body);
  process.exit(1);
}

const hasToken = (s) => (typeof s === 'string' && s.includes('{{ .Token }}') ? 'kod var' : 'KOD YOK');
console.log('Şablonlar güncellendi.');
console.log(`  confirmation: "${body.mailer_subjects_confirmation}" · ${hasToken(body.mailer_templates_confirmation_content)}`);
console.log(`  magic link:   "${body.mailer_subjects_magic_link}" · ${hasToken(body.mailer_templates_magic_link_content)}`);
console.log(`  OTP: ${body.mailer_otp_length} hane, ${body.mailer_otp_exp} sn`);
