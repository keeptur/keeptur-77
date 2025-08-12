
-- 1) Tabela de perfis dos usuários do app (não mexe no schema auth)
--    Usaremos esta tabela para listar/filtrar/editar dados básicos de usuários no Admin.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS: usuário vê/edita seu próprio perfil; admin vê e edita todos; admin pode inserir correções
create policy profiles_select_self_or_admin
  on public.profiles
  for select
  using (id = auth.uid() or has_role(auth.uid(), 'admin'));

create policy profiles_update_self_or_admin
  on public.profiles
  for update
  using (id = auth.uid() or has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or has_role(auth.uid(), 'admin'));

create policy profiles_insert_admin_only
  on public.profiles
  for insert
  with check (has_role(auth.uid(), 'admin'));

-- Atualiza updated_at automaticamente
drop trigger if exists trg_profiles_set_timestamp on public.profiles;
create trigger trg_profiles_set_timestamp
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 2) Permissões de ADMIN em user_roles (já existe leitura do próprio papel, precisamos do admin gerenciar)
-- SELECT para admin
create policy user_roles_admin_all_select
  on public.user_roles
  for select
  using (has_role(auth.uid(), 'admin'));

-- INSERT/UPDATE/DELETE para admin
create policy user_roles_admin_all_insert
  on public.user_roles
  for insert
  with check (has_role(auth.uid(), 'admin'));

create policy user_roles_admin_all_update
  on public.user_roles
  for update
  using (has_role(auth.uid(), 'admin'));

create policy user_roles_admin_all_delete
  on public.user_roles
  for delete
  using (has_role(auth.uid(), 'admin'));

-- 3) Tabela de “kits de plano”
create table if not exists public.plan_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  seats integer not null check (seats > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_kits enable row level security;

-- Admin-only em plan_kits
create policy plan_kits_admin_select
  on public.plan_kits
  for select
  using (has_role(auth.uid(), 'admin'));

create policy plan_kits_admin_insert
  on public.plan_kits
  for insert
  with check (has_role(auth.uid(), 'admin'));

create policy plan_kits_admin_update
  on public.plan_kits
  for update
  using (has_role(auth.uid(), 'admin'));

create policy plan_kits_admin_delete
  on public.plan_kits
  for delete
  using (has_role(auth.uid(), 'admin'));

-- Atualiza updated_at automaticamente
drop trigger if exists trg_plan_kits_set_timestamp on public.plan_kits;
create trigger trg_plan_kits_set_timestamp
before update on public.plan_kits
for each row execute function public.update_updated_at_column();

-- 4) Vínculo opcional da conta a um “kit de plano”
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'plan_kit_id'
  ) then
    alter table public.accounts
      add column plan_kit_id uuid references public.plan_kits(id);
  end if;
end $$;

-- 5) Semeadura inicial de kits (opcional, ajustamos valores depois no Admin)
insert into public.plan_kits (name, seats, price_cents, currency, sort_order)
select 'Individual', 1, 3990, 'BRL', 10
where not exists (select 1 from public.plan_kits where seats = 1);

insert into public.plan_kits (name, seats, price_cents, currency, sort_order)
select 'Equipe (3)', 3, 9990, 'BRL', 20
where not exists (select 1 from public.plan_kits where seats = 3);

insert into public.plan_kits (name, seats, price_cents, currency, sort_order)
select 'Time (5)', 5, 15990, 'BRL', 30
where not exists (select 1 from public.plan_kits where seats = 5);

insert into public.plan_kits (name, seats, price_cents, currency, sort_order)
select 'Empresa (10)', 10, 29990, 'BRL', 40
where not exists (select 1 from public.plan_kits where seats = 10);

-- 6) Garantir um registro nas settings (se vazio), para a UI do Admin não quebrar
insert into public.settings (trial_days, price_per_seat_cents, currency)
select 7, 3990, 'BRL'
where not exists (select 1 from public.settings);
