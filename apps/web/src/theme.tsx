"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#be645a",
    },
  },
  typography: {
    fontFamily: "var(--font-roboto)",
  },
  components: {
    MuiButton: {
      defaultProps: { variant: "outlined", disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none" },
      },
    },
    MuiPaper: {
      defaultProps: { variant: "outlined" },
    },
    MuiAppBar: {
      defaultProps: { variant: "elevation", elevation: 0 },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderTop: "none",
          borderLeft: "none",
          borderBottom: "none",
        },
      },
    },
  },
});

export function AppTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
