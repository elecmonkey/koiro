import { auth } from "@/auth";
import {
  AppBar,
  Container,
  Stack,
  Toolbar,
} from "@mui/material";
import NavLinks from "./NavLinks";
import NavUserMenu from "./NavUserMenu";
import HomeLink from "./HomeLink";

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
          <HomeLink />
          <Stack direction="row" spacing={2} alignItems="center">
            <NavLinks permissions={session?.user?.permissions ?? 0} />
            <NavUserMenu user={session?.user} />
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
