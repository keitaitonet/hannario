import { type NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { config } from "@/config";
import {
  createSession,
  getOidcConfig,
  safeRedirect,
  upsertUserByCognitoSub,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(config.oauthState.cookieName)?.value;
  if (!raw) {
    return NextResponse.json({ error: "missing oauth state" }, { status: 400 });
  }
  let parsed: { state: string; codeVerifier: string; redirect: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid oauth state" }, { status: 400 });
  }

  const oidcConfig = await getOidcConfig();
  // Reconstruct the callback URL using the public origin so the redirect_uri
  // sent during code exchange matches the one used at /authorize. Behind a
  // reverse proxy / tunnel, req.url carries the internal origin and Cognito
  // rejects the exchange with `invalid_redirect`.
  const callbackUrl = new URL(config.cognito.redirectUri);
  callbackUrl.search = req.nextUrl.search;
  const tokens = await client.authorizationCodeGrant(oidcConfig, callbackUrl, {
    pkceCodeVerifier: parsed.codeVerifier,
    expectedState: parsed.state,
  });
  const sub = tokens.claims()?.sub;
  if (!sub) {
    return NextResponse.json({ error: "missing sub" }, { status: 400 });
  }

  const userId = await upsertUserByCognitoSub(sub);
  const { token, expiresAt } = await createSession(userId);

  const response = NextResponse.redirect(
    new URL(safeRedirect(parsed.redirect), config.app.baseUrl),
  );
  response.cookies.set(config.session.cookieName, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  response.cookies.delete({ name: config.oauthState.cookieName, path: "/" });
  return response;
}
