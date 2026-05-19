import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { verifyMember } from "@/lib/dal";
import { SendForm } from "./_components/form";
import { getRecentDestinations } from "./_data";

export default async function SendPage() {
  const { user } = await verifyMember();
  const recentDestinations = await getRecentDestinations(user.id);

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" gutterBottom>
        メッセージ送信
      </Typography>
      <SendForm recentDestinations={recentDestinations} />
    </Box>
  );
}
