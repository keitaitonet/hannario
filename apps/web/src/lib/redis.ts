import "server-only";
import Redis from "ioredis";
import { config } from "@/config";

// bot 側の publish と一致させること
export const LOG_CHANNEL = "bot:logs";

export function createSubscriber(): Redis {
  const sub = new Redis(config.redis.url);
  sub.on("error", (err) => {
    console.error("[redis-sub]", err.message);
  });
  return sub;
}
