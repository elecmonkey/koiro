import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  permissions: number;
};

type MeResponse = {
  user: CurrentUser | null;
  allowAnonymous: boolean;
};

type AuthContextValue = {
  user: CurrentUser | null;
  allowAnonymous: boolean;
  /** 首次获取 /api/me 完成前为 true */
  loading: boolean;
  login: (email: string, password: string, ttlDays: number) => Promise<void>;
  logout: () => Promise<void>;
  /** 资料修改后同步本地状态 */
  setUser: (user: CurrentUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: CurrentUser | null;
    allowAnonymous: boolean;
    loading: boolean;
  }>({
    user: null,
    allowAnonymous: false,
    loading: true,
  });

  useEffect(() => {
    api<MeResponse>('/api/me')
      .then((me) =>
        setState({
          user: me.user,
          allowAnonymous: me.allowAnonymous,
          loading: false,
        }),
      )
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, []);

  const login = useCallback(
    async (email: string, password: string, ttlDays: number) => {
      const me = await api<MeResponse>('/api/auth/login', {
        method: 'POST',
        json: { email, password, ttlDays },
      });
      setState({
        user: me.user,
        allowAnonymous: me.allowAnonymous,
        loading: false,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setState((prev) => ({ ...prev, user: null }));
  }, []);

  const setUser = useCallback((user: CurrentUser | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, setUser }),
    [state, login, logout, setUser],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** 当前用户的权限位（未登录为 0） */
export function usePermissions() {
  return useAuth().user?.permissions ?? 0;
}
