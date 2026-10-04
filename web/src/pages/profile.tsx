import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { AgentSkillCard } from '@/components/profile/agent-skill-card';
import { DisplayNameField } from '@/components/profile/display-name-field';
import { PasswordCard } from '@/components/profile/password-card';
import { PageState } from '@/components/ui/page-state';
import { useProfile } from '@/query';
import { pageTitle } from '@/utils/page-title';

export default function ProfilePage() {
  const { data: user, isPending, error } = useProfile();

  return (
    <Container sx={{ py: 4 }}>
      <title>{pageTitle('个人信息')}</title>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        个人中心
      </Typography>
      <PageState loading={isPending} error={error}>
        {user && (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary' }}
                    >
                      邮箱（不可修改）
                    </Typography>
                    <Typography variant="body1">{user.email}</Typography>
                  </Box>
                  <Divider />
                  <DisplayNameField key={user.displayName} user={user} />
                  <Divider />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary' }}
                    >
                      注册时间
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.createdAt).toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            <AgentSkillCard />
            <PasswordCard />
          </>
        )}
      </PageState>
    </Container>
  );
}
