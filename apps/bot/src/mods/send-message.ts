import {
  database,
  discordDestinationsTable,
  discordOutboxTable,
  writeAuditLog,
} from "@repo/database";
import { type Channel, type Client, Events } from "discord.js";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Logger } from "pino";
import { defineMod } from "../types";

const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;
const STUCK_AFTER_MS = 5 * 60 * 1000;

export default defineMod({
  name: "send-message",
  setup: async (client, logger) => {
    await recoverStuck(logger);

    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        await processBatch(client, logger);
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          "tick failed",
        );
      }
      if (!stopped) setTimeout(tick, POLL_INTERVAL_MS);
    };

    client.once(Events.ClientReady, () => {
      logger.info(
        { intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE },
        "outbox poller started",
      );
      void tick();
    });

    const shutdown = () => {
      stopped = true;
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  },
});

type DestinationRecord = {
  userId: number;
  channelId: string;
  threadId: string | null;
  target: Channel;
};

async function recordDestination(
  { userId, channelId, threadId, target }: DestinationRecord,
  logger: Logger,
) {
  try {
    let channelName: string | null = null;
    let threadName: string | null = null;
    if (target.isThread()) {
      threadName = target.name;
      channelName = target.parent?.name ?? null;
    } else if ("name" in target && typeof target.name === "string") {
      channelName = target.name;
    }
    const now = new Date();
    await database
      .insert(discordDestinationsTable)
      .values({
        userId,
        channelId,
        threadId,
        channelName,
        threadName,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          discordDestinationsTable.userId,
          discordDestinationsTable.channelId,
          discordDestinationsTable.threadId,
        ],
        set: { channelName, threadName, lastUsedAt: now },
      });
  } catch (err) {
    logger.warn(
      {
        userId,
        channelId,
        threadId,
        err: err instanceof Error ? err.message : String(err),
      },
      "failed to record destination",
    );
  }
}

async function recoverStuck(logger: Logger) {
  const threshold = new Date(Date.now() - STUCK_AFTER_MS);
  const recovered = await database
    .update(discordOutboxTable)
    .set({ status: "pending" })
    .where(
      and(
        eq(discordOutboxTable.status, "sending"),
        lt(discordOutboxTable.claimedAt, threshold),
      ),
    )
    .returning({ id: discordOutboxTable.id });
  if (recovered.length > 0) {
    logger.warn(
      { count: recovered.length },
      "recovered stuck 'sending' rows to 'pending'",
    );
    await writeAuditLog({
      action: "discord.outbox.recover_stuck",
      meta: { count: recovered.length, ids: recovered.map((r) => r.id) },
    });
  }
}

async function processBatch(client: Client, logger: Logger) {
  const claimed = await database.execute<{
    id: string;
    channel_id: string;
    thread_id: string | null;
    content: string;
    attempt_count: number;
    created_by_user_id: number | null;
  }>(sql`
    WITH due AS (
      SELECT id
      FROM discord_outbox
      WHERE status = 'pending' AND scheduled_at <= now()
      ORDER BY scheduled_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE discord_outbox AS o
    SET status = 'sending',
        claimed_at = now(),
        attempt_count = o.attempt_count + 1,
        updated_at = now()
    FROM due
    WHERE o.id = due.id
    RETURNING o.id, o.channel_id, o.thread_id, o.content, o.attempt_count, o.created_by_user_id
  `);

  if (claimed.length === 0) return;
  logger.info({ count: claimed.length }, "claimed batch");

  for (const row of claimed) {
    const targetId = row.thread_id ?? row.channel_id;
    try {
      const target = await client.channels.fetch(targetId);
      if (!target) throw new Error(`channel not found: ${targetId}`);
      if (!target.isSendable()) {
        throw new Error(`channel not sendable: ${targetId} (${target.type})`);
      }
      await target.send(row.content);
      await database
        .update(discordOutboxTable)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(discordOutboxTable.id, row.id));
      logger.info({ id: row.id, targetId }, "message sent");
      await writeAuditLog({
        actorId: row.created_by_user_id,
        action: "discord.outbox.send",
        result: "success",
        targetType: "discord_outbox",
        targetId: row.id,
        meta: {
          channelId: row.channel_id,
          threadId: row.thread_id,
          attempt: row.attempt_count,
        },
      });
      if (row.created_by_user_id !== null) {
        await recordDestination(
          {
            userId: row.created_by_user_id,
            channelId: row.channel_id,
            threadId: row.thread_id,
            target,
          },
          logger,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = row.attempt_count >= MAX_ATTEMPTS;
      const nextAt = new Date(Date.now() + row.attempt_count * 60_000);
      await database
        .update(discordOutboxTable)
        .set({
          status: exhausted ? "failed" : "pending",
          lastError: message,
          scheduledAt: exhausted ? undefined : nextAt,
        })
        .where(eq(discordOutboxTable.id, row.id));
      logger[exhausted ? "error" : "warn"](
        {
          id: row.id,
          targetId,
          attempt: row.attempt_count,
          err: message,
        },
        exhausted ? "send failed (exhausted)" : "send failed (will retry)",
      );
      await writeAuditLog({
        actorId: row.created_by_user_id,
        action: exhausted
          ? "discord.outbox.send_exhausted"
          : "discord.outbox.send_retry",
        result: "failure",
        targetType: "discord_outbox",
        targetId: row.id,
        meta: {
          channelId: row.channel_id,
          threadId: row.thread_id,
          attempt: row.attempt_count,
          error: message,
        },
      });
    }
  }
}
