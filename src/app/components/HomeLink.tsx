"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";

export default function HomeLink() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const content = (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        component="img"
        src="/icon.svg"
        alt="Koiro logo"
        sx={{ width: 40, height: 40, borderRadius: "50%" }}
      />
      <Typography
        variant="h5"
        sx={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: { xs: 27, sm: 29 },
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        Koiro
      </Typography>
    </Stack>
  );

  if (isHome) {
    return (
      <div style={{ cursor: "pointer" }} aria-label="Home">
        {content}
      </div>
    );
  }

  return (
    <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}
