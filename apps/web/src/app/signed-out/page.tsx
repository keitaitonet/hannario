import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function SignedOutPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        ログアウトしました
      </Typography>
      <Button variant="contained" href="/sign-in">
        ログイン
      </Button>
    </Box>
  );
}
