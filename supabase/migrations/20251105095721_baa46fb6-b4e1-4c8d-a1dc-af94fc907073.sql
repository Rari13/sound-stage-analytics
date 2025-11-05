-- Create storage bucket for event banners
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-banners',
  'event-banners',
  true,
  3145728, -- 3MB
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- Storage policies for event-banners
create policy "Anyone can view event banners"
on storage.objects for select
using (bucket_id = 'event-banners');

create policy "Authenticated users can upload event banners"
on storage.objects for insert
to authenticated
with check (bucket_id = 'event-banners');

create policy "Organizers can update their event banners"
on storage.objects for update
to authenticated
using (bucket_id = 'event-banners' and auth.uid() in (
  select owner_user_id from organizers
));

create policy "Organizers can delete their event banners"
on storage.objects for delete
to authenticated
using (bucket_id = 'event-banners' and auth.uid() in (
  select owner_user_id from organizers
));

-- Add banner_url column to events if not exists
alter table public.events 
add column if not exists banner_url text;

-- Ensure we have the status column (should already exist)
-- status can be: 'draft', 'published', 'cancelled', 'completed'