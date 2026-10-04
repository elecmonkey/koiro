import { AppBar, Container, Stack, Toolbar } from '@mui/material';
import { useAuth } from '@/stores/session';
import NavLinks from './nav-links';
import NavUserMenu from './nav-user-menu';
import HomeLink from './home-link';

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
            <NavLinks user={user} />
            <NavUserMenu user={user} />
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
