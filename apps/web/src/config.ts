import * as v from "valibot";

function load() {
  const baseUrl = v.parse(v.string(), process.env["APP_BASE_URL"]);
  return {
    app: {
      baseUrl,
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
}

// Lazy: env is parsed on first property access of `config`, not at module
// import. Lets `next build` succeed with no env vars set at build time.
type Loaded = ReturnType<typeof load>;
let cached: Loaded | undefined;
export const config = new Proxy({} as Loaded, {
  get(_, key) {
    cached ??= load();
    return cached[key as keyof Loaded];
  },
});
