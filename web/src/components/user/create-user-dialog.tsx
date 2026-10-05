import { useState } from 'react';
import type { Permission } from '@koiro/shared';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCreateUser } from '@/query';
import { PermissionPicker } from './permission-picker';

const MIN_PASSWORD_LENGTH = 6;

/** 新建用户 */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>(['view']);
  const create = useCreateUser();

  const submit = () => {
    if (!email.trim() || password.length < MIN_PASSWORD_LENGTH) return;
    create.mutate(
      {
        email: email.trim(),
        displayName: displayName.trim() || email.trim(),
        password,
        permissions,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>新建用户</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="昵称"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            helperText="留空则默认为邮箱"
          />
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            helperText={`至少 ${String(MIN_PASSWORD_LENGTH)} 位`}
          />
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              权限
            </Typography>
            <PermissionPicker value={permissions} onChange={setPermissions} />
          </Box>
          {create.error && (
            <Alert severity="error">{create.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={create.isPending}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={
            create.isPending ||
            !email.trim() ||
            password.length < MIN_PASSWORD_LENGTH
          }
        >
          {create.isPending ? '创建中...' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
