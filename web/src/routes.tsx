import type { ComponentType, ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import RequireAuth from './auth/RequireAuth';
import { PERMISSIONS } from './lib/permissions';
import Layout from './app/Layout';
// 最常见的落地页随主包加载，省掉一次串行请求；其余页面按路由拆分
import HomePage from './app/page';
import LoginPage from './app/login/page';

type Guard = (page: ReactNode) => ReactNode;

/** 浏览类页面：VIEW 权限，开启匿名访问时未登录也可看 */
const view: Guard = (page) => (
  <RequireAuth permission={PERMISSIONS.VIEW} allowAnonymous>
    {page}
  </RequireAuth>
);
const upload: Guard = (page) => (
  <RequireAuth permission={PERMISSIONS.UPLOAD}>{page}</RequireAuth>
);
const admin: Guard = (page) => (
  <RequireAuth permission={PERMISSIONS.ADMIN}>{page}</RequireAuth>
);
const loggedIn: Guard = (page) => <RequireAuth>{page}</RequireAuth>;
const open: Guard = (page) => page;

/**
 * 按需加载的页面：用 React Router 的路由级 lazy，导航时先取到代码再切换，
 * 期间保持当前页面，不会闪出加载态
 */
function lazyPage(
  load: () => Promise<{ default: ComponentType }>,
  guard: Guard,
) {
  return async () => {
    const { default: Page } = await load();
    return {
      Component: function GuardedPage() {
        return guard(<Page />);
      },
    };
  };
}

function PageLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    // 直接打开一个按需加载的页面时，代码到达前的占位
    hydrateFallbackElement: <PageLoading />,
    children: [
      { path: '/', element: view(<HomePage />) },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/denied',
        lazy: lazyPage(() => import('./app/denied/page'), open),
      },
      {
        path: '/songs',
        lazy: lazyPage(() => import('./app/songs/page'), view),
      },
      {
        path: '/songs/:id',
        lazy: lazyPage(() => import('./app/songs/[id]/page'), view),
      },
      {
        path: '/songs/:id/edit',
        lazy: lazyPage(() => import('./app/songs/[id]/edit/page'), admin),
      },
      {
        path: '/playlists',
        lazy: lazyPage(() => import('./app/playlists/page'), view),
      },
      {
        path: '/playlists/:id',
        lazy: lazyPage(() => import('./app/playlists/[id]/page'), view),
      },
      {
        path: '/search',
        lazy: lazyPage(() => import('./app/search/page'), view),
      },
      {
        path: '/staff',
        lazy: lazyPage(() => import('./app/staff/page'), view),
      },
      {
        path: '/staff/:name',
        lazy: lazyPage(() => import('./app/staff/[name]/page'), view),
      },
      {
        path: '/languages',
        lazy: lazyPage(() => import('./app/languages/page'), view),
      },
      {
        path: '/languages/:language',
        lazy: lazyPage(() => import('./app/languages/[language]/page'), view),
      },
      {
        path: '/upload',
        lazy: lazyPage(() => import('./app/upload/page'), upload),
      },
      {
        path: '/editor',
        lazy: lazyPage(() => import('./app/editor/page'), upload),
      },
      {
        path: '/admin',
        lazy: lazyPage(() => import('./app/admin/page'), admin),
      },
      {
        path: '/admin/songs',
        lazy: lazyPage(() => import('./app/admin/songs/page'), admin),
      },
      {
        path: '/admin/users',
        lazy: lazyPage(() => import('./app/admin/users/page'), admin),
      },
      {
        path: '/admin/playlists/:id',
        lazy: lazyPage(() => import('./app/admin/playlists/[id]/page'), admin),
      },
      {
        path: '/profile',
        lazy: lazyPage(() => import('./app/profile/page'), loggedIn),
      },
      { path: '*', lazy: lazyPage(() => import('./app/not-found'), open) },
    ],
  },
]);
