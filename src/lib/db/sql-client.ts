/**
 * The two things the SQL case store needs from a database connection. Small on purpose, so the
 * same store code runs on node-postgres (production, Neon) and on PGlite (tests — a real
 * Postgres inside the test process), each through a few lines of adapter below.
 */
export interface SqlClient {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Runs `fn` inside BEGIN … COMMIT, rolling back if it throws. */
  transaction<R>(fn: (tx: SqlClient) => Promise<R>): Promise<R>;
}

/** Anything with a node-postgres-style `query` (a pg Client/PoolClient, or a PGlite transaction). */
type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

/** Already inside a transaction: nested `transaction` calls just reuse it. */
function inTransaction(conn: Queryable): SqlClient {
  const client: SqlClient = {
    query: async <T>(text: string, params?: unknown[]) => (await conn.query(text, params)) as { rows: T[] },
    transaction: (fn) => fn(client),
  };
  return client;
}

/** node-postgres Pool → SqlClient. Each transaction borrows one connection for its duration. */
export function fromPgPool(pool: Queryable & { connect: () => Promise<Queryable & { release: () => void }> }): SqlClient {
  return {
    query: async <T>(text: string, params?: unknown[]) => (await pool.query(text, params)) as { rows: T[] },
    transaction: async (fn) => {
      const conn = await pool.connect();
      try {
        await conn.query("begin");
        const result = await fn(inTransaction(conn));
        await conn.query("commit");
        return result;
      } catch (error) {
        await conn.query("rollback");
        throw error;
      } finally {
        conn.release();
      }
    },
  };
}

/** PGlite → SqlClient (tests). */
export function fromPglite(db: Queryable & { transaction: <R>(fn: (tx: Queryable) => Promise<R>) => Promise<R> }): SqlClient {
  return {
    query: async <T>(text: string, params?: unknown[]) => (await db.query(text, params)) as { rows: T[] },
    transaction: (fn) => db.transaction((tx) => fn(inTransaction(tx))),
  };
}
