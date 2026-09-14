-- Yalnızca öğrenci e-postaları hesap açabilsin.
--
-- Bu fonksiyon Supabase'in "Before User Created" auth hook'u olarak
-- çalışır: panelde Authentication → Hooks altından bu fonksiyonu seçmek
-- gerekir, yoksa devrede olmaz. İstemcideki kontrol (src/lib/format.ts)
-- yalnızca kullanıcıya hızlı geri bildirim içindir; asıl kapı burasıdır.

create or replace function public.restrict_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(coalesce(event -> 'user' ->> 'email', ''));
  v_domain text := '@std.yeditepe.edu.tr';
begin
  if v_email like ('%' || v_domain) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 400,
      'message', 'Yalnızca ' || v_domain || ' uzantılı öğrenci e-postaları giriş yapabilir.'
    )
  );
end;
$$;

-- Hook'u auth servisi çağırır; başka kimsenin çalıştırmasına gerek yok.
revoke all on function public.restrict_email_domain(jsonb) from public, anon, authenticated;
grant execute on function public.restrict_email_domain(jsonb) to supabase_auth_admin;
