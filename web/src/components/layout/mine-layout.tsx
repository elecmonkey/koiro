import type { ReactNode } from 'react';
import { Box, ButtonBase, Container, Stack, Typography } from '@mui/material';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { Link } from 'react-router';

type Tab = 'playlists' | 'songs';

interface MineLayoutProps {
  children: ReactNode;
  activeTab: Tab;
}

/** 「我的」页面的外壳：歌曲/歌单两个 tab。看到的内容按权限自然收窄——
 * 非 ADMIN 只有自己创建的，ADMIN 是全部，页面本身不用关心这个区别 */
export function MineLayout({ children, activeTab }: MineLayoutProps) {
  const tabs: { key: Tab; label: string; href: string; icon: ReactNode }[] = [
    {
      key: 'songs',
      label: '歌曲',
      href: '/mine/songs',
      icon: <MusicNoteIcon sx={{ mr: 1, fontSize: 20 }} />,
    },
    {
      key: 'playlists',
      label: '歌单',
      href: '/mine/playlists',
      icon: <QueueMusicIcon sx={{ mr: 1, fontSize: 20 }} />,
    },
  ];

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container maxWidth="lg" sx={{ pt: 6 }}>
        <Typography variant="h4" gutterBottom>
          我的
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {tabs.map((tab) => (
            <ButtonBase
              key={tab.key}
              component={Link}
              to={tab.href}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: activeTab === tab.key ? 'primary.main' : 'divider',
                bgcolor: activeTab === tab.key ? 'primary.main' : 'transparent',
                color:
                  activeTab === tab.key
                    ? 'primary.contrastText'
                    : 'text.primary',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              <Typography variant="button">{tab.label}</Typography>
            </ButtonBase>
          ))}
        </Stack>

        <Box>{children}</Box>
      </Container>
    </Box>
  );
}
