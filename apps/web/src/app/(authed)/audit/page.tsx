import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { verifyMember } from "@/lib/dal";
import { AuditTable } from "./_components/table";
import { getAuditLogs } from "./_data";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  await verifyMember();
  const { cursor: rawCursor } = await searchParams;
  const cursor =
    rawCursor && /^\d+$/.test(rawCursor) ? Number(rawCursor) : null;
  const { items, nextCursor } = await getAuditLogs(cursor);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        監査ログ
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        サーバーアクションおよび bot のイベントを記録しています。
      </Typography>
      <AuditTable rows={items} cursor={cursor} nextCursor={nextCursor} />
    </Box>
  );
}
