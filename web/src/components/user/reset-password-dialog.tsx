import { useState } from 'react';
import type { User } from '@koiro/shared';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useUpdateUser } from '@/query';

const MIN_PASSWORD_LENGTH = 6;

/** 重置一个用户的密码 */
export function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: User;
  onClose: () => void;
  /** 重置成功后调用，用于在列表页提示 */
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const update = useUpdateUser();

  const submit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) return;
    update.mutate({ id: user.id, patch: { password } }, { onSuccess: onDone });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>重置密码</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            用户: {user.displayName} ({user.email})
          </Typography>
          <TextField
            label="新密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            helperText={`至少 ${String(MIN_PASSWORD_LENGTH)} 位`}
          />
          {update.error && (
            <Alert severity="error">{update.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={update.isPending}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={update.isPending || password.length < MIN_PASSWORD_LENGTH}
        >
          {update.isPending ? '重置中...' : '重置密码'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
