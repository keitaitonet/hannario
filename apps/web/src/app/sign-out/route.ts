import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/config";
import { buildLogoutUrl, deleteSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(config.session.cookieName)?.value;
  if (token) await deleteSession(token);
  const response = NextResponse.redirect(buildLogoutUrl().href);
  response.cookies.delete({ name: config.session.cookieName, path: "/" });
  return response;
}
