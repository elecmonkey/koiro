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

/** 修改一个用户的昵称（管理员操作，与用户自己改昵称的 PasswordCard 无关） */
export function EditDisplayNameDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const update = useUpdateUser();

  const save = () => {
    if (!displayName.trim()) return;
    update.mutate(
      { id: user.id, patch: { displayName: displayName.trim() } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>编辑昵称</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            用户: {user.email}
          </Typography>
          <TextField
            label="昵称"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            required
            helperText="昵称不能为空"
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
          onClick={save}
          disabled={update.isPending || !displayName.trim()}
        >
          {update.isPending ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
