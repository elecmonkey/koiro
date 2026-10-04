import type { ReactNode } from 'react';
import { Box, Card, Divider, Stack, Typography } from '@mui/material';

type SectionCardProps = {
  icon: ReactNode;
  title: string;
  /** 标题右侧的按钮 */
  actions?: ReactNode;
  children: ReactNode;
};

/** 带图标、标题和操作的内容区块 */
export function SectionCard({
  icon,
  title,
  actions,
  children,
}: SectionCardProps) {
  return (
    <Card variant="outlined">
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {icon}
              <Typography variant="h6">{title}</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {actions}
            </Stack>
          </Stack>
          <Divider />
          {children}
        </Stack>
      </Box>
    </Card>
  );
}
