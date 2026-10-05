# CommonGround database (Postgres on Neon)

When `DATABASE_URL` is set, the app stores cases in Postgres; without it, it falls back to the
in-memory prototype store (that's what tests always use). Production runs on a free
[Neon](https://neon.com) project.

| File | What it does |
|---|---|
| `migrations/0001_init.sql` | Creates the tables, the `create_case` function that hands out case numbers, and the privacy lock-down (Row Level Security on; no access for any role but the owner). |
| `seed.sql` | Adds the 8 demonstration cases once. **Generated** from `src/lib/store/demo-seed.ts` — don't edit it by hand. |
| `../scripts/db.mjs` | Applies the files above (`npm run db:migrate`, `npm run db:seed`, `npm run db:status`). |

## Setting up a database

1. Create a free project at [console.neon.tech](https://console.neon.tech).
2. Put its **pooled** connection string (the host contains `-pooler`) in `commonground/.env.local`
   as `DATABASE_URL="postgresql://…"` — from the project's **Connect** button, or without
   copying it by hand:
   `npx neonctl connection-string production --project-id <id> --pooled --ssl verify-full`.
   It contains the database password: never paste it into a chat or a commit, and never give it
   a `NEXT_PUBLIC_` name.
3. `npm run db:migrate` — creates the tables (records what it applied, so it's safe to rerun).
4. `npm run db:seed` — adds the demonstration cases (does nothing if they're already there).
5. `npm run db:status` — shows applied migrations and how many cases exist.

For Vercel, add the same `DATABASE_URL` under **Project → Settings → Environment Variables**
(Production and Preview), then redeploy.

## How it stays private

- Only the server connects (`src/lib/db/pool.ts`, which imports `server-only`, so the build
  fails if browser code ever imports it). Nothing in the browser can reach the database.
- Row Level Security is on for every table with no policies, and the roles hosted "Data APIs"
  hand to browsers get nothing — a safety net if one is ever switched on.
- Public pages still pass every case through `toPublicCase`, which drops the private fields.

## How it's tested without a real database

- `src/lib/store/__tests__/db-sql.test.ts` runs both SQL files on [PGlite](https://pglite.dev)
  (a real Postgres inside the test process) and checks numbering, seeding, and privacy, that
  the SQL's allowed values match the app's Zod schemas, and that `seed.sql` is exactly what its
  generator produces.
- `src/lib/store/__tests__/case-repository-contract.test.ts` runs the same behaviour tests
  against the in-memory store and the Postgres store, so they can't drift apart.

After changing the demonstration cases, regenerate `seed.sql`:

```bash
npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
```
