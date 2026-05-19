import * as v from "valibot";

const baseUrl = v.parse(v.string(), process.env["APP_BASE_URL"]);

export const config = {
  app: {
    baseUrl,
  },
  redis: {
    url: v.parse(v.string(), process.env["REDIS_URL"]),
  },
  cognito: {
    issuer: v.parse(v.string(), process.env["COGNITO_ISSUER"]),
    loginDomain: v.parse(v.string(), process.env["COGNITO_LOGIN_DOMAIN"]),
    clientId: v.parse(v.string(), process.env["COGNITO_CLIENT_ID"]),
    clientSecret: v.parse(v.string(), process.env["COGNITO_CLIENT_SECRET"]),
    redirectUri: `${baseUrl}/api/auth/callback`,
    postLogoutUri: `${baseUrl}/signed-out`,
  },
  session: {
    cookieName: "session",
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  oauthState: {
    cookieName: "oauth_state",
    ttlSec: 60 * 10,
  },
};
