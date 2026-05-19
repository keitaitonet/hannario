import "server-only";
import { randomBytes } from "node:crypto";
import { database, sessionsTable, usersTable } from "@repo/database";
import { eq } from "drizzle-orm";
import * as client from "openid-client";
import { config } from "@/config";

let configPromise: Promise<client.Configuration> | null = null;
export function getOidcConfig(): Promise<client.Configuration> {
  configPromise ??= client.discovery(
    new URL(config.cognito.issuer),
    config.cognito.clientId,
    config.cognito.clientSecret,
  );
  return configPromise;
}

export function safeRedirect(input: string | null): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

export function buildLogoutUrl(): URL {
  const url = new URL(`${config.cognito.loginDomain}/logout`);
  url.searchParams.set("client_id", config.cognito.clientId);
  url.searchParams.set("logout_uri", config.cognito.postLogoutUri);
  return url;
}

export async function upsertUserByCognitoSub(
  cognitoSub: string,
): Promise<number> {
  const [row] = await database
    .insert(usersTable)
    .values({ cognitoSub })
    .onConflictDoUpdate({
      target: usersTable.cognitoSub,
      set: { cognitoSub },
    })
    .returning({ id: usersTable.id });
  if (!row) throw new Error("Failed to upsert user");
  return row.id;
}

export async function createSession(
  userId: number,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.session.ttlMs);
  await database.insert(sessionsTable).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function getSessionUser(token: string) {
  const session = await database.query.sessionsTable.findFirst({
    where: (s, { and, eq, gt }) =>
      and(eq(s.token, token), gt(s.expiresAt, new Date())),
    with: { user: true },
  });
  if (!session) return null;
  const expiresAt = new Date(Date.now() + config.session.ttlMs);
  await database
    .update(sessionsTable)
    .set({ expiresAt })
    .where(eq(sessionsTable.id, session.id));
  return { user: session.user, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await database.delete(sessionsTable).where(eq(sessionsTable.token, token));
}
