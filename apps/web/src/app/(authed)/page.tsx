import { database, usersTable } from "@repo/database";
import { verifySession } from "@/lib/dal";

export default async function IndexPage() {
  const { user } = await verifySession();
  const users = await database.select().from(usersTable);
  return <pre>{JSON.stringify({ me: user, users }, null, 2)}</pre>;
}
