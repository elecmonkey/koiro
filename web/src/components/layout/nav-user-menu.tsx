import { useState, type MouseEvent } from 'react';
import type { User } from '@koiro/shared';
import { hasPermission } from '@koiro/shared';
import { Link, useNavigate } from 'react-router';
import { useLogout } from '@/query';
import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

type NavUserMenuProps = {
  user: User | null;
};

/** 桌面端右上角的账号入口：「你好，{name}」，点开是我的音乐 / 用户管理 / 个人中心 / 退出登录 */
export function NavUserMenu({ user }: NavUserMenuProps) {
  const logout = useLogout();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!user) {
    return (
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Button component={Link} to="/login" variant="outlined" size="small">
          登录
        </Button>
      </Box>
    );
  }

  const close = () => setAnchorEl(null);

  return (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <Button
        onClick={(event: MouseEvent<HTMLElement>) =>
          setAnchorEl(event.currentTarget)
        }
        size="small"
        color="inherit"
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
      >
        你好，{user.displayName}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        slotProps={{
          paper: { sx: { width: anchorEl?.offsetWidth } },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            {user.email}
          </Typography>
        </Box>
        <Divider />
        {hasPermission(user, 'upload') && (
          <MenuItem component={Link} to="/mine/songs" onClick={close}>
            我的音乐
          </MenuItem>
        )}
        {hasPermission(user, 'admin') && (
          <MenuItem component={Link} to="/admin" onClick={close}>
            用户管理
          </MenuItem>
        )}
        <MenuItem component={Link} to="/profile" onClick={close}>
          个人中心
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={async () => {
            close();
            await logout.mutateAsync();
            void navigate('/login');
          }}
        >
          退出登录
        </MenuItem>
      </Menu>
    </Box>
  );
}
