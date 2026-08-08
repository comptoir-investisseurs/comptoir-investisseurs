import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __cronosticPool?: Pool;
  __cronosticDb?: Database;
};

/**
 * Le site fonctionne sans base : les pages publiques sont alors servies
 * depuis le catalogue de seed et les écritures admin sont refusées
 * explicitement. `hasDatabase()` est le seul point de bascule.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL n'est pas définie. Renseignez la chaîne de connexion Neon pour activer la persistance.",
    );
  }

  if (!globalForDb.__cronosticDb) {
    const pool =
      globalForDb.__cronosticPool ??
      new Pool({
        connectionString: url,
        max: 5,
        ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: true },
      });
    globalForDb.__cronosticPool = pool;
    globalForDb.__cronosticDb = drizzle(pool, { schema });
  }

  return globalForDb.__cronosticDb;
}

export { schema };
