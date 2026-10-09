-- Kabul edilen e-posta alan adı arayüzde gösterilmez; reddedilen kayıt da
-- nedenini açıklamayan genel bir mesaj alır. Kısıtın kendisi değişmedi.
create or replace function private.reject_non_student_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_student_email(new.email) then
    raise exception using errcode = 'RN400', message = 'Bu e-posta adresiyle giriş yapılamıyor.';
  end if;
  return new;
end;
$$;
