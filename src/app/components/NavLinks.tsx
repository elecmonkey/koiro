"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

type NavLinksProps = {
  permissions?: number;
  user?: {
    email?: string | null;
    displayName?: string | null;
    permissions?: number;
  } | null;
};

type NavItem = {
  label: string;
  href: string;
  permission?: number;
};

const navItems: NavItem[] = [
  { label: "搜索", href: "/search" },
  { label: "staff", href: "/staff" },
  { label: "歌单", href: "/playlists" },
  { label: "上传", href: "/upload", permission: PERMISSIONS.UPLOAD },
  { label: "管理", href: "/admin", permission: PERMISSIONS.ADMIN },
];

export default function NavLinks({ permissions = 0, user }: NavLinksProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission)
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
        alignItems="center"
        sx={{ display: { xs: "none", md: "flex" } }}
      >
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <Button variant="text" size="small">
              {item.label}
            </Button>
          </Link>
        ))}
      </Stack>

      {/* 移动端：汉堡菜单按钮 */}
      <Box sx={{ display: { xs: "flex", md: "none" } }}>
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
        PaperProps={{
          sx: { width: 240 },
        }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
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
                href={item.href}
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
              <Box>
                <Typography variant="body2">
                  <Typography component="span" variant="caption" color="text.secondary">
                    已登录 - {user.displayName ?? user.email ?? "(未设置昵称)"}
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {user.email}
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/profile"
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
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                退出登录
              </Button>
            </Stack>
          ) : (
            <Button
              component={Link}
              href="/login"
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
