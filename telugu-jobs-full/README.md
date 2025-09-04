# Telugu Jobs (AP & Telangana) — Next.js + Supabase (Free)

## Setup
1) Create a Supabase project and tables (`jobs`, `applications`, `employers`, `public_jobs` view).
2) In Vercel (or local), set env vars:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
3) Deploy to Vercel (free).

## RLS (testing only)
To allow posting jobs without auth while testing:
```sql
alter table public.jobs enable row level security;
create policy "jobs_anyone_insert_for_testing"
on public.jobs for insert with check (true);
```

## Dev
```bash
npm i
npm run dev
```
