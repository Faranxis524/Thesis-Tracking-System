-- Enable RLS

drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self_or_admin on public.profiles;

drop policy if exists terms_read_all_signed_in on public.terms;
drop policy if exists terms_write_coordinator on public.terms;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'colleges'
  ) then
    drop policy if exists colleges_read_all_public on public.colleges;
    drop policy if exists colleges_write_coordinator on public.colleges;
  end if;
end $$;

drop policy if exists sections_read_all_signed_in on public.sections;
drop policy if exists sections_write_coordinator on public.sections;

drop policy if exists requirements_read_all_signed_in on public.requirements;
drop policy if exists requirements_write_admin on public.requirements;

drop policy if exists requirement_overrides_read_own_or_coordinator on public.requirement_overrides;
drop policy if exists requirement_overrides_write_coordinator on public.requirement_overrides;

drop policy if exists groups_read_own_or_coordinator on public.groups;
drop policy if exists groups_write_coordinator on public.groups;
drop policy if exists groups_update_leader_own on public.groups;

drop policy if exists group_members_read_own_group_or_coordinator on public.group_members;
drop policy if exists group_members_write_coordinator on public.group_members;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'group_member_names'
  ) then
    drop policy if exists group_member_names_read_own_or_coordinator on public.group_member_names;
    drop policy if exists group_member_names_write_leader_or_coordinator on public.group_member_names;
  end if;
end $$;

drop policy if exists submissions_read_own_or_coordinator on public.submissions;
drop policy if exists submissions_insert_own on public.submissions;
drop policy if exists submissions_update_coordinator on public.submissions;
drop policy if exists submissions_update_own on public.submissions;

drop policy if exists defenses_read_own_or_coordinator on public.defenses;
drop policy if exists defenses_write_coordinator on public.defenses;

drop policy if exists revision_read_own_or_coordinator on public.revision_items;
drop policy if exists revision_write_coordinator on public.revision_items;
drop policy if exists revision_update_own on public.revision_items;

drop policy if exists audit_logs_read_coordinator on public.audit_logs;
drop policy if exists audit_logs_insert_any_signed_in on public.audit_logs;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'form_openings'
  ) then
    drop policy if exists form_openings_read_all_signed_in on public.form_openings;
    drop policy if exists form_openings_write_coordinator on public.form_openings;
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.terms enable row level security;
alter table public.sections enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_overrides enable row level security;
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'colleges'
  ) then
    alter table public.colleges enable row level security;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'group_member_names'
  ) then
    alter table public.group_member_names enable row level security;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'form_openings'
  ) then
    alter table public.form_openings enable row level security;
  end if;
end $$;
alter table public.submissions enable row level security;
alter table public.defenses enable row level security;
alter table public.revision_items enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES

create policy "profiles_select_own_or_admin" on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_self" on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self_or_admin" on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Guardrail: prevent non-admins from changing their role / clearing requests

create or replace function public.protect_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admin can change roles';
    end if;
    if old.role_requested = true and new.role_requested = false then
      raise exception 'Only admin can clear role requests';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role_changes on public.profiles;
create trigger trg_protect_profile_role_changes
before update on public.profiles
for each row
execute function public.protect_profile_role_changes();

-- TERMS / REQUIREMENTS

create policy "terms_read_all_signed_in" on public.terms
for select
using (true);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'colleges'
  ) then
    create policy "colleges_read_all_public" on public.colleges
    for select
    using (true);

    create policy "colleges_write_coordinator" on public.colleges
    for all
    using (public.is_coordinator_or_admin())
    with check (public.is_coordinator_or_admin());
  end if;
end $$;

create policy "terms_write_coordinator" on public.terms
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

create policy "sections_read_all_signed_in" on public.sections
for select
using (true);

create policy "sections_write_coordinator" on public.sections
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

create policy "requirements_read_all_signed_in" on public.requirements
for select
using (auth.uid() is not null);

create policy "requirements_write_admin" on public.requirements
for all
using (public.is_admin())
with check (public.is_admin());

create policy "requirement_overrides_read_own_or_coordinator" on public.requirement_overrides
for select
using (
  public.is_coordinator_or_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = requirement_overrides.group_id and gm.user_id = auth.uid()
  )
);

create policy "requirement_overrides_write_coordinator" on public.requirement_overrides
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

-- GROUPS

create policy "groups_read_own_or_coordinator" on public.groups
for select
using (
  public.is_coordinator_or_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id and gm.user_id = auth.uid()
  )
);

create policy "groups_write_coordinator" on public.groups
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

create policy "groups_update_leader_own" on public.groups
for update
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
      and gm.role = 'leader'
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
      and gm.role = 'leader'
  )
);

-- GROUP MEMBERS

create policy "group_members_read_own_group_or_coordinator" on public.group_members
for select
using (
  public.is_coordinator_or_admin()
  or user_id = auth.uid()
);

create policy "group_members_write_coordinator" on public.group_members
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'group_member_names'
  ) then
    create policy "group_member_names_read_own_or_coordinator" on public.group_member_names
    for select
    using (
      public.is_coordinator_or_admin()
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = group_member_names.group_id and gm.user_id = auth.uid()
      )
    );

    create policy "group_member_names_write_leader_or_coordinator" on public.group_member_names
    for all
    using (
      public.is_coordinator_or_admin()
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = group_member_names.group_id
          and gm.user_id = auth.uid()
          and gm.role = 'leader'
      )
    )
    with check (
      public.is_coordinator_or_admin()
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = group_member_names.group_id
          and gm.user_id = auth.uid()
          and gm.role = 'leader'
      )
    );
  end if;
end $$;

-- SUBMISSIONS

create policy "submissions_read_own_or_coordinator" on public.submissions
for select
using (
  public.is_coordinator_or_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = submissions.group_id and gm.user_id = auth.uid()
  )
);

create policy "submissions_insert_own" on public.submissions
for insert
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = submissions.group_id and gm.user_id = auth.uid()
  )
  and status in ('missing','submitted','needs_revision','resubmitted')
  and reviewed_at is null
);

create policy "submissions_update_coordinator" on public.submissions
for update
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

create policy "submissions_update_own" on public.submissions
for update
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = submissions.group_id and gm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = submissions.group_id and gm.user_id = auth.uid()
  )
  and status in ('missing','submitted','needs_revision','resubmitted')
  and reviewed_at is null
);

-- DEFENSES

create policy "defenses_read_own_or_coordinator" on public.defenses
for select
using (
  public.is_coordinator_or_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = defenses.group_id and gm.user_id = auth.uid()
  )
);

create policy "defenses_write_coordinator" on public.defenses
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

-- REVISION ITEMS

create policy "revision_read_own_or_coordinator" on public.revision_items
for select
using (
  public.is_coordinator_or_admin()
  or exists (
    select 1 from public.group_members gm
    where gm.group_id = revision_items.group_id and gm.user_id = auth.uid()
  )
);

create policy "revision_write_coordinator" on public.revision_items
for all
using (public.is_coordinator_or_admin())
with check (public.is_coordinator_or_admin());

create policy "revision_update_own" on public.revision_items
for update
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = revision_items.group_id and gm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = revision_items.group_id and gm.user_id = auth.uid()
  )
);

-- AUDIT LOGS

create policy "audit_logs_read_coordinator" on public.audit_logs
for select
using (public.is_coordinator_or_admin() or actor_id = auth.uid());

create policy "audit_logs_insert_any_signed_in" on public.audit_logs
for insert
with check (auth.uid() is not null);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'form_openings'
  ) then
    create policy "form_openings_read_all_signed_in" on public.form_openings
    for select
    using (auth.uid() is not null);

    create policy "form_openings_write_coordinator" on public.form_openings
    for all
    using (public.is_coordinator_or_admin())
    with check (public.is_coordinator_or_admin());
  end if;
end $$;
