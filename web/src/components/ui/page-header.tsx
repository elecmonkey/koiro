import type { ReactNode } from 'react';
import { Container, Stack, Typography } from '@mui/material';

/** 页面顶部的标题与说明 */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  /** 标题下方的小字，如数量 */
  subtitle?: ReactNode;
  /** 标题下方的其他内容 */
  children?: ReactNode;
}) {
  return (
    <Container sx={{ pt: 6 }}>
      <Stack spacing={1}>
        <Typography variant="h4">{title}</Typography>
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
