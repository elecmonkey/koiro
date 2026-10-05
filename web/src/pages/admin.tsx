import { Box, Container, Typography } from '@mui/material';
import { UsersManager } from '@/components/user/user-manager';
import { pageTitle } from '@/utils/page-title';

export default function Page() {
  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('用户管理')}</title>
      <Container maxWidth="lg" sx={{ pt: 6 }}>
        <Typography variant="h4" gutterBottom>
          管理后台
        </Typography>
        <Box sx={{ mt: 3 }}>
          <UsersManager />
        </Box>
      </Container>
    </Box>
  );
}
