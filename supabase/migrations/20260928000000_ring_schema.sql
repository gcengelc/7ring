-- Ring Nerede — Supabase şeması.
--
-- server/ klasöründeki Node servisinin karşılığı:
--   codes / sessions  → Supabase Auth (e-posta OTP)
--   sightings         → public.sightings + report_sighting()
--   push_tokens       → public.push_tokens + register/unregister_push_token()
--   push.js           → supabase/functions/notify-sighting (tetikleyiciyle çağrılır)
--   pruneOldRows      → pg_cron işi
--
-- İstemci tablolara yalnızca okumak için dokunur; yazma işlemleri
-- security definer fonksiyonlardan geçer, kurallar burada uygulanır.
-- Kullanıcıya gösterilecek hatalar `RN` ile başlayan SQLSTATE kodlarıyla
-- atılır; istemci (src/api/supabase.ts) bunların mesajını olduğu gibi gösterir.

create schema if not exists private;
-- RLS politikaları buradaki yardımcıları çağırır. Şema API'ye açık değil.
grant usage on schema private to authenticated;

/* ── Alan adı kısıtı ───────────────────────────────────────────────── */

-- İstemcideki MAIL_DOMAIN (src/data/stops.ts) ile aynı olmalı.
create or replace function private.mail_domain()
returns text
language sql
immutable
as $$ select '@std.yeditepe.edu.tr' $$;

create or replace function private.is_student_email(email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select email is not null
     and lower(email) like '%' || private.mail_domain()
     and split_part(lower(email), '@', 1) ~ '^[a-z0-9._-]{3,}$'
$$;

-- Öğrenci olmayan adreslerin hesap açmasını Auth katmanında engelle.
-- Tetikleyici supabase_auth_admin rolüyle çalışır; private şemasına
-- erişebilmesi için security definer.
create or replace function private.reject_non_student_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_student_email(new.email) then
    raise exception using errcode = 'RN400', message = 'Geçerli bir öğrenci e-postası gir.';
  end if;
  return new;
end;
$$;

drop trigger if exists ring_student_only on auth.users;
create trigger ring_student_only
  before insert on auth.users
  for each row execute function private.reject_non_student_signup();

/* ── Duraklar ──────────────────────────────────────────────────────── */

-- id'ler istemcideki src/data/stops.ts ile aynı olmalı.
create table public.stops (
  id   text primary key,
  name text not null
);

insert into public.stops (id, name) values
  ('ust', 'Üst Kapı'),
  ('meydan', 'Meydan'),
  ('rekt', 'Rektörlük'),
  ('gsf', 'GSF Arka Kapı'),
  ('sosyal', 'Sosyal Tesis'),
  ('alt', 'Alt Kapı'),
  ('festival', 'Festival Alanı'),
  ('yurt', 'Erkek/Kız Yurdu'),
  ('kuzey', 'Kuzey Kız Yurdu');

alter table public.stops enable row level security;

create policy "stops: oturumlu herkes okur"
  on public.stops for select to authenticated using (true);

/* ── Bildirimler ───────────────────────────────────────────────────── */

create table public.sightings (
  id       uuid primary key default gen_random_uuid(),
  stop_id  text not null references public.stops (id),
  user_id  uuid not null references auth.users (id) on delete cascade,
  -- Kullanıcıya gösterilen kısa ad: e-postanın @ öncesi.
  by_name  text not null,
  at       timestamptz not null default now()
);

create index sightings_at on public.sightings (at desc);
create index sightings_user_stop on public.sightings (user_id, stop_id, at desc);

alter table public.sightings enable row level security;

-- Uygulama yalnızca "bugünü" gösterir; daha eskisi okunmaz.
create policy "sightings: oturumlu öğrenci son 24 saati okur"
  on public.sightings for select to authenticated
  using (
    at > now() - interval '24 hours'
    and private.is_student_email(auth.jwt() ->> 'email')
  );

-- user_id başkalarına gösterilmez; okunabilen sütunlar bunlarla sınırlı.
revoke all on public.sightings from anon, authenticated;
grant select (id, stop_id, by_name, at) on public.sightings to authenticated;

-- Aynı kişi aynı durağı 60 saniye içinde iki kez bildiremez.
create or replace function public.report_sighting(p_stop_id text)
returns public.sightings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_row   public.sightings;
begin
  if v_uid is null then
    raise exception using errcode = 'RN401', message = 'Oturumun sona ermiş. Tekrar giriş yap.';
  end if;
  if not private.is_student_email(v_email) then
    raise exception using errcode = 'RN403', message = 'Bildirim için öğrenci e-postasıyla giriş yapmalısın.';
  end if;
  if not exists (select 1 from public.stops s where s.id = p_stop_id) then
    raise exception using errcode = 'RN400', message = 'Böyle bir durak yok.';
  end if;

  -- Aynı anda gelen iki istek bekleme kontrolünü birlikte atlatmasın.
  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_stop_id));

  if exists (
    select 1 from public.sightings s
    where s.user_id = v_uid
      and s.stop_id = p_stop_id
      and s.at > now() - interval '60 seconds'
  ) then
    raise exception using errcode = 'RN429', message = 'Bu durağı az önce bildirdin.';
  end if;

  insert into public.sightings (stop_id, user_id, by_name)
  values (p_stop_id, v_uid, split_part(lower(v_email), '@', 1))
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.report_sighting(text) from public, anon;
grant execute on function public.report_sighting(text) to authenticated;

/* ── Push jetonları ────────────────────────────────────────────────── */

create table public.push_tokens (
  push_token  text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  nearby_only boolean not null default false,
  sound       boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index push_tokens_user on public.push_tokens (user_id);

-- Politika yok: istemci tabloya doğrudan erişemez, yalnızca aşağıdaki
-- fonksiyonlar ve service role (edge function) dokunur.
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push_token(
  p_push_token  text,
  p_nearby_only boolean,
  p_sound       boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'RN401', message = 'Oturumun sona ermiş. Tekrar giriş yap.';
  end if;
  if p_push_token is null
     or not (p_push_token like 'ExponentPushToken%' or p_push_token like 'ExpoPushToken%') then
    raise exception using errcode = 'RN400', message = 'Geçersiz bildirim jetonu.';
  end if;

  -- Cihaz hesap değiştirdiyse jeton yeni kullanıcıya geçer.
  insert into public.push_tokens (push_token, user_id, nearby_only, sound, updated_at)
  values (p_push_token, auth.uid(), coalesce(p_nearby_only, false), coalesce(p_sound, false), now())
  on conflict (push_token) do update set
    user_id     = excluded.user_id,
    nearby_only = excluded.nearby_only,
    sound       = excluded.sound,
    updated_at  = excluded.updated_at;
end;
$$;

create or replace function public.unregister_push_token(p_push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens
  where push_token = p_push_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, boolean, boolean) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, boolean, boolean) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

/* ── Yeni bildirimde push ──────────────────────────────────────────── */

-- Her yeni bildirim notify-sighting edge function'ını çağırır. Proje adresi
-- ve paylaşılan sır Vault'ta tutulur (kurulum: README → Supabase). İkisi
-- tanımlı değilse tetikleyici sessizce geçer; bildirim yine kaydedilir.
create extension if not exists pg_net with schema extensions;

create or replace function private.notify_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'ring_project_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'ring_notify_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := rtrim(v_url, '/') || '/functions/v1/notify-sighting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := jsonb_build_object(
      'sighting_id', new.id,
      'stop_id', new.stop_id,
      'user_id', new.user_id
    )
  );
  return new;
end;
$$;

create trigger ring_notify_sighting
  after insert on public.sightings
  for each row execute function private.notify_sighting();

/* ── Temizlik ──────────────────────────────────────────────────────── */

-- Bir günden eski bildirimler tutulmaz (server/src/db.js → pruneOldRows).
create extension if not exists pg_cron;

select cron.schedule(
  'ring-prune-sightings',
  '0 * * * *',
  $$ delete from public.sightings where at < now() - interval '24 hours' $$
);
