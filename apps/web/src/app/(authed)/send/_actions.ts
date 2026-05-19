"use server";

import { database, discordOutboxTable } from "@repo/database";
import * as v from "valibot";
import { memberActionClient } from "@/lib/safe-action";

const SnowflakeSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d{17,20}$/, "Discord ID は 17〜20 桁の数字です"),
);

const SendMessageSchema = v.pipe(
  v.instance(FormData),
  v.transform((fd) => Object.fromEntries(fd)),
  v.object({
    channelId: SnowflakeSchema,
    threadId: v.pipe(
      v.string(),
      v.trim(),
      v.check(
        (s) => s === "" || /^\d{17,20}$/.test(s),
        "Discord ID は 17〜20 桁の数字です",
      ),
    ),
    content: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "本文を入力してください"),
      v.maxLength(2000, "本文は 2000 文字以内です"),
    ),
  }),
);

export const sendMessage = memberActionClient
  .inputSchema(SendMessageSchema)
  .stateAction(async ({ parsedInput }) => {
    await database.insert(discordOutboxTable).values({
      channelId: parsedInput.channelId,
      threadId: parsedInput.threadId || null,
      content: parsedInput.content,
    });
    return { ok: true, at: Date.now() };
  });
