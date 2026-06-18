-- 015_add_coaching_type_to_active_student_packages_view.sql
-- Update active_student_packages view to include coaching_type from packages

drop view if exists active_student_packages cascade;
create or replace view active_student_packages as
select
  sp.*,
  p.name         as package_name,
  p.package_type,
  p.validity_days,
  p.coaching_type,
  pr.full_name   as student_name,
  pr.phone       as student_phone,
  case
    when sp.expires_at < now() + interval '3 days'                       then 'critical'
    when sp.sessions_remaining = 1 and p.package_type = 'session'        then 'critical'
    when sp.expires_at < now() + interval '7 days'                       then 'warning'
    when sp.sessions_remaining <= 3 and p.package_type = 'session'       then 'warning'
    else 'ok'
  end as alert_level,
  extract(day from (sp.expires_at - now()))::int as days_remaining
from student_packages sp
join packages p on p.id = sp.package_id
join students s on s.id = sp.student_id
join profiles pr on pr.id = s.user_id
where sp.status = 'active';
