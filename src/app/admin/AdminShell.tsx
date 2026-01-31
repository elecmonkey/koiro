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
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import ImageUploadField from "../components/ImageUploadField";

// 类型定义
interface Playlist {
  id: string;
  name: string;
  description: string;
  coverObjectId: string;
  songCount: number;
  updatedAt: string;
}

interface Song {
  id: string;
  title: string;
  description: string;
  staff: { role?: string; name?: string }[];
  coverObjectId: string | null;
  audioVersions: Record<string, string>;
  audioDefaultName: string | null;
  lyricsCount: number;
  updatedAt: string;
}

type PlaylistDraft = {
  name: string;
  coverObjectId: string;
  description: string;
};

export default function AdminShell() {
  const [view, setView] = useState<"playlists" | "songs">("playlists");
  
  // 播放列表状态
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  
  // 歌曲状态
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  
  // 对话框状态
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "playlist" | "song"; id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // 播放列表草稿
  const [playlistDraft, setPlaylistDraft] = useState<PlaylistDraft>({
    name: "",
    coverObjectId: "",
    description: "",
  });

  // 获取播放列表
  const fetchPlaylists = useCallback(async () => {
    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const res = await fetch("/api/playlists");
      if (!res.ok) throw new Error("获取播放列表失败");
      const data = await res.json();
      setPlaylists(data.playlists);
    } catch (err) {
      setPlaylistsError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setPlaylistsLoading(false);
    }
  }, []);

  // 获取歌曲
  const fetchSongs = useCallback(async () => {
    setSongsLoading(true);
    setSongsError(null);
    try {
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error("获取歌曲列表失败");
      const data = await res.json();
      setSongs(data.songs);
    } catch (err) {
      setSongsError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setSongsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
    fetchSongs();
  }, [fetchPlaylists, fetchSongs]);

  // 创建播放列表
  const handleCreatePlaylist = async () => {
    if (!playlistDraft.name.trim() || !playlistDraft.coverObjectId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playlistDraft),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      setPlaylistDraft({ name: "", coverObjectId: "", description: "" });
      setCreatePlaylistOpen(false);
      fetchPlaylists();
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 删除确认
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const endpoint = deleteTarget.type === "playlist" 
        ? `/api/playlists/${deleteTarget.id}`
        : `/api/songs/${deleteTarget.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (deleteTarget.type === "playlist") {
        fetchPlaylists();
      } else {
        fetchSongs();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <Container sx={{ pt: 6 }}>
        <Stack spacing={1}>
          <Typography variant="h4">管理后台</Typography>
        </Stack>
      </Container>

      <Container sx={{ pt: 4 }}>
        <Stack spacing={3}>
          {/* 切换卡片 */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Card
              variant="outlined"
              sx={{
                flex: 1,
                cursor: "pointer",
                borderColor: view === "playlists" ? "primary.main" : "rgba(31, 26, 22, 0.12)",
              }}
              onClick={() => setView("playlists")}
            >
              <CardContent
                sx={{
                  minHeight: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" align="center">
                  播放列表管理
                </Typography>
              </CardContent>
            </Card>
            <Card
              variant="outlined"
              sx={{
                flex: 1,
                cursor: "pointer",
                borderColor: view === "songs" ? "primary.main" : "rgba(31, 26, 22, 0.12)",
              }}
              onClick={() => setView("songs")}
            >
              <CardContent
                sx={{
                  minHeight: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" align="center">
                  歌曲管理
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* 播放列表视图 */}
          {view === "playlists" && (
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
                      播放列表 ({playlists.length})
                    </Typography>
                    <Button variant="contained" onClick={() => setCreatePlaylistOpen(true)}>
                      新建播放列表
                    </Button>
                  </Stack>

                  {playlistsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : playlistsError ? (
                    <Alert severity="error">{playlistsError}</Alert>
                  ) : playlists.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                      暂无播放列表
                    </Typography>
                  ) : (
                    playlists.map((list) => (
                      <Box key={list.id}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <Box flex={1}>
                            <Typography variant="subtitle1">{list.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {list.songCount} 首 · 更新于 {formatDate(list.updatedAt)}
                            </Typography>
                            {list.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {list.description}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Button size="small" variant="outlined" disabled>
                              编辑
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteTarget({ type: "playlist", id: list.id, name: list.name });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              删除
                            </Button>
                          </Stack>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* 歌曲视图 */}
          {view === "songs" && (
            <Card className="float-in stagger-1" variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ md: "center" }}
                    justifyContent="space-between"
                  >
                    <Typography variant="h6">
                      歌曲 ({songs.length})
                    </Typography>
                    <Link href="/upload">
                      <Button variant="contained">上传新歌曲</Button>
                    </Link>
                  </Stack>

                  {songsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : songsError ? (
                    <Alert severity="error">{songsError}</Alert>
                  ) : songs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                      暂无歌曲
                    </Typography>
                  ) : (
                    songs.map((song) => (
                      <Box key={song.id}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <Box flex={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1">{song.title}</Typography>
                              {song.audioDefaultName && (
                                <Chip label={song.audioDefaultName} size="small" />
                              )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                              {song.description || "无描述"}
                            </Typography>
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
                                    label={`${s.role || "Staff"} · ${s.name || ""}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Link href={`/songs/${song.id}/edit`}>
                              <Button size="small" variant="outlined">
                                编辑
                              </Button>
                            </Link>
                            <Link href={`/songs/${song.id}`}>
                              <Button size="small" variant="text">
                                查看
                              </Button>
                            </Link>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteTarget({ type: "song", id: song.id, name: song.title });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              删除
                            </Button>
                          </Stack>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>

      {/* 新建播放列表对话框 */}
      <Dialog open={createPlaylistOpen} onClose={() => setCreatePlaylistOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>新建播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="播放列表名称"
              value={playlistDraft.name}
              onChange={(event) =>
                setPlaylistDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              fullWidth
              required
            />
            <ImageUploadField
              label="封面图片"
              objectId={playlistDraft.coverObjectId || null}
              onObjectIdChange={(value) =>
                setPlaylistDraft((prev) => ({ ...prev, coverObjectId: value ?? "" }))
              }
            />
            <TextField
              label="简介"
              value={playlistDraft.description}
              onChange={(event) =>
                setPlaylistDraft((prev) => ({ ...prev, description: event.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreatePlaylistOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePlaylist}
            disabled={submitting || !playlistDraft.name.trim() || !playlistDraft.coverObjectId}
          >
            {submitting ? "创建中..." : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除{deleteTarget?.type === "playlist" ? "播放列表" : "歌曲"}
            「{deleteTarget?.name}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={submitting}
          >
            {submitting ? "删除中..." : "删除"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
