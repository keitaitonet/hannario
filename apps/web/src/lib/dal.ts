import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { config } from "@/config";
import { getSessionUser } from "@/lib/auth";

export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(config.session.cookieName)?.value;
  return token ? await getSessionUser(token) : null;
});

export const verifySession = cache(async () => {
  const session = await getCurrentSession();
  if (!session) {
    const pathname = (await headers()).get("x-pathname") ?? "/";
    redirect(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
  }
  return session;
});

export const verifyMember = cache(async () => {
  const session = await verifySession();
  if (!session.user.grantedAt) redirect("/pending");
  return session;
});
