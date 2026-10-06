import { SINGER_ROLE, type StaffMember } from '@koiro/shared';
import { Box, Chip, Container, Stack } from '@mui/material';
import { CloudSection } from '@/components/staff/cloud-section';
import { PageHeader } from '@/components/ui/page-header';
import { PageState } from '@/components/ui/page-state';
import type { TagCloudItem } from '@/components/ui/tag-cloud';
import { useStaff } from '@/query';
import { pageTitle } from '@/utils/page-title';

/** 每人显示的角色数 */
const ROLES_SHOWN = 3;

const memberHref = (member: StaffMember) =>
  `/staff/${encodeURIComponent(member.name)}`;

/** 唱过歌的人，按唱过的歌曲数 */
function singerItems(members: readonly StaffMember[]): TagCloudItem[] {
  return members.flatMap((member) => {
    const sung = member.roles.find((role) => role.role === SINGER_ROLE);
    return sung
      ? [
          {
            key: member.name,
            label: member.name,
            count: sung.songCount,
            href: memberHref(member),
          },
        ]
      : [];
  });
}

/** 做过演唱以外角色的人，按幕后参与的歌曲数，下方列出这些角色 */
function crewItems(members: readonly StaffMember[]): TagCloudItem[] {
  return members.flatMap((member) => {
    if (member.crewSongCount === 0) return [];
    const roles = member.roles.filter((role) => role.role !== SINGER_ROLE);
    return [
      {
        key: member.name,
        label: member.name,
        count: member.crewSongCount,
        href: memberHref(member),
        footer: (
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {roles.slice(0, ROLES_SHOWN).map((role) => (
              <Chip
                key={role.role}
                size="small"
                label={role.role}
                variant="outlined"
              />
            ))}
          </Stack>
        ),
      },
    ];
  });
}

export default function StaffPage() {
  const { data, isPending, error } = useStaff();

  return (
    <Box component="main" sx={{ pb: 8 }}>
      <title>{pageTitle('Staff')}</title>
      <PageHeader title="Staff" />
      <Container sx={{ pt: 4 }}>
        <PageState loading={isPending} error={error}>
          {data && (
            <Stack spacing={3}>
              <CloudSection
                title="歌手云"
                items={singerItems(data)}
                emptyText="暂无歌手数据"
              />
              <CloudSection
                title="Staff 云"
                items={crewItems(data)}
                emptyText="暂无 Staff 数据"
              />
            </Stack>
          )}
        </PageState>
      </Container>
    </Box>
  );
}
