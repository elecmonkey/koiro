"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

type Song = {
  id: string;
  title: string;
  description: string | null;
  staff: { role: string; name: string }[];
  coverUrl: string | null;
  updatedAt: string;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function SongsClient() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const fetchSongs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/public?page=${p}`);
      if (!res.ok) throw new Error("获取歌曲列表失败");
      const data = await res.json();
      setSongs(data.songs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs(page);
  }, [fetchSongs, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">全部歌曲</Typography>
          {pagination && (
            <Typography variant="body2" color="text.secondary">
              共 {pagination.total} 首歌曲
            </Typography>
          )}
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : songs.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
            暂无歌曲
          </Typography>
        ) : (
          <Stack spacing={2}>
            {songs.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                style={{ textDecoration: "none" }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    transition: "border-color 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardActionArea>
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        {/* 封面 */}
                        <Avatar
                          variant="rounded"
                          src={song.coverUrl || undefined}
                          sx={{ width: 56, height: 56, bgcolor: "action.hover" }}
                        >
                          ♪
                        </Avatar>

                        {/* 歌曲信息 */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" noWrap>
                            {song.title}
                          </Typography>
                          {song.description && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {song.description}
                            </Typography>
                          )}
                          {song.staff && song.staff.length > 0 && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ mt: 0.5 }}
                              flexWrap="wrap"
                              useFlexGap
                            >
                              {song.staff.slice(0, 3).map((s, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${s.role || "Staff"} · ${s.name || ""}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {song.staff.length > 3 && (
                                <Chip
                                  label={`+${song.staff.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Link>
            ))}

            {pagination && pagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
