import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { pageTitle } from '@/utils/page-title';

export default function NotFoundPage() {
  return (
    <Container sx={{ pt: 8 }}>
      <title>{pageTitle('页面不存在')}</title>
      <Stack
        spacing={2}
        sx={{
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="h5">页面不存在</Typography>
        <Button component={Link} to="/" variant="outlined">
          返回首页
        </Button>
      </Stack>
    </Container>
  );
}
