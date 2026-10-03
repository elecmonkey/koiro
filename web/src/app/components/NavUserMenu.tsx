import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthContext';
import { Box, Button, Stack, Typography } from '@mui/material';

type NavUserMenuProps = {
  user?: {
    email?: string | null;
    displayName?: string | null;
    permissions?: number;
  } | null;
};

export default function NavUserMenu({ user }: NavUserMenuProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Button component={Link} to="/login" variant="outlined" size="small">
          登录
        </Button>
      </Box>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        display: { xs: 'none', md: 'flex' },
      }}
    >
      <Box
        component={Link}
        to="/profile"
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Typography variant="body2">
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            已登录 - {user.displayName ?? user.email ?? '(未设置昵称)'}
          </Typography>
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
          }}
        >
          {user.email}
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          await logout();
          void navigate('/login');
        }}
      >
        退出
      </Button>
    </Stack>
  );
}
