import "server-only";
import { writeAuditLog } from "@repo/database";
import { createMiddleware, createSafeActionClient } from "next-safe-action";
import * as v from "valibot";
import { verifyMember, verifySession } from "@/lib/dal";

export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return v.object({
      action: v.string(),
    });
  },
});

const auditMiddleware = createMiddleware<{
  ctx: { user: { id: number } };
  metadata: { action: string };
}>().define(async ({ next, ctx, metadata }) => {
  const result = await next();
  await writeAuditLog({
    actorId: ctx.user.id,
    action: metadata.action,
    result: result.success ? "success" : "failure",
    meta:
      result.parsedInput && typeof result.parsedInput === "object"
        ? (result.parsedInput as Record<string, unknown>)
        : {},
  });
  return result;
});

export const authActionClient = actionClient
  .use(async ({ next }) => {
    const { user } = await verifySession();
    return next({ ctx: { user } });
  })
  .use(auditMiddleware);

export const memberActionClient = actionClient
  .use(async ({ next }) => {
    const { user } = await verifyMember();
    return next({ ctx: { user } });
  })
  .use(auditMiddleware);
