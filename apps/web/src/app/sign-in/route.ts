import { type NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import { config } from "@/config";
import { getOidcConfig, getSessionUser, safeRedirect } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get(config.session.cookieName)?.value;
  if (sessionToken && (await getSessionUser(sessionToken))) {
    return NextResponse.redirect(new URL("/", config.app.baseUrl));
  }

  const redirect = safeRedirect(req.nextUrl.searchParams.get("redirect"));
  const oidcConfig = await getOidcConfig();

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
    redirect_uri: config.cognito.redirectUri,
    scope: "openid",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  const response = NextResponse.redirect(authorizationUrl.href);
  response.cookies.set(
    config.oauthState.cookieName,
    JSON.stringify({ state, codeVerifier, redirect }),
    {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: config.oauthState.ttlSec,
    },
  );
  return response;
}
