"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import ImageUploadField from "../components/ImageUploadField";

interface Playlist {
  id: string;
  name: string;
  description: string;
  coverObjectId: string;
  songCount: number;
  updatedAt: string;
}

type PlaylistDraft = {
  name: string;
  coverObjectId: string;
  description: string;
};

export default function PlaylistsManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<PlaylistDraft>({
    name: "",
    coverObjectId: "",
    description: "",
  });

  const [editDraft, setEditDraft] = useState<PlaylistDraft>({
    name: "",
    coverObjectId: "",
    description: "",
  });

  const fetchPlaylists = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists?q=${encodeURIComponent(q)}&page=${p}`);
      if (!res.ok) throw new Error("获取播放列表失败");
      const data = await res.json();
      setPlaylists(data.playlists);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists(keyword, page);
  }, [fetchPlaylists, keyword, page]);

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

  const handleCreate = async () => {
    if (!draft.name.trim() || !draft.coverObjectId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      setDraft({ name: "", coverObjectId: "", description: "" });
      setCreateOpen(false);
      fetchPlaylists(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditDraft({
      name: playlist.name,
      coverObjectId: playlist.coverObjectId,
      description: playlist.description,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingPlaylist || !editDraft.name.trim() || !editDraft.coverObjectId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }
      setEditOpen(false);
      setEditingPlaylist(null);
      fetchPlaylists(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/playlists/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchPlaylists(keyword, page);
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
                播放列表 ({total})
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ width: { xs: "100%", md: "auto" } }}>
                <TextField
                  size="small"
                  placeholder="搜索播放列表"
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
                  fullWidth
                  sx={{ minWidth: { md: 220 } }}
                />
                <Button variant="contained" onClick={() => setCreateOpen(true)} fullWidth>
                  新建播放列表
                </Button>
              </Stack>
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : playlists.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                暂无播放列表
              </Typography>
            ) : (
              <>
                {playlists.map((list) => (
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
                        <Button size="small" variant="outlined" onClick={() => openEdit(list)}>
                          编辑
                        </Button>
                        <Button component={Link} href={`/admin/playlists/${list.id}`} size="small" variant="text">
                          管理
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget(list);
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

      {/* 新建播放列表对话框 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>新建播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="播放列表名称"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <ImageUploadField
              label="封面图片"
              objectId={draft.coverObjectId || null}
              onObjectIdChange={(value) => setDraft((prev) => ({ ...prev, coverObjectId: value ?? "" }))}
            />
            <TextField
              label="简介"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !draft.name.trim() || !draft.coverObjectId}
          >
            {submitting ? "创建中..." : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑播放列表对话框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>编辑播放列表</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="播放列表名称"
              value={editDraft.name}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <ImageUploadField
              label="封面图片"
              objectId={editDraft.coverObjectId || null}
              onObjectIdChange={(value) => setEditDraft((prev) => ({ ...prev, coverObjectId: value ?? "" }))}
            />
            <TextField
              label="简介"
              value={editDraft.description}
              onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={submitting || !editDraft.name.trim() || !editDraft.coverObjectId}
          >
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除播放列表「{deleteTarget?.name}」吗？此操作不可撤销。
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
