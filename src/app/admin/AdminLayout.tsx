"use client";

import { ReactNode } from "react";
import {
  Box,
  ButtonBase,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PeopleIcon from "@mui/icons-material/People";
import Link from "next/link";

type Tab = "playlists" | "songs" | "users";

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: Tab;
}

export default function AdminLayout({ children, activeTab }: AdminLayoutProps) {
  const tabs: { key: Tab; label: string; href: string; icon: ReactNode }[] = [
    { key: "playlists", label: "歌单", href: "/admin", icon: <QueueMusicIcon sx={{ mr: 1, fontSize: 20 }} /> },
    { key: "songs", label: "歌曲", href: "/admin/songs", icon: <MusicNoteIcon sx={{ mr: 1, fontSize: 20 }} /> },
    { key: "users", label: "用户", href: "/admin/users", icon: <PeopleIcon sx={{ mr: 1, fontSize: 20 }} /> },
  ];

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container maxWidth="lg" sx={{ pt: 6 }}>
        <Typography variant="h4" gutterBottom>
          管理后台
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {tabs.map((tab) => (
            <Link key={tab.key} href={tab.href} style={{ textDecoration: "none" }}>
              <ButtonBase
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: activeTab === tab.key ? "primary.main" : "divider",
                  bgcolor: activeTab === tab.key ? "primary.main" : "transparent",
                  color: activeTab === tab.key ? "primary.contrastText" : "text.primary",
                  transition: "all 0.2s",
                }}
              >
                {tab.icon}
                <Typography variant="button">{tab.label}</Typography>
              </ButtonBase>
            </Link>
          ))}
        </Stack>

        <Box>{children}</Box>
      </Container>
    </Box>
  );
}
