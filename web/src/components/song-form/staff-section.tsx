import { Button, Stack, Typography } from '@mui/material';
import { StaffRow } from './staff-row';
import type { SongFormState } from './use-song-form';

/** staff 列表：角色与姓名，可增删 */
export function StaffSection({ form }: { form: SongFormState }) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1">Staff</Typography>
        <Button size="small" variant="outlined" onClick={form.addStaff}>
          添加 Staff
        </Button>
      </Stack>
      <Stack spacing={1.5}>
        {form.staff.map((item) => (
          <StaffRow
            key={item.id}
            item={item}
            onChange={(updates) => form.updateStaff(item.id, updates)}
            onRemove={() => form.removeStaff(item.id)}
          />
        ))}
      </Stack>
    </Stack>
  );
}
