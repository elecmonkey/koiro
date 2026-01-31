"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Box, Button, Stack, Typography } from "@mui/material";

type NavUserMenuProps = {
  user?: {
    email?: string | null;
    permissions?: number;
  } | null;
};

export default function NavUserMenu({ user }: NavUserMenuProps) {
  if (!user) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" color="text.secondary">
          未登录
        </Typography>
        <Button component={Link} href="/login" variant="outlined" size="small">
          登录
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box>
        <Typography variant="caption" color="text.secondary">
          已登录
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {user.email ?? "(无邮箱)"}
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        退出
      </Button>
    </Stack>
  );
}
