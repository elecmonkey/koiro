import type { Session } from '@koiro/shared';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/http';
import { queryKeys } from './keys';

/** 4xx 是请求本身的问题，重试也没用 */
function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500)
    return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // 任何请求遇到 401 说明登录已失效：清掉会话里的用户，路由守卫随之跳转登录页
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          client.setQueryData<Session>(queryKeys.session, (session) =>
            session ? { ...session, user: null } : session,
          );
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  return client;
}
