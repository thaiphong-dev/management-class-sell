-- 016_create_landing_settings_table.sql
-- Create landing_settings table and update RLS policies for public access

-- 1. Create table landing_settings
create table if not exists landing_settings (
  id                  uuid primary key default gen_random_uuid(),
  hero_title          text not null default 'Học Cầu Lông Cùng Thái Phong Badminton Class',
  hero_subtitle       text not null default 'Chương trình đào tạo chuyên nghiệp từ cơ bản đến nâng cao dành cho mọi lứa tuổi',
  center_intro        text not null default 'Chào mừng đến với Thái Phong Badminton Class! Chúng tôi cung cấp các khóa học cầu lông chất lượng cao với đội ngũ huấn luyện viên giàu kinh nghiệm, cơ sở vật chất hiện đại, và lộ trình đào tạo cá nhân hóa rõ ràng.',
  contact_phone       text not null default '0901234567',
  contact_email       text not null default 'contact@thaiphong.dev',
  zalo_url            text not null default 'https://zalo.me/',
  facebook_url        text not null default 'https://facebook.com/',
  updated_at          timestamptz default now()
);

-- Seed default row
insert into landing_settings (hero_title, hero_subtitle, center_intro, contact_phone, contact_email, zalo_url, facebook_url)
values (
  'Học Cầu Lông Cùng Thái Phong Badminton Class',
  'Chương trình đào tạo chuyên nghiệp từ cơ bản đến nâng cao dành cho mọi lứa tuổi',
  'Chào mừng đến với Thái Phong Badminton Class! Chúng tôi cung cấp các khóa học cầu lông chất lượng cao với đội ngũ huấn luyện viên giàu kinh nghiệm, cơ sở vật chất hiện đại, và lộ trình đào tạo cá nhân hóa rõ ràng.',
  '0901234567',
  'contact@thaiphong.dev',
  'https://zalo.me/',
  'https://facebook.com/'
) on conflict do nothing;

-- Enable RLS
alter table landing_settings enable row level security;

-- Drop existing if any
drop policy if exists "landing_settings_select_public" on landing_settings;
drop policy if exists "landing_settings_admin_all" on landing_settings;

-- Public read access
create policy "landing_settings_select_public"
  on landing_settings for select
  using (true);

-- Admin write access
create policy "landing_settings_admin_all"
  on landing_settings
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2. Update RLS policies for public landing page components
-- Packages
drop policy if exists "packages_select_public" on packages;
create policy "packages_select_public"
  on packages for select
  using (status = 'active');

-- Classes
drop policy if exists "classes_select_public" on classes;
create policy "classes_select_public"
  on classes for select
  using (status = 'active');

-- Facilities
drop policy if exists "facilities_select_public" on facilities;
create policy "facilities_select_public"
  on facilities for select
  using (true);

-- Courts
drop policy if exists "courts_select_public" on courts;
create policy "courts_select_public"
  on courts for select
  using (true);

-- Coaches
drop policy if exists "coaches_select_public" on coaches;
create policy "coaches_select_public"
  on coaches for select
  using (true);

-- Profiles (expose coach profiles only)
drop policy if exists "profiles_select_coaches" on profiles;
create policy "profiles_select_coaches"
  on profiles for select
  using (role = 'coach');
