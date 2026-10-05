import type { CliAuthorizeRequest, LoginRequest, Session } from '@koiro/shared';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authorizeCli, fetchSession, login, logout } from '@/api';
import { queryKeys } from './keys';

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => fetchSession({ signal }),
    staleTime: Infinity,
  });
}

/** 当前用户；未登录或会话还没取到时为 null */
export function useCurrentUser() {
  return useSession().data?.user ?? null;
}

/** 除 session 外的其余缓存都属于上一位用户，换身份时要丢弃 */
function removeOtherQueries(client: QueryClient) {
  client.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'session',
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: (session) => {
      // 先写入新会话：仍挂载的 useSession() 观察者（比如登录页）才能正常收到更新并跳转。
      // 反过来先 clear() 会把它们挂的 Query 对象连带销毁，后写入的数据会建在一个
      // 没有观察者的新 Query 上，页面要等下次挂载（比如手动刷新）才会跳转
      client.setQueryData(queryKeys.session, session);
      removeOtherQueries(client);
    },
  });
}

/** 已登录的用户确认命令行登录 */
export function useAuthorizeCli() {
  return useMutation({
    mutationFn: (body: CliAuthorizeRequest) => authorizeCli(body),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      const session = client.getQueryData<Session>(queryKeys.session);
      client.setQueryData<Session>(queryKeys.session, {
        user: null,
        allowAnonymous: session?.allowAnonymous ?? false,
      });
      removeOtherQueries(client);
    },
  });
}
