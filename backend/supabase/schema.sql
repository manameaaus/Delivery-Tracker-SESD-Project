create type public.app_role as enum ('delivery_creator', 'runner', 'approver', 'admin');
create type public.delivery_status as enum ('Unassigned', 'Assigned', 'In Progress', 'Delivered', 'Completed');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, role)
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_to text not null,
  start_location text not null,
  destination text not null,
  purpose text not null,
  remarks text,
  status public.delivery_status not null default 'Unassigned',
  runner_id uuid references public.profiles(id) on delete set null,
  start_date_time timestamptz,
  destination_date_time timestamptz,
  distance numeric(10,2),
  approved_by text,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  recipient_signature text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists deliveries_touch_updated_at on public.deliveries;
create trigger deliveries_touch_updated_at
before update on public.deliveries
for each row
execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.deliveries enable row level security;

create or replace function public.current_user_has_role(role_name public.app_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = role_name
  );
$$;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles
for select
using (auth.uid() = id or public.current_user_has_role('admin'));

drop policy if exists "roles read own or admin" on public.user_roles;
create policy "roles read own or admin"
on public.user_roles
for select
using (auth.uid() = user_id or public.current_user_has_role('admin'));

drop policy if exists "deliveries read authenticated" on public.deliveries;
create policy "deliveries read authenticated"
on public.deliveries
for select
using (auth.role() = 'authenticated');

drop policy if exists "deliveries create by creators" on public.deliveries;
create policy "deliveries create by creators"
on public.deliveries
for insert
with check (
  public.current_user_has_role('delivery_creator') or public.current_user_has_role('admin')
);

drop policy if exists "deliveries update by workflow roles" on public.deliveries;
create policy "deliveries update by workflow roles"
on public.deliveries
for update
using (
  public.current_user_has_role('delivery_creator')
  or public.current_user_has_role('runner')
  or public.current_user_has_role('approver')
  or public.current_user_has_role('admin')
);

