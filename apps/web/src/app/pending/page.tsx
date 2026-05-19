import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { PendingPoller } from "./_components/poller";

export default async function PendingPage() {
  const { user } = await verifySession();
  if (user.grantedAt) redirect("/");

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 480, width: "100%" }} elevation={2}>
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h5">承認待ちです</Typography>
          <Typography variant="body2" color="text.secondary">
            このアカウントはまだ管理画面へのアクセス権限が付与されていません。
            既に権限を持つメンバーに招待を依頼してください。
            権限が付与され次第、自動的に遷移します。
          </Typography>
          <Button
            component="a"
            href="/sign-out"
            variant="outlined"
            size="small"
          >
            ログアウト
          </Button>
        </Stack>
      </Paper>
      <PendingPoller />
    </Box>
  );
}
