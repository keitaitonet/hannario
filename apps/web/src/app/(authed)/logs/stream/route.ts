import "server-only";
import { verifySession } from "@/lib/dal";
import { createSubscriber, LOG_CHANNEL } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await verifySession();

  const sub = createSubscriber();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await sub.subscribe(LOG_CHANNEL);
      sub.on("message", (_channel, message) => {
        const payload = message.trimEnd();
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      });
    },
    cancel() {
      sub.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
