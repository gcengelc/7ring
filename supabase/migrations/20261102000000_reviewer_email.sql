-- Apple incelemesi için tek adres. Öğrenci alan adı kuralı durur.
-- Hesabı reviewer-login fonksiyonu ilk girişte açar. İstemcideki
-- REVIEWER_EMAIL ile aynı olmalı.

create or replace function private.is_student_email(email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select email is not null
     and (
       lower(email) = '7ringbackup@gmail.com'
       or (
         lower(email) like '%' || private.mail_domain()
         and split_part(lower(email), '@', 1) ~ '^[a-z0-9._-]{3,}$'
       )
     )
$$;
