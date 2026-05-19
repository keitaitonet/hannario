import { database, usersTable } from "@repo/database";
import { Events } from "discord.js";
import { defineMod } from "../types";

export default defineMod({
  name: "sample",
  setup: async (client, logger) => {
    client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      if (message.content === "ping") {
        logger.info({ user: message.author.tag }, "ping received");
        const users = await database.select().from(usersTable);
        logger.info({ count: users.length }, "fetched users");

        await message.channel.send(
          `\`\`\`\n${JSON.stringify(users, null, 2)}\n\`\`\``,
        );
      }
    });
  },
});
