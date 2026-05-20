import { database } from "./index";
import { auditLogsTable } from "./schema";

export type AuditResult = "success" | "failure";

export type AuditLogInput = {
  action: string;
  actorId?: number | null;
  targetType?: string | null;
  targetId?: string | null;
  result?: AuditResult;
  meta?: Record<string, unknown>;
};

// Audit writes must never break the caller. On failure, surface to stderr and swallow.
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await database.insert(auditLogsTable).values({
      action: input.action,
      actorId: input.actorId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      result: input.result ?? "success",
      meta: input.meta ?? {},
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[audit] write failed (${input.action}): ${msg}\n`);
  }
}
