import "server-only";
import { database, discordDestinationsTable } from "@repo/database";
import { desc, eq } from "drizzle-orm";

const RECENT_LIMIT = 20;

export type RecentDestination = {
  channelId: string;
  threadId: string | null;
  channelName: string | null;
  threadName: string | null;
};

export async function getRecentDestinations(
  userId: number,
): Promise<RecentDestination[]> {
  return await database
    .select({
      channelId: discordDestinationsTable.channelId,
      threadId: discordDestinationsTable.threadId,
      channelName: discordDestinationsTable.channelName,
      threadName: discordDestinationsTable.threadName,
    })
    .from(discordDestinationsTable)
    .where(eq(discordDestinationsTable.userId, userId))
    .orderBy(desc(discordDestinationsTable.lastUsedAt))
    .limit(RECENT_LIMIT);
}
