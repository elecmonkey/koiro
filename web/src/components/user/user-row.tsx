import { PERMISSIONS, type User } from '@koiro/shared';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatDate } from '@/utils/format-date';

/** 一个用户：资料与权限，以及编辑权限 / 昵称、重置密码、删除的入口 */
export function UserRow({
  user,
  onEditPermissions,
  onEditDisplayName,
  onResetPassword,
  onDelete,
}: {
  user: User;
  onEditPermissions: () => void;
  onEditDisplayName: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', flex: '1 1 260px', minWidth: 0 }}
        >
          <UserAvatar
            id={user.id}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            sx={{ width: 44, height: 44 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {user.displayName}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {user.email}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          sx={{ flexWrap: 'wrap', flex: '1 1 160px' }}
        >
          {user.permissions.map((permission) => (
            <Chip
              key={permission}
              label={PERMISSIONS[permission]}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
        >
          创建于 {formatDate(user.createdAt)}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', md: 'flex-end' },
          }}
        >
          <Button size="small" variant="outlined" onClick={onEditPermissions}>
            权限
          </Button>
          <Button size="small" variant="outlined" onClick={onEditDisplayName}>
            昵称
          </Button>
          <Button size="small" variant="outlined" onClick={onResetPassword}>
            重置密码
          </Button>
          <Button size="small" color="error" onClick={onDelete}>
            删除
          </Button>
        </Stack>
      </Stack>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
