import { Button, Stack, Typography } from '@mui/material';

type SubmitBarProps = {
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
  /** 创建模式：清空表单与草稿 */
  onClearDraft: () => void;
  /** 编辑模式：放弃修改，返回歌曲详情 */
  onCancel: () => void;
};

/** 表单底部：提交，以及清空草稿 / 取消，和错误提示 */
export function SubmitBar({
  mode,
  isSubmitting,
  submitError,
  onSubmit,
  onClearDraft,
  onCancel,
}: SubmitBarProps) {
  const isEditMode = mode === 'edit';
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Button variant="contained" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? '提交中...' : isEditMode ? '保存修改' : '提交上传'}
      </Button>
      {!isEditMode && (
        <Button variant="outlined" onClick={onClearDraft}>
          清空草稿
        </Button>
      )}
      {isEditMode && (
        <Button variant="outlined" onClick={onCancel}>
          取消
        </Button>
      )}
      {submitError ? (
        <Typography variant="caption" color="error">
          {submitError}
        </Typography>
      ) : null}
    </Stack>
  );
}
