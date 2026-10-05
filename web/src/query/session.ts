import type { CliAuthorizeRequest, LoginRequest, Session } from '@koiro/shared';
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

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: (session) => {
      // 换了身份：清掉上一位用户的数据，再写入新会话
      client.clear();
      client.setQueryData(queryKeys.session, session);
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
      client.clear();
      client.setQueryData<Session>(queryKeys.session, {
        user: null,
        allowAnonymous: session?.allowAnonymous ?? false,
      });
    },
  });
}
