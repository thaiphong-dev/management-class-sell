-- 031_storage_policies.sql
-- Add RLS policies for storage.objects on the 'image' bucket

-- 1. Drop existing policies on storage.objects for the 'image' bucket to avoid duplicates
drop policy if exists "Public Access to image" on storage.objects;
drop policy if exists "Allow anyone to upload to image" on storage.objects;
drop policy if exists "Allow auth users to update image" on storage.objects;
drop policy if exists "Allow auth users to delete image" on storage.objects;

-- 2. Create policies
-- Allow public select (read) access on 'image' bucket
create policy "Public Access to image"
on storage.objects for select
to public
using (bucket_id = 'image');

-- Allow anyone to upload (insert) files to 'image' bucket (required for registration forms)
create policy "Allow anyone to upload to image"
on storage.objects for insert
to public
with check (bucket_id = 'image');

-- Allow authenticated users to update files in 'image' bucket
create policy "Allow auth users to update image"
on storage.objects for update
to authenticated
using (bucket_id = 'image')
with check (bucket_id = 'image');

-- Allow authenticated users to delete files in 'image' bucket
create policy "Allow auth users to delete image"
on storage.objects for delete
to authenticated
using (bucket_id = 'image');
