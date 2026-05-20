import pino from "pino";
import pretty from "pino-pretty";
import { config } from "./config";

export const logger = pino(
  { level: config.log.level },
  config.log.pretty
    ? pretty({ colorize: true, translateTime: "SYS:HH:MM:ss.l" })
    : process.stdout,
);
