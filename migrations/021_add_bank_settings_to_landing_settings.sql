-- 021_add_bank_settings_to_landing_settings.sql
-- Add bank settings columns to landing_settings table for payment configuration

alter table landing_settings
  add column if not exists bank_id text not null default 'MSB',
  add column if not exists bank_account text not null default '96886693012620',
  add column if not exists bank_account_name text not null default 'TU THAI PHONG',
  add column if not exists bank_bin text not null default '970426',
  add column if not exists bank_branch text default 'CN Hà Nội';
