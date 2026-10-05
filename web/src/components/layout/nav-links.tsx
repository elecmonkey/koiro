import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { hasPermission, type Permission, type User } from '@koiro/shared';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useLogout } from '@/query';

type NavLinksProps = {
  user: User | null;
};

type NavItem = {
  label: string;
  href: string;
  permission?: Permission;
};

const navItems: NavItem[] = [
  { label: '搜索', href: '/search', permission: 'view' },
  { label: 'staff', href: '/staff', permission: 'view' },
  { label: '语种', href: '/languages', permission: 'view' },
  { label: '歌曲', href: '/songs', permission: 'view' },
  { label: '歌单', href: '/playlists', permission: 'view' },
];

export function NavLinks({ user }: NavLinksProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logout = useLogout();
  const navigate = useNavigate();

  const visibleItems = navItems.filter(
    (item) =>
      !item.permission ||
      (user !== null && hasPermission(user, item.permission)),
  );

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  return (
    <>
      {/* 桌面端：水平按钮 */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          display: { xs: 'none', md: 'flex' },
        }}
      >
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="text" size="small">
              {item.label}
            </Button>
          </Link>
        ))}
      </Stack>

      {/* 移动端：汉堡菜单按钮 */}
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={toggleDrawer(true)}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      {/* 移动端：抽屉菜单 */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        slotProps={{
          paper: { sx: { width: 240 } },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={toggleDrawer(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {visibleItems.map((item) => (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={Link}
                to={item.href}
                onClick={toggleDrawer(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        {/* 用户信息和登录/退出 */}
        <Box sx={{ p: 2 }}>
          {user ? (
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <UserAvatar
                  id={user.id}
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {user.displayName}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: 'text.secondary',
                      display: 'block',
                    }}
                  >
                    {user.email}
                  </Typography>
                </Box>
              </Stack>
              {hasPermission(user, 'upload') && (
                <Button
                  component={Link}
                  to="/mine/songs"
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={toggleDrawer(false)}
                >
                  我的音乐
                </Button>
              )}
              {hasPermission(user, 'admin') && (
                <Button
                  component={Link}
                  to="/admin"
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={toggleDrawer(false)}
                >
                  用户管理
                </Button>
              )}
              <Button
                component={Link}
                to="/profile"
                variant="outlined"
                size="small"
                fullWidth
                onClick={toggleDrawer(false)}
              >
                个人中心
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={async () => {
                  setDrawerOpen(false);
                  await logout.mutateAsync();
                  void navigate('/login');
                }}
              >
                退出登录
              </Button>
            </Stack>
          ) : (
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="small"
              fullWidth
              onClick={toggleDrawer(false)}
            >
              登录
            </Button>
          )}
        </Box>
      </Drawer>
    </>
  );
}
