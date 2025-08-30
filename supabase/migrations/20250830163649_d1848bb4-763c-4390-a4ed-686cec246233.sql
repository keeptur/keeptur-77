-- Expand email template types to include all necessary types
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'email_confirmation';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'trial_start';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'trial_ending';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'trial_ended';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'subscription_welcome';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'subscription_renewal';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'subscription_cancelled';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE email_template_type ADD VALUE IF NOT EXISTS 'tutorial_inicial';