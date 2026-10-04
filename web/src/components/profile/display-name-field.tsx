import type { User } from '@koiro/shared';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useUpdateProfile } from '@/query';

/** 昵称：显示，或就地修改 */
export function DisplayNameField({ user }: { user: User }) {
  const update = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.displayName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!value.trim()) {
      setError('昵称不能为空');
      return;
    }
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ displayName: value });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  const cancel = () => {
    setEditing(false);
    setValue(user.displayName);
    setError(null);
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        昵称
      </Typography>
      {editing ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="请输入昵称"
            error={!!error}
            helperText={error}
            disabled={update.isPending}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              onClick={save}
              disabled={update.isPending}
            >
              {update.isPending ? '保存中...' : '保存'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={cancel}
              disabled={update.isPending}
            >
              取消
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="body1">{user.displayName}</Typography>
          <Button size="small" onClick={() => setEditing(true)}>
            修改
          </Button>
        </Stack>
      )}
      {saved && (
        <Alert severity="success" sx={{ mt: 1 }}>
          昵称更新成功
        </Alert>
      )}
    </Box>
  );
}
