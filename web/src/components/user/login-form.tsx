import { useState } from 'react';
import { useAuth } from '@/stores/session';
import { ApiError } from '@/lib/api';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export default function LoginForm() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttlDays, setTtlDays] = useState('7');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formValue(formData, 'email').trim();
    const password = formValue(formData, 'password');

    try {
      await login(email, password, Number(ttlDays));
    } catch (err) {
      setLoading(false);
      setError(err instanceof ApiError ? err.message : '登录失败，请稍后重试');
      return;
    }

    // 登录成功后由登录页统一跳转（见 page.tsx）
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 10 }}>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={3} component="form" onSubmit={handleSubmit}>
              <Stack spacing={1}>
                <Typography variant="h4">登录 Koiro</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  label="邮箱"
                  name="email"
                  placeholder="you@example.com"
                  fullWidth
                  required
                />
                <TextField
                  label="密码"
                  name="password"
                  type="password"
                  fullWidth
                  required
                />
                <TextField
                  select
                  label="有效期"
                  value={ttlDays}
                  onChange={(event) => setTtlDays(event.target.value)}
                >
                  <MenuItem value="1">1 天</MenuItem>
                  <MenuItem value="7">7 天</MenuItem>
                  <MenuItem value="30">30 天</MenuItem>
                  <MenuItem value="180">180 天</MenuItem>
                </TextField>
              </Stack>
              {error ? (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              ) : null}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}
