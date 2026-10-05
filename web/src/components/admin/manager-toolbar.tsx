import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';

/** 管理列表顶部：标题（通常带数量）与右侧的搜索框、操作按钮 */
export function ManagerToolbar({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
    >
      <Typography variant="h6">{title}</Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, width: { xs: '100%', md: 'auto' } }}
      >
        {children}
      </Stack>
    </Stack>
  );
}
