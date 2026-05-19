import * as v from "valibot";

const logLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
] as const;

function load() {
  return {
    discord: {
      token: v.parse(v.string(), process.env["DISCORD_BOT_TOKEN"]),
      guildId: v.parse(v.string(), process.env["DISCORD_GUILD_ID"]),
    },
    database: {
      url: v.parse(v.string(), process.env["DATABASE_URL"]),
      ssl:
        v.parse(
          v.optional(v.picklist(["require", "allow", "prefer", "verify-full"])),
          process.env["DATABASE_SSL"] || undefined,
        ) ?? false,
    },
    redis: {
      url: v.parse(v.string(), process.env["REDIS_URL"]),
    },
    openai: {
      apiKey: v.parse(v.string(), process.env["OPENAI_API_KEY"]),
      baseURL: v.parse(
        v.optional(v.string(), "https://api.openai.com/v1"),
        process.env["OPENAI_BASE_URL"] || undefined,
      ),
      model: v.parse(
        v.optional(v.string(), "gpt-5-mini"),
        process.env["OPENAI_MODEL"] || undefined,
      ),
    },
    log: {
      level: v.parse(
        v.optional(v.picklist(logLevels), "info"),
        process.env["LOG_LEVEL"] || undefined,
      ),
      pretty: process.env["NODE_ENV"] !== "production",
    },
  };
}

// Lazy: env is parsed on first property access of `config`, not at module
// import. Keeps tsup bundling free of any runtime env requirement.
type Loaded = ReturnType<typeof load>;
let cached: Loaded | undefined;
export const config = new Proxy({} as Loaded, {
  get(_, key) {
    cached ??= load();
    return cached[key as keyof Loaded];
  },
});
