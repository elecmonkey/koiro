import type { SxProps, Theme } from '@mui/material';
import { Avatar } from '@mui/material';
import { avatarColor } from '@/utils/avatar-color';

type UserAvatarProps = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  sx?: SxProps<Theme>;
};

/** 用户头像：有上传的就显示，没有时按用户 ID 固定分配一个底色 + 首字母 */
export function UserAvatar({
  id,
  displayName,
  avatarUrl,
  sx,
}: UserAvatarProps) {
  return (
    <Avatar
      src={avatarUrl ?? undefined}
      sx={{ bgcolor: avatarColor(id), fontWeight: 600, ...sx }}
    >
      {displayName.slice(0, 1).toUpperCase()}
    </Avatar>
  );
}
