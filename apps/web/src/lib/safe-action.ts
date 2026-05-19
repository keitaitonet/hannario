import "server-only";
import { createSafeActionClient } from "next-safe-action";
import { verifySession } from "@/lib/dal";

export const actionClient = createSafeActionClient();

export const authActionClient = actionClient.use(async ({ next }) => {
  const { user } = await verifySession();
  return next({ ctx: { user } });
});
