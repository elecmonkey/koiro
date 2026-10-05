import type { OwnerRef } from '@koiro/shared';
import { Box, Stack, Typography } from '@mui/material';
import { UserAvatar } from './user-avatar';

const AVATAR_SIZE = 44;
const PILL_HEIGHT = 32;

/**
 * 创建者胶囊：头像在最左边、比胶囊大一圈，压在胶囊上；只显示昵称，不带「创建者/上传者」字样。
 * 没有创建者信息（历史数据、账号已删除）时不渲染
 */
export function OwnerLine({ owner }: { owner: OwnerRef | null }) {
  if (!owner) return null;
  return (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      <UserAvatar
        id={owner.id}
        displayName={owner.displayName}
        avatarUrl={owner.avatarUrl}
        sx={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          border: '2px solid',
          borderColor: 'background.default',
        }}
      />
      <Box
        sx={{
          ml: `-${String(AVATAR_SIZE / 2 + 2)}px`,
          pl: `${String(AVATAR_SIZE / 2 + 10)}px`,
          pr: 2,
          height: PILL_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 999,
          bgcolor: 'background.paper',
          border: '1px solid rgba(31, 26, 22, 0.08)',
        }}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {owner.displayName}
        </Typography>
      </Box>
    </Stack>
  );
}
