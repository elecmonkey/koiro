import { Box, Container } from '@mui/material';
import { UsersManager } from '@/components/user/user-manager';
import { PageHeader } from '@/components/ui/page-header';
import { pageTitle } from '@/utils/page-title';

export default function Page() {
  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('用户管理')}</title>
      <PageHeader title="用户管理" />
      <Container sx={{ pt: 4 }}>
        <UsersManager />
      </Container>
    </Box>
  );
}
