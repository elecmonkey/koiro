import {
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ImageUploadField } from '@/components/upload/image-upload-field';
import { PlaylistPicker } from './playlist-picker';
import { StaffSection } from './staff-section';
import type { SongFormState } from './use-song-form';
import { VersionSection } from './version-section';

/** 歌曲信息卡片：标题、简介、staff、音频版本、封面与所属播放列表 */
export function SongInfoSection({ form }: { form: SongFormState }) {
  return (
    <Card className="float-in">
      <CardContent>
        <Stack spacing={2.5}>
          <Typography variant="h6">歌曲信息</Typography>
          <Stack spacing={2}>
            <TextField
              label="歌曲名"
              placeholder="例如：玻璃海"
              fullWidth
              value={form.title}
              onChange={(event) => form.setTitle(event.target.value)}
            />
            <TextField
              label="简介"
              placeholder="描述这首歌的氛围、来源..."
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) => form.setDescription(event.target.value)}
            />
          </Stack>
          <Divider />
          <StaffSection form={form} />
          <Divider />
          <VersionSection form={form} />
          <Divider />
          <ImageUploadField
            key={form.uploadComponentKey}
            label="封面"
            objectId={form.coverObjectId}
            previewUrl={form.coverPreviewUrl}
            onObjectIdChange={(value, url) => form.setCover(value, url ?? null)}
            onFilenameChange={form.setCoverFilename}
          />
          <Divider />
          <PlaylistPicker form={form} />
        </Stack>
      </CardContent>
    </Card>
  );
}
