import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { Events } from "discord.js";
import { config } from "../config";
import { defineMod } from "../types";

const provider = createOpenAICompatible({
  name: "openai-compatible",
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
});

export default defineMod({
  name: "chat",
  setup: async (client, logger) => {
    client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot || !client.user) return;
      if (!message.mentions.has(client.user)) return;

      const input = message.content.replace(/<@!?\d+>/g, "").trim();
      if (!input) return;

      logger.info(
        { user: message.author.tag, length: input.length },
        "mention received",
      );
      await message.channel.sendTyping();

      try {
        const started = Date.now();
        const { text } = await generateText({
          model: provider.chatModel(config.openai.model),
          prompt: input,
        });
        const elapsedMs = Date.now() - started;
        if (!text) {
          logger.warn({ user: message.author.tag, elapsedMs }, "empty reply");
          return;
        }
        await message.reply(text);
        logger.info(
          { user: message.author.tag, elapsedMs, replyLength: text.length },
          "replied",
        );
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "chat generation failed",
        );
      }
    });
  },
});
