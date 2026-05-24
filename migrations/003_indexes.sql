-- 003_indexes.sql
-- Performance indexes

create index if not exists idx_profiles_role
  on profiles(role);

create index if not exists idx_coaches_user_id
  on coaches(user_id);

create index if not exists idx_students_user_id
  on students(user_id);

create index if not exists idx_classes_coach_id
  on classes(coach_id);

create index if not exists idx_classes_status
  on classes(status);

create index if not exists idx_sessions_class_id
  on sessions(class_id);

create index if not exists idx_sessions_scheduled_at
  on sessions(scheduled_at);

create index if not exists idx_sessions_status
  on sessions(status);

create index if not exists idx_attendance_session_id
  on attendance(session_id);

create index if not exists idx_attendance_student_id
  on attendance(student_id);

create index if not exists idx_student_packages_student_id
  on student_packages(student_id);

create index if not exists idx_student_packages_status
  on student_packages(status);

create index if not exists idx_student_packages_expires_at
  on student_packages(expires_at);

create index if not exists idx_payments_student_id
  on payments(student_id);

create index if not exists idx_payments_paid_at
  on payments(paid_at);

create index if not exists idx_notifications_user_id
  on notifications(user_id);

create index if not exists idx_notifications_unread
  on notifications(read_at) where read_at is null;

create index if not exists idx_notifications_created_at
  on notifications(created_at desc);
