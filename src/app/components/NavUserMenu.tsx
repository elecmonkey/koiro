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
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Button component={Link} href="/login" variant="outlined" size="small">
          登录
        </Button>
      </Box>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{ display: { xs: "none", md: "flex" } }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary">
          已登录
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {user.email ?? "(无邮箱)"}
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        退出
      </Button>
    </Stack>
  );
}