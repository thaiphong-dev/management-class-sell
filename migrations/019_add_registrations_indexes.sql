-- 019_add_registrations_indexes.sql
-- Create performance indexes for registrations table

create index if not exists idx_registrations_class_id on registrations(class_id);
create index if not exists idx_registrations_student_id on registrations(student_id);
create index if not exists idx_registrations_package_id on registrations(package_id);
create index if not exists idx_registrations_status on registrations(status);
create index if not exists idx_registrations_created_at on registrations(created_at desc);
