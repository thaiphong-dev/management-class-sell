# Skill: Supabase

## Queries cơ bản

```ts
// Select với filter
const { data, error } = await supabase
  .from('classes')
  .select('id, name, status')        // chỉ lấy columns cần
  .eq('status', 'active')
  .order('name')
  .limit(50)

// Join (foreign table)
const { data } = await supabase
  .from('classes')
  .select('*, coaches(profiles(full_name))')  // nested join

// Single row
const { data } = await supabase
  .from('classes')
  .select('*')
  .eq('id', id)
  .single()   // throw error nếu không có row
// dùng .maybeSingle() nếu row có thể không tồn tại

// Count
const { count } = await supabase
  .from('students')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'active')
```

## Mutations

```ts
// Insert
const { data, error } = await supabase
  .from('classes')
  .insert({ name: 'Lớp A', coach_id: '...' })
  .select()
  .single()

// Upsert (insert hoặc update nếu conflict)
const { data } = await supabase
  .from('attendance')
  .upsert(
    records,
    { onConflict: 'session_id,student_id' }  // unique columns
  )

// Update
const { data } = await supabase
  .from('classes')
  .update({ status: 'inactive' })
  .eq('id', classId)
  .select()
  .single()

// Soft delete (không dùng .delete() trừ khi cần thiết)
await supabase.from('classes').update({ status: 'inactive' }).eq('id', id)
```

## RLS & Auth

```ts
// Lấy current user
const { data: { user } } = await supabase.auth.getUser()

// Supabase RLS tự động filter theo auth.uid()
// Không cần truyền userId vào query — Supabase tự handle

// Nếu cần bypass RLS (server-side only):
// Dùng service role key — KHÔNG dùng ở frontend
```

## Realtime

```ts
// Subscribe to table changes
const channel = supabase
  .channel('room-1')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    payload => console.log('New:', payload.new)
  )
  .subscribe()

// Cleanup
return () => { supabase.removeChannel(channel) }
```

## Storage

```ts
// Upload avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, { upsert: true })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)
```

## Error patterns

```ts
// Luôn destructure error
const { data, error } = await supabase.from('...').select()
if (error) {
  if (error.code === 'PGRST116') {
    // Row not found — expected case
    return null
  }
  // Unexpected error
  console.error('[query name]', error)
  throw new Error('Không thể tải dữ liệu.')
}
```

## Common Error Codes

| Code | Meaning |
|------|---------|
| `PGRST116` | Row not found (single()) |
| `23505` | Unique constraint violation |
| `23503` | Foreign key violation |
| `42501` | RLS policy denied |
