import * as v from "valibot";

export const config = {
  database: {
    url: v.parse(v.string(), process.env["DATABASE_URL"]),
    ssl:
      v.parse(
        v.optional(v.picklist(["require", "allow", "prefer", "verify-full"])),
        process.env["DATABASE_SSL"],
      ) ?? false,
  },
};
