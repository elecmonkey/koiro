import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/stores/session';
import type { CliAuthorization, CliAuthorizeRequest } from '@koiro/shared';
import { api } from '@/lib/api';
import { pageTitle } from '@/utils/page-title';

/** 与后端相同的校验：只接受本机回环地址上的 /callback */
function parseRequest(params: URLSearchParams): CliAuthorizeRequest | null {
  const redirectUri = params.get('redirectUri') ?? '';
  const state = params.get('state') ?? '';
  const codeChallenge = params.get('codeChallenge') ?? '';
  if (!/^[0-9a-f]{64}$/.test(state)) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) return null;
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.pathname !== '/callback' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.href !== redirectUri
  ) {
    return null;
  }
  return { redirectUri, state, codeChallenge };
}

/** 即使接口返回成功，也确认回调地址确实指回命令行，再离开本站 */
function validCallback(callbackUrl: string, request: CliAuthorizeRequest) {
  let callback: URL;
  try {
    callback = new URL(callbackUrl);
  } catch {
    return false;
  }
  const expected = new URL(request.redirectUri);
  return (
    callback.origin === expected.origin &&
    callback.pathname === expected.pathname &&
    callback.username === '' &&
    callback.password === '' &&
    callback.hash === '' &&
    callback.searchParams.getAll('state').length === 1 &&
    callback.searchParams.getAll('code').length === 1 &&
    callback.searchParams.get('state') === request.state &&
    /^[0-9a-f]{64}$/.test(callback.searchParams.get('code') ?? '')
  );
}

export default function CliLoginPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = parseRequest(params);

  const approve = async () => {
    if (!request) return;
    setPending(true);
    setError(null);
    try {
      const { callbackUrl } = await api<CliAuthorization>(
        '/api/auth/cli/authorize',
        { method: 'POST', json: request },
      );
      if (!validCallback(callbackUrl, request)) {
        setError('无法完成命令行登录，请回到命令行重新发起。');
        setPending(false);
        return;
      }
      window.location.assign(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
      setPending(false);
    }
  };

  return (
    <Box component="main" sx={{ py: 10 }}>
      <title>{pageTitle('命令行登录')}</title>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={2}>
              <Typography variant="h4">命令行登录</Typography>
              {request ? (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    将以 {user?.displayName}（{user?.email}
                    ）的身份和权限登录本机的 Koiro 命令行，有效期 30
                    天。仅在你刚刚主动发起登录时继续。
                  </Typography>
                  {error && <Alert severity="error">{error}</Alert>}
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      loading={pending}
                      onClick={approve}
                    >
                      允许命令行登录
                    </Button>
                    <Button variant="outlined" component={Link} to="/">
                      取消
                    </Button>
                  </Stack>
                </>
              ) : (
                <Alert severity="error">
                  命令行登录链接无效，请回到命令行重新登录。
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
