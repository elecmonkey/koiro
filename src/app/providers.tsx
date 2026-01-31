"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { PlayerProvider, FloatingPlayer } from "./player";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PlayerProvider>
        {children}
        <FloatingPlayer />
      </PlayerProvider>
    </ThemeProvider>
  );
}
