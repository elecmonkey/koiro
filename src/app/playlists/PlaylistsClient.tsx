"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

type Playlist = {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  songCount: number;
  updatedAt: string;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function PlaylistsClient() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);

  const fetchPlaylists = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/public?page=${p}`);
      if (!res.ok) throw new Error("获取播放列表失败");
      const data = await res.json();
      setPlaylists(data.playlists);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists(page);
  }, [fetchPlaylists, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">播放列表</Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : playlists.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
            暂无播放列表
          </Typography>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(4, 1fr)",
                  lg: "repeat(5, 1fr)",
                },
                gap: 2,
              }}
            >
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/playlists/${playlist.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      transition: "border-color 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                      },
                    }}
                  >
                    <CardActionArea sx={{ height: "100%" }}>
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
                        <Typography
                          variant="subtitle2"
                          noWrap
                          title={playlist.name}
                        >
                          {playlist.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {playlist.songCount} 首歌曲
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Link>
              ))}
            </Box>

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
