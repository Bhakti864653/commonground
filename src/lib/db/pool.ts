import "server-only";
import { Pool } from "pg";
import { fromPgPool, type SqlClient } from "./sql-client";

/**
 * The app's one connection to Postgres (Neon in production), from DATABASE_URL — a server-only
 * secret: `server-only` makes the build fail if anything in the browser bundle imports this.
 * Use the pooled ("-pooler") connection string; Neon's pooler shares connections across
 * serverless instances, so each instance keeps only a few.
 */
let client: SqlClient | null = null;

export function getSqlClient(connectionString: string): SqlClient {
  if (!client) {
    const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
    // An idle connection the server dropped must not crash the process.
    pool.on("error", (error) => console.error("[db] idle connection error", error.message));
    client = fromPgPool(pool);
  }
  return client;
}
