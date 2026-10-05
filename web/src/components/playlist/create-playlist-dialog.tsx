import { useState } from 'react';
import type { PlaylistInput } from '@koiro/shared';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { ImageUploadField } from '@/components/upload/image-upload-field';
import { useCreatePlaylist } from '@/query';

/** 新建歌单 */
export function CreatePlaylistDialog({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<PlaylistInput>({
    name: '',
    coverObjectId: '',
    description: '',
  });
  const create = useCreatePlaylist();

  const submit = () => {
    if (!draft.name.trim() || !draft.coverObjectId) return;
    create.mutate(draft, { onSuccess: onClose });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>新建播放列表</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="播放列表名称"
            value={draft.name}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            required
          />
          <ImageUploadField
            label="封面图片"
            objectId={draft.coverObjectId || null}
            onObjectIdChange={(value) =>
              setDraft((prev) => ({ ...prev, coverObjectId: value ?? '' }))
            }
          />
          <TextField
            label="简介"
            value={draft.description}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, description: e.target.value }))
            }
            fullWidth
            multiline
            minRows={3}
          />
          {create.error && (
            <Alert severity="error">{create.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={create.isPending}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={
            create.isPending || !draft.name.trim() || !draft.coverObjectId
          }
        >
          {create.isPending ? '创建中...' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
