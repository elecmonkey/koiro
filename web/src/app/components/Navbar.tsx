import { AppBar, Container, Stack, Toolbar } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import NavLinks from './NavLinks';
import NavUserMenu from './NavUserMenu';
import HomeLink from './HomeLink';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: '1px solid rgba(31, 26, 22, 0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar disableGutters>
        <Container
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: { xs: 1, md: 1.5 },
          }}
        >
          <HomeLink />
          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2 }}
            sx={{
              alignItems: 'center',
            }}
          >
            <NavLinks permissions={user?.permissions ?? 0} user={user} />
            <NavUserMenu user={user} />
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
