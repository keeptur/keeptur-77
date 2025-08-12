-- Schema for Admin, Subscriptions, Seats, Settings, Emails, and Roles

-- 1) Roles enum and user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own roles; admins can read all via function below
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "read_own_roles" ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Inserts/updates/deletes reserved for service role/Admin paths (no open policy)


-- 2) Accounts (subscriptions) and memberships
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE, -- account owner/billing email
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  seats_purchased INTEGER NOT NULL DEFAULT 1,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.membership_status AS ENUM ('active','inactive');

CREATE TABLE public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  status public.membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);

CREATE INDEX idx_memberships_user ON public.user_memberships(user_id);
CREATE INDEX idx_memberships_account ON public.user_memberships(account_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is member of an account
CREATE OR REPLACE FUNCTION public.is_account_member(_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_memberships um
    WHERE um.account_id = _account_id
      AND um.user_id = auth.uid()
      AND um.status = 'active'
  );
$$;

-- Policies for accounts
CREATE POLICY "accounts_select_member_or_admin" ON public.accounts
FOR SELECT
USING (public.is_account_member(id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "accounts_update_owner_or_admin" ON public.accounts
FOR UPDATE
USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Insert/Delete restricted to admins (service role bypasses RLS)
CREATE POLICY "accounts_insert_admin_only" ON public.accounts
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "accounts_delete_admin_only" ON public.accounts
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Policies for user_memberships
CREATE POLICY "memberships_select_self_or_admin" ON public.user_memberships
FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "memberships_insert_admin_only" ON public.user_memberships
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "memberships_update_admin_only" ON public.user_memberships
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "memberships_delete_admin_only" ON public.user_memberships
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- 3) Settings (global config)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_days INTEGER NOT NULL DEFAULT 7,
  price_per_seat_cents INTEGER NOT NULL DEFAULT 3990, -- R$ 39,90
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_admin_only_select" ON public.settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings_admin_only_upsert" ON public.settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings_admin_only_update" ON public.settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Seed one settings row (service role typically runs migrations)
INSERT INTO public.settings (trial_days, price_per_seat_cents, currency)
VALUES (7, 3990, 'BRL');


-- 4) Email templates
CREATE TYPE public.email_template_type AS ENUM ('welcome','trial_expired','payment_confirmed');

CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.email_template_type NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_only_select" ON public.email_templates
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "email_templates_admin_only_upsert" ON public.email_templates
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "email_templates_admin_only_update" ON public.email_templates
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "email_templates_admin_only_delete" ON public.email_templates
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- 5) SMTP settings (store non-secret parts; password kept in Supabase Secrets)
CREATE TABLE public.smtp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT,
  from_email TEXT NOT NULL,
  secure BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smtp_settings_admin_only_select" ON public.smtp_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "smtp_settings_admin_only_upsert" ON public.smtp_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "smtp_settings_admin_only_update" ON public.smtp_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "smtp_settings_admin_only_delete" ON public.smtp_settings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- 6) Access logs
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user ON public.access_logs(user_id, created_at DESC);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_logs_select_self_or_admin" ON public.access_logs
FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "access_logs_insert_self" ON public.access_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 7) Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();