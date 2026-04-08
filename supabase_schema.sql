-- =========================================================
-- FLUXBOX - Schema definitivo para Supabase
-- =========================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================================================
-- 1. TABELAS
-- =========================================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null,
  description text,
  total_qty integer not null default 0,
  available_qty integer not null default 0,
  min_qty integer not null default 0,
  unit text not null,
  location_id uuid references public.locations(id) on delete set null,
  status text not null default 'disponível'
    check (status in ('disponível', 'em uso', 'estoque baixo', 'em manutenção', 'indisponível', 'danificado')),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint total_qty_not_negative check (total_qty >= 0),
  constraint available_qty_not_negative check (available_qty >= 0),
  constraint available_not_greater_than_total check (available_qty <= total_qty),
  constraint min_qty_not_negative check (min_qty >= 0)
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('check-in', 'check-out')),
  quantity integer not null check (quantity > 0),
  timestamp timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- =========================================================
-- 2. RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.movements enable row level security;
alter table public.alerts enable row level security;

-- =========================================================
-- 3. LIMPEZA DE POLICIES ANTIGAS (para poder rerodar)
-- =========================================================

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Allow insert profile on signup" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Authenticated users can view locations" on public.locations;
drop policy if exists "Admins can manage locations" on public.locations;

drop policy if exists "Authenticated users can view items" on public.items;
drop policy if exists "Admins can manage items" on public.items;

drop policy if exists "Authenticated users can view movements" on public.movements;
drop policy if exists "Authenticated users can insert movements" on public.movements;

drop policy if exists "Authenticated users can view alerts" on public.alerts;
drop policy if exists "Admins can manage alerts" on public.alerts;

-- =========================================================
-- 4. POLICIES
-- =========================================================

-- PROFILES
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Allow insert profile on signup"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- LOCATIONS
create policy "Authenticated users can view locations"
on public.locations
for select
to authenticated
using (true);

create policy "Admins can manage locations"
on public.locations
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- ITEMS
create policy "Authenticated users can view items"
on public.items
for select
to authenticated
using (true);

create policy "Admins can manage items"
on public.items
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- MOVEMENTS
create policy "Authenticated users can view movements"
on public.movements
for select
to authenticated
using (true);

create policy "Authenticated users can insert movements"
on public.movements
for insert
to authenticated
with check (auth.uid() = user_id);

-- ALERTS
create policy "Authenticated users can view alerts"
on public.alerts
for select
to authenticated
using (true);

create policy "Admins can manage alerts"
on public.alerts
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- =========================================================
-- 5. FUNÇÃO/TRIGGER DE ESTOQUE
-- =========================================================

drop trigger if exists tr_check_stock_level on public.items;
drop function if exists public.check_stock_level();

create or replace function public.check_stock_level()
returns trigger
language plpgsql
as $$
begin
  if new.available_qty = 0 then
    new.status := 'indisponível';

  elsif new.available_qty < new.min_qty then
    new.status := 'estoque baixo';

    insert into public.alerts (item_id, message)
    values (
      new.id,
      'Estoque baixo para o item: ' || new.name || '. Quantidade atual: ' || new.available_qty
    );

  elsif new.status in ('estoque baixo', 'indisponível') then
    new.status := 'disponível';
  end if;

  return new;
end;
$$;

create trigger tr_check_stock_level
before insert or update on public.items
for each row
execute function public.check_stock_level();

-- =========================================================
-- 6. FUNÇÃO/TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- =========================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Usuário'),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- 7. ÍNDICES
-- =========================================================

create index if not exists idx_items_code on public.items(code);
create index if not exists idx_items_location_id on public.items(location_id);
create index if not exists idx_movements_item_id on public.movements(item_id);
create index if not exists idx_movements_user_id on public.movements(user_id);
create index if not exists idx_alerts_item_id on public.alerts(item_id);

-- =========================================================
-- 8. DADOS INICIAIS OPCIONAIS
-- =========================================================

insert into public.locations (name, description)
values ('Prateleira A1', 'Local inicial padrão do sistema')
on conflict do nothing;