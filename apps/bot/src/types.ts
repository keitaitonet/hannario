import type { Client } from "discord.js";
import type { Logger } from "pino";

export type Mod = {
  name: string;
  setup: (client: Client, logger: Logger) => Promise<void>;
};

export const defineMod = (mod: Mod): Mod => mod;
