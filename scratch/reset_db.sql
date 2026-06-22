-- =============================================================================
-- Reset and Seed Script
-- Wipes all data, creates 1 Admin, 1 Coach, and 2 beginner classes.
-- =============================================================================

BEGIN;

-- 1. Wipe all user data from public tables
TRUNCATE TABLE public.sepay_transactions CASCADE;
TRUNCATE TABLE public.registrations CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.student_packages CASCADE;
TRUNCATE TABLE public.attendance CASCADE;
TRUNCATE TABLE public.sessions CASCADE;
TRUNCATE TABLE public.class_students CASCADE;
TRUNCATE TABLE public.classes CASCADE;
TRUNCATE TABLE public.coach_assistants CASCADE;
TRUNCATE TABLE public.lesson_plans CASCADE;
TRUNCATE TABLE public.progress_evaluations CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.coaches CASCADE;
TRUNCATE TABLE public.students CASCADE;
TRUNCATE TABLE public.assistants CASCADE;
TRUNCATE TABLE public.coach_assistant_registrations CASCADE;
TRUNCATE TABLE public.parents CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.courts CASCADE;
TRUNCATE TABLE public.facilities CASCADE;
TRUNCATE TABLE public.packages CASCADE;
TRUNCATE TABLE public.landing_settings CASCADE;
TRUNCATE TABLE public.keep_live CASCADE;

-- 2. Wipe all auth users
DELETE FROM auth.users;

-- 3. Seed Packages
INSERT INTO public.packages (id, name, package_type, sessions_count, validity_days, price, description, is_featured, sort_order, status)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'Khởi Đầu', 'session', 8, 45, 800000, '8 buổi học / 45 ngày — Phù hợp cho người mới bắt đầu', false, 1, 'active'),
  ('30000000-0000-0000-0000-000000000002', 'Tiêu Chuẩn', 'session', 12, 60, 1200000, '12 buổi học / 60 ngày — Gói phổ biến nhất', true, 2, 'active'),
  ('30000000-0000-0000-0000-000000000003', 'Chuyên Sâu', 'session', 24, 90, 2200000, '24 buổi học / 90 ngày — Tiết kiệm hơn cho học viên chăm chỉ', false, 3, 'active'),
  ('30000000-0000-0000-0000-000000000004', 'Gói Tháng', 'monthly', null, 30, 1500000, 'Tập không giới hạn buổi trong 30 ngày', false, 4, 'active');

-- 4. Seed Facilities and Courts
INSERT INTO public.facilities (id, name, address, phone, description, status)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'ShuttleClass Quận 1',
  '123 Nguyễn Huệ, Quận 1, TP.HCM',
  '028 3825 1234',
  'Trung tâm cầu lông chuyên nghiệp tại trung tâm thành phố',
  'active'
);

INSERT INTO public.courts (id, facility_id, name, court_number, status)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sân 1', 1, 'available');

-- 5. Seed Admin User
-- Email: thaiphong.dev@gmail.com
-- Password: LyLinh196465
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-100000000001',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'thaiphong.dev@gmail.com',
  crypt('LyLinh196465', gen_salt('bf', 10)),
  now(),
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Admin Thái Phong", "role": "admin", "email_verified": true}'::jsonb,
  false,
  false,
  false,
  now(),
  now()
);

-- Update profile phone
UPDATE public.profiles
SET phone = '0377612701'
WHERE id = '00000000-0000-0000-0000-100000000001';

UPDATE auth.users
SET phone = '0377612701'
WHERE id = '00000000-0000-0000-0000-100000000001';

-- 6. Seed Coach User
-- Email: tuthaiphong600@gmail.com
-- Password: ttphong1101
-- Name: Từ Thái Phong
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-100000000002',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'tuthaiphong600@gmail.com',
  crypt('ttphong1101', gen_salt('bf', 10)),
  now(),
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Từ Thái Phong", "role": "coach", "email_verified": true}'::jsonb,
  false,
  false,
  false,
  now(),
  now()
);

-- Update profile phone
UPDATE public.profiles
SET phone = '0377612701'
WHERE id = '00000000-0000-0000-0000-100000000002';

-- Seed Coach public record
INSERT INTO public.coaches (id, user_id, specialty, experience_years, bio, status)
VALUES (
  '00000000-0000-0000-0000-200000000001',
  '00000000-0000-0000-0000-100000000002',
  'Đánh đơn & Đánh đôi',
  5,
  'HLV Từ Thái Phong chuyên dạy kỹ thuật cơ bản và nâng cao.',
  'active'
);

-- 7. Seed the 2 requested classes (beginner level)
-- Class 1: Thứ 2, 3, 4, 5, 6 19h30-21h
INSERT INTO public.classes (
  id,
  name,
  coach_id,
  facility_id,
  court_id,
  max_students,
  skill_level,
  schedule_days,
  schedule_time,
  duration_min,
  status
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'Lớp Thứ 2 - 6 (19h30 - 21h)',
  '00000000-0000-0000-0000-200000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  15,
  'beginner',
  ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
  '19:30:00'::time,
  90,
  'active'
);

-- Class 2: Thứ 7-CN 15h30-21h
INSERT INTO public.classes (
  id,
  name,
  coach_id,
  facility_id,
  court_id,
  max_students,
  skill_level,
  schedule_days,
  schedule_time,
  duration_min,
  status
)
VALUES (
  '40000000-0000-0000-0000-000000000002',
  'Lớp Thứ 7 - Chủ Nhật (15h30 - 21h)',
  '00000000-0000-0000-0000-200000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  15,
  'beginner',
  ARRAY['sat', 'sun'],
  '15:30:00'::time,
  330,
  'active'
);

COMMIT;
