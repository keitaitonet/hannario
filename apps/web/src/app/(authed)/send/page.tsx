import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SendForm } from "./_components/form";

export default function SendPage() {
  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" gutterBottom>
        メッセージ送信
      </Typography>
      <SendForm />
    </Box>
  );
}
