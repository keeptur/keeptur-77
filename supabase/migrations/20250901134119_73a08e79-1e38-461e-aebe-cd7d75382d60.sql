
-- 1) Tabela de regras de automação
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null, -- ex: user_signup, trial_start, trial_ending, trial_expired, subscription_active, payment_failed
  template_type text not null, -- corresponde ao campo "type" em public.email_templates
  delay_hours integer not null default 0,
  active boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_rules enable row level security;

-- RLS: somente admin pode gerenciar
drop policy if exists automation_rules_admin_select on public.automation_rules;
create policy automation_rules_admin_select
  on public.automation_rules
  for select
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists automation_rules_admin_insert on public.automation_rules;
create policy automation_rules_admin_insert
  on public.automation_rules
  for insert
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists automation_rules_admin_update on public.automation_rules;
create policy automation_rules_admin_update
  on public.automation_rules
  for update
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists automation_rules_admin_delete on public.automation_rules;
create policy automation_rules_admin_delete
  on public.automation_rules
  for delete
  using (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
drop trigger if exists trg_automation_rules_updated_at on public.automation_rules;
create trigger trg_automation_rules_updated_at
before update on public.automation_rules
for each row
execute function public.update_updated_at_column();

-- Índices úteis
create index if not exists idx_automation_rules_active on public.automation_rules (active);
create index if not exists idx_automation_rules_trigger on public.automation_rules (trigger);
create index if not exists idx_automation_rules_template_type on public.automation_rules (template_type);


-- 2) Tabela de logs de e-mail
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid,
  user_id uuid,
  user_email text not null,
  template_type text not null,
  status text not null default 'sent', -- sent | failed | pending
  error_message text,
  metadata jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

-- RLS: somente admin pode ler e inserir (os envios virão de funções com service role)
drop policy if exists email_logs_admin_select on public.email_logs;
create policy email_logs_admin_select
  on public.email_logs
  for select
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists email_logs_admin_insert on public.email_logs;
create policy email_logs_admin_insert
  on public.email_logs
  for insert
  with check (has_role(auth.uid(), 'admin'::app_role));

-- índices úteis
create index if not exists idx_email_logs_template_type on public.email_logs (template_type);
create index if not exists idx_email_logs_status on public.email_logs (status);
create index if not exists idx_email_logs_sent_at on public.email_logs (sent_at desc);


-- 3) Tabela de fila de e-mails (opcional, para agendamentos/delay)
create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  template_type text not null,
  to_email text not null,
  variables jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending', -- pending | processing | sent | failed
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_jobs enable row level security;

-- RLS: admin-only
drop policy if exists email_jobs_admin_select on public.email_jobs;
create policy email_jobs_admin_select
  on public.email_jobs
  for select
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists email_jobs_admin_insert on public.email_jobs;
create policy email_jobs_admin_insert
  on public.email_jobs
  for insert
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists email_jobs_admin_update on public.email_jobs;
create policy email_jobs_admin_update
  on public.email_jobs
  for update
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
drop trigger if exists trg_email_jobs_updated_at on public.email_jobs;
create trigger trg_email_jobs_updated_at
before update on public.email_jobs
for each row
execute function public.update_updated_at_column();

-- índices úteis
create index if not exists idx_email_jobs_status on public.email_jobs (status);
create index if not exists idx_email_jobs_scheduled_for on public.email_jobs (scheduled_for);
create index if not exists idx_email_jobs_template_type on public.email_jobs (template_type);
