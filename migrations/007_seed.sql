-- 007_seed.sql
-- Initial seed data (idempotent via ON CONFLICT DO NOTHING)
-- Test user accounts must be created separately via scripts/seed-users.mjs

-- =============================================
-- Facility
-- =============================================
insert into facilities (id, name, address, phone, description, status)
values (
  '10000000-0000-0000-0000-000000000001',
  'ShuttleClass Quận 1',
  '123 Nguyễn Huệ, Quận 1, TP.HCM',
  '028 3825 1234',
  'Trung tâm cầu lông chuyên nghiệp tại trung tâm thành phố',
  'active'
)
on conflict (id) do nothing;

-- =============================================
-- Courts (4 sân)
-- =============================================
insert into courts (id, facility_id, name, court_number, status)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sân 1', 1, 'available'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Sân 2', 2, 'available'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Sân 3', 3, 'available'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Sân 4', 4, 'maintenance')
on conflict (id) do nothing;

-- =============================================
-- Packages (gói học)
-- =============================================
insert into packages (id, name, package_type, sessions_count, validity_days, price, description, is_featured, sort_order, status)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Khởi Đầu',
    'session',
    8,
    45,
    800000,
    '8 buổi học / 45 ngày — Phù hợp cho người mới bắt đầu',
    false,
    1,
    'active'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Tiêu Chuẩn',
    'session',
    12,
    60,
    1200000,
    '12 buổi học / 60 ngày — Gói phổ biến nhất',
    true,
    2,
    'active'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Chuyên Sâu',
    'session',
    24,
    90,
    2200000,
    '24 buổi học / 90 ngày — Tiết kiệm hơn cho học viên chăm chỉ',
    false,
    3,
    'active'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Gói Tháng',
    'monthly',
    null,
    30,
    1500000,
    'Tập không giới hạn buổi trong 30 ngày',
    false,
    4,
    'active'
  )
on conflict (id) do nothing;
