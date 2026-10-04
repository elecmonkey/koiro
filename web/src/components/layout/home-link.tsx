import { Link, useLocation } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';

export function HomeLink() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const content = (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
      }}
    >
      <Box
        component="img"
        src="/icon.svg"
        alt="Koiro logo"
        sx={{
          width: { xs: 32, md: 40 },
          height: { xs: 32, md: 40 },
          borderRadius: '50%',
        }}
      />
      <Typography
        variant="h5"
        sx={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: { xs: 22, md: 29 },
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        Koiro
      </Typography>
    </Stack>
  );

  if (isHome) {
    return (
      <div style={{ cursor: 'pointer' }} aria-label="Home">
        {content}
      </div>
    );
  }

  return (
    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}
