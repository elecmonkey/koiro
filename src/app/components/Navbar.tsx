import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  // 如果用户已登录，从数据库获取最新的用户信息（包括 displayName）
  let userWithDisplayName = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        permissions: true,
      },
    });
    if (user) {
      userWithDisplayName = user;
    }
  }

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
            py: { xs: 1, md: 1.5 },
          }}
        >
          <HomeLink />
          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
            <NavLinks permissions={userWithDisplayName?.permissions ?? 0} user={userWithDisplayName} />
            <NavUserMenu user={userWithDisplayName} />
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
