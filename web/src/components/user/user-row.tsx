import { PERMISSIONS, type User } from '@koiro/shared';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">{user.displayName}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {user.email}
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', mt: 0.5 }}
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
            sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
          >
            创建于 {formatDate(user.createdAt)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
