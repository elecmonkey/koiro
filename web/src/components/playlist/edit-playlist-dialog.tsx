import { useState } from 'react';
import type { Playlist, PlaylistPatch } from '@koiro/shared';
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
import { useUpdatePlaylist } from '@/query';

/** 修改歌单：`coverObjectId` 为空表示不换封面 */
type PlaylistEdit = {
  name: string;
  description: string;
  coverObjectId: string | null;
};

/** 修改一个歌单的名称、简介与封面 */
export function EditPlaylistDialog({
  playlist,
  onClose,
}: {
  playlist: Playlist;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PlaylistEdit>({
    name: playlist.name,
    description: playlist.description,
    coverObjectId: null,
  });
  const update = useUpdatePlaylist();

  const submit = () => {
    if (!draft.name.trim()) return;
    const { coverObjectId, ...fields } = draft;
    const patch: PlaylistPatch = {
      ...fields,
      ...(coverObjectId ? { coverObjectId } : {}),
    };
    update.mutate({ id: playlist.id, patch }, { onSuccess: onClose });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>编辑播放列表</DialogTitle>
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
            objectId={draft.coverObjectId}
            currentUrl={playlist.coverUrl}
            onObjectIdChange={(value) =>
              setDraft((prev) => ({ ...prev, coverObjectId: value }))
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
          {update.error && (
            <Alert severity="error">{update.error.message}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={update.isPending}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={update.isPending || !draft.name.trim()}
        >
          {update.isPending ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
