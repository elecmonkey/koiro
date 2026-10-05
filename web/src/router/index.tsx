import type { ComponentType, ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import RequireAuth from './require-auth';
import { Layout } from '@/components/layout/app-layout';
// 最常见的落地页随主包加载，省掉一次串行请求；其余页面按路由拆分
import HomePage from '@/pages/home';
import LoginPage from '@/pages/login';

type Guard = (page: ReactNode) => ReactNode;

/** 浏览类页面：VIEW 权限，开启匿名访问时未登录也可看 */
const view: Guard = (page) => (
  <RequireAuth permission="view" allowAnonymous>
    {page}
  </RequireAuth>
);
const upload: Guard = (page) => (
  <RequireAuth permission="upload">{page}</RequireAuth>
);
const admin: Guard = (page) => (
  <RequireAuth permission="admin">{page}</RequireAuth>
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
        lazy: lazyPage(() => import('@/pages/denied'), open),
      },
      {
        path: '/songs',
        lazy: lazyPage(() => import('@/pages/songs'), view),
      },
      {
        path: '/songs/:id',
        lazy: lazyPage(() => import('@/pages/songs/detail'), view),
      },
      {
        path: '/songs/:id/edit',
        lazy: lazyPage(() => import('@/pages/songs/edit'), upload),
      },
      {
        path: '/playlists',
        lazy: lazyPage(() => import('@/pages/playlists'), view),
      },
      {
        path: '/playlists/:id',
        lazy: lazyPage(() => import('@/pages/playlists/detail'), view),
      },
      {
        path: '/search',
        lazy: lazyPage(() => import('@/pages/search'), view),
      },
      {
        path: '/staff',
        lazy: lazyPage(() => import('@/pages/staff'), view),
      },
      {
        path: '/staff/:name',
        lazy: lazyPage(() => import('@/pages/staff/detail'), view),
      },
      {
        path: '/languages',
        lazy: lazyPage(() => import('@/pages/languages'), view),
      },
      {
        path: '/languages/:language',
        lazy: lazyPage(() => import('@/pages/languages/detail'), view),
      },
      {
        path: '/upload',
        lazy: lazyPage(() => import('@/pages/upload'), upload),
      },
      {
        path: '/editor',
        lazy: lazyPage(() => import('@/pages/editor'), upload),
      },
      {
        path: '/mine/songs',
        lazy: lazyPage(() => import('@/pages/mine/songs'), upload),
      },
      {
        path: '/mine/playlists',
        lazy: lazyPage(() => import('@/pages/mine/playlists'), upload),
      },
      {
        path: '/mine/playlists/:id',
        lazy: lazyPage(() => import('@/pages/mine/playlists/detail'), upload),
      },
      {
        path: '/admin',
        lazy: lazyPage(() => import('@/pages/admin'), admin),
      },
      {
        path: '/auth/cli',
        lazy: lazyPage(() => import('@/pages/auth/cli'), loggedIn),
      },
      {
        path: '/profile',
        lazy: lazyPage(() => import('@/pages/profile'), loggedIn),
      },
      { path: '*', lazy: lazyPage(() => import('@/pages/not-found'), open) },
    ],
  },
]);
