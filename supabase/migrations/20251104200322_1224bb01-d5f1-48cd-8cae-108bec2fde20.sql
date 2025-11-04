-- Fix search_path for security functions

-- Fix generate_short_code
create or replace function public.generate_short_code()
returns text
language plpgsql
security definer
set search_path = public
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

-- Fix generate_event_slug
create or replace function public.generate_event_slug(event_title text, event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
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

-- Fix update_updated_at_column
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;