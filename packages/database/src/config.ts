import * as v from "valibot";

function load() {
  return {
    database: {
      url: v.parse(v.string(), process.env["DATABASE_URL"]),
      ssl:
        v.parse(
          v.optional(v.picklist(["require", "allow", "prefer", "verify-full"])),
          process.env["DATABASE_SSL"] || undefined,
        ) ?? false,
    },
  };
}

// Lazy: env is parsed on first property access of `config`, not at module
// import. Lets `next build` and similar tooling load this file without env.
type Loaded = ReturnType<typeof load>;
let cached: Loaded | undefined;
export const config = new Proxy({} as Loaded, {
  get(_, key) {
    cached ??= load();
    return cached[key as keyof Loaded];
  },
});
