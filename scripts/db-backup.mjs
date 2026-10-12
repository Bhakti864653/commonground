// Full backup and restore of the CommonGround database (every table in the public schema).
// Run through node with .env.local loaded:
//
//   node --env-file=.env.local scripts/db-backup.mjs backup
//       Saves every table's rows as JSON in a new folder under ../commonground-backups/
//       (outside the repo on purpose: a backup holds private data and must never be committed).
//   node --env-file=.env.local scripts/db-backup.mjs verify <folder>
//       Restore rehearsal: loads the backup into a temporary schema, checks every row count, then
//       drops the temporary schema. Never touches the real tables.
//   node --env-file=.env.local scripts/db-backup.mjs rollback-0007
//       Undoes migration 0007 (db/rollback/0007_agentic_pipeline_down.sql).
//   node --env-file=.env.local scripts/db-backup.mjs restore <folder>
//       Replaces the data in every table the backup contains with the backup's rows, in one
//       transaction (all or nothing). Run rollback-0007 first if going back to before 0007.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";

const [command, folderArg] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL isn't set. Run with --env-file=.env.local.");
  process.exit(1);
}
const root = join(import.meta.dirname, "..");
const backupsRoot = resolve(root, "..", "commonground-backups");
const client = new pg.Client({ connectionString: url });

const ident = (name) => `"${name.replace(/"/g, '""')}"`;

async function tables() {
  const { rows } = await client.query(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  return rows.map((r) => r.tablename);
}

/** Parents before children, so foreign keys are satisfied while inserting. */
async function insertOrder(names) {
  const { rows } = await client.query(
    `select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
     from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`,
  );
  const strip = (n) => n.replace(/^public\./, "").replace(/"/g, "");
  const deps = new Map(names.map((n) => [n, new Set()]));
  for (const r of rows) {
    const child = strip(r.child);
    const parent = strip(r.parent);
    if (deps.has(child) && deps.has(parent) && child !== parent) deps.get(child).add(parent);
  }
  const order = [];
  const visit = (n, seen = new Set()) => {
    if (order.includes(n) || seen.has(n)) return;
    seen.add(n);
    for (const p of deps.get(n)) visit(p, seen);
    order.push(n);
  };
  names.forEach((n) => visit(n));
  return order;
}

async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folder = join(backupsRoot, `backup-${stamp}`);
  mkdirSync(folder, { recursive: true });
  const manifest = { createdAt: new Date().toISOString(), host: new URL(url).hostname, tables: {} };
  await client.query("begin isolation level repeatable read read only");
  for (const t of await tables()) {
    const { rows } = await client.query(`select * from public.${ident(t)}`);
    writeFileSync(join(folder, `${t}.json`), JSON.stringify(rows));
    manifest.tables[t] = rows.length;
  }
  await client.query("commit");
  writeFileSync(join(folder, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Backup saved to ${folder}`);
  for (const [t, n] of Object.entries(manifest.tables)) console.log(`  ${t}: ${n} rows`);
}

function readBackup(folder) {
  if (!folder) throw new Error("Give the backup folder, e.g. ../commonground-backups/backup-…");
  const dir = resolve(folder);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const data = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "manifest.json")) {
    data[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(dir, file), "utf8"));
  }
  return { manifest, data };
}

/** Inserts rows into schema.table, keeping identity values exactly as backed up. */
async function load(schema, table, rows) {
  if (rows.length === 0) return;
  await client.query(
    `insert into ${ident(schema)}.${ident(table)} overriding system value
     select * from json_populate_recordset(null::${ident(schema)}.${ident(table)}, $1::json)`,
    [JSON.stringify(rows)],
  );
}

async function verify(folder) {
  const { manifest, data } = readBackup(folder);
  const schema = `restore_rehearsal_${Date.now()}`;
  await client.query("begin");
  try {
    await client.query(`create schema ${ident(schema)}`);
    const names = Object.keys(data);
    for (const t of names) {
      // Same columns and types as the live table, without its constraints or defaults.
      await client.query(`create table ${ident(schema)}.${ident(t)} (like public.${ident(t)})`);
    }
    for (const t of names) await load(schema, t, data[t]);
    let ok = true;
    for (const t of names) {
      const { rows } = await client.query(`select count(*)::int as n from ${ident(schema)}.${ident(t)}`);
      const expected = manifest.tables[t];
      const good = rows[0].n === expected;
      ok &&= good;
      console.log(`  ${good ? "ok " : "BAD"} ${t}: ${rows[0].n}/${expected}`);
    }
    console.log(ok ? "Restore rehearsal passed: every row loads back." : "Restore rehearsal FAILED.");
    if (!ok) process.exitCode = 1;
  } finally {
    // Nothing from the rehearsal is ever kept.
    await client.query("rollback");
  }
}

async function restore(folder) {
  const { data } = readBackup(folder);
  const live = new Set(await tables());
  const names = (await insertOrder(Object.keys(data))).filter((t) => live.has(t));
  await client.query("begin");
  try {
    await client.query(`truncate ${names.map((t) => `public.${ident(t)}`).join(", ")} cascade`);
    for (const t of names) {
      await load("public", t, data[t]);
      console.log(`  restored ${t}: ${data[t].length} rows`);
    }
    // Identity counters continue after the restored rows.
    for (const t of names) {
      const { rows } = await client.query(
        `select attname from pg_attribute where attrelid = $1::regclass and attidentity <> ''`,
        [`public.${t}`],
      );
      for (const { attname } of rows) {
        await client.query(
          `select setval(pg_get_serial_sequence($1, $2), coalesce((select max(${ident(attname)}) from public.${ident(t)}), 0) + 1, false)`,
          [`public.${t}`, attname],
        );
      }
    }
    await client.query("commit");
    console.log("Restore complete.");
  } catch (error) {
    await client.query("rollback");
    throw new Error(`Restore failed, nothing was changed: ${error.message}`);
  }
}

async function rollback0007() {
  await client.query(readFileSync(join(root, "db/rollback/0007_agentic_pipeline_down.sql"), "utf8"));
  console.log("Migration 0007 undone.");
}

const commands = { backup, verify: () => verify(folderArg), restore: () => restore(folderArg), "rollback-0007": rollback0007 };
if (!commands[command]) {
  console.error(`Usage: node scripts/db-backup.mjs <${Object.keys(commands).join("|")}> [folder]`);
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
