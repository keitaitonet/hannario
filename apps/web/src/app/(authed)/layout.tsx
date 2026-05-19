import { verifyMember } from "@/lib/dal";
import { AppShell } from "./app-shell";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await verifyMember();
  return (
    <AppShell userDisplayName={user.name ?? `#${user.id}`}>{children}</AppShell>
  );
}
