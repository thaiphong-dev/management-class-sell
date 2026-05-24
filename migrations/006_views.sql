-- 006_views.sql
-- Useful views

-- =============================================
-- Active student packages with alert level
-- =============================================
create or replace view active_student_packages as
select
  sp.*,
  p.name         as package_name,
  p.package_type,
  p.validity_days,
  pr.full_name   as student_name,
  pr.phone       as student_phone,
  case
    when sp.expires_at < now() + interval '3 days'                       then 'critical'
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

-- =============================================
-- Session with class + coach info
-- =============================================
create or replace view sessions_with_details as
select
  se.*,
  c.name         as class_name,
  c.skill_level  as class_skill_level,
  pr.full_name   as coach_name,
  f.name         as facility_name,
  ct.name        as court_name
from sessions se
join classes c on c.id = se.class_id
left join coaches co on co.id = c.coach_id
left join profiles pr on pr.id = co.user_id
left join facilities f on f.id = c.facility_id
left join courts ct on ct.id = se.court_id;

-- =============================================
-- Monthly revenue summary
-- =============================================
create or replace view monthly_revenue as
select
  date_trunc('month', paid_at) as month,
  count(*)                     as payment_count,
  sum(amount)                  as total_revenue
from payments
where status = 'paid'
group by date_trunc('month', paid_at)
order by month desc;
