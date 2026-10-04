import { useState } from 'react';
import { ApiError } from '@/http';
import { useLogin } from '@/query';
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
  const login = useLogin();
  const [ttlDays, setTtlDays] = useState('7');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // 登录成功后会话随之更新，由登录页统一跳转；失败的说明见下方 login.error
    await login
      .mutateAsync({
        email: formValue(formData, 'email').trim(),
        password: formValue(formData, 'password'),
        ttlDays: Number(ttlDays),
      })
      .catch(() => undefined);
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
              {login.error ? (
                <Typography variant="body2" color="error">
                  {login.error instanceof ApiError
                    ? login.error.message
                    : '登录失败，请稍后重试'}
                </Typography>
              ) : null}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={login.isPending}
              >
                {login.isPending ? '登录中...' : '登录'}
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
