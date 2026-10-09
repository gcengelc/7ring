-- Mağaza gereksinimleri: hesap silme ve yanlış bildirimi şikayet etme.
--
--   delete_my_account()   → kullanıcı kendi hesabını ve tüm verisini siler
--   flag_sighting()       → "bu bildirim yanlış" şikayeti
--
-- Şikayet eden kişi o bildirimi bir daha görmez; üç farklı kişi şikayet
-- ederse bildirim herkesten gizlenir (satır silinmez, inceleme için kalır).
-- `flag_count` istemciye açılmaz (sütun yetkisi verilmedi).

/* ── Şikayetler ────────────────────────────────────────────────────── */

alter table public.sightings
  add column flag_count integer not null default 0;

create table public.sighting_flags (
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  at          timestamptz not null default now(),
  primary key (sighting_id, user_id)
);

-- Politika yok: istemci tabloya doğrudan erişemez, yalnızca fonksiyonlar dokunur.
alter table public.sighting_flags enable row level security;
revoke all on public.sighting_flags from anon, authenticated;

-- Bu kadar farklı kişi şikayet ederse bildirim herkesten gizlenir.
create or replace function private.flag_limit()
returns integer
language sql
immutable
as $$ select 3 $$;

-- Bildirim bu kullanıcıdan gizli mi? Politika içinden, kullanıcının erişimi
-- olmayan sütun ve tabloya bakmak için security definer.
create or replace function private.hidden_for_me(p_sighting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sightings s
    where s.id = p_sighting_id
      and (
        s.flag_count >= private.flag_limit()
        or exists (
          select 1 from public.sighting_flags f
          where f.sighting_id = s.id and f.user_id = auth.uid()
        )
      )
  )
$$;

revoke execute on function private.hidden_for_me(uuid) from public, anon;
grant execute on function private.hidden_for_me(uuid) to authenticated;

drop policy "sightings: oturumlu öğrenci son 24 saati okur" on public.sightings;

create policy "sightings: oturumlu öğrenci son 24 saati okur"
  on public.sightings for select to authenticated
  using (
    at > now() - interval '24 hours'
    and not private.hidden_for_me(id)
    and private.is_student_email(auth.jwt() ->> 'email')
  );

create or replace function public.flag_sighting(p_sighting_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_owner   uuid;
  v_flagged integer;
begin
  if v_uid is null then
    raise exception using errcode = 'RN401', message = 'Oturumun sona ermiş. Tekrar giriş yap.';
  end if;
  if not private.is_student_email(auth.jwt() ->> 'email') then
    raise exception using errcode = 'RN403', message = 'Şikayet için öğrenci e-postasıyla giriş yapmalısın.';
  end if;

  select s.user_id into v_owner from public.sightings s where s.id = p_sighting_id;
  if not found then
    raise exception using errcode = 'RN404', message = 'Bu bildirim artık yok.';
  end if;
  if v_owner = v_uid then
    raise exception using errcode = 'RN403', message = 'Kendi bildirimini şikayet edemezsin.';
  end if;

  insert into public.sighting_flags (sighting_id, user_id)
  values (p_sighting_id, v_uid)
  on conflict do nothing;
  get diagnostics v_flagged = row_count;

  -- Aynı kişinin ikinci şikayeti sayacı artırmaz.
  if v_flagged > 0 then
    update public.sightings s set flag_count = s.flag_count + 1 where s.id = p_sighting_id;
  end if;
end;
$$;

revoke execute on function public.flag_sighting(uuid) from public, anon;
grant execute on function public.flag_sighting(uuid) to authenticated;

/* ── Hesap silme ───────────────────────────────────────────────────── */

-- Auth kaydı silinince sightings, push_tokens ve sighting_flags satırları
-- `on delete cascade` ile birlikte gider. Kullanıcının bildirimleri de
-- silinir; başkalarının ekranından kalkar.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'RN401', message = 'Oturumun sona ermiş. Tekrar giriş yap.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
