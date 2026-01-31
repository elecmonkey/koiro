"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const PAGE_SIZE = 10;

interface User {
  id: string;
  email: string;
  permissions: number;
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "VIEW" },
  { value: 2, label: "DOWNLOAD" },
  { value: 4, label: "UPLOAD" },
  { value: 8, label: "ADMIN" },
];

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // 编辑权限对话框
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<number>(0);

  // 删除确认对话框
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // 新建用户对话框
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPermissions, setCreatePermissions] = useState(1); // 默认 VIEW

  // 重置密码对话框
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("获取用户列表失败");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const getPermissionLabels = (permissions: number) => {
    const labels: string[] = [];
    for (const { value, label } of PERMISSION_LABELS) {
      if (permissions & value) {
        labels.push(label);
      }
    }
    return labels;
  };

  const openEditDialog = (user: User) => {
    setEditTarget(user);
    setEditPermissions(user.permissions);
    setEditOpen(true);
  };

  const handleTogglePermission = (value: number) => {
    setEditPermissions((prev) => prev ^ value);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPermissions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失败");
      }
      setEditOpen(false);
      setEditTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 新建用户
  const handleCreate = async () => {
    if (!createEmail.trim() || !createPassword) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword,
          permissions: createPermissions,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }
      setCreateOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreatePermissions(1);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 重置密码
  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "重置失败");
      }
      setResetOpen(false);
      setResetTarget(null);
      setResetPassword("");
      alert("密码已重置");
    } catch (err) {
      alert(err instanceof Error ? err.message : "重置失败");
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
                用户 ({users.length})
              </Typography>
              <Button variant="contained" onClick={() => setCreateOpen(true)}>
                新建用户
              </Button>
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : users.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                暂无用户
              </Typography>
            ) : (
              <>
                {paginatedUsers.map((user) => (
                  <Box key={user.id}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <Box flex={1}>
                        <Typography variant="subtitle1">{user.email}</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                          {getPermissionLabels(user.permissions).map((label) => (
                            <Chip key={label} label={label} size="small" variant="outlined" />
                          ))}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          创建于 {formatDate(user.createdAt)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" variant="outlined" onClick={() => openEditDialog(user)}>
                          权限
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setResetTarget(user);
                            setResetPassword("");
                            setResetOpen(true);
                          }}
                        >
                          重置密码
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteTarget(user);
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

      {/* 编辑权限对话框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>编辑权限</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            用户: {editTarget?.email}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {PERMISSION_LABELS.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                color={(editPermissions & value) ? "primary" : "default"}
                variant={(editPermissions & value) ? "filled" : "outlined"}
                onClick={() => handleTogglePermission(value)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除用户「{deleteTarget?.email}」吗？此操作不可撤销。
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

      {/* 新建用户对话框 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>新建用户</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="邮箱"
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="密码"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              fullWidth
              required
              helperText="至少 6 位"
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                权限
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {PERMISSION_LABELS.map(({ value, label }) => (
                  <Chip
                    key={value}
                    label={label}
                    color={(createPermissions & value) ? "primary" : "default"}
                    variant={(createPermissions & value) ? "filled" : "outlined"}
                    onClick={() => setCreatePermissions((prev) => prev ^ value)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !createEmail.trim() || createPassword.length < 6}
          >
            {submitting ? "创建中..." : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>重置密码</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              用户: {resetTarget?.email}
            </Typography>
            <TextField
              label="新密码"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              fullWidth
              required
              helperText="至少 6 位"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={submitting || resetPassword.length < 6}
          >
            {submitting ? "重置中..." : "重置密码"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
