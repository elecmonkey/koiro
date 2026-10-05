import type { OwnerRef } from '@koiro/shared';
import { Stack, Typography } from '@mui/material';
import { UserAvatar } from './user-avatar';

/** 「头像 + 创建者昵称」一行；没有创建者信息（历史数据、账号已删除）时不渲染 */
export function OwnerLine({
  owner,
  label = '创建者',
}: {
  owner: OwnerRef | null;
  label?: string;
}) {
  if (!owner) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <UserAvatar
        id={owner.id}
        displayName={owner.displayName}
        avatarUrl={owner.avatarUrl}
        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label} · {owner.displayName}
      </Typography>
    </Stack>
  );
}
