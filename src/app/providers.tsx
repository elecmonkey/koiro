"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { PlayerProvider, FloatingPlayer } from "./player";
import PwaRegister from "./PwaRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PwaRegister />
      <PlayerProvider>
        {children}
        <FloatingPlayer />
      </PlayerProvider>
    </ThemeProvider>
  );
}
