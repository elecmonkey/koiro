import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { PageState } from '@/components/ui/page-state';
import { TagCloud } from '@/components/ui/tag-cloud';
import { useStaff } from '@/query';
import { pageTitle } from '@/utils/page-title';

/** 默认只显示参与歌曲数不少于这个数的人 */
const MIN_SONGS = 3;
/** 每人显示的角色数 */
const ROLES_SHOWN = 3;

export default function StaffPage() {
  const { data, isPending, error } = useStaff();
  const [showSingles, setShowSingles] = useState(false);
  const members = (data ?? []).filter(
    (member) => showSingles || member.songCount >= MIN_SONGS,
  );

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('Staff 云')}</title>
      <Container sx={{ pt: 6 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="h4">Staff 云</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              显示出现 1-2 次
            </Typography>
            <Switch
              size="small"
              checked={showSingles}
              onChange={(event) => setShowSingles(event.target.checked)}
              slotProps={{ input: { 'aria-label': 'show singles' } }}
            />
          </Stack>
        </Stack>
      </Container>
      <Container sx={{ pt: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <PageState
              loading={isPending}
              error={error}
              empty={members.length === 0 && '暂无 Staff 数据'}
            >
              <TagCloud
                items={members.map((member) => ({
                  key: member.name,
                  label: member.name,
                  count: member.songCount,
                  href: `/staff/${encodeURIComponent(member.name)}`,
                  footer: member.roles.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      useFlexGap
                      sx={{ flexWrap: 'wrap' }}
                    >
                      {member.roles.slice(0, ROLES_SHOWN).map((role) => (
                        <Chip
                          key={role.role}
                          size="small"
                          label={role.role}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  ),
                }))}
              />
            </PageState>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
