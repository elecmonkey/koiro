import { PERMISSIONS, type Permission } from '@koiro/shared';
import { Chip, Stack } from '@mui/material';

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/** 切换一项权限，结果保持固定顺序 */
function toggle(list: readonly Permission[], permission: Permission) {
  return ALL_PERMISSIONS.filter((item) =>
    item === permission ? !list.includes(item) : list.includes(item),
  );
}

/** 权限的多选，用点击切换的 Chip 表示 */
export function PermissionPicker({
  value,
  onChange,
}: {
  value: readonly Permission[];
  onChange: (next: Permission[]) => void;
}) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {ALL_PERMISSIONS.map((permission) => (
        <Chip
          key={permission}
          label={PERMISSIONS[permission]}
          color={value.includes(permission) ? 'primary' : 'default'}
          variant={value.includes(permission) ? 'filled' : 'outlined'}
          onClick={() => onChange(toggle(value, permission))}
        />
      ))}
    </Stack>
  );
}
