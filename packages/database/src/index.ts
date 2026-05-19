import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "./config";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const database = drizzle({
  connection: { url: config.database.url, ssl: config.database.ssl },
  schema,
});

export * from "./schema";
