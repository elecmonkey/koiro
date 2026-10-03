import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from './AuthContext';

type RequireAuthProps = {
  children: ReactNode;
  /** 所需权限；不填则只要求登录 */
  permission?: number;
  /** 全局开启匿名访问时，该页面是否允许未登录浏览 */
  allowAnonymous?: boolean;
};

/**
 * 前端路由守卫，只决定跳转（真正的权限校验在后端）：
 * 未登录 → /login，权限为 0 或不足 → /denied
 */
export default function RequireAuth({
  children,
  permission,
  allowAnonymous = false,
}: RequireAuthProps) {
  const { user, allowAnonymous: globalAnonymous, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!user) {
    if (globalAnonymous && allowAnonymous) {
      return children;
    }
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (
    user.permissions === 0 ||
    (permission && !hasPermission(user.permissions, permission))
  ) {
    return <Navigate to="/denied" replace />;
  }

  return children;
}
