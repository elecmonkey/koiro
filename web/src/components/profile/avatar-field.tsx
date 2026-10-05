import { useRef, useState, type ChangeEvent } from 'react';
import type { User } from '@koiro/shared';
import {
  Alert,
  Avatar,
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useUploadAvatar } from '@/query';
import { avatarColor } from '@/utils/avatar-color';

/** 头像：显示，或选一张图片直接上传并设为头像 */
export function AvatarField({ user }: { user: User }) {
  const upload = useUploadAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    setSaved(false);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        头像
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1 }}>
        <Avatar
          src={localPreview ?? user.avatarUrl ?? undefined}
          sx={{
            width: 64,
            height: 64,
            bgcolor: avatarColor(user.id),
            fontWeight: 600,
          }}
        >
          {user.displayName.slice(0, 1).toUpperCase()}
        </Avatar>
        <Stack spacing={0.5}>
          <Button
            size="small"
            variant="outlined"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? '上传中...' : '更换头像'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onChange}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            最大 30MB，支持 PNG/JPG/WebP
          </Typography>
        </Stack>
      </Stack>
      {upload.isPending && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 1.5, maxWidth: 300 }}
        />
      )}
      {upload.error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {upload.error instanceof Error ? upload.error.message : '上传失败'}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mt: 1 }}>
          头像更新成功
        </Alert>
      )}
    </Box>
  );
}
