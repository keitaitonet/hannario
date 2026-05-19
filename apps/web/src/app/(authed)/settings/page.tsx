import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { verifySession } from "@/lib/dal";
import { SettingsForm } from "./_components/form";

export default async function SettingsPage() {
  const { user } = await verifySession();
  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography variant="h4" gutterBottom>
        設定
      </Typography>
      <SettingsForm defaultName={user.name ?? ""} />
    </Box>
  );
}
