import { useState } from 'react';
import { useParams } from 'react-router';
import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { SongList } from '@/components/song/song-list';
import { ListPagination } from '@/components/ui/list-pagination';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import { useSongs, useStaffMember } from '@/query';
import { pageTitle } from '@/utils/page-title';

/** 头部显示的角色数 */
const ROLES_SHOWN = 3;

export default function StaffDetailPage() {
  const { name = '' } = useParams();
  const [page, setPage] = useState(1);
  const member = useStaffMember(name);
  const songs = useSongs({ staff: name, page });

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle(name)}</title>
      <PageHeader title={name}>
        {member.data && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              共参与 {member.data.songCount} 首
            </Typography>
            {member.data.roles.slice(0, ROLES_SHOWN).map((role) => (
              <Chip
                key={role.role}
                size="small"
                label={role.role}
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </PageHeader>
      <Container sx={{ pt: 4 }}>
        <PageState
          loading={member.isPending || songs.isPending}
          error={member.error ?? songs.error}
          empty={songs.data?.total === 0 && '暂无歌曲'}
        >
          {songs.data && <SongList songs={songs.data.items} />}
          <ListPagination
            page={page}
            totalPages={songs.data?.totalPages ?? 0}
            onChange={setPage}
          />
        </PageState>
      </Container>
    </Box>
  );
}
