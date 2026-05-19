import { Events, MessageFlags, SlashCommandBuilder } from "discord.js";
import { config } from "../config";
import { defineMod } from "../types";

const command = new SlashCommandBuilder()
  .setName("say")
  .setDescription("入力したテキストをそのまま Bot に発言させる")
  .addStringOption((option) =>
    option
      .setName("text")
      .setDescription("発言させたい内容")
      .setRequired(true)
      .setMaxLength(2000),
  );

export default defineMod({
  name: "say",
  setup: async (client, logger) => {
    client.once(Events.ClientReady, async (readyClient) => {
      try {
        await readyClient.application.commands.create(
          command.toJSON(),
          config.discord.guildId,
        );
        logger.info({ guildId: config.discord.guildId }, "registered /say");
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "failed to register /say",
        );
      }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== "say") return;

      const text = interaction.options.getString("text", true);
      const channel = interaction.channel;
      if (!channel?.isSendable()) {
        await interaction.reply({
          content: "このチャンネルには送信できません",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await channel.send(text);
        await interaction.editReply("送信しました");
        logger.info(
          {
            user: interaction.user.tag,
            channelId: channel.id,
            length: text.length,
          },
          "say invoked",
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await interaction.editReply(`送信に失敗しました: ${message}`);
        logger.error({ err: message }, "say failed");
      }
    });
  },
});
