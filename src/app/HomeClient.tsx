"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SongCard, { type SongCardData } from "@/app/components/SongCard";

type SongCard = SongCardData;

type PlaylistCard = {
  id: string;
  name: string;
  description: string;
  songCount: number;
  coverUrl: string | null;
};

export default function HomeClient() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [featuredSongs, setFeaturedSongs] = useState<SongCard[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<PlaylistCard[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  const fetchRandomSongs = async () => {
    setLoadingSongs(true);
    try {
      const res = await fetch("/api/songs/random?limit=3");
      if (res.ok) {
        const data = await res.json();
        setFeaturedSongs(data.songs);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSongs(false);
    }
  };

  const fetchRandomPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const res = await fetch("/api/playlists/random?limit=4");
      if (res.ok) {
        const data = await res.json();
        setFeaturedPlaylists(data.playlists);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    fetchRandomSongs();
    fetchRandomPlaylists();
  }, []);

  const handleSearch = () => {
    const q = inputValue.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Box component="main" sx={{ pb: 10 }}>
      {/* 搜索区域 */}
      <Container maxWidth="sm" sx={{ pt: 8, pb: 6 }}>
        <Stack spacing={4} alignItems="center">
          {/* 标题：「声の色」with ruby annotations */}
          <Box
            component="h1"
            sx={{
              fontSize: { xs: 48, sm: 60, md: 72 },
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "text.primary",
              m: 0,
              textAlign: "center",
              fontFamily: 'var(--font-jp-display), "Noto Serif SC", Georgia, "Times New Roman", serif',
              display: "flex",
              alignItems: "flex-end", // 底部对齐
            }}
          >
            <Box component="span" sx={{ lineHeight: 1 }}>「</Box>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "translateY(4px)", // 声往下移
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: "0.4em",
                  fontWeight: 900,
                  color: "text.secondary",
                  letterSpacing: "0.1em",
                  mb: -2.2, // 假名离汉字更近
                }}
              >
                こえ
              </Box>
              <Box component="span">声</Box>
            </Box>
            <Box component="span" sx={{ mx: 0.2, lineHeight: 1, transform: "translateY(-10px)" }}>
              の
            </Box>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                transform: "translateY(4px)", // 色往下移
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: "0.4em",
                  fontWeight: 900,
                  color: "text.secondary",
                  letterSpacing: "0.1em",
                  mb: -2.2, // 假名离汉字更近
                }}
              >
                いろ
              </Box>
              <Box component="span">色</Box>
            </Box>
            <Box component="span" sx={{ lineHeight: 1 }}>」</Box>
          </Box>

          {/* 搜索框 */}
          <TextField
            id="home-search"
            fullWidth
            placeholder="搜索歌曲、Staff 或歌词..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 6,
                  bgcolor: "background.paper",
                  fontSize: 18,
                  py: 0.5,
                  "&:hover": {
                    boxShadow: 1,
                  },
                  "&.Mui-focused": {
                    boxShadow: 2,
                  },
                },
              },
            }}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "divider",
              },
            }}
          />
        </Stack>
      </Container>

      {/* 随机歌单 */}
      <Container sx={{ pt: 2 }}>
        <Card variant="outlined">
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.3}>
                  <Typography variant="h6">随机歌单</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {featuredPlaylists.length} 个
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button component={Link} href="/playlists" size="small" variant="text">
                    全部歌单
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={fetchRandomPlaylists}
                    disabled={loadingPlaylists}
                  >
                    换一批
                  </Button>
                </Stack>
              </Stack>
              <Divider />
              {loadingPlaylists ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  加载中...
                </Typography>
              ) : featuredPlaylists.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  暂无歌单
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(3, 1fr)",
                      md: "repeat(4, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  {featuredPlaylists.map((playlist) => (
                    <Card
                      key={playlist.id}
                      variant="outlined"
                      sx={{
                        height: "100%",
                        transition: "border-color 0.2s",
                        "&:hover": { borderColor: "primary.main" },
                      }}
                    >
                      <CardActionArea component={Link} href={`/playlists/${playlist.id}`} sx={{ height: "100%" }}>
                        {playlist.coverUrl ? (
                            <CardMedia
                              component="img"
                              image={playlist.coverUrl}
                              alt={playlist.name}
                              sx={{ aspectRatio: "1", objectFit: "cover" }}
                            />
                          ) : (
                            <Box
                              sx={{
                                aspectRatio: "1",
                                bgcolor: "action.hover",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Typography variant="h4" color="text.disabled">
                                ♪
                              </Typography>
                            </Box>
                          )}
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="subtitle2" noWrap title={playlist.name}>
                              {playlist.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {playlist.songCount} 首
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                  ))}
                </Box>
              )}
            </Stack>
          </Box>
        </Card>
      </Container>

      {/* 随机音乐 */}
      <Container sx={{ pt: 2 }}>
        <Card variant="outlined">
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.3}>
                  <Typography variant="h6">随机音乐</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {featuredSongs.length} 首
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button component={Link} href="/songs" size="small" variant="text">
                    全部歌曲
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={fetchRandomSongs}
                    disabled={loadingSongs}
                  >
                    换一批
                  </Button>
                </Stack>
              </Stack>
              <Divider />
              {loadingSongs ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  加载中...
                </Typography>
              ) : featuredSongs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  暂无歌曲
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {featuredSongs.map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
