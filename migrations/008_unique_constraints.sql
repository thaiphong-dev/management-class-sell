-- 008_unique_constraints.sql
-- Add unique constraints on user_id for coaches and students

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'coaches_user_id_unique' and table_name = 'coaches'
  ) then
    alter table coaches add constraint coaches_user_id_unique unique (user_id);
  end if;

  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'students_user_id_unique' and table_name = 'students'
  ) then
    alter table students add constraint students_user_id_unique unique (user_id);
  end if;
end;
$$;
