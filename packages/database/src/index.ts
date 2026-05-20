import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "./config";
import * as schema from "./schema";

export type Database = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;

function load(): Database {
  return drizzle({
    connection: { url: config.database.url, ssl: config.database.ssl },
    schema,
  });
}

// Lazy: drizzle is constructed on first property access. Mirrors `config`'s
// lazy pattern so importing this module never reads env. Methods are bound
// to the real instance so chained calls keep the correct `this`.
let cached: Database | undefined;
export const database = new Proxy({} as Database, {
  get(_, prop) {
    cached ??= load();
    const value = cached[prop as keyof Database];
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

export * from "./audit";
export * from "./schema";
