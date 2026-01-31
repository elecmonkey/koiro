import Link from "next/link";
import { auth } from "@/auth";
import {
  AppBar,
  Box,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import LogoMark from "./LogoMark";
import NavLinks from "./NavLinks";
import NavUserMenu from "./NavUserMenu";

export default async function Navbar() {
  const session = await auth();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: "1px solid rgba(31, 26, 22, 0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Toolbar disableGutters>
        <Container
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
              <LogoMark size={40} />
            </Link>
            <Typography
              variant="h5"
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: { xs: 26, sm: 28 },
              }}
            >
              Koiro
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <NavLinks permissions={session?.user?.permissions ?? 0} />
            <NavUserMenu user={session?.user} />
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
