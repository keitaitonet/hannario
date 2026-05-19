"use server";

import { database, usersTable } from "@repo/database";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import { memberActionClient } from "@/lib/safe-action";

const SettingsSchema = v.pipe(
  v.instance(FormData),
  v.transform((fd) => Object.fromEntries(fd)),
  v.object({
    name: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "名前を入力してください"),
      v.maxLength(100, "名前は100文字以内で入力してください"),
    ),
  }),
);

export const updateSettings = memberActionClient
  .inputSchema(SettingsSchema)
  .stateAction(async ({ parsedInput, ctx }) => {
    await database
      .update(usersTable)
      .set(parsedInput)
      .where(eq(usersTable.id, ctx.user.id));
    revalidatePath("/", "layout");
    return { ok: true };
  });
