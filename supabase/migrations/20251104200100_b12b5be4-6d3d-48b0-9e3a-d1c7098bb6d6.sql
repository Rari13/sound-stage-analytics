-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create app_role enum
create type public.app_role as enum ('client', 'organizer', 'scan_agent', 'admin');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  legal_version text default 'v1.0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Create user_roles table (separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role),
  created_at timestamptz default now()
);

alter table public.user_roles enable row level security;

-- Create organizers table
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  phone text,
  siret text,
  instant_payout_enabled boolean default false,
  commission_fixed_eur numeric(6,2) default 0,
  commission_rate_bps int default 110,
  bio text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizers enable row level security;

-- Create client_profiles table for onboarding data
create table public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text,
  nationality text,
  region text,
  age_group text,
  art_movements text[],
  artists text[],
  onboarding_completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.client_profiles enable row level security;

-- Create events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  title text not null,
  subtitle text,
  slug text unique not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text default 'Europe/Paris',
  venue text not null,
  address_line1 text,
  city text not null,
  postal_code text,
  country text default 'FR',
  capacity int check (capacity > 0),
  event_type text,
  music_genres text[],
  short_description text,
  description text,
  cover_image jsonb,
  status text default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  is_searchable boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

create index idx_events_organizer_id on public.events(organizer_id);
create index idx_events_status on public.events(status);
create index idx_events_starts_at on public.events(starts_at);

-- Create price_tiers table
create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price_cents int not null check (price_cents > 0),
  currency char(3) default 'EUR',
  starts_at timestamptz,
  ends_at timestamptz,
  quota int,
  has_timer boolean default false,
  hidden boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.price_tiers enable row level security;

create index idx_price_tiers_event_id on public.price_tiers(event_id);

-- Create orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  short_code varchar(12) unique not null,
  amount_total_cents int not null,
  currency char(3) default 'EUR',
  application_fee_cents int default 0,
  status text default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_event_id on public.orders(event_id);
create index idx_orders_organizer_id on public.orders(organizer_id);
create index idx_orders_status on public.orders(status);

-- Create tickets table
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qr_token text unique not null,
  qr_hash text unique,
  version int default 1,
  status text default 'valid' check (status in ('valid', 'used', 'refunded', 'revoked', 'expired')),
  issued_at timestamptz default now(),
  used_at timestamptz
);

alter table public.tickets enable row level security;

create index idx_tickets_user_id on public.tickets(user_id);
create index idx_tickets_event_id on public.tickets(event_id);
create index idx_tickets_qr_hash on public.tickets(qr_hash);
create index idx_tickets_status on public.tickets(status);

-- Create follows table
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  unique(user_id, organizer_id),
  created_at timestamptz default now()
);

alter table public.follows enable row level security;

create index idx_follows_user_id on public.follows(user_id);
create index idx_follows_organizer_id on public.follows(organizer_id);

-- Security definer function to check if email is confirmed
create or replace function public.is_email_confirmed(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select email_confirmed_at is not null
  from auth.users
  where id = uid
$$;

-- Security definer function to check if user has a specific role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Function to generate short_code for orders
create or replace function public.generate_short_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..12 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Function to generate event slug
create or replace function public.generate_event_slug(event_title text, event_id uuid)
returns text
language plpgsql
as $$
declare
  base_slug text;
  final_slug text;
  counter int := 0;
begin
  base_slug := lower(regexp_replace(event_title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  while exists (select 1 from public.events where slug = final_slug and id != event_id) loop
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  end loop;
  
  return final_slug;
end;
$$;

-- Trigger function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_organizers_updated_at before update on public.organizers
  for each row execute function public.update_updated_at_column();

create trigger update_client_profiles_updated_at before update on public.client_profiles
  for each row execute function public.update_updated_at_column();

create trigger update_events_updated_at before update on public.events
  for each row execute function public.update_updated_at_column();

create trigger update_price_tiers_updated_at before update on public.price_tiers
  for each row execute function public.update_updated_at_column();

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  -- Get role from metadata
  user_role := new.raw_user_meta_data->>'role';
  
  -- Insert into profiles
  insert into public.profiles (id, role, terms_accepted_at, privacy_accepted_at)
  values (
    new.id,
    user_role,
    case when new.raw_user_meta_data->>'terms_accepted' = 'true' then now() else null end,
    case when new.raw_user_meta_data->>'privacy_accepted' = 'true' then now() else null end
  );
  
  -- Insert into user_roles
  if user_role = 'client' then
    insert into public.user_roles (user_id, role) values (new.id, 'client');
    insert into public.client_profiles (user_id) values (new.id);
  elsif user_role = 'organizer' then
    insert into public.user_roles (user_id, role) values (new.id, 'organizer');
  end if;
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- RLS Policies for organizers
create policy "Anyone can view published organizers"
  on public.organizers for select
  using (true);

create policy "Organizer owners can insert their own organizer"
  on public.organizers for insert
  with check (auth.uid() = owner_user_id and public.has_role(auth.uid(), 'organizer'));

create policy "Organizer owners can update their own organizer"
  on public.organizers for update
  using (auth.uid() = owner_user_id);

create policy "Organizer owners can delete their own organizer"
  on public.organizers for delete
  using (auth.uid() = owner_user_id);

-- RLS Policies for client_profiles
create policy "Users can view their own client profile"
  on public.client_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own client profile"
  on public.client_profiles for update
  using (auth.uid() = user_id);

-- RLS Policies for events
create policy "Anyone can view published events"
  on public.events for select
  using (status = 'published' or exists (
    select 1 from public.organizers o
    where o.id = organizer_id and o.owner_user_id = auth.uid()
  ));

create policy "Confirmed organizers can create events"
  on public.events for insert
  with check (
    public.is_email_confirmed(auth.uid()) and
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.owner_user_id = auth.uid()
    )
  );

create policy "Organizers can update their own events"
  on public.events for update
  using (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.owner_user_id = auth.uid()
    )
  );

create policy "Organizers can delete their own events"
  on public.events for delete
  using (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.owner_user_id = auth.uid()
    )
  );

-- RLS Policies for price_tiers
create policy "Anyone can view price tiers for published events"
  on public.price_tiers for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (
        e.status = 'published' or
        exists (
          select 1 from public.organizers o
          where o.id = e.organizer_id and o.owner_user_id = auth.uid()
        )
      )
    )
  );

create policy "Organizers can manage price tiers for their events"
  on public.price_tiers for all
  using (
    exists (
      select 1 from public.events e
      join public.organizers o on o.id = e.organizer_id
      where e.id = event_id and o.owner_user_id = auth.uid()
    )
  );

-- RLS Policies for orders
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Organizers can view orders for their events"
  on public.orders for select
  using (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.owner_user_id = auth.uid()
    )
  );

create policy "Confirmed users can create orders"
  on public.orders for insert
  with check (public.is_email_confirmed(auth.uid()) and auth.uid() = user_id);

-- RLS Policies for tickets
create policy "Users can view their own tickets"
  on public.tickets for select
  using (auth.uid() = user_id);

create policy "Organizers can view tickets for their events"
  on public.tickets for select
  using (
    exists (
      select 1 from public.events e
      join public.organizers o on o.id = e.organizer_id
      where e.id = event_id and o.owner_user_id = auth.uid()
    )
  );

-- RLS Policies for follows
create policy "Users can view their own follows"
  on public.follows for select
  using (auth.uid() = user_id);

create policy "Users can follow organizers"
  on public.follows for insert
  with check (auth.uid() = user_id);

create policy "Users can unfollow organizers"
  on public.follows for delete
  using (auth.uid() = user_id);