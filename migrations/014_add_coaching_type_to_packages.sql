-- 014_add_coaching_type_to_packages.sql
-- Add coaching_type to packages table to support 1-1 and group coaching options

alter table packages add column if not exists coaching_type text default 'none' check (coaching_type in ('none', '1-1', 'group'));
