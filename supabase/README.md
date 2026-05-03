# Supabase setup

This folder contains SQL you can paste into the Supabase SQL editor.

## Run order

1. Run `schema.sql`
2. Run `rls.sql`
3. Run `seed_requirements.sql`

## Make yourself admin (one-time bootstrap)

After you sign in once (so a `profiles` row exists), set your role to `admin`:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL@gmail.com';
```
