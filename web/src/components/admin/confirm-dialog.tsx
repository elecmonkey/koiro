import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  color?: 'error' | 'primary';
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** 需要用户确认才能继续的操作：说明文字，取消与确认 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '删除',
  pendingLabel,
  color = 'error',
  pending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          取消
        </Button>
        <Button
          variant="contained"
          color={color}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? (pendingLabel ?? `${confirmLabel}中...`) : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
