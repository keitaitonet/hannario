import { getCurrentSession } from "@/lib/dal";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return new Response(null, { status: 401 });
  return Response.json({ granted: !!session.user.grantedAt });
}
