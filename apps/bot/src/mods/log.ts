import { Events, SlashCommandBuilder } from "discord.js";
import { config } from "../config";
import { getLogText } from "../logger";
import { defineMod } from "../types";

export default defineMod({
  name: "log",
  setup: async (client, logger) => {
    client.once(Events.ClientReady, async (c) => {
      const guild = await c.guilds.fetch(config.discord.guildId);
      await guild.commands.create(
        new SlashCommandBuilder()
          .setName("log")
          .setDescription("現在のセッションのログを表示します"),
      );
      logger.info({ guildId: config.discord.guildId }, "registered /log");
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== "log") return;

      logger.info({ user: interaction.user.tag }, "/log invoked");
      const body = getLogText().slice(-1900) || "ログなし";
      await interaction.reply(`\`\`\`\n${body}\n\`\`\``);
    });
  },
});
