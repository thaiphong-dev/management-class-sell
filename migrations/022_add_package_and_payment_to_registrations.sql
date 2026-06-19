-- 022_add_package_and_payment_to_registrations.sql
-- Add student_package_id and payment_id columns to registrations table to link pre-created package and payment

alter table registrations
  add column if not exists student_package_id uuid references student_packages(id) on delete set null,
  add column if not exists payment_id uuid references payments(id) on delete set null;
