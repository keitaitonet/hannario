import Redis from "ioredis";
import pino, { type StreamEntry } from "pino";
import pretty, { prettyFactory } from "pino-pretty";
import { config } from "./config";

const prettify = prettyFactory({
  colorize: false,
  translateTime: "SYS:HH:MM:ss.l",
});

const MAX = 200;
const lines: string[] = [];

const memoryStream = {
  write(chunk: string) {
    lines.push(chunk);
    if (lines.length > MAX) lines.shift();
  },
};

// web 側の SSE と一致させること
const LOG_CHANNEL = "bot:logs";
const pub = new Redis(config.redis.url);
pub.on("error", (err) => {
  process.stderr.write(`[redis-pub] ${err.message}\n`);
});

const redisStream = {
  write(chunk: string) {
    pub.publish(LOG_CHANNEL, chunk).catch(() => {});
  },
};

const streams: StreamEntry[] = [
  { stream: memoryStream },
  { stream: redisStream },
  {
    stream: config.log.pretty
      ? pretty({ colorize: true, translateTime: "SYS:HH:MM:ss.l" })
      : process.stdout,
  },
];

export const logger = pino(
  { level: config.log.level },
  pino.multistream(streams),
);

export const getLogText = (): string => lines.map(prettify).join("");
