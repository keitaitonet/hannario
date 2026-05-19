import { type NextRequest, NextResponse } from "next/server";
import { config as appConfig } from "@/config";

const ALWAYS_ALLOWED = new Set([
  "/sign-in",
  "/sign-out",
  "/signed-out",
  "/api/auth/callback",
]);

function passThrough(req: NextRequest, pathname: string) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ALWAYS_ALLOWED.has(pathname)) {
    return passThrough(req, pathname);
  }

  const hasSession = !!req.cookies.get(appConfig.session.cookieName)?.value;
  if (!hasSession) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return passThrough(req, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
