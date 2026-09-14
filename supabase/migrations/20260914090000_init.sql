-- Ring Nerede — Supabase şeması.
--
-- Uygulama doğrudan bu veritabanına konuşur; arada kendi sunucumuz yok.
-- Güvenlik iki katmanlı: RLS satır erişimini sınırlar, yazma işlemleri ise
-- RPC'lerden geçer (durak doğrulaması, bekleme süresi, kısa ad üretimi
-- tek yerde dursun diye).
--
-- Uygulamak için:  supabase db push        (veya SQL Editor'a yapıştır)

/* ── duraklar ─────────────────────────────────────────────────────── */
-- İstemcideki src/data/stops.ts ile aynı id'ler. Ayrı tablo olmasının
-- sebebi: bildirim eklenirken durak id'sinin doğrulanabilmesi.
create table if not exists public.stops (
  id    text primary key,
  name  text not null
);

insert into public.stops (id, name) values
  ('ust',      'Üst Kapı'),
  ('meydan',   'Meydan'),
  ('rekt',     'Rektörlük'),
  ('gsf',      'GSF Arka Kapı'),
  ('sosyal',   'Sosyal Tesis'),
  ('alt',      'Alt Kapı'),
  ('festival', 'Festival Alanı'),
  ('yurt',     'Erkek/Kız Yurdu'),
  ('kuzey',    'Kuzey Kız Yurdu')
on conflict (id) do update set name = excluded.name;

/* ── bildirimler ──────────────────────────────────────────────────── */
create table if not exists public.sightings (
  id       uuid primary key default gen_random_uuid(),
  stop_id  text not null references public.stops (id),
  user_id  uuid not null references auth.users (id) on delete cascade,
  -- Kullanıcıya gösterilen kısa ad (e-postanın @ öncesi). Denormalize
  -- tutuluyor ki listeleme için kimsenin e-postasına erişmek gerekmesin.
  by_name  text not null,
  at       timestamptz not null default now()
);

create index if not exists sightings_at_idx on public.sightings (at desc);
create index if not exists sightings_user_stop_idx on public.sightings (user_id, stop_id, at desc);

/* ── push jetonları ───────────────────────────────────────────────── */
create table if not exists public.push_tokens (
  push_token   text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  nearby_only  boolean not null default false,
  sound        boolean not null default false,
  updated_at   timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

/* ── RLS ──────────────────────────────────────────────────────────── */
alter table public.stops       enable row level security;
alter table public.sightings   enable row level security;
alter table public.push_tokens enable row level security;

drop policy if exists "duraklar herkese açık" on public.stops;
create policy "duraklar herkese açık"
  on public.stops for select
  to authenticated
  using (true);

-- Bildirimler giriş yapan herkese görünür; uygulama yalnızca son 24 saati
-- çeker ama okuma hakkı tarihe göre daraltılmaz (eski satırlar zaten silinir).
drop policy if exists "bildirimleri giriş yapanlar görür" on public.sightings;
create policy "bildirimleri giriş yapanlar görür"
  on public.sightings for select
  to authenticated
  using (true);

-- Doğrudan insert yok: report_sighting RPC'si üzerinden yazılır.
-- (Bekleme süresi ve kısa ad orada uygulanıyor.)

drop policy if exists "kendi push jetonunu görür" on public.push_tokens;
create policy "kendi push jetonunu görür"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kendi push jetonunu siler" on public.push_tokens;
create policy "kendi push jetonunu siler"
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

/* ── yardımcılar ──────────────────────────────────────────────────── */
-- E-postanın @ öncesi: arayüzde bildirimi atan kişinin adı olarak görünür.
create or replace function public.short_name(p_email text)
returns text
language sql
immutable
as $$
  select split_part(p_email, '@', 1);
$$;

/* ── bildirim gönderme ────────────────────────────────────────────── */
-- Aynı kişi aynı durağı 60 saniye içinde iki kez bildiremez.
create or replace function public.report_sighting(p_stop_id text)
returns table (id uuid, stop_id text, by_name text, at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_last    timestamptz;
begin
  if v_user_id is null then
    raise exception 'Bildirim için giriş yapmalısın.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.stops s where s.id = p_stop_id) then
    raise exception 'Böyle bir durak yok.' using errcode = 'P0001';
  end if;

  select s.at into v_last
  from public.sightings s
  where s.user_id = v_user_id and s.stop_id = p_stop_id
  order by s.at desc
  limit 1;

  if v_last is not null and v_last > now() - interval '60 seconds' then
    raise exception 'Bu durağı az önce bildirdin.' using errcode = 'P0001';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;

  return query
  insert into public.sightings (stop_id, user_id, by_name)
  values (p_stop_id, v_user_id, public.short_name(v_email))
  returning sightings.id, sightings.stop_id, sightings.by_name, sightings.at;
end;
$$;

revoke all on function public.report_sighting(text) from public, anon;
grant execute on function public.report_sighting(text) to authenticated;

/* ── push jetonu kaydı ────────────────────────────────────────────── */
-- Upsert RPC üzerinden: aynı cihaz başka bir hesaba geçtiğinde jeton
-- yeni kullanıcıya devredilir; RLS ile bu satır güncellenemezdi.
create or replace function public.register_push_token(
  p_push_token  text,
  p_nearby_only boolean,
  p_sound       boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Oturumun sona ermiş. Tekrar giriş yap.' using errcode = 'P0001';
  end if;

  if p_push_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_%+/=-]+\]$' then
    raise exception 'Geçersiz bildirim jetonu.' using errcode = 'P0001';
  end if;

  insert into public.push_tokens (push_token, user_id, nearby_only, sound, updated_at)
  values (p_push_token, v_user_id, p_nearby_only, p_sound, now())
  on conflict (push_token) do update set
    user_id     = excluded.user_id,
    nearby_only = excluded.nearby_only,
    sound       = excluded.sound,
    updated_at  = excluded.updated_at;
end;
$$;

revoke all on function public.register_push_token(text, boolean, boolean) from public, anon;
grant execute on function public.register_push_token(text, boolean, boolean) to authenticated;

/* ── temizlik ─────────────────────────────────────────────────────── */
-- Uygulama yalnızca "bugünü" gösterir; bir günden eski satırlar tutulmaz.
-- pg_cron kuruluysa aşağıdaki zamanlama da çalışır (bkz. docs).
create or replace function public.prune_old_sightings()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.sightings where at < now() - interval '24 hours';
$$;

revoke all on function public.prune_old_sightings() from public, anon, authenticated;
