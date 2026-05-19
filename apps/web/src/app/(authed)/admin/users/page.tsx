import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { database } from "@repo/database";
import { verifyMember } from "@/lib/dal";
import { UsersTable } from "./_components/users-table";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminUsersPage() {
  const { user: me } = await verifyMember();
  const users = await database.query.usersTable.findMany({
    with: {
      grantedBy: { columns: { id: true, name: true, cognitoSub: true } },
    },
  });

  const sorted = [...users].sort((a, b) => {
    if (!a.grantedAt && b.grantedAt) return -1;
    if (a.grantedAt && !b.grantedAt) return 1;
    if (!a.grantedAt) return +a.createdAt - +b.createdAt;
    return +(b.grantedAt as Date) - +(a.grantedAt as Date);
  });

  const rows = sorted.map((u) => ({
    id: u.id,
    name: u.name,
    subPrefix: u.cognitoSub.slice(0, 8),
    grantedAt: u.grantedAt ? dateFormatter.format(u.grantedAt) : null,
    grantedBy: u.grantedBy ? (u.grantedBy.name ?? `#${u.grantedBy.id}`) : null,
    isSelf: u.id === me.id,
  }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ユーザー管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        承認待ちのユーザーに権限を付与できます。
      </Typography>
      <UsersTable rows={rows} />
    </Box>
  );
}
