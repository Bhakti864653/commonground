// Applies the database files to the Postgres in DATABASE_URL (Neon). Run through npm, which
// loads .env.local first:
//
//   npm run db:migrate   apply every db/migrations/*.sql not applied yet, in name order
//   npm run db:seed      run db/seed.sql (adds the demonstration cases once; safe to repeat)
//   npm run db:status    list applied migrations and count cases
//
// Each migration runs in its own transaction and is recorded in schema_migrations, so running
// db:migrate again only applies new files. The connection string is never printed — only the
// host, so you can see which database you're talking to.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const command = process.argv[2];
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL isn't set. Add it to .env.local (see db/README.md).");
  process.exit(1);
}

const root = join(import.meta.dirname, "..");
const client = new pg.Client({ connectionString: url });
client.on("notice", (notice) => console.log(`  ${notice.message}`));

async function migrate() {
  await client.query(`create table if not exists public.schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
  const files = readdirSync(join(root, "db/migrations")).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) return console.log("Already up to date.");
  for (const file of pending) {
    await client.query("begin");
    try {
      await client.query(readFileSync(join(root, "db/migrations", file), "utf8"));
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${file} failed, nothing from it was kept: ${error.message}`);
    }
  }
}

async function seed() {
  await client.query(readFileSync(join(root, "db/seed.sql"), "utf8"));
}

async function status() {
  const migrations = await client.query(
    "select name, applied_at from public.schema_migrations order by name",
  ).catch(() => ({ rows: [] }));
  console.log(migrations.rows.length ? "Applied migrations:" : "No migrations applied yet.");
  for (const r of migrations.rows) console.log(`  ${r.name}  (${r.applied_at.toISOString()})`);
  if (migrations.rows.length) {
    const cases = await client.query(
      "select source_type, count(*)::int as n from public.cases where deleted_at is null group by source_type order by source_type",
    );
    console.log("Cases:", cases.rows.map((r) => `${r.n} ${r.source_type}`).join(", ") || "none");
  }
}

const commands = { migrate, seed, status };
if (!commands[command]) {
  console.error(`Usage: node scripts/db.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}

try {
  await client.connect();
  console.log(`Connected to ${new URL(url).hostname}`);
  await commands[command]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
