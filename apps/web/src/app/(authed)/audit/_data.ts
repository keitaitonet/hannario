import "server-only";
import { auditLogsTable, database } from "@repo/database";
import { desc, lt } from "drizzle-orm";

export const PAGE_SIZE = 50;

export type AuditLogRow = {
  id: number;
  createdAt: Date;
  actor: { id: number; name: string | null } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: string;
  meta: Record<string, unknown>;
};

export type AuditLogPage = {
  items: AuditLogRow[];
  nextCursor: number | null;
};

export async function getAuditLogs(
  cursor: number | null,
): Promise<AuditLogPage> {
  const rows = await database.query.auditLogsTable.findMany({
    with: { actor: { columns: { id: true, name: true } } },
    where: cursor !== null ? lt(auditLogsTable.id, cursor) : undefined,
    orderBy: desc(auditLogsTable.id),
    limit: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? last.id : null;

  return { items, nextCursor };
}
