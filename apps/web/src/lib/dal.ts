import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { config } from "@/config";
import { getSessionUser } from "@/lib/auth";

export const verifySession = cache(async () => {
  const token = (await cookies()).get(config.session.cookieName)?.value;
  const session = token ? await getSessionUser(token) : null;
  if (!session) {
    const pathname = (await headers()).get("x-pathname") ?? "/";
    redirect(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
  }
  return session;
});
