"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
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

type SongCard = {
  id: string;
  title: string;
  description: string;
  staff: { role: string; name: string }[];
  audioVersions: Record<string, string>;
  coverUrl: string | null;
};

export default function HomeClient() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [featuredSongs, setFeaturedSongs] = useState<SongCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRandomSongs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/songs/random?limit=3");
      if (res.ok) {
        const data = await res.json();
        setFeaturedSongs(data.songs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomSongs();
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
              fontFamily: '"Noto Serif JP", "Noto Serif SC", Georgia, "Times New Roman", serif',
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
                  mb: -3, // 假名离汉字更近
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
                  mb: -3, // 假名离汉字更近
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

      {/* 随机推荐 */}
      <Container sx={{ pt: 2 }}>
        <Card variant="outlined">
          <Box sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.3}>
                  <Typography variant="h6">随机推荐</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {featuredSongs.length} 首
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={fetchRandomSongs}
                  disabled={loading}
                >
                  刷新推荐
                </Button>
              </Stack>
              <Divider />
              {loading ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  加载中...
                </Typography>
              ) : featuredSongs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  暂无歌曲
                </Typography>
              ) : (
                featuredSongs.map((song) => (
                  <Box key={song.id}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "120px 1fr",
                          md: "120px 1fr 180px",
                        },
                        gap: 2,
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: "100%",
                          height: 72,
                          borderRadius: 1,
                          background: song.coverUrl
                            ? `url(${song.coverUrl}) center/cover no-repeat`
                            : "linear-gradient(135deg, #f3efe7, #e8dfd1)",
                        }}
                      />
                      <Stack spacing={0.6}>
                        <Typography variant="subtitle1">{song.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {song.description}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {(song.staff ?? []).map((item) => (
                            <Chip
                              key={`${item.role}-${item.name}`}
                              label={`${item.role} · ${item.name}`}
                              size="small"
                            />
                          ))}
                        </Stack>
                      </Stack>
                      <Stack
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "flex-end" }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {Object.keys(song.audioVersions ?? {}).length} 版本
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Link href={`/songs/${song.id}`}>
                            <Button size="small">详情</Button>
                          </Link>
                        </Stack>
                      </Stack>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
