"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Link from "next/link";

interface Song {
  id: string;
  title: string;
  description: string;
  staff: { role?: string; name?: string | string[] }[];
  coverObjectId: string | null;
  audioVersions: Record<string, string>;
  lyricsCount: number;
  updatedAt: string;
}

export default function SongsManager() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSongs = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}&page=${p}`);
      if (!res.ok) throw new Error("获取歌曲列表失败");
      const data = await res.json();
      setSongs(data.songs);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongs(keyword, page);
  }, [fetchSongs, keyword, page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const handleSearch = () => {
    const q = inputValue.trim();
    setKeyword(q);
    setPage(1);
  };

  const handleClear = () => {
    setInputValue("");
    setKeyword("");
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/songs/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchSongs(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="float-in" variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ md: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="h6">
                歌曲 ({total})
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="搜索歌曲"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  slotProps={{
                    input: {
                      endAdornment: inputValue ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={handleClear}
                            aria-label="clear search"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  sx={{ minWidth: { xs: "100%", md: 220 } }}
                />
                <Link href="/upload">
                  <Button variant="contained">上传新歌曲</Button>
                </Link>
              </Stack>
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : songs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                暂无歌曲
              </Typography>
            ) : (
              <>
                {songs.map((song) => (
                  <Box key={song.id}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1">{song.title}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                          <Typography variant="caption" color="text.secondary">
                            {Object.keys(song.audioVersions || {}).length} 个音频版本
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            · {song.lyricsCount} 份歌词
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            · 更新于 {formatDate(song.updatedAt)}
                          </Typography>
                        </Stack>
                        {Array.isArray(song.staff) && song.staff.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            {song.staff.map((s, idx) => (
                              <Chip
                                key={idx}
                                label={`${s.role || "Staff"} · ${Array.isArray(s.name) ? s.name.join("、") : (s.name || "")}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button component={Link} href={`/songs/${song.id}/edit`} size="small" variant="outlined">
                          编辑
                        </Button>
                        <Button component={Link} href={`/songs/${song.id}`} size="small" variant="text">
                          查看
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget(song);
                            setDeleteOpen(true);
                          }}
                        >
                          删除
                        </Button>
                      </Stack>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                  </Box>
                ))}
                {totalPages > 1 && (
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_e, v) => setPage(v)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除歌曲「{deleteTarget?.title}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={submitting}>
            {submitting ? "删除中..." : "删除"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
