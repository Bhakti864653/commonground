# CommonGround database (Supabase Postgres)

Not connected yet — the app still stores cases in memory. This folder holds the database design
so it can be reviewed and tested before anything depends on it.

| File | What it does |
|---|---|
| `migrations/0001_init.sql` | Creates the tables, the `create_case` function that hands out case numbers, and the privacy lock-down (Row Level Security on, nothing granted to browser keys). |
| `seed.sql` | Adds the 8 demonstration cases once. **Generated** from `src/lib/store/demo-seed.ts` — don't edit it by hand. |

## Setting up a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste all of `migrations/0001_init.sql`, press **Run**.
3. New query again, paste all of `seed.sql`, press **Run**. Running it twice is harmless.
4. Add two values to `commonground/.env.local` (and later to Vercel). Never paste them into a chat,
   a commit, or anything starting with `NEXT_PUBLIC_`:
   - `SUPABASE_URL` — the **Project URL**, from the **Connect** button at the top of the project.
   - `SUPABASE_SECRET_KEY` — **Project Settings → API Keys → Secret keys**; create one and copy it
     (it starts with `sb_secret_`). Not the publishable key.

## How it's tested without a Supabase account

`src/lib/store/__tests__/supabase-sql.test.ts` runs both files on a real Postgres that lives
inside the test process ([PGlite](https://pglite.dev)), then checks numbering, seeding, and
privacy. It also checks that every allowed value in the SQL matches the app's Zod schemas, and
that `seed.sql` is exactly what its generator produces. After changing the demonstration cases:

```bash
npx vitest run src/lib/store/__tests__/supabase-sql.test.ts -u
```
