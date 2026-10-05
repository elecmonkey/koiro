import {
  Autocomplete,
  Checkbox,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { SongFormState } from './use-song-form';

/** 多选所属播放列表 */
export function PlaylistPicker({ form }: { form: SongFormState }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">所属播放列表</Typography>
      <Autocomplete
        multiple
        options={form.allPlaylists}
        disableCloseOnSelect
        getOptionLabel={(option) => option.name}
        value={form.selectedPlaylists}
        onChange={(_, value) => form.setSelectedPlaylists(value)}
        loading={form.playlistsLoading}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderOption={(props, option, { selected }) => {
          const { key, ...restProps } = props;
          return (
            <li key={key} {...restProps}>
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              {option.name}
            </li>
          );
        }}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getItemProps({ index });
            return (
              <Chip key={key} label={option.name} size="small" {...tagProps} />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={
              form.selectedPlaylists.length === 0 ? '选择播放列表（可选）' : ''
            }
          />
        )}
        noOptionsText="暂无播放列表"
      />
    </Stack>
  );
}
