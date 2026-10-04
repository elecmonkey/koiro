import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { useLogout } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function DeniedPage() {
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 10 }}>
      <title>{pageTitle('访问被拒绝')}</title>
      <Container maxWidth="sm">
        <Card className="float-in">
          <CardContent sx={{ p: 5 }}>
            <Stack spacing={2}>
              <Typography variant="h4">权限不足</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                当前账号权限不足或已被停用，请联系管理员。
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" component={Link} to="/">
                  返回首页
                </Button>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    await logout.mutateAsync();
                    void navigate('/login');
                  }}
                >
                  重新登录
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
