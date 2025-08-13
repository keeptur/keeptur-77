
-- 1) Função para criar perfil automaticamente no signup (idempotente)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Trigger em auth.users para criar perfil no signup (idempotente)
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_auth_user_created_create_profile'
      and n.nspname = 'auth'
      and c.relname = 'users'
  ) then
    create trigger on_auth_user_created_create_profile
    after insert on auth.users
    for each row execute function public.handle_new_user_profile();
  end if;
end
$$;

-- 3) Trigger em auth.users para bootstrap do primeiro admin (idempotente)
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_auth_user_created_bootstrap_admin'
      and n.nspname = 'auth'
      and c.relname = 'users'
  ) then
    create trigger on_auth_user_created_bootstrap_admin
    after insert on auth.users
    for each row execute function public.on_auth_user_created_make_first_admin();
  end if;
end
$$;

-- 4) Backfill de perfis para usuários que não têm profile ainda
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), u.email)
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- 5) Triggers de updated_at (idempotentes) para tabelas com coluna updated_at
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_accounts') then
    create trigger set_updated_at_accounts
    before update on public.accounts
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_email_templates') then
    create trigger set_updated_at_email_templates
    before update on public.email_templates
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_plan_kits') then
    create trigger set_updated_at_plan_kits
    before update on public.plan_kits
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_profiles') then
    create trigger set_updated_at_profiles
    before update on public.profiles
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_settings') then
    create trigger set_updated_at_settings
    before update on public.settings
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_smtp_settings') then
    create trigger set_updated_at_smtp_settings
    before update on public.smtp_settings
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_subscribers') then
    create trigger set_updated_at_subscribers
    before update on public.subscribers
    for each row execute function public.update_updated_at_column();
  end if;
end
$$;
