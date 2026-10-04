import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { ApiError } from '@/http';

type PageStateProps = {
  /** 第一次加载中（已有数据时的后台刷新不算） */
  loading: boolean;
  error: unknown;
  /** 加载完成但没有内容时显示的说明 */
  empty?: ReactNode;
  children: ReactNode;
};

/** 一块数据区域的加载、错误、空状态，统一处理后才渲染内容 */
export function PageState({ loading, error, empty, children }: PageStateProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{errorMessage(error)}</Alert>;
  }
  if (empty) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', py: 4 }}>
        {empty}
      </Typography>
    );
  }
  return children;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return '内容不存在';
  return error instanceof Error ? error.message : '加载失败';
}
