import { defineConfig } from "drizzle-kit";

process.loadEnvFile(".env.local");

const { config } = require("./src/config") as typeof import("./src/config");

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: config.database.url,
    ssl: config.database.ssl,
  },
});
