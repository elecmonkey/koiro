import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  PERMISSIONS,
  type Page,
  type Permission,
  type User,
  type UserInput,
  type UserPatch,
} from '@koiro/shared';
import { api, withQuery } from '@/lib/api';

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** 切换一项权限，结果保持固定顺序 */
function toggle(list: readonly Permission[], permission: Permission) {
  return ALL_PERMISSIONS.filter((item) =>
    item === permission ? !list.includes(item) : list.includes(item),
  );
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 编辑权限对话框
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);

  // 删除确认对话框
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // 新建用户对话框
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPermissions, setCreatePermissions] = useState<Permission[]>([
    'view',
  ]);

  // 重置密码对话框
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // 编辑昵称对话框
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameTarget, setEditNameTarget] = useState<User | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Page<User>>(
        withQuery('/api/users', { q, page: p }),
      );
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(keyword, page);
  }, [fetchUsers, keyword, page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const handleSearch = () => {
    const q = inputValue.trim();
    setKeyword(q);
    setPage(1);
  };

  const handleClear = () => {
    setInputValue('');
    setKeyword('');
    setPage(1);
  };

  const openEditDialog = (user: User) => {
    setEditTarget(user);
    setEditPermissions(user.permissions);
    setEditOpen(true);
  };

  const handleTogglePermission = (permission: Permission) => {
    setEditPermissions((prev) => toggle(prev, permission));
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        json: { permissions: editPermissions } satisfies UserPatch,
      });
      setEditOpen(false);
      setEditTarget(null);
      void fetchUsers(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchUsers(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 新建用户
  const handleCreate = async () => {
    if (!createEmail.trim() || !createPassword) return;
    setSubmitting(true);
    try {
      await api('/api/users', {
        method: 'POST',
        json: {
          email: createEmail.trim(),
          displayName: createDisplayName.trim() || createEmail.trim(),
          password: createPassword,
          permissions: createPermissions,
        } satisfies UserInput,
      });
      setCreateOpen(false);
      setCreateEmail('');
      setCreateDisplayName('');
      setCreatePassword('');
      setCreatePermissions(['view']);
      void fetchUsers(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 重置密码
  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    setSubmitting(true);
    try {
      await api(`/api/users/${resetTarget.id}`, {
        method: 'PATCH',
        json: { password: resetPassword } satisfies UserPatch,
      });
      setResetOpen(false);
      setResetTarget(null);
      setResetPassword('');
      alert('密码已重置');
    } catch (err) {
      alert(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 编辑昵称
  const handleEditDisplayName = async () => {
    if (!editNameTarget || !editDisplayName.trim()) return;
    setSubmitting(true);
    try {
      await api(`/api/users/${editNameTarget.id}`, {
        method: 'PATCH',
        json: { displayName: editDisplayName.trim() } satisfies UserPatch,
      });
      setEditNameOpen(false);
      setEditNameTarget(null);
      setEditDisplayName('');
      void fetchUsers(keyword, page);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失败');
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
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                alignItems: { md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h6">用户 ({total})</Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  alignItems: { sm: 'center' },
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                <TextField
                  size="small"
                  placeholder="搜索用户"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
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
                <Button
                  variant="contained"
                  onClick={() => setCreateOpen(true)}
                  fullWidth
                >
                  新建用户
                </Button>
              </Stack>
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : users.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  py: 4,
                  textAlign: 'center',
                }}
              >
                暂无用户
              </Typography>
            ) : (
              <>
                {users.map((user) => (
                  <Box key={user.id}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Box
                        sx={{
                          flex: 1,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {user.displayName}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {user.email}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          useFlexGap
                          sx={{
                            flexWrap: 'wrap',
                            mt: 0.5,
                          }}
                        >
                          {user.permissions.map((permission) => (
                            <Chip
                              key={permission}
                              label={PERMISSIONS[permission]}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            mt: 0.5,
                          }}
                        >
                          创建于 {formatDate(user.createdAt)}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: 'center',
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditDialog(user)}
                        >
                          权限
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setEditNameTarget(user);
                            setEditDisplayName(user.displayName);
                            setEditNameOpen(true);
                          }}
                        >
                          昵称
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setResetTarget(user);
                            setResetPassword('');
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
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}
                  >
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
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
            }}
          >
            用户: {editTarget?.displayName} ({editTarget?.email})
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: 'wrap',
            }}
          >
            {ALL_PERMISSIONS.map((permission) => (
              <Chip
                key={permission}
                label={PERMISSIONS[permission]}
                color={
                  editPermissions.includes(permission) ? 'primary' : 'default'
                }
                variant={
                  editPermissions.includes(permission) ? 'filled' : 'outlined'
                }
                onClick={() => handleTogglePermission(permission)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleEdit}
            disabled={submitting}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除用户「{deleteTarget?.displayName}」（{deleteTarget?.email}
            ）吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建用户对话框 */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="xs"
      >
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
              label="昵称"
              type="text"
              value={createDisplayName}
              onChange={(e) => setCreateDisplayName(e.target.value)}
              fullWidth
              helperText="留空则默认为邮箱"
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
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                权限
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap: 'wrap',
                }}
              >
                {ALL_PERMISSIONS.map((permission) => (
                  <Chip
                    key={permission}
                    label={PERMISSIONS[permission]}
                    color={
                      createPermissions.includes(permission)
                        ? 'primary'
                        : 'default'
                    }
                    variant={
                      createPermissions.includes(permission)
                        ? 'filled'
                        : 'outlined'
                    }
                    onClick={() =>
                      setCreatePermissions((prev) => toggle(prev, permission))
                    }
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
            disabled={
              submitting || !createEmail.trim() || createPassword.length < 6
            }
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>重置密码</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              用户: {resetTarget?.displayName} ({resetTarget?.email})
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
            {submitting ? '重置中...' : '重置密码'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑昵称对话框 */}
      <Dialog
        open={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>编辑昵称</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              用户: {editNameTarget?.email}
            </Typography>
            <TextField
              label="昵称"
              type="text"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              fullWidth
              required
              helperText="昵称不能为空"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditNameOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleEditDisplayName}
            disabled={submitting || !editDisplayName.trim()}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
