import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Roboto } from "next/font/google";
import { AppTheme } from "../theme";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={roboto.variable}>
      <body>
        <AppRouterCacheProvider>
          <AppTheme>{children}</AppTheme>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
