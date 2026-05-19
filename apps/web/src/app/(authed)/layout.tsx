import { verifySession } from "@/lib/dal";
import { AppShell } from "./app-shell";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await verifySession();
  return (
    <AppShell userDisplayName={user.name ?? `#${user.id}`}>{children}</AppShell>
  );
}
