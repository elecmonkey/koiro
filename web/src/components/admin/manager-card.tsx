import type { ReactNode } from 'react';
import { Card, CardContent, Stack } from '@mui/material';

/** 管理列表的外层卡片：标题栏、内容区按此顺序垫间距 */
export function ManagerCard({ children }: { children: ReactNode }) {
  return (
    <Card className="float-in" variant="outlined">
      <CardContent>
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}
