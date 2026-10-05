import type { ReactNode } from 'react';
import { Container, Stack, Typography } from '@mui/material';

/** 页面顶部的标题与说明 */
export function PageHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode;
  /** 标题下方的小字，如数量 */
  subtitle?: ReactNode;
  /** 和标题同一行，贴右边，如「上传」「新建」按钮 */
  action?: ReactNode;
  /** 标题下方的其他内容 */
  children?: ReactNode;
}) {
  return (
    <Container sx={{ pt: 6 }}>
      <Stack spacing={1}>
        {action ? (
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="h4">{title}</Typography>
            {action}
          </Stack>
        ) : (
          <Typography variant="h4">{title}</Typography>
        )}
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Stack>
    </Container>
  );
}
