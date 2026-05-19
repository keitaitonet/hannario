import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "./config";
import { logger } from "./logger";
import { mods } from "./mods";

async function main() {
  logger.info("starting bot");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on(Events.Error, (err) =>
    logger.error({ err: err.message }, "discord client error"),
  );
  client.on(Events.Warn, (msg) => logger.warn(msg));
  client.on(Events.ShardDisconnect, (event, shardId) =>
    logger.warn({ shardId, code: event.code }, "shard disconnected"),
  );
  client.on(Events.ShardReconnecting, (shardId) =>
    logger.info({ shardId }, "shard reconnecting"),
  );

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      {
        tag: readyClient.user.tag,
        guilds: readyClient.guilds.cache.size,
      },
      "logged in",
    );
  });

  logger.info({ count: mods.length }, "loading mods");
  for (const mod of mods) {
    const modLogger = logger.child({ mod: mod.name });
    await mod.setup(client, modLogger);
    modLogger.info("ready");
  }

  logger.info("connecting to discord");
  await client.login(config.discord.token);
}

main();
