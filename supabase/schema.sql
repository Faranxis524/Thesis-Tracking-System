-- Core roles & identity

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'student' check (role in ('student','leader','coordinator','admin')),
  role_requested boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('student','leader','coordinator','admin'));
end $$;

-- create unique index for username will be created after the column exists

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) then
    alter table public.profiles
      add column username text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'first_name'
  ) then
    alter table public.profiles
      add column first_name text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'middle_name'
  ) then
    alter table public.profiles
      add column middle_name text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'last_name'
  ) then
    alter table public.profiles
      add column last_name text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'suffix'
  ) then
    alter table public.profiles
      add column suffix text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'term_id'
  ) then
    alter table public.profiles
      add column term_id bigint;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'college_id'
  ) then
    alter table public.profiles
      add column college_id bigint;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'section_id'
  ) then
    alter table public.profiles
      add column section_id bigint;
  end if;
end $$;

-- Ensure unique index on profiles(username) only after the column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) then
    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and indexname = 'profiles_username_unique'
    ) then
      execute 'create unique index profiles_username_unique on public.profiles (username)';
    end if;
  end if;
end $$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_coordinator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() in ('coordinator','admin');
$$;

create or replace function public.is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_user_role() = 'leader';
$$;

-- Terms

create table if not exists public.terms (
  id bigserial primary key,
  name text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

-- Colleges

create table if not exists public.colleges (
  id bigserial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Sections

create table if not exists public.sections (
  id bigserial primary key,
  term_id bigint references public.terms(id) on delete cascade,
  college_id bigint references public.colleges(id) on delete set null,
  program text not null,
  name text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sections'
      and column_name = 'college_id'
  ) then
    alter table public.sections
      add column college_id bigint;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sections_college_id_fkey'
  ) then
    alter table public.sections
      add constraint sections_college_id_fkey
      foreign key (college_id)
      references public.colleges(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_term_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_term_id_fkey
      foreign key (term_id)
      references public.terms(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_college_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_college_id_fkey
      foreign key (college_id)
      references public.colleges(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_section_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_section_id_fkey
      foreign key (section_id)
      references public.sections(id)
      on delete set null;
  end if;
end $$;

-- Research groups and membership

create table if not exists public.groups (
  id bigserial primary key,
  term_id bigint references public.terms(id) on delete set null,
  section_id bigint references public.sections(id) on delete set null,
  title text,
  adviser_name text,
  stage text not null default 'title' check (stage in ('title','proposal','final')),
  status text not null default 'pending' check (status in ('pending','active')),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'groups'
      and column_name = 'status'
  ) then
    alter table public.groups
      add column status text not null default 'pending' check (status in ('pending','active'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'groups'
      and column_name = 'section_id'
  ) then
    alter table public.groups
      add column section_id bigint;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'groups_section_id_fkey'
  ) then
    alter table public.groups
      add constraint groups_section_id_fkey
      foreign key (section_id)
      references public.sections(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.group_members (
  group_id bigint not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader','member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_member_names (
  id bigserial primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  full_name text not null,
  role text not null default 'member' check (role in ('leader','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_members_user_id_profiles_fk'
  ) then
    alter table public.group_members
      add constraint group_members_user_id_profiles_fk
      foreign key (user_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;

-- Requirements / checklists

create table if not exists public.requirements (
  id bigserial primary key,
  stage text not null check (stage in ('title','proposal','final')),
  timing text not null check (timing in ('before','after')),
  owner text not null check (owner in ('student','teacher')),
  code text,
  name text not null,
  is_optional boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.requirement_overrides (
  group_id bigint not null references public.groups(id) on delete cascade,
  requirement_id bigint not null references public.requirements(id) on delete cascade,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (group_id, requirement_id)
);

-- Form openings (teacher-controlled availability + deadline)

create table if not exists public.form_openings (
  id bigserial primary key,
  requirement_id bigint not null references public.requirements(id) on delete cascade,
  term_id bigint references public.terms(id) on delete set null,
  college_id bigint references public.colleges(id) on delete set null,
  section_id bigint references public.sections(id) on delete set null,
  deadline_at timestamptz,
  is_open boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'form_openings_unique_scope'
  ) then
    alter table public.form_openings
      add constraint form_openings_unique_scope
      unique (requirement_id, term_id, college_id, section_id);
  end if;
end $$;

-- Helper: create pending group for leader

create or replace function public.create_leader_group(
  leader_id uuid,
  p_term_id bigint,
  p_section_id bigint,
  p_college_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  new_group_id bigint;
  leader_name text;
begin
  select coalesce(nullif(trim(concat_ws(' ', last_name, first_name, middle_name)), ''), full_name)
    into leader_name
  from public.profiles
  where id = leader_id;

  insert into public.groups (term_id, section_id, stage, status)
  values (p_term_id, p_section_id, 'title', 'pending')
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, leader_id, 'leader')
  on conflict do nothing;

  if leader_name is not null then
    insert into public.group_member_names (group_id, full_name, role)
    values (new_group_id, leader_name, 'leader');
  end if;

  update public.profiles
    set term_id = p_term_id,
        section_id = p_section_id,
        college_id = p_college_id
  where id = leader_id;

  return new_group_id;
end;
$$;

grant execute on function public.create_leader_group(uuid, bigint, bigint, bigint) to authenticated;

-- Submissions (Google Drive link only)

create table if not exists public.submissions (
  id bigserial primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  requirement_id bigint not null references public.requirements(id) on delete cascade,
  drive_url text,
  status text not null default 'missing' check (status in ('missing','submitted','approved','needs_revision','resubmitted')),
  remarks text,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, requirement_id)
);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'submissions_status_check'
  ) then
    alter table public.submissions drop constraint submissions_status_check;
  end if;

  alter table public.submissions
    add constraint submissions_status_check
    check (status in ('missing','submitted','approved','needs_revision','resubmitted'));
end $$;

-- Defense schedules

create table if not exists public.defenses (
  id bigserial primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  stage text not null check (stage in ('title','proposal','final')),
  schedule_datetime timestamptz,
  venue_or_meet_link text,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  created_at timestamptz not null default now()
);

-- Revision compliance

create table if not exists public.revision_items (
  id bigserial primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  stage text not null check (stage in ('proposal','final')),
  description text not null,
  due_date date,
  status text not null default 'open' check (status in ('open','submitted','accepted')),
  evidence_drive_url text,
  created_at timestamptz not null default now()
);

-- Audit logs

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
