import type { OwnerRef } from '@koiro/shared';
import { Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Link } from 'react-router';
import { OwnerLine } from './owner-line';

/** 详情页底部：左边创建者，右边是否有编辑入口（owner 本人或 admin 才显示） */
export function OwnerFooter({
  owner,
  label,
  canEdit,
  editHref,
}: {
  owner: OwnerRef | null;
  label: string;
  canEdit: boolean;
  editHref: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <OwnerLine owner={owner} label={label} />
      {canEdit && (
        <Button
          component={Link}
          to={editHref}
          size="small"
          variant="outlined"
          startIcon={<EditIcon fontSize="small" />}
        >
          编辑
        </Button>
      )}
    </Stack>
  );
}
