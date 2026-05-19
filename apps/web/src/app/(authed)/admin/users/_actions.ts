"use server";

import { database, usersTable } from "@repo/database";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as v from "valibot";
import { memberActionClient } from "@/lib/safe-action";

const GrantSchema = v.object({
  userId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const grantUser = memberActionClient
  .inputSchema(GrantSchema)
  .action(async ({ parsedInput, ctx }) => {
    const res = await database
      .update(usersTable)
      .set({ grantedAt: new Date(), grantedById: ctx.user.id })
      .where(
        and(
          eq(usersTable.id, parsedInput.userId),
          isNull(usersTable.grantedAt),
        ),
      )
      .returning({ id: usersTable.id });
    if (res.length === 0) {
      throw new Error("対象ユーザーが存在しないか、既に権限が付与されています");
    }
    revalidatePath("/admin/users");
    return { ok: true };
  });
