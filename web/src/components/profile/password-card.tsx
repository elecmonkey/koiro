import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { useLogout, useUpdateProfile } from '@/query';

const MIN_PASSWORD_LENGTH = 6;
/** 改密码成功后过多久退出登录 */
const LOGOUT_DELAY_MS = 3000;

/** 修改登录密码；成功后退出登录，让用户用新密码重新登录 */
export function PasswordCard() {
  const update = useUpdateProfile();
  const logout = useLogout();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  };

  const submit = async () => {
    if (!current) return setError('请输入当前密码');
    if (next.length < MIN_PASSWORD_LENGTH)
      return setError(`新密码至少 ${String(MIN_PASSWORD_LENGTH)} 位`);
    if (next !== confirm) return setError('两次输入的新密码不一致');
    setError(null);
    try {
      await update.mutateAsync({ password: { current, new: next } });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
      return;
    }
    reset();
    setDone(true);
    setTimeout(() => {
      void logout.mutateAsync().then(() => navigate('/login'));
    }, LOGOUT_DELAY_MS);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          安全设置
        </Typography>
        {done && (
          <Alert severity="success" sx={{ mb: 2 }}>
            密码更新成功，请重新登录
          </Alert>
        )}
        {open ? (
          <Stack spacing={2}>
            <TextField
              type="password"
              size="small"
              fullWidth
              label="当前密码"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={update.isPending}
            />
            <TextField
              type="password"
              size="small"
              fullWidth
              label={`新密码（至少${String(MIN_PASSWORD_LENGTH)}位）`}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={update.isPending}
            />
            <TextField
              type="password"
              size="small"
              fullWidth
              label="确认新密码"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={update.isPending}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={submit}
                disabled={update.isPending}
              >
                {update.isPending ? '提交中...' : '确认修改'}
              </Button>
              <Button
                variant="outlined"
                onClick={reset}
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              修改登录密码
            </Typography>
            <Button size="small" onClick={() => setOpen(true)}>
              修改密码
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
