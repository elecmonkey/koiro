import { useState } from 'react';
import type { Permission, User } from '@koiro/shared';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useUpdateUser } from '@/query';
import { PermissionPicker } from './permission-picker';

/** 修改一个用户的权限 */
export function EditPermissionsDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [permissions, setPermissions] = useState<Permission[]>(
    user.permissions,
  );
  const update = useUpdateUser();

  const save = () => {
    update.mutate(
      { id: user.id, patch: { permissions } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>编辑权限</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          用户: {user.displayName} ({user.email})
        </Typography>
        <PermissionPicker value={permissions} onChange={setPermissions} />
        {update.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={update.isPending}>
          取消
        </Button>
        <Button variant="contained" onClick={save} disabled={update.isPending}>
          {update.isPending ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
